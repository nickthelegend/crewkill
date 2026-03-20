/**
 * Server-side BaseStrategy — adapted from agent/src/strategies/BaseStrategy.ts
 * No viem dependency; uses plain strings and numbers.
 */

import type { AgentAction, AgentStrategyContext } from "../types.js";

// Map adjacency (mirrors agent/src/types.ts AdjacentRooms)
const AdjacentRooms: Record<number, number[]> = {
  0: [1, 4, 5],       // Cafeteria -> Admin, MedBay, UpperEngine
  1: [0, 2],           // Admin -> Cafeteria, Storage
  2: [1, 3, 6],        // Storage -> Admin, Electrical, LowerEngine
  3: [2, 6],           // Electrical -> Storage, LowerEngine
  4: [0, 5, 7],        // MedBay -> Cafeteria, UpperEngine, Security
  5: [0, 4, 8],        // UpperEngine -> Cafeteria, MedBay, Reactor
  6: [2, 3, 7],        // LowerEngine -> Storage, Electrical, Security
  7: [4, 6, 8],        // Security -> MedBay, LowerEngine, Reactor
  8: [5, 7],           // Reactor -> UpperEngine, Security
};

const VentConnections: Record<number, number | null> = {
  0: 1,    // Cafeteria <-> Admin
  1: 0,
  2: null,
  3: 4,    // Electrical <-> MedBay
  4: 3,
  5: null,
  6: null,
  7: 8,    // Security <-> Reactor
  8: 7,
};

const TaskRooms: number[] = [1, 2, 3, 4, 5, 6, 8]; // rooms with tasks (excluding Cafeteria)

// ActionType enum values
const ActionType = {
  None: 0,
  Move: 1,
  DoTask: 2,
  FakeTask: 3,
  Kill: 4,
  Report: 5,
  CallMeeting: 6,
  Vent: 7,
  Sabotage: 8,
  UseCams: 9,
  Skip: 10,
} as const;

export { AdjacentRooms, VentConnections, TaskRooms, ActionType };

export abstract class BaseStrategy {
  abstract decideAction(context: AgentStrategyContext): AgentAction;
  abstract decideVote(context: AgentStrategyContext): string | null;

  // ============ HELPERS ============

  protected getAdjacentLocations(location: number): number[] {
    return AdjacentRooms[location] || [];
  }

  protected getVentDestination(location: number): number | null {
    return VentConnections[location] ?? null;
  }

  protected getPlayersAtLocation(
    players: AgentStrategyContext["alivePlayers"],
    location: number,
  ): AgentStrategyContext["alivePlayers"] {
    return players.filter((p) => p.location === location && p.isAlive);
  }

  protected randomChoice<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  protected getNextTaskLocation(context: AgentStrategyContext): number | null {
    if (!context.taskLocations || context.taskLocations.length === 0) return null;
    // Return the first uncompleted task location
    return context.taskLocations[context.tasksCompleted % context.taskLocations.length] ?? null;
  }

  protected moveToward(current: number, target: number): number {
    if (current === target) return current;
    const adjacent = this.getAdjacentLocations(current);
    if (adjacent.includes(target)) return target;

    // BFS to find the shortest path, return the first step
    const visited = new Set<number>([current]);
    const queue: Array<{ node: number; firstStep: number }> = [];
    for (const adj of adjacent) {
      queue.push({ node: adj, firstStep: adj });
      visited.add(adj);
    }
    while (queue.length > 0) {
      const { node, firstStep } = queue.shift()!;
      if (node === target) return firstStep;
      for (const next of this.getAdjacentLocations(node)) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push({ node: next, firstStep });
        }
      }
    }

    // Fallback (should not happen with a connected graph)
    return this.randomChoice(adjacent);
  }
}
