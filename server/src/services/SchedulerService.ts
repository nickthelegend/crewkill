import { ConvexHttpClient } from "convex/browser";
import { createLogger } from "../logger.js";
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger("scheduler");

/**
 * SchedulerService — Handles automatic game scheduling and room creation.
 * Standard frequency: 30 minutes.
 */
export class SchedulerService {
  private convex: ConvexHttpClient;
  private intervalMs: number = 30 * 60 * 1000; // 30 minutes
  private intervalId: NodeJS.Timeout | null = null;
  private bettingWindowMs: number = 27 * 60 * 1000; // 27 minutes (3 mins before start)

  constructor(convexUrl: string) {
    this.convex = new ConvexHttpClient(convexUrl);
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
      // 1. Calculate the next slot (top of the hour or bottom of the hour)
      const now = Date.now();
      const thirtyMins = 30 * 60 * 1000;
      const nextSlot = Math.ceil(now / thirtyMins) * thirtyMins;
      
      // If the next slot is too close (e.g. within 5 mins), schedule the one after that
      // to ensure there's enough time for betting.
      let targetSlot = nextSlot;
      if (targetSlot - now < 5 * 60 * 1000) {
        targetSlot += thirtyMins;
      }

      // Check if a game is already scheduled for this slot or later
      // For now, we'll just check if there are any games in LOBBY phase
      // A more robust check would query Convex for specifically scheduled slot.
      // But we can simplify: if no game exists with scheduledAt >= targetSlot, we create one.
      
      // To keep it simple for this wave, we'll just ensure at least ONE upcoming game exists.
      const games: any = await this.convex.query("crewkill:getGameByRoomId" as any, { roomId: `scheduled_${targetSlot}` });
      
      if (!games) {
        logger.info(`Scheduling new game for slot: ${new Date(targetSlot).toISOString()}`);
        
        const roomId = `scheduled_${targetSlot}`;
        const bettingEndsAt = targetSlot - (3 * 60 * 1000); // 3 mins before start

        await this.convex.mutation("crewkill:createScheduledGame" as any, {
          roomId,
          scheduledAt: targetSlot,
          bettingEndsAt,
        });

        logger.info(`Successfully created scheduled room: ${roomId}`);
      }
    } catch (err) {
      logger.error("Error in scheduler check:", err);
    }
  }
}
