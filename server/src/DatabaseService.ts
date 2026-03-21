import { ConvexHttpClient } from "convex/browser";
import { createLogger } from "./logger.js";

const logger = createLogger("database-service");

/**
 * DatabaseService handles all database operations via Convex.
 * This unifies data across the entire platform.
 */
export class DatabaseService {
  private convex: ConvexHttpClient;
  private enabled = false;

  constructor() {
    const convexUrl = process.env.CONVEX_URL;

    if (!convexUrl) {
      logger.warn("CONVEX_URL not set - running without persistence");
      this.convex = null as unknown as ConvexHttpClient;
      return;
    }

    try {
      this.convex = new ConvexHttpClient(convexUrl);
      this.enabled = true;
      logger.info("Database service initialized (Convex)");
    } catch (error) {
      logger.error("Failed to initialize Convex client:", error);
      this.convex = null as unknown as ConvexHttpClient;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async connect(): Promise<void> {
    // Convex is stateless over HTTP, no connection needed
    if (this.enabled) logger.info("Connected to Convex");
  }

  async disconnect(): Promise<void> {
    // No-op for Convex
  }

  // ============ Operator Operations ============

  async upsertOperator(data: {
    name: string;
    operatorKey: string;
    walletAddress: string;
  }) {
    if (!this.enabled) return null;
    try {
      return await this.convex.mutation("crewkill:upsertOperator" as any, data);
    } catch (error) {
      logger.error("Failed to upsert operator via Convex:", error);
      return null;
    }
  }

  async getOperatorByKey(operatorKey: string) {
    if (!this.enabled) return null;
    try {
      return await this.convex.query("crewkill:getOperatorByKey" as any, { operatorKey });
    } catch (error) {
      logger.error("Failed to get operator from Convex:", error);
      return null;
    }
  }

  async getOperatorByWallet(walletAddress: string) {
    if (!this.enabled) return null;
    try {
      // Small workaround: we can use a query if available or just return null for now
      return null; 
    } catch (error) {
      return null;
    }
  }

  // ============ Agent Operations ============

  async upsertAgent(data: {
    walletAddress: string;
    name: string;
    operatorId: string;
  }) {
    if (!this.enabled) return;
    try {
      await this.convex.mutation("crewkill:upsertAgent" as any, {
        ...data,
        operatorId: data.operatorId as any, // Cast to ID if using strings
      });
    } catch (error) {
      logger.error("Failed to upsert agent via Convex:", error);
    }
  }

  async getAgentByWallet(walletAddress: string) {
    if (!this.enabled) return null;
    try {
      return await this.convex.query("crewkill:getAgentByWallet" as any, { walletAddress });
    } catch (error) {
      return null;
    }
  }

  async getAllAgents() {
    if (!this.enabled) return [];
    try {
      // Implement query in Convex if needed
      return [];
    } catch (error) {
      return [];
    }
  }

  async updateAgentStats(
    walletAddress: string,
    stats: {
      gamesPlayed?: number;
      wins?: number;
      losses?: number;
      kills?: number;
      tasksCompleted?: number;
    },
  ) {
    if (!this.enabled) return;
    try {
      await this.convex.mutation("crewkill:updateAgentStats" as any, {
        walletAddress,
        ...stats,
      });
    } catch (error) {
      logger.error("Failed to update agent stats via Convex:", error);
    }
  }

  // ============ Game Operations ============

  async createGame(roomId: string) {
    if (!this.enabled) return;
    try {
      await this.convex.mutation("crewkill:createGame" as any, { roomId });
    } catch (error) {
      logger.error("Failed to create game via Convex:", error);
    }
  }

  async updateGamePlayers(roomId: string, players: Array<{
    address: string;
    name: string;
    colorId: number;
  }>) {
    if (!this.enabled) return;
    try {
      await this.convex.mutation("crewkill:updateGamePlayers" as any, {
        roomId,
        players,
      });
    } catch (error) {
      logger.error(`Failed to update game players for ${roomId} via Convex:`, error);
    }
  }

  async startGame(
    roomId: string,
    participants: Array<{
      walletAddress: string;
      isImpostor: boolean;
      colorId?: number;
      wagerAmount: bigint;
    }>,
  ) {
    if (!this.enabled) return;
    try {
      const totalPot = participants.reduce((sum, p) => sum + p.wagerAmount, 0n).toString();
      await this.convex.mutation("crewkill:startGame" as any, {
        roomId,
        totalPot,
      });
    } catch (error) {
      logger.error("Failed to start game via Convex:", error);
    }
  }

  async endGame(
    roomId: string,
    result: {
      crewmatesWon: boolean;
      winReason: string;
      winners: string[];
      playerStats: Array<{
        walletAddress: string;
        kills: number;
        tasksCompleted: number;
        isAlive: boolean;
      }>;
      winningsPerPlayer: bigint;
      settlementTxHash?: string;
    },
  ) {
    // In progress - would call resolve mutations
  }

  async getGameByRoomId(roomId: string) {
    if (!this.enabled) return null;
    try {
      return await this.convex.query("crewkill:getGameByRoomId" as any, { roomId });
    } catch (error) {
      return null;
    }
  }

  // ============ Transaction Operations ============

  async logTransaction(data: {
    type: string;
    walletAddress: string;
    amount: bigint;
    gameRoomId?: string;
    txHash?: string;
    description?: string;
  }) {
    if (!this.enabled) return;
    try {
      await this.convex.mutation("crewkill:logTransaction" as any, {
        ...data,
        amount: data.amount.toString(),
      });
    } catch (error) {
      logger.error("Failed to log transaction via Convex:", error);
    }
  }

  async getLeaderboard(limit = 10) {
    if (!this.enabled) return [];
    try {
      // Leaderboard calculated on the fly or via specialized query
      return [];
    } catch (error) {
      return [];
    }
  }
}

export const databaseService = new DatabaseService();
