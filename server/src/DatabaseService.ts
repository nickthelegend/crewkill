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

  async listGames() {
    if (!this.enabled) return [];
    try {
      return await this.convex.query("crewkill:listGames" as any, {});
    } catch (error) {
      logger.error("Failed to list games from Convex:", error);
      return [];
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

  async createScheduledGame(roomId: string, scheduledAt: number, bettingEndsAt: number) {
    if (!this.enabled) return;
    try {
      await this.convex.mutation("crewkill:createScheduledGame" as any, { 
        roomId, 
        scheduledAt, 
        bettingEndsAt 
      });
    } catch (error) {
      logger.error("Failed to create scheduled game via Convex:", error);
    }
  }

  async updateGameMarketId(roomId: string, marketId: string) {
    if (!this.enabled) return;
    try {
      await this.convex.mutation("crewkill:updateGameMarketId" as any, { 
        roomId, 
        marketId 
      });
    } catch (error) {
      logger.error(`Failed to update market ID for ${roomId} via Convex:`, error);
    }
  }

  async closeBetting(roomId: string) {
    if (!this.enabled) return;
    try {
      await this.convex.mutation("crewkill:closeBetting" as any, { roomId });
      logger.info(`Betting closed for room ${roomId} via Convex`);
    } catch (error) {
      logger.error(`Failed to close betting for ${roomId} via Convex:`, error);
    }
  }

  async updateGamePlayers(roomId: string, players: Array<{
    address: string;
    name: string;
    colorId: number;
    location?: number;
    isAlive?: boolean;
    tasksCompleted?: number;
    isAIAgent?: boolean;
    agentPersona?: {
      emoji: string;
      title: string;
      playstyle: string;
    };
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
      impostorAddresses?: string[];
      settlementTxHash?: string;
    },
  ) {
    if (!this.enabled) return;
    try {
      // 1. Resolve predictions if impostors known
      if (result.impostorAddresses) {
        await this.convex.mutation("bets:resolveBets" as any, {
          gameId: roomId,
          winnerSide: result.crewmatesWon ? 0 : 1,
          impostorAddresses: result.impostorAddresses,
        });
      }
      
      // 2. Settlement log for the game itself
      await this.convex.mutation("crewkill:endGame" as any, {
        roomId,
        crewmatesWon: result.crewmatesWon,
        winReason: result.winReason,
        winningsPerPlayer: result.winningsPerPlayer.toString(),
        impostorAddresses: result.impostorAddresses,
      });
    } catch (error) {
      logger.error(`Failed to end game ${roomId} via Convex:`, error);
    }
  }

  async resolveBets(gameId: string, winnerSide: number, impostorAddresses: string[]) {
    if (!this.enabled) return;
    try {
      await this.convex.mutation("bets:resolveBets" as any, {
        gameId,
        winnerSide,
        impostorAddresses,
      });
    } catch (error) {
      logger.error(`Failed to resolve bets for ${gameId} via Convex:`, error);
    }
  }

  async getBetsByGame(gameId: string) {
    if (!this.enabled) return [];
    try {
      return await this.convex.query("bets:getBetsByGame" as any, { gameId });
    } catch (error) {
      logger.error(`Failed to get bets for ${gameId} from Convex:`, error);
      return [];
    }
  }

  async getGameByRoomId(roomId: string) {
    if (!this.enabled) return null;
    try {
      return await this.convex.query("crewkill:getGameByRoomId" as any, { roomId });
    } catch (error) {
      return null;
    }
  }

  async getGameReplay(gameId: string) {
    if (!this.enabled) return null;
    try {
      return await this.convex.query("crewkill:getGameReplay" as any, { gameId });
    } catch (error) {
      logger.error(`Failed to get game replay for ${gameId} from Convex:`, error);
      return null;
    }
  }

  async saveGameReplay(data: {
    gameId: string;
    logJsonl: string;
    winnerSide: number;
    players: string[];
    impostors: string[];
    rounds: number;
  }) {
    if (!this.enabled) return;
    try {
      await this.convex.mutation("crewkill:saveGameReplay" as any, data);
    } catch (error) {
      logger.error(`Failed to save game replay for ${data.gameId} via Convex:`, error);
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
