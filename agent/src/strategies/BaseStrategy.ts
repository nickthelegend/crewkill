
import {
  Action,
  GameState,
  Player,
  Location,
  DeadBody,
  DiscussionMessage,
  Role,
} from "../types.js";
import { GameMemory } from "../memory/GameMemory.js";
import { GameObserver } from "../core/GameObserver.js";

export interface StrategyContext {
  gameState: GameState;
  myPlayer: Player;
  allPlayers: Player[];
  alivePlayers: Player[];
  deadBodies: DeadBody[];
  messages: DiscussionMessage[];
  memory: GameMemory;
  observer: GameObserver;
}

export interface IStrategy {
  /**
   * Decide what action to take this round
   */
  decideAction(context: StrategyContext): Promise<Action>;

  /**
   * Decide who to vote for during voting phase
   * Returns null to skip vote
   */
  decideVote(context: StrategyContext): Promise<string | null>;

  /**
   * Generate discussion messages during discussion phase
   */
  generateMessages(context: StrategyContext): Promise<DiscussionMessage[]>;

  /**
   * Get the strategy name for logging
   */
  getName(): string;
}

export abstract class BaseStrategy implements IStrategy {
  protected name: string;

  constructor(name: string) {
    this.name = name;
  }

  getName(): string {
    return this.name;
  }

  abstract decideAction(context: StrategyContext): Promise<Action>;
  abstract decideVote(context: StrategyContext): Promise<string | null>;
  abstract generateMessages(context: StrategyContext): Promise<DiscussionMessage[]>;

  // ============ HELPER METHODS ============

  protected getAdjacentLocations(location: Location): Location[] {
    const adjacencyMap: Record<number, Location[]> = {
      [Location.Cafeteria]: [Location.Admin, Location.MedBay, Location.UpperEngine, Location.Weapons],
      [Location.Admin]: [Location.Cafeteria, Location.Storage],
      [Location.Storage]: [Location.Admin, Location.Electrical, Location.LowerEngine, Location.Shields, Location.Communications],
      [Location.Electrical]: [Location.Storage, Location.LowerEngine],
      [Location.MedBay]: [Location.Cafeteria, Location.UpperEngine],
      [Location.UpperEngine]: [Location.MedBay, Location.Reactor],
      [Location.LowerEngine]: [Location.Reactor, Location.Electrical, Location.Security],
      [Location.Security]: [Location.Reactor, Location.LowerEngine],
      [Location.Reactor]: [Location.UpperEngine, Location.Security, Location.LowerEngine],
      [Location.Weapons]: [Location.Cafeteria, Location.Navigation, Location.Shields],
      [Location.Navigation]: [Location.Weapons, Location.Shields, Location.O2],
      [Location.Shields]: [Location.Storage, Location.Navigation, Location.Weapons],
      [Location.O2]: [Location.Navigation],
      [Location.Communications]: [Location.Storage],
    };
    return adjacencyMap[location] || [];
  }

  protected getVentDestination(location: Location): Location | null {
    const ventMap: Partial<Record<Location, Location | null>> = {
      [Location.Cafeteria]: Location.Admin,
      [Location.Admin]: Location.Cafeteria,
      [Location.Storage]: null,
      [Location.Electrical]: Location.MedBay,
      [Location.MedBay]: Location.Electrical,
      [Location.UpperEngine]: null,
      [Location.LowerEngine]: null,
      [Location.Security]: Location.Reactor,
      [Location.Reactor]: Location.Security,
      [Location.Weapons]: Location.Navigation,
      [Location.Navigation]: Location.Weapons,
      [Location.Shields]: null,
      [Location.O2]: null,
      [Location.Communications]: null,
    };
    return ventMap[location] ?? null;
  }

  protected randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  protected getPlayersAtLocation(players: Player[], location: Location): Player[] {
    return players.filter((p) => p.isAlive && p.location === location);
  }

  protected getIsolatedPlayers(players: Player[]): Player[] {
    const locationCounts = new Map<Location, number>();
    for (const p of players) {
      if (p.isAlive) {
        locationCounts.set(p.location, (locationCounts.get(p.location) || 0) + 1);
      }
    }
    return players.filter(
      (p) => p.isAlive && (locationCounts.get(p.location) || 0) === 1
    );
  }

  protected findNearestTaskRoom(from: Location, completedTasks: number): Location {
    const taskRooms = [
      Location.Admin,
      Location.Storage,
      Location.Electrical,
      Location.MedBay,
      Location.UpperEngine,
      Location.LowerEngine,
      Location.Reactor,
      Location.Weapons,
      Location.Navigation,
      Location.Shields,
      Location.O2,
      Location.Communications,
    ];

    // Simple pathfinding - return adjacent task room or random task room
    const adjacent = this.getAdjacentLocations(from);
    const adjacentTaskRooms = adjacent.filter((loc) => taskRooms.includes(loc));

    if (adjacentTaskRooms.length > 0) {
      return this.randomChoice(adjacentTaskRooms);
    }

    // Otherwise move towards a task room
    return this.randomChoice(adjacent);
  }
}
