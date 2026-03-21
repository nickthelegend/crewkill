import "dotenv/config";
import { WebSocketRelayServer } from "./WebSocketServer.js";
import { createApiServer } from "./api.js";
import { logger } from "./logger.js";
import { databaseService } from "./DatabaseService.js";

import { KeeperService } from "./services/KeeperService.js";
import { SchedulerService } from "./services/SchedulerService.js";

// Render (and similar platforms) set PORT env var — single port mode
const SINGLE_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : null;
const WS_PORT = parseInt(process.env.WS_PORT || "8082", 10);
const API_PORT = parseInt(process.env.API_PORT || "8080", 10);
const HOST = process.env.WS_HOST || "0.0.0.0";

const KEEPER_ENABLED = process.env.KEEPER_ENABLED === "true";
const SCHEDULER_ENABLED = process.env.SCHEDULER_ENABLED === "true";

async function main() {
  // Connect to database
  await databaseService.connect();

  // Initialize Keeper Service if enabled
  if (KEEPER_ENABLED) {
    const keeper = new KeeperService(
      process.env.ONECHAIN_RPC || "https://rpc-testnet.onelabs.cc:443",
      process.env.OPERATOR_PRIV_KEY || "",
      process.env.NEXT_PUBLIC_CONVEX_URL || "https://beaming-crocodile-136.convex.cloud"
    );
    keeper.start().catch(err => logger.error("Keeper start failed:", err));
  }

  // Initialize Scheduler Service if enabled
  if (SCHEDULER_ENABLED) {
    const scheduler = new SchedulerService(
      process.env.NEXT_PUBLIC_CONVEX_URL || "https://beaming-crocodile-136.convex.cloud"
    );
    scheduler.start().catch(err => logger.error("Scheduler start failed:", err));
  }

  // Create WebSocket server
  const wsServer = new WebSocketRelayServer({ port: WS_PORT, host: HOST });

  // Create HTTP API server (Express app)
  const apiServer = createApiServer(wsServer);

  if (SINGLE_PORT) {
    // ===== SINGLE PORT MODE (Render, Railway, etc.) =====
    // Both HTTP API and WebSocket share the same port
    const httpServer = apiServer.listen(SINGLE_PORT, HOST, () => {
      logger.info(`Server listening on http://${HOST}:${SINGLE_PORT} (HTTP + WebSocket shared port)`);
    });

    // Attach WebSocket to the same HTTP server
    wsServer.attachToServer(httpServer);

    // Handle graceful shutdown
    const shutdown = async () => {
      logger.info("Shutting down...");
      wsServer.stop();
      httpServer.close();
      await databaseService.disconnect();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    logger.info("Among Us On-Chain Server starting (single-port mode)...");
    logger.info(`  HTTP + WS: http://${HOST}:${SINGLE_PORT}`);
    logger.info(`  Database:  ${databaseService.isEnabled() ? "connected" : "disabled"}`);
  } else {
    // ===== DUAL PORT MODE (local development) =====
    // HTTP API and WebSocket on separate ports
    const httpServer = apiServer.listen(API_PORT, HOST, () => {
      logger.info(`HTTP API server listening on http://${HOST}:${API_PORT}`);
    });

    // Handle graceful shutdown
    const shutdown = async () => {
      logger.info("Shutting down...");
      wsServer.stop();
      httpServer.close();
      await databaseService.disconnect();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    // Start WebSocket on its own port
    wsServer.start();

    logger.info("Among Us On-Chain Server starting (dual-port mode)...");
    logger.info(`  WebSocket: ws://${HOST}:${WS_PORT}`);
    logger.info(`  HTTP API:  http://${HOST}:${API_PORT}`);
    logger.info(`  Database:  ${databaseService.isEnabled() ? "connected" : "disabled"}`);
  }

  // Log stats periodically
  setInterval(() => {
    const stats = wsServer.getStats();
    logger.info(
      `Stats: ${stats.connections.total} connections (${stats.connections.agents} agents, ${stats.connections.spectators} spectators), ` +
      `${stats.rooms.total}/${stats.limits.maxRooms} rooms (${stats.rooms.lobby} lobby, ${stats.rooms.playing} playing), ${stats.rooms.totalPlayers} players`
    );
  }, 60000); // Every minute
}

main().catch((error) => {
  logger.error("Failed to start server:", error);
  process.exit(1);
});
