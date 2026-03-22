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

      // Check if a game is already scheduled for this slot or later
      // For now, we'll just check if there are any games in LOBBY phase
      // A more robust check would query Convex for specifically scheduled slot.
      // But we can simplify: if no game exists with scheduledAt >= targetSlot, we create one.
      
      // To keep it simple for this wave, we'll just ensure at least ONE upcoming game exists.
      const roomId = `scheduled_${targetSlot}`;
      const games: any = await this.convex.query("crewkill:getGameByRoomId" as any, { roomId });
      
      const missingInMemory = this.wsServer && !this.wsServer.getRooms().find(r => r.roomId === roomId);

      if (!games) {
        logger.info(`Scheduling new game for slot: ${new Date(targetSlot).toISOString()}`);
        
        const bettingEndsAt = now + this.bettingWindowMs; // Betting open for the defined window

        await this.convex.mutation("crewkill:createScheduledGame" as any, {
          roomId,
          scheduledAt: targetSlot,
          bettingEndsAt,
        });

        if (this.wsServer) {
          this.wsServer.createRoom(undefined, 10, 2, "100000000", 10, roomId);
        }

        logger.info(`Successfully created scheduled room: ${roomId}`);
      } else if (missingInMemory && this.wsServer) {
        logger.info(`Room ${roomId} exists in Convex but missing from memory. Syncing...`);
        this.wsServer.createRoom(undefined, 10, 2, "100000000", 10, roomId);
      }
    } catch (err) {
      logger.error("Error in scheduler check:", err);
    }
  }
}
