// ============ SERVER AGENT TYPES ============

export type AgentPersonality =
  | "aggressive"
  | "cautious"
  | "detective"
  | "social"
  | "chaotic";

export type CrewmateStyle =
  | "task-focused"
  | "detective"
  | "group-safety"
  | "vigilante"
  | "conservative";

export type ImpostorStyle =
  | "stealth"
  | "aggressive"
  | "saboteur"
  | "social-manipulator"
  | "frame-game";

export interface ServerAgentConfig {
  name: string;
  address: string;
  personality: AgentPersonality;
  crewmateStyle: CrewmateStyle;
  impostorStyle: ImpostorStyle;
}

export interface AgentAction {
  type: number; // ActionType enum value
  target?: string;
  destination?: number; // Location enum value
  taskId?: number;
  sabotage?: number;
  targetLocation?: number;
}

export interface AgentStrategyContext {
  myAddress: string;
  myLocation: number;
  isAlive: boolean;
  role: "crewmate" | "impostor" | "none";
  round: number;
  phase: number;
  alivePlayers: Array<{
    address: string;
    location: number;
    isAlive: boolean;
    colorId: number;
    tasksCompleted: number;
  }>;
  deadBodies: Array<{
    victim: string;
    location: number;
    round: number;
    reported: boolean;
  }>;
  impostors?: string[]; // Only available if we're an impostor
  taskLocations?: number[]; // Assigned task locations
  tasksCompleted: number;
  totalTasks: number;
  activeSabotage: number;
  topChatSuspect?: string | null;
}
