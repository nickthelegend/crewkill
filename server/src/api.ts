import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { createLogger } from "./logger.js";
import { wagerService } from "./WagerService.js";
import type { WebSocketRelayServer } from "./WebSocketServer.js";
import { databaseService } from "./DatabaseService.js";
import { Operator } from "@prisma/client";

const logger = createLogger("api");

// Extract Bearer token from Authorization header
function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7); // Remove "Bearer " prefix
}

// Middleware to require operator authentication
interface AuthenticatedRequest extends Request {
  operator?: Operator;
}

async function requireOperatorAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const operatorKey = extractBearerToken(req);

  if (!operatorKey) {
    res.status(401).json({
      error: "Authorization header required. Use: Authorization: Bearer {operatorKey}",
    });
    return;
  }

  const operator = await databaseService.getOperatorByKey(operatorKey);
  if (!operator) {
    res.status(401).json({ error: "Invalid operator key" });
    return;
  }

  req.operator = operator as any;
  next();
}

export function createApiServer(
  wsServer: WebSocketRelayServer,
): express.Express {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Health check
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  // ============ ROOMS ============

  // Get all rooms and server stats
  app.get("/api/rooms", (_req: Request, res: Response) => {
    const stats = wsServer.getStats();
    const rooms = wsServer.getRooms();

    res.json({
      rooms: rooms.map((room) => ({
        roomId: room.roomId,
        players: room.players.map((p) => ({
          address: p.address,
          colorId: p.colorId,
          isAlive: p.isAlive,
        })),
        spectators: room.spectators.length,
        maxPlayers: room.maxPlayers,
        phase: room.phase,
        creator: room.creator,
        createdAt: room.createdAt,
        wagerAmount: room.wagerAmount,
      })),
      stats,
    });
  });

  // ============ LEADERBOARD ============

  app.get("/api/leaderboard", (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const leaderboard = wsServer.getLeaderboard(limit);

    res.json({
      agents: leaderboard,
      timestamp: Date.now(),
    });
  });

  // ============ SERVER INFO ============

  app.get("/api/server", (_req: Request, res: Response) => {
    const stats = wsServer.getStats();

    res.json({
      version: "1.1.0",
      network: "OneChain",
      wager: {
        amountMist: wagerService.getWagerAmount().toString(),
      },
      limits: stats.limits,
      connections: stats.connections,
      rooms: stats.rooms,
    });
  });

  return app;
}
