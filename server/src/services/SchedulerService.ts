import { ConvexHttpClient } from "convex/browser";
import { createLogger } from "../logger.js";
import { WebSocketRelayServer } from "../WebSocketServer.js";

const logger = createLogger("scheduler");

/**
 * SchedulerService — Handles automatic game scheduling and room creation.
 * Standard frequency: 30 minutes.
 */
export class SchedulerService {
  private convex: ConvexHttpClient;
  private wsServer?: WebSocketRelayServer;
  private intervalMs: number = 10 * 60 * 1000; // 10 minutes
  private intervalId: NodeJS.Timeout | null = null;
  private bettingWindowMs: number = 7 * 60 * 1000; // 7 minutes betting window

  constructor(convexUrl: string, wsServer?: WebSocketRelayServer) {
    this.convex = new ConvexHttpClient(convexUrl);
    this.wsServer = wsServer;
  }

  async start() {
    logger.info("Scheduler Service started. Checking for upcoming games...");
    
    // Immediate check
    await this.checkAndSchedule();
    
    // Regular check every 1 minute to ensure consistency across restarts
    this.intervalId = setInterval(() => this.checkAndSchedule(), 60 * 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async checkAndSchedule() {
    try {
      const now = Date.now();
      // For immediate verification during development
      const targetSlot = Math.ceil(now / (5 * 60 * 1000)) * (5 * 60 * 1000) + (5 * 60 * 1000); // Next 5 min slot

      // 1. Check if a game is already scheduled for this slot in Convex
      const existingGames: any = await this.convex.query("crewkill:getGamesBySlot" as any, { scheduledAt: targetSlot });
      
      const hasUpcomingGame = existingGames && existingGames.length > 0;

      if (!hasUpcomingGame) {
        logger.info(`Scheduling new on-chain game for slot: ${new Date(targetSlot).toISOString()}`);
        
        if (this.wsServer) {
          // 2. Create room on-chain WITHOUT forcedRoomId
          const result = await this.wsServer.createRoom(undefined, 10, 2, "100000000", 10);
          
          if ('error' in result) {
            logger.error(`Failed to create on-chain room for slot ${targetSlot}:`, result.error);
            return;
          }

          const roomId = result.roomId; // This is the real Sui Object ID
          const bettingEndsAt = now + this.bettingWindowMs;

          // 3. Register in Convex with the real address
          await this.convex.mutation("crewkill:createScheduledGame" as any, {
            roomId,
            scheduledAt: targetSlot,
            bettingEndsAt,
          });

          logger.info(`Successfully created scheduled on-chain room: ${roomId} for slot ${targetSlot}`);
        }
      } else {
        // Just sync memory with Convex if needed
        for (const game of existingGames) {
           if (this.wsServer && !this.wsServer.getRooms().find(r => r.roomId === game.roomId)) {
             logger.info(`Room ${game.roomId} exists in Convex but missing from memory. Syncing...`);
             this.wsServer.createRoom(undefined, 10, 2, game.wagerAmount || "100000000", 10, game.roomId);
           }
        }
      }
    } catch (err) {
      logger.error("Error in scheduler check:", err);
    }
  }
}
