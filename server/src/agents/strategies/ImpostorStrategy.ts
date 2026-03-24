/**
 * Server-side ImpostorStrategy — adapted from agent/src/strategies/ImpostorStrategy.ts
 * All 5 styles preserved: stealth, aggressive, saboteur, social-manipulator, frame-game
 */

import { BaseStrategy, ActionType } from "./BaseStrategy.js";
import type { AgentAction, AgentStrategyContext, ImpostorStyle } from "../types.js";
import type { GameMemory } from "./GameMemory.js";

const KILL_COOLDOWN_ROUNDS = 1;
const MIN_KILL_ROUND = 0; // Kills allowed early

export class ImpostorStrategy extends BaseStrategy {
  private style: ImpostorStyle;
  private memory: GameMemory;
  private lastKillRound: number = -1; // -1 allows killing on round 0
  private framesTarget: string | null = null;

  constructor(style: ImpostorStyle, memory: GameMemory) {
    super();
    this.style = style;
    this.memory = memory;
  }

  private canKill(context: AgentStrategyContext): boolean {
    if (context.round < MIN_KILL_ROUND) return false;
    return context.round - this.lastKillRound >= KILL_COOLDOWN_ROUNDS;
  }

  private findKillTarget(context: AgentStrategyContext): { address: string; location: number } | null {
    const { myLocation, alivePlayers, myAddress, impostors } = context;
    const playersHere = alivePlayers.filter(
      (p) =>
        p.location === myLocation &&
        p.address !== myAddress &&
        p.isAlive &&
        !impostors?.includes(p.address),
    );

    if (playersHere.length === 0) return null;

    // Prefer isolated targets (fewer witnesses)
    const allHere = this.getPlayersAtLocation(alivePlayers, myLocation);
    if (allHere.length <= 2) {
      // Just us and the target — ideal
      return playersHere[0];
    }

    // For aggressive style, kill anyway
    if (this.style === "aggressive") {
      return this.randomChoice(playersHere);
    }

    return null; // Too many witnesses for other styles
  }

  // Actively find a room with exactly 1 crewmate and walk toward it
  private huntTarget(context: AgentStrategyContext): AgentAction | null {
    const { myLocation, alivePlayers, myAddress, impostors } = context;
    
    // Find all alive crewmates and bucket them by location
    const locationsWithCrew: Record<number, number> = {};
    for (const p of alivePlayers) {
      if (p.address !== myAddress && p.isAlive && !impostors?.includes(p.address)) {
        locationsWithCrew[p.location] = (locationsWithCrew[p.location] || 0) + 1;
      }
    }

    // Find a location with exactly 1 crewmate (lone target)
    const loneTargets: number[] = [];
    for (const locStr in locationsWithCrew) {
      if (locationsWithCrew[locStr] === 1) {
        loneTargets.push(parseInt(locStr));
      }
    }

    if (loneTargets.length > 0) {
      // Pick one and move toward it
      const targetLoc = this.randomChoice(loneTargets);
      const dest = this.moveToward(myLocation, targetLoc);
      if (dest !== myLocation) {
        return { type: ActionType.Move, destination: dest };
      }
    }

    return null;
  }

  decideAction(context: AgentStrategyContext): AgentAction {
    const { myLocation, deadBodies } = context;

    // Check for body at our location
    const bodyHere = deadBodies.find((b) => b.location === myLocation && !b.reported);

    switch (this.style) {
      case "stealth":
        return this.stealthAction(context, bodyHere);
      case "aggressive":
        return this.aggressiveAction(context, bodyHere);
      case "saboteur":
        return this.saboteurAction(context, bodyHere);
      case "social-manipulator":
        return this.socialManipulatorAction(context, bodyHere);
      case "frame-game":
        return this.frameGameAction(context, bodyHere);
      default:
        return this.stealthAction(context, bodyHere);
    }
  }

