/**
 * ServerAgent — wraps a strategy + memory + mock WebSocket.
 *
 * The server treats this like a regular connected client. Messages from the
 * server arrive via MockWebSocket.send(), get parsed, update memory, and
 * trigger strategy decisions that are sent back as client messages.
 */

import { MockWebSocket } from "./MockWebSocket.js";
import { GameMemory } from "./strategies/GameMemory.js";
import { CrewmateStrategy } from "./strategies/CrewmateStrategy.js";
import { ImpostorStrategy } from "./strategies/ImpostorStrategy.js";
import { ActionType } from "./strategies/BaseStrategy.js";
import type {
  ServerAgentConfig,
  AgentStrategyContext,
  CrewmateStyle,
  ImpostorStyle,
} from "./types.js";
import { createLogger } from "../logger.js";
import { getAgentPersona, type AgentPersona } from "./AgentPersonas.js";

const logger = createLogger("server-agent");

// Delay range for human-like behavior (ms)
const MIN_DELAY = 1000;
const MAX_DELAY = 3000;

function randomDelay(): number {
  return MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
}

export class ServerAgent {
  readonly name: string;
  readonly address: string;
  readonly mockWs: MockWebSocket;
  readonly crewmateStyle: CrewmateStyle;
  readonly impostorStyle: ImpostorStyle;
  readonly persona: AgentPersona;

  private memory: GameMemory;
  private crewmateStrategy: CrewmateStrategy;
  private impostorStrategy: ImpostorStrategy;

  private role: "crewmate" | "impostor" | "none" = "none";
  private impostors: string[] = [];
  private roomId: string | null = null;
  private myLocation: number = 0;
  private isAlive: boolean = true;
  private round: number = 0;
  private phase: number = 0;
  private tasksCompleted: number = 0;
  private totalTasks: number = 10;
  private taskLocations: number[] = [];

  // Track other players as seen in game state updates
  private players: AgentStrategyContext["alivePlayers"] = [];
  private deadBodies: AgentStrategyContext["deadBodies"] = [];

  // Reference to the send-to-server function
  private sendToServer: ((msg: any) => void) | null = null;

  // Pending timers for cleanup
  private pendingTimers: NodeJS.Timeout[] = [];

  constructor(config: ServerAgentConfig) {
    this.name = config.name;
    this.address = config.address;
    this.crewmateStyle = config.crewmateStyle;
    this.impostorStyle = config.impostorStyle;
    this.persona = getAgentPersona(config.crewmateStyle, config.impostorStyle);

    this.memory = new GameMemory();
    this.crewmateStrategy = new CrewmateStrategy(config.crewmateStyle, this.memory);
    this.impostorStrategy = new ImpostorStrategy(config.impostorStyle, this.memory);

    // Create mock WebSocket that routes server messages to us
    this.mockWs = new MockWebSocket((data: string) => {
      this.onServerMessage(data);
    });
  }

  /**
   * Set the function used to send messages back to the server.
   * This is the equivalent of ws.send() from a real client, but instead
   * we directly call handleMessage on the server.
   */
  setSendToServer(fn: (msg: any) => void): void {
    this.sendToServer = fn;
  }

  setRoom(roomId: string): void {
    this.roomId = roomId;
  }

  getRoom(): string | null {
    return this.roomId;
  }

  isActive(): boolean {
    return this.isAlive && this.roomId !== null;
  }

  // ============ HANDLE SERVER MESSAGES ============

  private onServerMessage(data: string): void {
    try {
      const msg = JSON.parse(data);
      this.processServerMessage(msg);
    } catch (err) {
      logger.error(`[${this.name}] Failed to parse server message: ${err}`);
    }
  }

  private processServerMessage(msg: any): void {
    switch (msg.type) {
      case "server:role_assigned":
        this.handleRoleAssigned(msg);
        break;

      case "server:tasks_assigned":
        this.taskLocations = msg.taskLocations || [];
        logger.info(`[${this.name}] Tasks assigned: ${this.taskLocations.length} locations`);
        break;

      case "server:phase_changed":
        this.handlePhaseChanged(msg);
        break;

      case "server:game_state":
        this.handleGameState(msg);
        break;

      case "server:player_moved":
        this.handlePlayerMoved(msg);
        break;

      case "server:kill_occurred":
        this.handleKillOccurred(msg);
        break;

      case "server:body_reported":
      case "server:meeting_called":
        // Discussion phase — we'll act when phase changes to voting
        break;

      case "server:player_ejected":
        this.handlePlayerEjected(msg);
        break;

      case "server:game_ended":
        this.handleGameEnded();
        break;

      case "server:lobby_locked":
        // Lobby locked, game is fully in progress
        break;

      default:
        // Ignore other messages (welcome, room_update, etc.)
        break;
    }
  }

