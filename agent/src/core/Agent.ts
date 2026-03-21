import winston from "winston";
import {
  AgentConfig,
  GameState,
  GamePhase,
  Role,
  Player,
  Action,
  ActionCommitment,
  ActionType,
  Location,
} from "../types.js";
import { GameObserver } from "./GameObserver.js";
import { ActionSubmitter } from "./ActionSubmitter.js";
import { GameMemory } from "../memory/GameMemory.js";
import { IStrategy, StrategyContext } from "../strategies/BaseStrategy.js";
import { CrewmateStrategy, CrewmateStyle } from "../strategies/CrewmateStrategy.js";
import { ImpostorStrategy, ImpostorStyle } from "../strategies/ImpostorStrategy.js";
import { WebSocketClient } from "./WebSocketClient.js";
import { GAME_CONFIG } from "../config.js";

export interface AgentOptions {
  crewmateStyle?: CrewmateStyle;
  impostorStyle?: ImpostorStyle;
  wsServerUrl?: string;
}

export class Agent {
  private config: AgentConfig;
  private observer: GameObserver;
  private submitter: ActionSubmitter;
  private memory: GameMemory;
  private logger: winston.Logger;
  private wsClient: WebSocketClient | null = null;

  private currentGameObjectId: string | null = null;
  private myRole: Role = Role.None;
  private strategy: IStrategy | null = null;
  private pendingCommitment: ActionCommitment | null = null;
  private lastPhase: GamePhase | null = null;

  private crewmateStyle: CrewmateStyle;
  private impostorStyle: ImpostorStyle;

