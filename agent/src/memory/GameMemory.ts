import { 
  Location, 
  DiscussionMessage, 
  VoteRecord, 
  GameState, 
  Player, 
  DeadBody, 
  SuspicionScore, 
  SuspicionReason,
  Action
} from "../types.js";

export class GameMemory {
  private myLocation: Location = Location.Cafeteria;
  private currentRound: bigint = 0n;
  private players: Map<string, Player> = new Map();
  private suspicionScores: Map<string, SuspicionScore> = new Map();
  private deadBodies: DeadBody[] = [];
  private messages: DiscussionMessage[] = [];
  private votes: VoteRecord[] = [];
  private seenLastRound: Map<string, Location> = new Map();
  private myActions: Map<bigint, Action> = new Map();
  private taskLocations: number[] = [];

  constructor() {}

  reset(): void {
    this.myLocation = Location.Cafeteria;
    this.currentRound = 0n;
    this.players.clear();
    this.suspicionScores.clear();
    this.deadBodies = [];
    this.messages = [];
    this.votes = [];
    this.seenLastRound.clear();
    this.myActions.clear();
    this.taskLocations = [];
  }

  setTaskLocations(locations: number[]): void {
    this.taskLocations = locations;
  }

  getTaskLocations(): number[] {
    return this.taskLocations;
  }

  setCurrentRound(round: bigint): void {
    if (round > this.currentRound) {
      this.currentRound = round;
    }
  }

  setMyLocation(location: Location): void {
    this.myLocation = location;
  }

  getMyLocation(): Location {
    return this.myLocation;
  }

  updatePlayer(player: Player): void {
    this.players.set(player.address, player);
  }

  getPlayer(address: string): Player | undefined {
    return this.players.get(address);
  }

  recordAccusation(msg: DiscussionMessage): void {
    this.messages.push(msg);
    this.incrementSuspicion(msg.target, 10, msg.reason, "Accused by " + msg.sender);
  }

  recordDefense(msg: DiscussionMessage): void {
    this.messages.push(msg);
    this.incrementSuspicion(msg.target, -5, msg.reason, "Defended by " + msg.sender);
  }

  recordVote(voter: string, suspect: string): void {
    this.votes.push({
      voter,
      suspect,
      timestamp: BigInt(Date.now()),
    });
  }

  incrementSuspicion(address: string, score: number, type: any, details?: string): void {
    let stats = this.suspicionScores.get(address);
    if (!stats) {
      stats = { address, score: 50, reasons: [] };
      this.suspicionScores.set(address, stats);
    }
    stats.score = Math.max(0, Math.min(100, stats.score + score));
    stats.reasons.push({ type, weight: score, round: this.currentRound, details });
  }

  getSuspicion(address: string): number {
    return this.suspicionScores.get(address)?.score ?? 50;
  }

  recordAction(action: Action): void {
    this.myActions.set(this.currentRound, action);
  }

  getRecentMessages(limit: number = 10): DiscussionMessage[] {
    return this.messages.slice(-limit);
  }

  getSuspects(): SuspicionScore[] {
    return Array.from(this.suspicionScores.values())
      .sort((a, b) => b.score - a.score);
  }

  getMostSuspicious(): SuspicionScore | null {
    const list = this.getSuspects();
    return list.length > 0 ? list[0] : null;
  }

  getAllSuspicionScores(): SuspicionScore[] {
    return Array.from(this.suspicionScores.values());
  }
}