  private handleRoleAssigned(msg: any): void {
    this.role = msg.role;
    this.impostors = msg.impostors || [];
    logger.info(`[${this.name}] Role assigned: ${this.role}`);

    // Robustness: If we're already in phase 2, start move loop now
    if (this.phase === 2 && this.isAlive && this.pendingTimers.length === 0) {
      logger.debug(`[${this.name}] Detected phase 2 during role assignment, starting action loop`);
      this.scheduleAction();
    }
  }

  private handlePhaseChanged(msg: any): void {
    const previousPhase = this.phase;
    this.phase = msg.phase;
    this.round = msg.round;
    logger.debug(`[${this.name}] Phase changed: ${previousPhase} -> ${this.phase}, role=${this.role}, alive=${this.isAlive}, timers=${this.pendingTimers.length}`);

    // Clear any pending action timers when leaving action phase (2)
    if (previousPhase === 2 && msg.phase !== 2) {
      this.clearTimers();
    }

    // ActionCommit phase (2) — make a move
    if (msg.phase === 2) {
      logger.debug(`[${this.name}] Phase 2 detected — starting action loop! role=${this.role}`);
      this.scheduleAction();
    }

    // Voting phase (5) — cast a vote
    if (msg.phase === 5) {
      this.scheduleVote();
    }
  }

  private handleGameState(msg: any): void {
    const state = msg.state;
    if (!state) return;

    const previousPhase = this.phase;
    this.round = state.round;
    this.phase = state.phase;

    // Update players list
    this.players = (state.players || []).map((p: any) => ({
      address: p.address,
      location: p.location,
      isAlive: p.isAlive,
      colorId: p.colorId,
      tasksCompleted: p.tasksCompleted,
    }));

    this.deadBodies = state.deadBodies || [];

    // Update our own state
    const me = this.players.find((p) => p.address === this.address);
    if (me) {
      this.myLocation = me.location;
      this.isAlive = me.isAlive;
      this.tasksCompleted = me.tasksCompleted;
    }

    this.memory.setCurrentRound(this.round);
    this.memory.setMyLocation(this.myLocation);

    // FIXED: Detect phase transitions via game_state updates
    // This catches transitions that might be missed by phase_changed events
    if (previousPhase !== this.phase) {
      // Entering ActionCommit phase (2) — start acting if we have a role
      if (this.phase === 2 && this.role !== "none" && this.pendingTimers.length === 0) {
        logger.debug(`[${this.name}] Detected phase transition to ActionCommit via game_state (${previousPhase}->${this.phase}), scheduling action`);
        this.scheduleAction();
      }
      // Entering Voting phase (5) — cast a vote
      if (this.phase === 5 && this.role !== "none" && this.pendingTimers.length === 0) {
        logger.debug(`[${this.name}] Detected phase transition to Voting via game_state, scheduling vote`);
        this.scheduleVote();
      }
    } else if (this.phase === 2 && this.role !== "none" && this.isAlive && this.pendingTimers.length === 0) {
      // SAFETY: If we're in phase 2 with a role but have no pending timers,
      // it means we got stuck. Restart the action loop.
      logger.debug(`[${this.name}] Phase 2 with no pending actions, restarting action loop`);
      this.scheduleAction();
    }
  }

  private handlePlayerMoved(msg: any): void {
    this.memory.recordMovement(msg.address, msg.from, msg.to, msg.round);

    // Update local player list
    const player = this.players.find((p) => p.address === msg.address);
    if (player) {
      player.location = msg.to;
    }

    // Update own location if this is our move being confirmed
    if (msg.address === this.address) {
      logger.debug(`[${this.name}] Server confirmed my move: ${this.myLocation} -> ${msg.to}`);
      this.myLocation = msg.to;
      this.memory.setMyLocation(this.myLocation);
    }
  }

  private handleKillOccurred(msg: any): void {
    const playersAtLocation = this.players
      .filter((p) => p.location === msg.location)
      .map((p) => p.address);

    this.memory.recordKill(msg.victim, msg.location, msg.round, playersAtLocation);

    // Mark victim as dead in our list
    const victim = this.players.find((p) => p.address === msg.victim);
    if (victim) victim.isAlive = false;

    // Add to dead bodies
    this.deadBodies.push({
      victim: msg.victim,
      location: msg.location,
      round: msg.round,
      reported: false,
    });
  }

  private handlePlayerEjected(msg: any): void {
    const ejected = this.players.find((p) => p.address === msg.ejected);
    if (ejected) ejected.isAlive = false;
  }

