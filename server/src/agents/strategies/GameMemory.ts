/**
 * Server-side GameMemory — adapted from agent/src/memory/GameMemory.ts
 * Uses plain strings instead of viem Address type.
 */

// Mirror enums locally to avoid importing from agent package
enum AccuseReason {
  NearBody = 0,
  NoTasks = 1,
  SuspiciousMovement = 2,
  SawVent = 3,
  Inconsistent = 4,
  Following = 5,
  SelfReport = 6,
}

const LocationNames: Record<number, string> = {
  0: "Cafeteria",
  1: "Admin",
  2: "Storage",
  3: "Electrical",
  4: "MedBay",
  5: "Upper Engine",
  6: "Lower Engine",
  7: "Security",
  8: "Reactor",
};

interface MovementRecord {
  player: string;
  from: number;
  to: number;
  round: number;
}

interface KillRecord {
  victim: string;
  location: number;
  round: number;
  possibleKillers: string[];
}

interface VoteRecord {
  round: number;
  votes: Map<string, string | null>;
  ejected: string | null;
  wasImpostor: boolean | null;
}

interface PlayerBehavior {
  address: string;
  movementPattern: number[];
  tasksCompleted: number;
  timesAccused: number;
  timesDefended: number;
  votingAccuracy: number;
  wasWithVictimCount: number;
  reportedBodies: number;
  calledMeetings: number;
}

export interface SuspicionScore {
  address: string;
  score: number;
  reasons: SuspicionReason[];
}

export interface SuspicionReason {
  type: number; // AccuseReason
  weight: number;
  round: number;
  details?: string;
}

export class GameMemory {
  private movements: MovementRecord[] = [];
  private kills: KillRecord[] = [];
  private voteHistory: VoteRecord[] = [];
  private playerBehaviors: Map<string, PlayerBehavior> = new Map();
  private suspicionScores: Map<string, SuspicionScore> = new Map();
  private myLocation: number = 0; // Cafeteria
  private currentRound: number = 0;
  private knownLocations: Map<string, number> = new Map();

  // ============ RECORDING EVENTS ============

  recordMovement(player: string, from: number, to: number, round: number): void {
    this.movements.push({ player, from, to, round });
    this.knownLocations.set(player, to);
    this.updatePlayerBehavior(player, (b) => {
      b.movementPattern.push(to);
    });
  }

  recordKill(victim: string, location: number, round: number, playersAtLocation: string[]): void {
    this.kills.push({
      victim,
      location,
      round,
      possibleKillers: playersAtLocation.filter((p) => p !== victim),
    });

    for (const player of playersAtLocation) {
      if (player !== victim) {
        this.addSuspicion(player, AccuseReason.NearBody, 30, round, `Near body at ${LocationNames[location]}`);
      }
    }
  }

  recordVote(round: number, votes: Map<string, string | null>, ejected: string | null, wasImpostor: boolean | null): void {
    this.voteHistory.push({ round, votes, ejected, wasImpostor });

    if (ejected && wasImpostor !== null) {
      votes.forEach((votedFor, voter) => {
        if (votedFor === ejected) {
          this.updatePlayerBehavior(voter, (b) => {
            b.votingAccuracy = wasImpostor
              ? (b.votingAccuracy + 1) / 2
              : (b.votingAccuracy - 0.5) / 2;
          });

          if (wasImpostor) {
            this.adjustSuspicion(voter, -20);
          } else {
            this.addSuspicion(voter, AccuseReason.Inconsistent, 25, round, "Voted for innocent player");
          }
        }
      });
    }
  }

  recordReport(reporter: string, round: number): void {
    this.updatePlayerBehavior(reporter, (b) => {
      b.reportedBodies++;
    });
    this.addSuspicion(reporter, AccuseReason.SelfReport, 10, round, "Reported body");
  }

  recordTaskCompletion(player: string): void {
    this.updatePlayerBehavior(player, (b) => {
      b.tasksCompleted++;
    });
    this.adjustSuspicion(player, -10);
  }

  setMyLocation(location: number): void {
    this.myLocation = location;
  }

  setCurrentRound(round: number): void {
    this.currentRound = round;
  }

  // ============ SUSPICION MANAGEMENT ============

  addSuspicion(player: string, reason: number, weight: number, round: number, details?: string): void {
    let score = this.suspicionScores.get(player);
    if (!score) {
      score = { address: player, score: 0, reasons: [] };
      this.suspicionScores.set(player, score);
    }
    score.reasons.push({ type: reason, weight, round, details });
    score.score = Math.min(100, score.score + weight);
  }

  adjustSuspicion(player: string, delta: number): void {
    let score = this.suspicionScores.get(player);
    if (!score) {
      score = { address: player, score: 50, reasons: [] };
      this.suspicionScores.set(player, score);
    }
    score.score = Math.max(0, Math.min(100, score.score + delta));
  }

  getSuspicionScore(player: string): SuspicionScore | undefined {
    return this.suspicionScores.get(player);
  }

  getAllSuspicionScores(): SuspicionScore[] {
    return Array.from(this.suspicionScores.values()).sort((a, b) => b.score - a.score);
  }

  getMostSuspicious(): SuspicionScore | undefined {
    return this.getAllSuspicionScores()[0];
  }

  // ============ ANALYSIS ============

  getPlayerLastKnownLocation(player: string): number | undefined {
    return this.knownLocations.get(player);
  }

  getPlayersWhoWereAt(location: number, round: number): string[] {
    return this.movements
      .filter((m) => m.to === location && m.round === round)
      .map((m) => m.player);
  }

  detectNoTaskProgress(player: string, rounds: number): boolean {
    const behavior = this.playerBehaviors.get(player);
    if (!behavior) return false;
    return behavior.tasksCompleted === 0 && this.currentRound > rounds;
  }

  /**
   * Get recent kill records (with players nearby info)
   */
  getRecentKills(limit = 3): Array<{ victim: string; location: number; round: number; playersNearby: string[] }> {
    return this.kills
      .slice(-limit)
      .map((k) => ({
        victim: k.victim,
        location: k.location,
        round: k.round,
        playersNearby: k.possibleKillers,
      }));
  }

  // ============ HELPERS ============

  private updatePlayerBehavior(player: string, updater: (behavior: PlayerBehavior) => void): void {
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

  reset(): void {
    this.movements = [];
    this.kills = [];
    this.voteHistory = [];
    this.playerBehaviors.clear();
    this.suspicionScores.clear();
    this.knownLocations.clear();
    this.myLocation = 0;
    this.currentRound = 0;
  }
}
