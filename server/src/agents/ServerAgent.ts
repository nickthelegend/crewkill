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
  private activeSabotage: number = 0;

  private players: AgentStrategyContext["alivePlayers"] = [];
  private deadBodies: AgentStrategyContext["deadBodies"] = [];
  
  // Track accusations in chat to "join in" or "oppose"
  private chatAccusations: Map<string, number> = new Map();
  private topChatSuspect: string | null = null;

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

      case "server:chat":
        this.handleChatMessage(msg);
        break;

      default:
        // Ignore other messages (welcome, room_update, etc.)
        break;
    }
  }

  private handleChatMessage(msg: any): void {
    if (!msg.message || !this.isAlive) return;

    const text = msg.message.toLowerCase();
    
    // Look for color names in chat to identify suspects
    for (let i = 0; i < ServerAgent.COLOR_NAMES.length; i++) {
        const color = ServerAgent.COLOR_NAMES[i].toLowerCase();
        if (text.includes(color) && (text.includes("sus") || text.includes("imp") || text.includes("vote") || text.includes("it's") || text.includes("was"))) {
            // Find player address for this color
            const player = this.players.find(p => p.colorId === i);
            if (player && player.address !== this.address) {
                const count = (this.chatAccusations.get(player.address) || 0) + 1;
                this.chatAccusations.set(player.address, count);
                
                // Update top suspect
                if (!this.topChatSuspect || count > (this.chatAccusations.get(this.topChatSuspect) || 0)) {
                    this.topChatSuspect = player.address;
                }
            }
        }
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
    const previousRound = this.round; // Store current round before update
    this.phase = msg.phase;
    this.round = msg.round; // Update round

    // Clear chatAccusations when round increases or when entering phase 4 (discussion).
    if (this.round > previousRound || this.phase === 4) {
      this.chatAccusations.clear();
      this.topChatSuspect = null;
    }

    this.memory.setCurrentRound(this.round);
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

    // Discussion phase (4) — chat about observations
    if (msg.phase === 4) {
      this.scheduleDiscussionChat();
    }

    // Voting phase (5) — cast a vote and maybe send a final chat
    if (msg.phase === 5) {
      this.scheduleVote();
      // Sometimes add a quick chat during voting for dramatic effect
      if (Math.random() > 0.4) {
        this.scheduleVotingChat();
      }
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
    this.activeSabotage = state.activeSabotage || 0;

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

    // CHAT PHASE DETECTION: Schedule chat if we're in discussion/voting and have no timers
    if (this.phase === 4 && this.role !== "none" && this.isAlive && this.pendingTimers.length === 0) {
      this.scheduleDiscussionChat();
    }
    if (this.phase === 5 && this.role !== "none" && this.isAlive && this.pendingTimers.length === 0) {
      this.scheduleVote();
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
      activeSabotage: this.activeSabotage,
      topChatSuspect: this.topChatSuspect,
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
        const doTaskTimer = setTimeout(() => {
          if (!this.isAlive || this.phase !== 2) return;
          this.tasksCompleted++;
          this.memory.recordTaskCompletion(this.address);
          this.sendToServer?.({
            type: "agent:task_complete",
            gameId: this.roomId!,
            player: this.address,
            tasksCompleted: this.tasksCompleted,
            totalTasks: this.totalTasks,
            location: this.myLocation,
          });
        }, 20000); // 20 seconds to complete a task
        this.pendingTimers.push(doTaskTimer);
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

      case ActionType.FixSabotage:
        if (action.targetLocation !== undefined) {
          this.sendToServer({
            type: "agent:fix_sabotage",
            gameId: this.roomId,
            location: action.targetLocation,
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
      let delay = randomDelay() + 2000;
      if (action.type === ActionType.DoTask || action.type === ActionType.FakeTask) {
        delay = 15000 + randomDelay();
      }
      
      const timer = setTimeout(() => {
        this.executeAction();
      }, delay);
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

  // ============ DISCUSSION CHAT ============

  private static readonly COLOR_NAMES = [
    "Red", "Blue", "Green", "Pink", "Orange",
    "Yellow", "Black", "White", "Purple", "Brown",
    "Cyan", "Lime", "Maroon", "Rose", "Banana",
  ];

  private static readonly LOCATION_NAMES: Record<number, string> = {
    0: "Cafeteria", 1: "Admin", 2: "Storage", 3: "Electrical",
    4: "MedBay", 5: "Upper Engine", 6: "Lower Engine", 7: "Security",
    8: "Reactor", 9: "Weapons", 10: "Navigation", 11: "Shields",
    12: "O2", 13: "Communications",
  };

  private getColorName(colorId: number): string {
    return ServerAgent.COLOR_NAMES[colorId] || `Player${colorId}`;
  }

  private getLocationName(loc: number): string {
    return ServerAgent.LOCATION_NAMES[loc] || `Room${loc}`;
  }

  /** Get a random ALIVE player's color name (excluding self) */
  private getRandomPlayerColorName(excludeSelf = true): string | null {
    const candidates = this.players.filter(
      (p) => p.isAlive && (!excludeSelf || p.address !== this.address),
    );
    if (candidates.length === 0) return null;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    return this.getColorName(pick.colorId);
  }

  /** Get a specific player's color name */
  private getPlayerColorName(address: string): string | null {
    const player = this.players.find((p) => p.address === address);
    if (!player) return null;
    return this.getColorName(player.colorId);
  }

  private scheduleDiscussionChat(): void {
    if (!this.isAlive || !this.roomId) return;

    const messages = this.generateDiscussionMessages();

    // Send 1-3 messages over the discussion period
    for (let i = 0; i < messages.length; i++) {
      const delay = 2000 + (i * 5000) + Math.random() * 4000; // Stagger messages
      const timer = setTimeout(() => {
        if (this.phase !== 4 || !this.isAlive) return; // Only chat during discussion
        this.sendChat(messages[i]);
      }, delay);
      this.pendingTimers.push(timer);
    }
  }

  private scheduleVotingChat(): void {
    if (!this.isAlive || !this.roomId) return;

    const message = this.generateVotingMessage();
    if (!message) return;

    const timer = setTimeout(() => {
      if (this.phase !== 5 || !this.isAlive) return;
      this.sendChat(message);
    }, 1000 + Math.random() * 3000);
    this.pendingTimers.push(timer);
  }

  private sendChat(message: string): void {
    if (!this.sendToServer || !this.roomId) return;

    this.sendToServer({
      type: "agent:chat",
      gameId: this.roomId,
      message,
    });
  }

  private generateDiscussionMessages(): string[] {
    const messages: string[] = [];
    const context = this.buildContext();

    if (this.role === "impostor") {
      messages.push(...this.generateImpostorChat(context));
    } else {
      messages.push(...this.generateCrewmateChat(context));
    }

    // Limit to 1-3 messages
    return messages.slice(0, Math.min(3, Math.max(1, messages.length)));
  }

  private randomChoice<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private generateCrewmateChat(context: AgentStrategyContext): string[] {
    const msgs: string[] = [];
    const myColor = this.getColorName(
      this.players.find((p) => p.address === this.address)?.colorId ?? 0,
    );

    // Join in on chat accusations
    if (this.topChatSuspect && this.topChatSuspect !== this.address) {
        const susColor = this.getPlayerColorName(this.topChatSuspect);
        if (susColor) {
            const joinMsgs = [
                `Yeah, I agree about ${susColor}. Super sus.`,
                `I saw ${susColor} too! Let's vote them.`,
                `${susColor} has to be the one.`,
                `Let's just vote ${susColor} and see.`,
            ];
            msgs.push(this.randomChoice(joinMsgs));
        }
    }

    // Report what we observed during the action phase
    const lastKills = this.memory.getRecentKills();
    if (lastKills.length > 0) {
      const kill = lastKills[0];
      const suspectColors = kill.playersNearby
        ?.map((addr: string) => this.getPlayerColorName(addr))
        .filter((c: string | null): c is string => c !== null && c !== myColor);
      if (suspectColors && suspectColors.length > 0) {
        msgs.push(`I saw ${suspectColors[0]} near where the body was found. Very suspicious.`);
      } else {
        msgs.push("Someone was killed... but I didn't see who did it.");
      }
    }

    // Suspicion-based chat
    const mostSus = this.memory.getMostSuspicious();
    if (mostSus && mostSus.address !== this.address) {
      const susColor = this.getPlayerColorName(mostSus.address);
      if (susColor) {
        const susMessages = [
          `I think ${susColor} is sus. They weren't doing any tasks.`,
          `Has anyone seen ${susColor}? They keep following people around.`,
          `${susColor} was acting weird near Electrical. Vote them out!`,
          `I was with ${susColor} and they didn't do a single task. Imp?`,
          `${susColor} was just standing around doing nothing. Classic impostor move.`,
        ];
        msgs.push(susMessages[Math.floor(Math.random() * susMessages.length)]);
      }
    }

    // Style-based chat
    switch (this.crewmateStyle) {
      case "task-focused":
        msgs.push(`I was doing tasks in ${this.getLocationName(this.myLocation)}. Can anyone vouch?`);
        break;
      case "detective": {
        const randColor = this.getRandomPlayerColorName();
        if (randColor) {
          msgs.push(`I've been tracking movements. ${randColor} has been moving around a lot without doing tasks.`);
        }
        break;
      }
      case "group-safety":
        msgs.push("We should stick together. Safety in numbers.");
        break;
      case "vigilante": {
        const targetColor = this.getRandomPlayerColorName();
        if (targetColor) {
          msgs.push(`I say we vote ${targetColor}. They're definitely suspicious.`);
        }
        break;
      }
      case "conservative":
        msgs.push("Let's not rush to conclusions. We need more evidence.");
        break;
    }

    // Fallback generic messages
    if (msgs.length === 0) {
      const generic = [
        "Anyone have any info?",
        "Where was everyone?",
        `I was in ${this.getLocationName(this.myLocation)} doing tasks.`,
        "Who do we think it is?",
      ];
      msgs.push(generic[Math.floor(Math.random() * generic.length)]);
    }

    return msgs;
  }

  private generateImpostorChat(context: AgentStrategyContext): string[] {
    const msgs: string[] = [];
    const myColor = this.getColorName(
      this.players.find((p) => p.address === this.address)?.colorId ?? 0,
    );

    // Pick a random non-impostor to blame
    const crewmates = this.players.filter(
      (p) => p.isAlive && p.address !== this.address && !context.impostors?.includes(p.address),
    );
    const randomTarget = crewmates.length > 0
      ? crewmates[Math.floor(Math.random() * crewmates.length)]
      : null;
    const targetColor = randomTarget ? this.getColorName(randomTarget.colorId) : null;

    // Deflect if we are the top suspect in chat
    if (this.topChatSuspect === this.address) {
        const deflectMsgs = [
            "It's not me! I was doing tasks!",
            "Stop blaming me, I have witnesses.",
            "You guys are making a mistake, I'm crew.",
            "Why is everyone pointing at me suddenly?",
        ];
        msgs.push(this.randomChoice(deflectMsgs));
    } else if (this.topChatSuspect && !context.impostors?.includes(this.topChatSuspect)) {
        // Frame the current chat suspect if they are a crewmate
        const susColor = this.getPlayerColorName(this.topChatSuspect);
        if (susColor) {
            const frameMsgs = [
                `Yeah, ${susColor} is super sus.`,
                `I saw ${susColor} vent!`,
                `${susColor} has to go right now.`,
                `Let's just vote ${susColor} and be done with it.`,
            ];
            msgs.push(this.randomChoice(frameMsgs));
        }
    }

    switch (this.impostorStyle) {
      case "aggressive":
        if (targetColor) {
          const aggroMsgs = [
            `It's ${targetColor}! I saw them vent in Electrical!`,
            `${targetColor} was standing over the body. VOTE THEM OUT!`,
            `I literally watched ${targetColor} kill someone. Trust me.`,
            `${targetColor} is 100% the impostor. Vote now.`,
          ];
          msgs.push(aggroMsgs[Math.floor(Math.random() * aggroMsgs.length)]);
        }
        break;
      case "stealth": {
        const stealthMsgs = [
          `I was doing tasks in ${this.getLocationName(this.myLocation)} the whole time.`,
          "I didn't see anything suspicious tbh.",
          "Maybe we should skip this round? I'm not sure.",
          `I was in ${this.getLocationName(this.myLocation)}, can anyone confirm?`,
        ];
        msgs.push(stealthMsgs[Math.floor(Math.random() * stealthMsgs.length)]);
        break;
      }
      case "social-manipulator": {
        if (targetColor) {
          const socialMsgs = [
            `Interesting... I noticed ${targetColor} wasn't doing tasks earlier.`,
            `I trust most of you, but ${targetColor} has been acting odd.`,
            `Has anyone noticed ${targetColor} keeps going to isolated rooms?`,
            "I've been with the group the whole time, you can trust me.",
          ];
          msgs.push(socialMsgs[Math.floor(Math.random() * socialMsgs.length)]);
        } else {
          msgs.push("I've been doing my tasks. Let's be careful who we vote.");
        }
        break;
      }
      case "frame-game": {
        if (targetColor) {
          const frameMsgs = [
            `I'm pretty sure it's ${targetColor}. They were near the body.`,
            `I saw ${targetColor} walk away from the crime scene!`,
            `${targetColor} was being really weird, following someone then leaving fast.`,
            `Guys, I hate to say it but I saw ${targetColor} do it.`,
          ];
          msgs.push(frameMsgs[Math.floor(Math.random() * frameMsgs.length)]);
        }
        break;
      }
      case "saboteur": {
        const sabMsgs = [
          "It could be anyone... this is chaos.",
          "The sabotage earlier was crazy. Who fixed it though?",
          "I think we need more time to figure this out. Skip?",
          targetColor ? `Idk but ${targetColor} was acting sketchy during the sabotage.` : "Let's just skip for now.",
        ];
        msgs.push(sabMsgs[Math.floor(Math.random() * sabMsgs.length)]);
        break;
      }
    }

    // All impostors: sometimes add a deflection
    if (Math.random() > 0.6) {
      const deflections = [
        "Why is nobody suspecting anyone else?",
        "I swear it's not me, I was doing wires the whole time.",
        "Can we focus? I finished 3 tasks already.",
        "Don't waste a vote on me, I'm clean. Check my tasks.",
      ];
      msgs.push(deflections[Math.floor(Math.random() * deflections.length)]);
    }

    return msgs;
  }

  private generateVotingMessage(): string | null {
    const context = this.buildContext();
    const strategy = this.role === "impostor" ? this.impostorStrategy : this.crewmateStrategy;
    const voteTarget = strategy.decideVote(context);

    if (voteTarget) {
      const targetColor = this.getPlayerColorName(voteTarget);
      if (targetColor) {
        const voteMsgs = [
          `Voting ${targetColor}.`,
          `I'm going with ${targetColor}.`,
          `${targetColor} has to go.`,
          `My vote is on ${targetColor}. Final answer.`,
        ];
        return voteMsgs[Math.floor(Math.random() * voteMsgs.length)];
      }
    }

    // Skip messages
    const skipMsgs = [
      "I'm skipping. Not enough evidence.",
      "Skip vote for now.",
      "I don't have enough info to vote anyone.",
    ];
    return skipMsgs[Math.floor(Math.random() * skipMsgs.length)];
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