  private handleGameEnded(): void {
    this.roomId = null;
    this.role = "none";
    this.clearTimers();
    logger.info(`[${this.name}] Game ended`);
  }

  // ============ ACTION SCHEDULING ============

  private buildContext(): AgentStrategyContext {
    return {
      myAddress: this.address,
      myLocation: this.myLocation,
      isAlive: this.isAlive,
      role: this.role,
      round: this.round,
      phase: this.phase,
      alivePlayers: this.players.filter((p) => p.isAlive),
      deadBodies: this.deadBodies,
      impostors: this.role === "impostor" ? this.impostors : undefined,
      taskLocations: this.taskLocations,
      tasksCompleted: this.tasksCompleted,
      totalTasks: this.totalTasks,
    };
  }

  private scheduleAction(): void {
    if (!this.isAlive || !this.roomId) return;

    const timer = setTimeout(() => {
      this.executeAction();
    }, randomDelay());
    this.pendingTimers.push(timer);
  }

  private executeAction(): void {
    if (!this.isAlive || !this.roomId || !this.sendToServer) return;
    // Phase guard: only act during action phase (2)
    if (this.phase !== 2) return;

    const context = this.buildContext();
    const strategy = this.role === "impostor" ? this.impostorStrategy : this.crewmateStrategy;
    const action = strategy.decideAction(context);

    logger.debug(`[${this.name}] Action: type=${action.type} role=${this.role} phase=${this.phase} loc=${this.myLocation}`);

    // Translate action to server messages
    switch (action.type) {
      case ActionType.Move:
        if (action.destination !== undefined) {
          // Don't update myLocation here — wait for server confirmation via server:player_moved
          this.sendToServer({
            type: "agent:position_update",
            gameId: this.roomId,
            location: action.destination,
            round: this.round,
          });
        }
        break;

      case ActionType.DoTask:
        this.tasksCompleted++;
        this.memory.recordTaskCompletion(this.address);
        this.sendToServer({
          type: "agent:task_complete",
          gameId: this.roomId,
          player: this.address,
          tasksCompleted: this.tasksCompleted,
          totalTasks: this.totalTasks,
        });
        break;

      case ActionType.FakeTask:
        // Fake tasks don't send anything to the server
        // Just waste time to look like we're doing a task
        break;

      case ActionType.Kill:
        if (action.target) {
          this.sendToServer({
            type: "agent:kill",
            gameId: this.roomId,
            killer: this.address,
            victim: action.target,
            location: this.myLocation,
            round: this.round,
          });
        }
        break;

      case ActionType.Report:
        this.memory.recordReport(this.address, this.round);
        this.sendToServer({
          type: "agent:report_body",
          gameId: this.roomId,
          reporter: this.address,
          bodyLocation: this.myLocation,
          round: this.round,
        });
        break;

      case ActionType.CallMeeting:
        this.sendToServer({
          type: "agent:call_meeting",
          gameId: this.roomId,
        });
        break;

      case ActionType.Sabotage:
        if (action.sabotage !== undefined) {
          this.sendToServer({
            type: "agent:sabotage",
            gameId: this.roomId,
            sabotageType: action.sabotage,
          });
        }
        break;

      case ActionType.Skip:
      case ActionType.None:
        // Do nothing
        break;
    }

    // Schedule another action after a delay (continuous play during action phase)
    if (this.phase === 2 && this.isAlive) {
      const timer = setTimeout(() => {
        this.executeAction();
      }, randomDelay() + 1000);
      this.pendingTimers.push(timer);
    }
  }

  private scheduleVote(): void {
    if (!this.isAlive || !this.roomId) return;

    const timer = setTimeout(() => {
      this.executeVote();
    }, randomDelay());
    this.pendingTimers.push(timer);
  }

  private executeVote(): void {
    if (!this.isAlive || !this.roomId || !this.sendToServer) return;

    const context = this.buildContext();
    const strategy = this.role === "impostor" ? this.impostorStrategy : this.crewmateStrategy;
    const voteTarget = strategy.decideVote(context);

    logger.debug(`[${this.name}] Vote decided: ${voteTarget || "skip"}`);

    this.sendToServer({
      type: "agent:vote",
      gameId: this.roomId,
      voter: this.address,
      target: voteTarget,
      round: this.round,
    });
  }

  // ============ CLEANUP ============

  clearTimers(): void {
    for (const timer of this.pendingTimers) {
      clearTimeout(timer);
    }
    this.pendingTimers = [];
  }

  destroy(): void {
    this.clearTimers();
    this.memory.reset();
    this.roomId = null;
    this.sendToServer = null;
  }
}
