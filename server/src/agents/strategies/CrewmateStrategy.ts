/**
 * Server-side CrewmateStrategy — adapted from agent/src/strategies/CrewmateStrategy.ts
 * All 5 styles preserved: task-focused, detective, group-safety, vigilante, conservative
 */

import { BaseStrategy, ActionType, TaskRooms } from "./BaseStrategy.js";
import type { AgentAction, AgentStrategyContext, CrewmateStyle } from "../types.js";
import type { GameMemory } from "./GameMemory.js";

export class CrewmateStrategy extends BaseStrategy {
  private style: CrewmateStyle;
  private memory: GameMemory;

  constructor(style: CrewmateStyle, memory: GameMemory) {
    super();
    this.style = style;
    this.memory = memory;
  }

  decideAction(context: AgentStrategyContext): AgentAction {
    const { myLocation, alivePlayers, deadBodies, round } = context;

    // Universal: report bodies
    const bodyHere = deadBodies.find((b) => b.location === myLocation && !b.reported);
    if (bodyHere) {
      return { type: ActionType.Report };
    }

    switch (this.style) {
      case "task-focused":
        return this.taskFocusedAction(context);
      case "detective":
        return this.detectiveAction(context);
      case "group-safety":
        return this.groupSafetyAction(context);
      case "vigilante":
        return this.vigilanteAction(context);
      case "conservative":
        return this.conservativeAction(context);
      default:
        return this.taskFocusedAction(context);
    }
  }

  // ── task-focused ──
  private taskFocusedAction(context: AgentStrategyContext): AgentAction {
    const { myLocation, tasksCompleted, totalTasks } = context;

    // Always do task if at a task location with tasks remaining
    const nextTask = this.getNextTaskLocation(context);
    if (nextTask !== null && nextTask === myLocation) {
      return { type: ActionType.DoTask, taskId: tasksCompleted };
    }

    // Also do task if we're at any task location (even if not "next" in sequence)
    if (tasksCompleted < totalTasks && TaskRooms.includes(myLocation)) {
      return { type: ActionType.DoTask, taskId: tasksCompleted };
    }

    // Move toward the next task location
    if (nextTask !== null) {
      const dest = this.moveToward(myLocation, nextTask);
      if (dest !== myLocation) {
        return { type: ActionType.Move, destination: dest };
      }
    }

    // Fallback: move randomly to task rooms
    const adjacent = this.getAdjacentLocations(myLocation);
    const taskAdjacent = adjacent.filter((a) => TaskRooms.includes(a));
    const dest = taskAdjacent.length > 0 ? this.randomChoice(taskAdjacent) : this.randomChoice(adjacent);
    return { type: ActionType.Move, destination: dest };
  }

  // ── detective ──
  private detectiveAction(context: AgentStrategyContext): AgentAction {
    const { myLocation, alivePlayers, round } = context;

    // Patrol high-traffic areas and track suspicious movement
    const playersHere = this.getPlayersAtLocation(alivePlayers, myLocation);

    // Track suspicion on players with no tasks
    for (const p of alivePlayers) {
      if (p.address !== context.myAddress && this.memory.detectNoTaskProgress(p.address, 3)) {
        this.memory.addSuspicion(p.address, 1, 10, round, "No task progress");
      }
    }

    // Strongly prefer doing tasks while investigating (90% chance)
    const nextTask = this.getNextTaskLocation(context);
    if (nextTask !== null && nextTask === myLocation && Math.random() > 0.1) {
      return { type: ActionType.DoTask, taskId: context.tasksCompleted };
    }

    // Also do task at any task room
    if (context.tasksCompleted < context.totalTasks && TaskRooms.includes(myLocation) && Math.random() > 0.2) {
      return { type: ActionType.DoTask, taskId: context.tasksCompleted };
    }

    // Move toward next task first, then patrol
    if (nextTask !== null && nextTask !== myLocation) {
      const dest = this.moveToward(myLocation, nextTask);
      if (dest !== myLocation) {
        return { type: ActionType.Move, destination: dest };
      }
    }

    // Patrol: move to rooms with suspicious players
    const mostSus = this.memory.getMostSuspicious();
    if (mostSus && mostSus.address !== context.myAddress) {
      const susLocation = this.memory.getPlayerLastKnownLocation(mostSus.address);
      if (susLocation !== undefined && susLocation !== myLocation) {
        const dest = this.moveToward(myLocation, susLocation);
        return { type: ActionType.Move, destination: dest };
      }
    }

    // Default: move toward task rooms
    const adjacent = this.getAdjacentLocations(myLocation);
    const taskAdjacent = adjacent.filter((a) => TaskRooms.includes(a));
    return { type: ActionType.Move, destination: taskAdjacent.length > 0 ? this.randomChoice(taskAdjacent) : this.randomChoice(adjacent) };
  }

