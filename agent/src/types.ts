// ============ ENUMS (Mirror OneChain Move) ============

export enum Role {
  None = 0,
  Crewmate = 1,
  Impostor = 2,
}

export enum Location {
  Cafeteria = 0,
  Admin = 1,
  Storage = 2,
  Electrical = 3,
  MedBay = 4,
  UpperEngine = 5,
  LowerEngine = 6,
  Security = 7,
  Reactor = 8,
  Weapons = 9,
  Navigation = 10,
  Shields = 11,
  O2 = 12,
  Communications = 13,
}

export const LocationNames: Record<Location, string> = {
  [Location.Cafeteria]: "Cafeteria",
  [Location.Admin]: "Admin",
  [Location.Storage]: "Storage",
  [Location.Electrical]: "Electrical",
  [Location.MedBay]: "MedBay",
  [Location.UpperEngine]: "Upper Engine",
  [Location.LowerEngine]: "Lower Engine",
  [Location.Security]: "Security",
  [Location.Reactor]: "Reactor",
  [Location.Weapons]: "Weapons",
  [Location.Navigation]: "Navigation",
  [Location.Shields]: "Shields",
  [Location.O2]: "O2",
  [Location.Communications]: "Communications",
};

export enum ActionType {
  None = 0,
  Move = 1,
  Task = 2,
  DoTask = 2,   // Alias for Task
  Kill = 3,
  Sabotage = 4,
  Report = 5,
  CallMeeting = 6,
  Vote = 7,
  // These are client-side or legacy, mapping them to something safe
  FakeTask = 2, 
  Vent = 1,      // Map to Move
  Skip = 7,      // Map to Vote(null)
}

export enum SabotageType {
  None = 0,
  Lights = 1,
  Reactor = 2,
  O2 = 3,
  Comms = 4,
}

export enum GamePhase {
  Lobby = 0,
  Starting = 1,
  ActionCommit = 2,
  ActionReveal = 3,
  Discussion = 4,
  Voting = 5,
  VoteResult = 6,
  Ended = 7,
}

export enum MessageType {
  Accuse = 0,
  Defend = 1,
  Vouch = 2,
  Info = 3,
}

export enum AccuseReason {
  NearBody = 0,
  NoTasks = 1,
  SuspiciousMovement = 2,
  SawVent = 3,
  Inconsistent = 4,
  Following = 5,
  SelfReport = 6,
}

// ============ INTERFACES ============

export interface Player {
  address: string;
  colorId: number;
  role: Role;
  location: Location;
  isAlive: boolean;
  tasksCompleted: number;
  totalTasks: number;
  hasVoted: boolean;
}

export interface DeadBody {
  victim: string;
  location: Location;
  round: bigint;
  reported: boolean;
}

export interface GameState {
  gameObjectId: string;
  phase: GamePhase;
  round: bigint;
  players: string[];
  ended: boolean;
  winner: number;
  maxPlayers: number;
  wagerAmount: bigint;
  tasksRequired: number;
  activeSabotage: SabotageType;
}

export interface DiscussionMessage {
  sender: string;
  msgType: MessageType;
  target: string;
  reason: AccuseReason;
  location: Location;
  timestamp: bigint;
}

export interface VoteRecord {
  voter: string;
  suspect: string;
  timestamp: bigint;
}

export interface Action {
  type: ActionType;
  target?: string;
  destination?: Location;
  location?: Location; // NEW: The current location where the action is performed
  taskId?: number;
  sabotage?: SabotageType;
}

export interface ActionCommitment {
  commitment: number[];   // sha3_256 hash as byte array
  action: Action;
  salt: Uint8Array;       // 32 random bytes
}

// ============ MEMORY TYPES ============

export interface SuspicionScore {
  address: string;
  score: number;
  reasons: SuspicionReason[];
}

export interface SuspicionReason {
  type: AccuseReason;
  weight: number;
  round: bigint;
  details?: string;
}

// ============ AGENT TYPES ============

export interface AgentConfig {
  privateKeyB64: string;
  agentName: string;
  strategyType: "crewmate" | "impostor" | "adaptive";
  riskTolerance: number;
}

export interface AgentStats {
  wins: number;
  losses: number;
  kills: number;
  tasksCompleted: number;
}
