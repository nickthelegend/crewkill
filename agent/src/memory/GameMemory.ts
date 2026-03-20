import {
  Location,
  Player,
  DeadBody,
  DiscussionMessage,
  Vote,
  ActionType,
  AccuseReason,
  SuspicionScore,
  SuspicionReason,
  LocationNames,
} from "../types.js";
import type { Address } from "viem";

interface MovementRecord {
  player: Address;
  from: Location;
  to: Location;
  round: bigint;
}

interface KillRecord {
  victim: Address;
  location: Location;
  round: bigint;
  possibleKillers: Address[]; // Players at that location
}

interface VoteRecord {
  round: bigint;
  votes: Map<Address, Address | null>;
  ejected: Address | null;
  wasImpostor: boolean | null;
}

interface PlayerBehavior {
  address: Address;
  movementPattern: Location[];
  tasksCompleted: number;
  timesAccused: number;
  timesDefended: number;
  votingAccuracy: number; // How often they voted for actual impostors
  wasWithVictimCount: number;
  reportedBodies: number;
  calledMeetings: number;
}

export class GameMemory {
  private movements: MovementRecord[] = [];
  private kills: KillRecord[] = [];
  private voteHistory: VoteRecord[] = [];
  private accusations: DiscussionMessage[] = [];
  private defenses: DiscussionMessage[] = [];
  private playerBehaviors: Map<Address, PlayerBehavior> = new Map();
  private suspicionScores: Map<Address, SuspicionScore> = new Map();
  private myLocation: Location = Location.Cafeteria;
  private currentRound: bigint = 0n;
  private knownLocations: Map<Address, Location> = new Map();

  // ============ RECORDING EVENTS ============

  recordMovement(player: Address, from: Location, to: Location, round: bigint): void {
    this.movements.push({ player, from, to, round });
    this.knownLocations.set(player, to);
    this.updatePlayerBehavior(player, (b) => {
      b.movementPattern.push(to);
    });
  }

  recordKill(victim: Address, location: Location, round: bigint, playersAtLocation: Address[]): void {
    this.kills.push({
      victim,
      location,
      round,
      possibleKillers: playersAtLocation.filter((p) => p !== victim),
    });

    // Increase suspicion for all players at location
    for (const player of playersAtLocation) {
      if (player !== victim) {
        this.addSuspicion(player, AccuseReason.NearBody, 30, round, `Near body at ${LocationNames[location]}`);
      }
    }
  }

  recordVote(round: bigint, votes: Map<Address, Address | null>, ejected: Address | null, wasImpostor: boolean | null): void {
    this.voteHistory.push({ round, votes, ejected, wasImpostor });

    // Update voting accuracy if we know the result
    if (ejected && wasImpostor !== null) {
      votes.forEach((votedFor, voter) => {
        if (votedFor === ejected) {
          this.updatePlayerBehavior(voter, (b) => {
            b.votingAccuracy = wasImpostor
              ? (b.votingAccuracy + 1) / 2
              : (b.votingAccuracy - 0.5) / 2;
          });

          // Decrease suspicion for correct votes
          if (wasImpostor) {
            this.adjustSuspicion(voter, -20);
          } else {
            // Increase suspicion for voting innocent
            this.addSuspicion(voter, AccuseReason.Inconsistent, 25, round, "Voted for innocent player");
          }
        }
      });
    }
  }

  recordAccusation(message: DiscussionMessage): void {
    this.accusations.push(message);
    this.updatePlayerBehavior(message.target, (b) => {
      b.timesAccused++;
    });
    // Add suspicion based on accusation
    this.addSuspicion(message.target, message.reason, 15, BigInt(message.timestamp), "Accused by " + message.sender);
  }

  recordDefense(message: DiscussionMessage): void {
    this.defenses.push(message);
    this.updatePlayerBehavior(message.sender, (b) => {
      b.timesDefended++;
    });
  }

  recordReport(reporter: Address, round: bigint): void {
    this.updatePlayerBehavior(reporter, (b) => {
      b.reportedBodies++;
    });
    // Self-report suspicion (slight)
    this.addSuspicion(reporter, AccuseReason.SelfReport, 10, round, "Reported body");
  }

  recordTaskCompletion(player: Address): void {
    this.updatePlayerBehavior(player, (b) => {
      b.tasksCompleted++;
    });
    // Decrease suspicion for task completion
    this.adjustSuspicion(player, -10);
  }

  recordMeeting(caller: Address, round: bigint): void {
    this.updatePlayerBehavior(caller, (b) => {
      b.calledMeetings++;
    });
  }

  setMyLocation(location: Location): void {
    this.myLocation = location;
  }

  setCurrentRound(round: bigint): void {
    this.currentRound = round;
  }

  // ============ SUSPICION MANAGEMENT ============

  addSuspicion(
    player: Address,
    reason: AccuseReason,
    weight: number,
    round: bigint,
    details?: string
  ): void {
    let score = this.suspicionScores.get(player);
    if (!score) {
      score = { address: player, score: 0, reasons: [] };
      this.suspicionScores.set(player, score);
    }

    score.reasons.push({ type: reason, weight, round, details });
    score.score = Math.min(100, score.score + weight);
  }