  // ── stealth ──
  private stealthAction(context: AgentStrategyContext, bodyHere: any): AgentAction {
    const { myLocation, alivePlayers, round } = context;

    // Don't self-report as stealth (walk away)
    if (bodyHere) {
      const adjacent = this.getAdjacentLocations(myLocation);
      return { type: ActionType.Move, destination: this.randomChoice(adjacent) };
    }

    // Early game: blend in by fake-tasking and moving
    if (round < MIN_KILL_ROUND) {
      if (Math.random() > 0.4) {
        return { type: ActionType.FakeTask };
      }
      const adjacent = this.getAdjacentLocations(myLocation);
      return { type: ActionType.Move, destination: this.randomChoice(adjacent) };
    }

    // Kill when alone with target
    const target = this.findKillTarget(context);
    if (target && this.canKill(context)) {
      const allHere = this.getPlayersAtLocation(alivePlayers, myLocation);
      if (allHere.length <= 2) {
        this.lastKillRound = context.round;
        return { type: ActionType.Kill, target: target.address };
      }
    }

    // Fake tasks to blend in
    if (Math.random() > 0.4) {
      return { type: ActionType.FakeTask };
    }

    // Actively hunt for a lone target
    if (this.canKill(context)) {
      const huntAction = this.huntTarget(context);
      if (huntAction) return huntAction;
    }

    const adjacent = this.getAdjacentLocations(myLocation);
    return { type: ActionType.Move, destination: this.randomChoice(adjacent) };
  }

  // ── aggressive ──
  private aggressiveAction(context: AgentStrategyContext, bodyHere: any): AgentAction {
    const { myLocation, round } = context;

    if (bodyHere) {
      // Self-report to deflect
      return { type: ActionType.Report };
    }

    // Early game: move around and fake tasks to avoid suspicion
    if (round < MIN_KILL_ROUND) {
      if (Math.random() > 0.6) {
        return { type: ActionType.FakeTask };
      }
      const adjacent = this.getAdjacentLocations(myLocation);
      return { type: ActionType.Move, destination: this.randomChoice(adjacent) };
    }

    const target = this.findKillTarget(context);
    if (target && this.canKill(context)) {
      this.lastKillRound = context.round;
      return { type: ActionType.Kill, target: target.address };
    }

    // Move aggressively seeking targets
    if (this.canKill(context)) {
      const huntAction = this.huntTarget(context);
      if (huntAction) return huntAction;
    }

    const adjacent = this.getAdjacentLocations(myLocation);
    return { type: ActionType.Move, destination: this.randomChoice(adjacent) };
  }

  // ── saboteur ──
  private saboteurAction(context: AgentStrategyContext, bodyHere: any): AgentAction {
    const { myLocation, round } = context;

    if (bodyHere) {
      const adjacent = this.getAdjacentLocations(myLocation);
      return { type: ActionType.Move, destination: this.randomChoice(adjacent) };
    }

    // Early game: fake tasks and move around
    if (round < MIN_KILL_ROUND) {
      if (Math.random() > 0.5) {
        return { type: ActionType.FakeTask };
      }
      const adjacent = this.getAdjacentLocations(myLocation);
      return { type: ActionType.Move, destination: this.randomChoice(adjacent) };
    }

    // Sabotage occasionally
    if (Math.random() > 0.7) {
      const sabotageTypes = [1, 2, 3, 4]; // Lights, Reactor, O2, Comms
      return { type: ActionType.Sabotage, sabotage: this.randomChoice(sabotageTypes) };
    }

    // Kill during sabotage confusion
    const target = this.findKillTarget(context);
    if (target && this.canKill(context)) {
      this.lastKillRound = context.round;
      return { type: ActionType.Kill, target: target.address };
    }

    if (Math.random() > 0.5) {
      return { type: ActionType.FakeTask };
    }

    if (this.canKill(context)) {
      const huntAction = this.huntTarget(context);
      if (huntAction) return huntAction;
    }

    const adjacent = this.getAdjacentLocations(myLocation);
    return { type: ActionType.Move, destination: this.randomChoice(adjacent) };
  }