  constructor(
    config: AgentConfig,
    options: AgentOptions = {}
  ) {
    const {
      crewmateStyle = "task-focused",
      impostorStyle = "stealth",
      wsServerUrl,
    } = options;

    this.config = config;
    this.observer = new GameObserver();
    this.submitter = new ActionSubmitter(config.privateKey);
    this.memory = new GameMemory();
    this.crewmateStyle = crewmateStyle;
    this.impostorStyle = impostorStyle;

    this.logger = winston.createLogger({
      level: "info",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `[${timestamp}] [${config.agentName}] ${level.toUpperCase()}: ${message}`;
        })
      ),
      transports: [new winston.transports.Console()],
    });

    if (wsServerUrl) {
      this.wsClient = new WebSocketClient(
        {
          serverUrl: wsServerUrl,
          agentAddress: this.submitter.address,
          agentName: config.agentName,
        },
        this.logger
      );
    }
  }

  async connectWebSocket(): Promise<void> {
    if (this.wsClient) {
      await this.wsClient.connect();
      this.logger.info("WebSocket connected");
    }
  }

  disconnectWebSocket(): void {
    if (this.wsClient) {
      this.wsClient.disconnect();
      this.logger.info("WebSocket disconnected");
    }
  }

  get address(): string {
    return this.submitter.address;
  }

  // ============ GAME LIFECYCLE ============

  async joinGame(gameObjectId: string): Promise<void> {
    this.logger.info(`Joining game ${gameObjectId}`);

    // Check if registered
    const registered = await this.observer.isAgentRegistered(this.address);
    if (!registered) {
      await this.submitter.registerAgent();
      this.logger.info("Registered agent on-chain");
    }

    // Place wager
    await this.submitter.placeWager(gameObjectId);
    this.logger.info("Placed wager");

    // Join game object
    await this.submitter.joinGame(gameObjectId);
    this.logger.info("Joined game on-chain");

    this.setGame(gameObjectId);
  }

  setGame(gameObjectId: string): void {
    this.currentGameObjectId = gameObjectId;
    this.submitter.setGame(gameObjectId);
    this.memory.reset();
    this.myRole = Role.None;
    this.strategy = null;
    this.pendingCommitment = null;
    this.lastPhase = null;
    this.logger.info(`Set active game: ${gameObjectId}`);

    if (this.wsClient) {
      this.wsClient.joinRoom(gameObjectId);
    }
  }

  // ============ MAIN GAME LOOP ============

  async playGame(): Promise<void> {
    if (!this.currentGameObjectId) {
      throw new Error("No game set.");
    }

    this.logger.info("Starting game loop...");

    while (true) {
      try {
        const gameState = await this.observer.getGameState(this.currentGameObjectId);
        this.memory.setCurrentRound(gameState.round);

        if (this.lastPhase !== gameState.phase) {
          this.broadcastPhaseChange(gameState);
          this.lastPhase = gameState.phase;
          this.logger.info(`Phase changed to: ${GamePhase[gameState.phase]}`);
        }

        if (gameState.ended) {
          this.logger.info(`Game ended! Winner: ${gameState.winner === 1 ? "Crewmates" : "Impostors"}`);
          if (this.wsClient) this.wsClient.leaveGame(this.currentGameObjectId);
          break;
        }

        await this.handlePhase(gameState);

        await this.sleep(2000);
      } catch (error) {
        this.logger.error(`Error in game loop: ${error instanceof Error ? error.message : String(error)}`);
        await this.sleep(4000);
      }
    }
  }

  private broadcastPhaseChange(gameState: GameState): void {
    if (this.wsClient) {
      this.wsClient.sendPhaseChange(
        this.currentGameObjectId!,
        gameState.phase,
        Number(gameState.round),
        Date.now() + 30000 // Estimated end time
      );
    }
  }

  private async handlePhase(gameState: GameState): Promise<void> {
    switch (gameState.phase) {
      case GamePhase.ActionCommit:
        await this.handleActionCommit(gameState);
        break;

      case GamePhase.ActionReveal:
        await this.handleActionReveal(gameState);
        break;

      case GamePhase.Discussion:
        this.logger.debug("Discussion phase - waiting for voting...");
        break;

      case GamePhase.Voting:
        await this.handleActionCommit(gameState); // Voting is also a commit in this contract
        break;

      case GamePhase.Resolution:
        await this.handleActionReveal(gameState); // Reveal vote
        break;

      default:
        this.logger.debug(`Phase: ${GamePhase[gameState.phase]}`);
    }
  }

  // ============ PHASE HANDLERS ============

  private async handleActionCommit(gameState: GameState): Promise<void> {
    const hasCommitted = await this.observer.hasCommitted(this.currentGameObjectId!, this.address);
    if (hasCommitted) return;

    if (this.myRole === Role.None || !this.strategy) {
      await this.initializeRoleAndStrategy();
    }

    const context = await this.buildStrategyContext(gameState);
    
    let action: Action;
    if (gameState.phase === GamePhase.Voting) {
      const voteTarget = await this.strategy!.decideVote(context);
      action = this.submitter.createVoteAction(voteTarget);
    } else {
      action = await this.strategy!.decideAction(context);
    }

    this.logger.info(`Deciding action: ${JSON.stringify(action)}`);

    this.pendingCommitment = await this.submitter.createActionCommitment(action);
    await this.submitter.commitAction(this.currentGameObjectId!, this.pendingCommitment);
    this.logger.info("Committed action");
  }

  private async handleActionReveal(gameState: GameState): Promise<void> {
    const hasRevealed = await this.observer.hasRevealed(this.currentGameObjectId!, this.address);
    if (hasRevealed) return;

    if (!this.pendingCommitment) {
      this.logger.error("No pending commitment found!");
      return;
    }

    await this.submitter.revealAction(this.currentGameObjectId!, this.pendingCommitment);
    this.logger.info("Revealed action");

    // Update memory and WS
    const location = await this.observer.getPlayerLocation(this.currentGameObjectId!, this.address);
    this.memory.setMyLocation(location);

    if (this.wsClient) {
      const action = this.pendingCommitment.action;
      this.wsClient.sendActionResult(this.currentGameObjectId!, action, Number(gameState.round));
      
      if (action.type === ActionType.Move && action.destination !== undefined) {
        this.wsClient.sendPositionUpdate(this.currentGameObjectId!, action.destination, Number(gameState.round));
      }
    }

    this.pendingCommitment = null;
  }

  private async initializeRoleAndStrategy(): Promise<void> {
    const role = await this.observer.getPlayerRole(this.currentGameObjectId!, this.address);
    this.myRole = role;

    if (this.myRole === Role.Impostor) {
      this.strategy = new ImpostorStrategy(this.impostorStyle);
      this.logger.info(`Assigned role: IMPOSTOR (${this.impostorStyle})`);
    } else {
      this.strategy = new CrewmateStrategy(this.crewmateStyle);
      this.logger.info(`Assigned role: CREWMATE (${this.crewmateStyle})`);
    }
  }

  private async buildStrategyContext(gameState: GameState): Promise<StrategyContext> {
    const allPlayerAddresses = await this.observer.getAllPlayers(this.currentGameObjectId!);
    const alivePlayers: Player[] = [];
    const allPlayers: Player[] = [];

    for (const addr of allPlayerAddresses) {
      const location = await this.observer.getPlayerLocation(this.currentGameObjectId!, addr);
      const isAlive = await this.observer.isAlive(this.currentGameObjectId!, addr);
      const role = addr === this.address ? this.myRole : Role.None; // Hide others' roles
      
      const player: Player = {
        address: addr,
        colorId: 0, 
        role,
        location,
        isAlive,
        tasksCompleted: 0,
        totalTasks: GAME_CONFIG.TASKS_REQUIRED,
        hasVoted: false,
      };
      
      allPlayers.push(player);
      if (isAlive) alivePlayers.push(player);
    }

    const myPlayer = allPlayers.find((p) => p.address === this.address)!;

    return {
      gameState,
      myPlayer,
      allPlayers,
      alivePlayers,
      deadBodies: [], // TODO: query bodies if needed
      messages: [],    // TODO: query messages if needed
      memory: this.memory,
      observer: this.observer,
    };
  }

  getRole(): Role {
    return this.myRole;
  }

  getMemory(): GameMemory {
    return this.memory;
  }

  async createAndJoinGame(): Promise<void> {
    throw new Error("createAndJoinGame not implemented - join an existing object instead");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