  // ── group-safety ──
  private groupSafetyAction(context: AgentStrategyContext): AgentAction {
    const { myLocation, alivePlayers } = context;

    const playersHere = this.getPlayersAtLocation(alivePlayers, myLocation);
    const othersHere = playersHere.filter((p) => p.address !== context.myAddress);

    // Always do task at task location regardless of group status
    const nextTask = this.getNextTaskLocation(context);
    if (nextTask !== null && nextTask === myLocation) {
      return { type: ActionType.DoTask, taskId: context.tasksCompleted };
    }

    // Also do task at any task room
    if (context.tasksCompleted < context.totalTasks && TaskRooms.includes(myLocation)) {
      return { type: ActionType.DoTask, taskId: context.tasksCompleted };
    }

    // Move toward next task location
    if (nextTask !== null && nextTask !== myLocation) {
      const dest = this.moveToward(myLocation, nextTask);
      if (dest !== myLocation) {
        return { type: ActionType.Move, destination: dest };
      }
    }

    // If no tasks to move to, move toward other players
    for (const p of alivePlayers) {
      if (p.address !== context.myAddress && p.isAlive) {
        const dest = this.moveToward(myLocation, p.location);
        if (dest !== myLocation) {
          return { type: ActionType.Move, destination: dest };
        }
      }
    }

    // Fallback to cafeteria (social hub)
    if (myLocation !== 0) {
      const dest = this.moveToward(myLocation, 0);
      return { type: ActionType.Move, destination: dest };
    }

    const adjacent = this.getAdjacentLocations(myLocation);
    return { type: ActionType.Move, destination: this.randomChoice(adjacent) };
  }

  // ── vigilante ──
  private vigilanteAction(context: AgentStrategyContext): AgentAction {
    const { myLocation, alivePlayers, round } = context;

    // Prioritize tasks first — always do task if at a task location
    const nextTask = this.getNextTaskLocation(context);
    if (nextTask !== null && nextTask === myLocation) {
      return { type: ActionType.DoTask, taskId: context.tasksCompleted };
    }

    // Also do task at any task room
    if (context.tasksCompleted < context.totalTasks && TaskRooms.includes(myLocation)) {
      return { type: ActionType.DoTask, taskId: context.tasksCompleted };
    }

    // Only call meetings after early rounds and with high suspicion
    const mostSus = this.memory.getMostSuspicious();
    if (round >= 4 && mostSus && mostSus.score > 60 && mostSus.address !== context.myAddress && Math.random() > 0.7) {
      return { type: ActionType.CallMeeting };
    }

    // Move toward next task
    if (nextTask !== null) {
      const dest = this.moveToward(myLocation, nextTask);
      if (dest !== myLocation) {
        return { type: ActionType.Move, destination: dest };
      }
    }

    const adjacent = this.getAdjacentLocations(myLocation);
    const taskAdjacent = adjacent.filter((a) => TaskRooms.includes(a));
    return { type: ActionType.Move, destination: taskAdjacent.length > 0 ? this.randomChoice(taskAdjacent) : this.randomChoice(adjacent) };
  }

  // ── conservative ──
  private conservativeAction(context: AgentStrategyContext): AgentAction {
    const { myLocation, alivePlayers } = context;

    const dangerousRooms = [3, 8, 7]; // Electrical, Reactor, Security
    const playersHere = this.getPlayersAtLocation(alivePlayers, myLocation);
    const othersHere = playersHere.filter((p) => p.address !== context.myAddress);

    // Always do task if at task location — even in "dangerous" rooms
    const nextTask = this.getNextTaskLocation(context);
    if (nextTask !== null && nextTask === myLocation) {
      return { type: ActionType.DoTask, taskId: context.tasksCompleted };
    }

    // Also do task at any task room
    if (context.tasksCompleted < context.totalTasks && TaskRooms.includes(myLocation)) {
      return { type: ActionType.DoTask, taskId: context.tasksCompleted };
    }

    // If alone in a dangerous room with no task, leave
    if (dangerousRooms.includes(myLocation) && othersHere.length === 0) {
      const adjacent = this.getAdjacentLocations(myLocation);
      const safe = adjacent.filter((a) => !dangerousRooms.includes(a));
      return { type: ActionType.Move, destination: safe.length > 0 ? this.randomChoice(safe) : this.randomChoice(adjacent) };
    }

    // Move to next task, prefer safe routes
    if (nextTask !== null) {
      const dest = this.moveToward(myLocation, nextTask);
      if (dest !== myLocation) {
        return { type: ActionType.Move, destination: dest };
      }
    }

    const adjacent = this.getAdjacentLocations(myLocation);
    const taskAdjacent = adjacent.filter((a) => TaskRooms.includes(a));
    if (taskAdjacent.length > 0) {
      return { type: ActionType.Move, destination: this.randomChoice(taskAdjacent) };
    }
    return { type: ActionType.Move, destination: this.randomChoice(adjacent) };
  }

  // ============ VOTING ============

  decideVote(context: AgentStrategyContext): string | null {
    const { alivePlayers, myAddress } = context;

    // Vote based on suspicion scores
    const scores = this.memory.getAllSuspicionScores();
    for (const score of scores) {
      if (score.address === myAddress) continue;
      const player = alivePlayers.find((p) => p.address === score.address && p.isAlive);
      if (player && score.score > 30) {
        return score.address;
      }
    }

    // Vigilante always votes someone
    if (this.style === "vigilante") {
      const others = alivePlayers.filter((p) => p.address !== myAddress && p.isAlive);
      if (others.length > 0) {
        return this.randomChoice(others).address;
      }
    }

    // Conservative skips when unsure
    return null;
  }
}