  adjustSuspicion(player: Address, delta: number): void {
    let score = this.suspicionScores.get(player);
    if (!score) {
      score = { address: player, score: 50, reasons: [] };
      this.suspicionScores.set(player, score);
    }
    score.score = Math.max(0, Math.min(100, score.score + delta));
  }

  clearSuspicion(player: Address): void {
    this.suspicionScores.delete(player);
  }

  getSuspicionScore(player: Address): SuspicionScore | undefined {
    return this.suspicionScores.get(player);
  }

  getAllSuspicionScores(): SuspicionScore[] {
    return Array.from(this.suspicionScores.values()).sort((a, b) => b.score - a.score);
  }

  getMostSuspicious(): SuspicionScore | undefined {
    const scores = this.getAllSuspicionScores();
    return scores[0];
  }

  // ============ ANALYSIS METHODS ============

  getPlayerLastKnownLocation(player: Address): Location | undefined {
    return this.knownLocations.get(player);
  }

  getPlayersWhoWereAt(location: Location, round: bigint): Address[] {
    return this.movements
      .filter((m) => m.to === location && m.round === round)
      .map((m) => m.player);
  }

  wasPlayerNearVictim(player: Address, victimLocation: Location, round: bigint): boolean {
    const playerMovements = this.movements.filter(
      (m) => m.player === player && m.round === round
    );
    return playerMovements.some(
      (m) => m.to === victimLocation || m.from === victimLocation
    );
  }

  getVoteHistoryFor(player: Address): { votedFor: Address | null; round: bigint }[] {
    const history: { votedFor: Address | null; round: bigint }[] = [];
    for (const record of this.voteHistory) {
      const vote = record.votes.get(player);
      if (vote !== undefined) {
        history.push({ votedFor: vote, round: record.round });
      }
    }
    return history;
  }

  getPlayersWhoVotedFor(target: Address, round: bigint): Address[] {
    const record = this.voteHistory.find((v) => v.round === round);
    if (!record) return [];

    const voters: Address[] = [];
    record.votes.forEach((votedFor, voter) => {
      if (votedFor === target) {
        voters.push(voter);
      }
    });
    return voters;
  }

  getPlayerBehavior(player: Address): PlayerBehavior | undefined {
    return this.playerBehaviors.get(player);
  }

  // ============ PATTERN DETECTION ============

  detectFollowingPattern(player: Address, target: Address): boolean {
    const playerMoves = this.movements.filter((m) => m.player === player);
    const targetMoves = this.movements.filter((m) => m.player === target);

    // Check if player frequently moves to same location as target
    let followCount = 0;
    for (const tm of targetMoves) {
      const followMove = playerMoves.find(
        (pm) => pm.round === tm.round && pm.to === tm.to
      );
      if (followMove) followCount++;
    }

    return followCount >= 3;
  }

  detectNoTaskProgress(player: Address, rounds: number): boolean {
    const behavior = this.playerBehaviors.get(player);
    if (!behavior) return false;

    // If player has been in game for several rounds without completing tasks
    return behavior.tasksCompleted === 0 && this.currentRound > BigInt(rounds);
  }

  detectErraticMovement(player: Address): boolean {
    const behavior = this.playerBehaviors.get(player);
    if (!behavior || behavior.movementPattern.length < 4) return false;

    // Check for back-and-forth movement (suspicious)
    const pattern = behavior.movementPattern;
    let backForthCount = 0;
    for (let i = 2; i < pattern.length; i++) {
      if (pattern[i] === pattern[i - 2] && pattern[i] !== pattern[i - 1]) {
        backForthCount++;
      }
    }

    return backForthCount >= 2;
  }

  // ============ HELPERS ============

  private updatePlayerBehavior(player: Address, updater: (behavior: PlayerBehavior) => void): void {
    let behavior = this.playerBehaviors.get(player);
    if (!behavior) {
      behavior = {
        address: player,
        movementPattern: [],
        tasksCompleted: 0,
        timesAccused: 0,
        timesDefended: 0,
        votingAccuracy: 0.5,
        wasWithVictimCount: 0,
        reportedBodies: 0,
        calledMeetings: 0,
      };
      this.playerBehaviors.set(player, behavior);
    }
    updater(behavior);
  }

  // ============ SERIALIZATION ============

  toJSON(): object {
    return {
      movements: this.movements,
      kills: this.kills,
      voteHistory: this.voteHistory.map((v) => ({
        round: v.round.toString(),
        votes: Object.fromEntries(v.votes),
        ejected: v.ejected,
        wasImpostor: v.wasImpostor,
      })),
      suspicionScores: Object.fromEntries(this.suspicionScores),
      currentRound: this.currentRound.toString(),
    };
  }

  reset(): void {
    this.movements = [];
    this.kills = [];
    this.voteHistory = [];
    this.accusations = [];
    this.defenses = [];
    this.playerBehaviors.clear();
    this.suspicionScores.clear();
    this.knownLocations.clear();
    this.myLocation = Location.Cafeteria;
    this.currentRound = 0n;
  }
}
