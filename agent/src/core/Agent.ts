import winston from 'winston';
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
  AgentStats,
} from '../types.js';
import { GameObserver } from './GameObserver.js';
import { ActionSubmitter } from './ActionSubmitter.js';
import { GameMemory } from '../memory/GameMemory.js';
import { IStrategy, StrategyContext } from '../strategies/BaseStrategy.js';
import { CrewmateStrategy, CrewmateStyle } from '../strategies/CrewmateStrategy.js';
import { ImpostorStrategy, ImpostorStyle } from '../strategies/ImpostorStrategy.js';
import { WebSocketClient } from './WebSocketClient.js';
import { GAME_CONFIG } from '../config.js';

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
      crewmateStyle = 'task-focused',
      impostorStyle = 'stealth',
      wsServerUrl,
    } = options;

    this.config = config;
    this.observer = new GameObserver();
    this.submitter = new ActionSubmitter(config.privateKeyB64);
    this.memory = new GameMemory();
    this.crewmateStyle = crewmateStyle;
    this.impostorStyle = impostorStyle;

    this.logger = winston.createLogger({
      level: 'info',
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

  get name(): string {
    return this.config.agentName;
  }

  get address(): string {
    return this.submitter.address;
  }

  // ============ LIFECYCLE ============

  async ensureRegistered(): Promise<void> {
    const isRegistered = await this.observer.isAgentRegistered(this.address);
    if (!isRegistered) {
      this.logger.info('Registering agent...');
      await this.submitter.registerAgent();
      this.logger.info('Agent registered successfully');
    }
  }

  async createGame(): Promise<string> {
    this.logger.info('Creating new game...');
    const gameId = await this.submitter.createGame();
    this.logger.info(`Game created with ID: ${gameId}`);
    return gameId;
  }

  async placeWagerAndJoin(gameObjectId: string): Promise<void> {
    this.logger.info(`Joining game ${gameObjectId}...`);
    await this.submitter.placeWager(gameObjectId);
    await this.submitter.joinGame(gameObjectId);
    this.logger.info('Wager placed and joined game successfully');
  }

  async startGame(gameObjectId: string): Promise<void> {
    this.logger.info('Starting game...');
    await this.submitter.startGame(gameObjectId);
  }

  async getStats(): Promise<AgentStats | null> {
    try {
        const stats = await this.observer.getAgentStats(this.address);
        return {
            wins: Number(stats?.wins ?? 0),
            losses: Number(stats?.losses ?? 0),
            kills: Number(stats?.kills ?? 0),
            tasksCompleted: Number(stats?.tasks_completed ?? 0),
        };
    } catch {
        return null;
    }
  }

  // ============ MAIN LOOP ============

  async playGame(gameObjectId?: string): Promise<void> {
    if (gameObjectId) {
        this.currentGameObjectId = gameObjectId;
        this.submitter.setGame(gameObjectId);
    }
    
    if (!this.currentGameObjectId) {
      throw new Error('No game ID provided');
    }

    this.logger.info('Starting agent play loop...');

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
          this.logger.info('Game ended!');
          break;
        }

        await this.handlePhase(gameState);

        await this.sleep(3000);
      } catch (error) {
        this.logger.error(`Error in loop: ${error instanceof Error ? error.message : String(error)}`);
        await this.sleep(5000);
      }
    }
  }

  private broadcastPhaseChange(gameState: GameState): void {
    if (this.wsClient && this.currentGameObjectId) {
      this.wsClient.sendPhaseChange(
        this.currentGameObjectId,
        gameState.phase,
        Number(gameState.round),
        Date.now() + 30000 
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

      case GamePhase.Voting:
        await this.handleActionCommit(gameState); 
        break;

      case GamePhase.VoteResult:
        await this.handleActionReveal(gameState); 
        break;

      default:
        this.logger.debug(`Idle in phase: ${GamePhase[gameState.phase]}`);
    }
  }

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

    this.logger.info(`Decided action: ${JSON.stringify(action)}`);

    this.pendingCommitment = await this.submitter.createActionCommitment(action);
    await this.submitter.commitAction(this.currentGameObjectId!, this.pendingCommitment);
    this.logger.info('Action committed');
  }

  private async handleActionReveal(gameState: GameState): Promise<void> {
    const hasRevealed = await this.observer.hasRevealed(this.currentGameObjectId!, this.address);
    if (hasRevealed) return;

    if (!this.pendingCommitment) {
      this.logger.error('No pending commitment to reveal');
      return;
    }

    await this.submitter.revealAction(this.currentGameObjectId!, this.pendingCommitment);
    this.logger.info('Action revealed');

    const location = await this.observer.getPlayerLocation(this.currentGameObjectId!, this.address);
    this.memory.setMyLocation(location);

    if (this.wsClient) {
      const action = this.pendingCommitment.action;
      this.wsClient.sendActionResult(this.currentGameObjectId!, action, Number(gameState.round));
    }

    this.pendingCommitment = null;
  }

  private async initializeRoleAndStrategy(): Promise<void> {
    const role = await this.observer.getPlayerRole(this.currentGameObjectId!, this.address);
    this.myRole = role;

    if (this.myRole === Role.Impostor) {
      this.strategy = new ImpostorStrategy(this.impostorStyle);
      this.logger.info('Role assigned: IMPOSTOR');
    } else {
      this.strategy = new CrewmateStrategy(this.crewmateStyle);
      this.logger.info('Role assigned: CREWMATE');
    }
  }

  private async buildStrategyContext(gameState: GameState): Promise<StrategyContext> {
    const allPlayerAddresses = await this.observer.getAllPlayers(this.currentGameObjectId!);
    const allPlayers: Player[] = [];
    const alivePlayers: Player[] = [];

    for (const addr of allPlayerAddresses) {
      const location = await this.observer.getPlayerLocation(this.currentGameObjectId!, addr);
      const isAlive = await this.observer.isAlive(this.currentGameObjectId!, addr);
      
      const player: Player = {
        address: addr,
        colorId: 0, 
        role: addr === this.address ? this.myRole : Role.None,
        location,
        isAlive,
        tasksCompleted: 0,
        totalTasks: GAME_CONFIG.TASKS_REQUIRED,
        hasVoted: false,
      };
      
      allPlayers.push(player);
      if (isAlive) alivePlayers.push(player);
    }

    return {
      gameState,
      myPlayer: allPlayers.find(p => p.address === this.address)!,
      allPlayers,
      alivePlayers,
      deadBodies: [], 
      messages: [],    
      memory: this.memory,
      observer: this.observer,
    };
  }

  getRole(): Role {
    return this.myRole;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