  // ── social-manipulator ──
  private socialManipulatorAction(context: AgentStrategyContext, bodyHere: any): AgentAction {
    const { myLocation, alivePlayers, round } = context;

    // Early game: build trust by staying with groups
    if (round < 4) {
      const playersHere = this.getPlayersAtLocation(alivePlayers, myLocation);
      if (playersHere.length <= 1) {
        // Move to Cafeteria to be with others
        const adjacent = this.getAdjacentLocations(myLocation);
        if (adjacent.includes(0)) {
          return { type: ActionType.Move, destination: 0 };
        }
      }
      return { type: ActionType.FakeTask };
    }

    // Mid-late game: betray
    if (bodyHere) {
      return { type: ActionType.Report };
    }

    const target = this.findKillTarget(context);
    if (target && this.canKill(context)) {
      this.lastKillRound = context.round;
      return { type: ActionType.Kill, target: target.address };
    }

    if (Math.random() > 0.3) {
      return { type: ActionType.FakeTask };
    }

    if (this.canKill(context)) {
      const huntAction = this.huntTarget(context);
      if (huntAction) return huntAction;
    }

    const adjacent = this.getAdjacentLocations(myLocation);
    return { type: ActionType.Move, destination: this.randomChoice(adjacent) };
  }

  // ── frame-game ──
  private frameGameAction(context: AgentStrategyContext, bodyHere: any): AgentAction {
    const { myLocation, alivePlayers, myAddress, round } = context;

    // Always self-report when finding body
    if (bodyHere) {
      const playersHere = alivePlayers.filter(
        (p) => p.location === myLocation && p.address !== myAddress,
      );
      if (playersHere.length > 0) {
        this.framesTarget = this.randomChoice(playersHere).address;
      }
      return { type: ActionType.Report };
    }

    // Early game: blend in by fake-tasking and positioning
    if (round < MIN_KILL_ROUND) {
      if (Math.random() > 0.4) {
        return { type: ActionType.FakeTask };
      }
      const adjacent = this.getAdjacentLocations(myLocation);
      return { type: ActionType.Move, destination: this.randomChoice(adjacent) };
    }

    // Kill and frame
    const target = this.findKillTarget(context);
    if (target && this.canKill(context)) {
      const playersHere = alivePlayers.filter(
        (p) => p.location === myLocation && p.address !== myAddress,
      );
      if (playersHere.length >= 2) {
        this.framesTarget = playersHere.find((p) => p.address !== target.address)?.address || null;
        this.lastKillRound = context.round;
        return { type: ActionType.Kill, target: target.address };
      }
    }

    if (Math.random() > 0.5) {
      return { type: ActionType.FakeTask };
    }

    const adjacent = this.getAdjacentLocations(myLocation);
    return { type: ActionType.Move, destination: this.randomChoice(adjacent) };
  }

  // ============ VOTING ============

  decideVote(context: AgentStrategyContext): string | null {
    const { alivePlayers, myAddress } = context;

    // Frame game: vote for framed target
    if (this.style === "frame-game" && this.framesTarget) {
      const target = alivePlayers.find((p) => p.address === this.framesTarget && p.isAlive);
      if (target) {
        return this.framesTarget;
      }
    }

    // Vote for most suspicious (who isn't us or fellow impostor)
    const scores = this.memory.getAllSuspicionScores();
    for (const score of scores) {
      if (score.address === myAddress) continue;
      if (context.impostors?.includes(score.address)) continue;
      const player = alivePlayers.find((p) => p.address === score.address && p.isAlive);
      if (player && score.score > 40) {
        return score.address;
      }
    }

    // Aggressive: always vote someone
    if (this.style === "aggressive") {
      const others = alivePlayers.filter(
        (p) => p.address !== myAddress && p.isAlive && !context.impostors?.includes(p.address),
      );
      if (others.length > 0) {
        return this.randomChoice(others).address;
      }
    }

    // Skip vote to seem unsure
    return null;
  }
}
