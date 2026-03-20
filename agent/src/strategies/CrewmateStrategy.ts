import type { Address } from "viem";
import {
  Action,
  ActionType,
  Location,
  DiscussionMessage,
  MessageType,
  AccuseReason,
  LocationNames,
} from "../types.js";
import { BaseStrategy, StrategyContext } from "./BaseStrategy.js";

export type CrewmateStyle = "task-focused" | "detective" | "group-safety" | "vigilante" | "conservative";

export class CrewmateStrategy extends BaseStrategy {
  private style: CrewmateStyle;
  private nextTaskId: number = 0;
  private emergencyMeetingsUsed: number = 0;
  private maxEmergencyMeetings: number = 1;

  constructor(style: CrewmateStyle = "task-focused") {
    super(`Crewmate-${style}`);
    this.style = style;
  }

  async decideAction(context: StrategyContext): Promise<Action> {
    const { myPlayer, alivePlayers, deadBodies, memory } = context;
    const myLocation = myPlayer.location;

    // Priority 1: Report any body at my location
    const bodyHere = deadBodies.find(
      (b) => b.location === myLocation && !b.reported
    );
    if (bodyHere) {
      return { type: ActionType.Report };
    }

    // Priority 2: Handle based on style
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

  private async taskFocusedAction(context: StrategyContext): Promise<Action> {
    const { myPlayer } = context;
    const myLocation = myPlayer.location;

    // If at a task room and have tasks to do, do task
    const taskRooms = [
      Location.Admin,
      Location.Storage,
      Location.Electrical,
      Location.MedBay,
      Location.UpperEngine,
      Location.LowerEngine,
      Location.Reactor,
    ];

    if (taskRooms.includes(myLocation) && myPlayer.tasksCompleted < myPlayer.totalTasks) {
      const taskId = this.nextTaskId;
      this.nextTaskId = (this.nextTaskId + 1) % myPlayer.totalTasks;
      return { type: ActionType.DoTask, taskId };
    }

    // Otherwise, move towards a task room
    const destination = this.findNearestTaskRoom(myLocation, myPlayer.tasksCompleted);
    return { type: ActionType.Move, destination };
  }

  private async detectiveAction(context: StrategyContext): Promise<Action> {
    const { myPlayer, memory, alivePlayers } = context;
    const myLocation = myPlayer.location;

    // Go to Security to watch cameras if not there
    if (myLocation !== Location.Security) {
      const adjacent = this.getAdjacentLocations(myLocation);
      if (adjacent.includes(Location.Security)) {
        return { type: ActionType.Move, destination: Location.Security };
      }
      // Move towards Security
      // Simple: go to MedBay or LowerEngine as intermediate
      if (adjacent.includes(Location.MedBay)) {
        return { type: ActionType.Move, destination: Location.MedBay };
      }
      if (adjacent.includes(Location.LowerEngine)) {
        return { type: ActionType.Move, destination: Location.LowerEngine };
      }
    }

    // At Security - use cameras or do task
    if (myLocation === Location.Security) {
      // Alternate between using cams and doing tasks
      if (Math.random() > 0.5 && myPlayer.tasksCompleted < myPlayer.totalTasks) {
        return { type: ActionType.UseCams };
      }
    }

    // Default: do tasks
    return this.taskFocusedAction(context);
  }

  private async groupSafetyAction(context: StrategyContext): Promise<Action> {
    const { myPlayer, alivePlayers } = context;
    const myLocation = myPlayer.location;

    // Find a location with other players
    const playersHere = this.getPlayersAtLocation(alivePlayers, myLocation);

    // If alone, move to find others
    if (playersHere.length <= 1) {
      // Move towards Cafeteria (central meeting point)
      const adjacent = this.getAdjacentLocations(myLocation);
      if (adjacent.includes(Location.Cafeteria)) {
        return { type: ActionType.Move, destination: Location.Cafeteria };
      }
      // Or move randomly
      return { type: ActionType.Move, destination: this.randomChoice(adjacent) };
    }

    // With others - do tasks
    if (myPlayer.tasksCompleted < myPlayer.totalTasks) {
      const taskRooms = [
        Location.Admin,
        Location.Storage,
        Location.Electrical,
        Location.MedBay,
        Location.UpperEngine,
        Location.LowerEngine,
        Location.Reactor,
      ];
      if (taskRooms.includes(myLocation)) {
        const taskId = this.nextTaskId;
        this.nextTaskId = (this.nextTaskId + 1) % myPlayer.totalTasks;
        return { type: ActionType.DoTask, taskId };
      }
    }

    // Move with others
    const adjacent = this.getAdjacentLocations(myLocation);
    return { type: ActionType.Move, destination: this.randomChoice(adjacent) };
  }

  private async vigilanteAction(context: StrategyContext): Promise<Action> {
    const { myPlayer, memory, gameState } = context;
    const myLocation = myPlayer.location;

    // Check if we have high suspicion on someone
    const mostSuspicious = memory.getMostSuspicious();
    if (
      mostSuspicious &&
      mostSuspicious.score > 70 &&
      myLocation === Location.Cafeteria &&
      this.emergencyMeetingsUsed < this.maxEmergencyMeetings
    ) {
      this.emergencyMeetingsUsed++;
      return { type: ActionType.CallMeeting };
    }

    // Otherwise focus on tasks
    return this.taskFocusedAction(context);
  }

  private async conservativeAction(context: StrategyContext): Promise<Action> {
    // Very task-focused, avoids isolated areas
    const { myPlayer, alivePlayers } = context;
    const myLocation = myPlayer.location;

    const dangerousRooms = [Location.Electrical, Location.Reactor, Location.Security];

    // Avoid dangerous rooms unless with others
    const playersHere = this.getPlayersAtLocation(alivePlayers, myLocation);
    if (dangerousRooms.includes(myLocation) && playersHere.length <= 1) {
      const adjacent = this.getAdjacentLocations(myLocation);
      const safeRooms = adjacent.filter((r) => !dangerousRooms.includes(r));
      if (safeRooms.length > 0) {
        return { type: ActionType.Move, destination: this.randomChoice(safeRooms) };
      }
    }

    return this.taskFocusedAction(context);
  }

  async decideVote(context: StrategyContext): Promise<Address | null> {
    const { memory, alivePlayers, myPlayer } = context;

    // Get suspicion scores
    const scores = memory.getAllSuspicionScores();
    const threshold = this.style === "conservative" ? 80 : this.style === "vigilante" ? 50 : 65;

    // Find most suspicious alive player
    for (const score of scores) {
      const player = alivePlayers.find(
        (p) => p.address === score.address && p.address !== myPlayer.address
      );
      if (player && score.score >= threshold) {
        return score.address;
      }
    }

    // If vigilante and have any suspicion, vote
    if (this.style === "vigilante" && scores.length > 0) {
      const score = scores[0];
      if (score.address !== myPlayer.address && score.score > 30) {
        return score.address;
      }
    }

    // Skip vote if no strong suspicion
    return null;
  }

  async generateMessages(context: StrategyContext): Promise<DiscussionMessage[]> {
    const { memory, myPlayer, deadBodies, gameState } = context;
    const messages: DiscussionMessage[] = [];

    // If we found a body, share location
    const recentBody = deadBodies.find((b) => b.round === gameState.round);
    if (recentBody) {
      const mostSuspicious = memory.getMostSuspicious();
      if (mostSuspicious && mostSuspicious.score > 50) {
        messages.push({
          sender: myPlayer.address,
          msgType: MessageType.Accuse,
          target: mostSuspicious.address,
          reason: mostSuspicious.reasons[0]?.type || AccuseReason.NearBody,
          location: recentBody.location,
          timestamp: BigInt(Date.now()),
        });
      } else {
        // Share info about where body was found
        messages.push({
          sender: myPlayer.address,
          msgType: MessageType.Info,
          target: "0x0000000000000000000000000000000000000000" as Address,
          reason: AccuseReason.NearBody,
          location: recentBody.location,
          timestamp: BigInt(Date.now()),
        });
      }
    }

    return messages;
  }
}
