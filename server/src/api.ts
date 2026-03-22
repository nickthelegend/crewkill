import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { createLogger } from "./logger.js";
import { wagerService } from "./WagerService.js";
import type { WebSocketRelayServer } from "./WebSocketServer.js";
import { databaseService } from "./DatabaseService.js";
// Removed Prisma import as we migrated to Convex

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
  operator?: any; // Convex operator type
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

  // ============ OPERATORS ============
  
  // Register or update an operator key
  app.post("/api/operators", async (req: Request, res: Response) => {
    const { walletAddress, name } = req.body;
    const operatorKey = extractBearerToken(req);

    if (!walletAddress || !operatorKey) {
      res.status(400).json({ error: "walletAddress and operatorKey (in Bearer token) required" });
      return;
    }

    try {
      const result = await databaseService.upsertOperator({
        walletAddress: walletAddress.toLowerCase(),
        operatorKey,
        name: name || `Operator ${walletAddress.slice(0, 6)}`,
      });

      // Even if DB is disabled, we return success so frontend can continue locally
      res.json({
        success: true,
        operatorKey: result?.operatorKey || operatorKey,
        walletAddress: result?.walletAddress || walletAddress,
      });
    } catch (err) {
      logger.error("Failed to register operator:", err);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Validate current operator key
  app.get("/api/operators/me", requireOperatorAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({
      success: true,
      operator: {
        id: req.operator?.id,
        name: req.operator?.name,
        walletAddress: req.operator?.walletAddress,
      },
    });
  });

  // ============ SYSTEM CONTROL (Operator Only) ============

  // Create a new room on-chain and fill it with AI agents
  app.post("/api/system/create-full-room", requireOperatorAuth, async (req: AuthenticatedRequest, res: Response) => {
    const { count = 9, maxPlayers = 10, impostorCount = 2, wagerAmount } = req.body;
    
    try {
      logger.info(`System request: Creating full room with ${count} AI agents...`);
      const result = await wsServer.createRoom(
        undefined, // System created
        maxPlayers,
        impostorCount,
        wagerAmount,
        count
      );

      if ("error" in result) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.json({
        success: true,
        roomId: result.roomId,
        creationDigest: result.creationDigest,
        players: result.players.length,
      });
    } catch (err) {
      logger.error("System room creation failed:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Manually force-start a game for an existing room
  app.post("/api/system/start-game", requireOperatorAuth, async (req: AuthenticatedRequest, res: Response) => {
    const { roomId } = req.body;
    
    if (!roomId) {
      res.status(400).json({ error: "roomId required" });
      return;
    }

    try {
      const room = wsServer.getRooms().find(r => r.roomId === roomId);
      if (!room) {
        res.status(404).json({ error: "Room not found" });
        return;
      }

      logger.info(`System request: Manually starting game for room ${roomId}`);
      // Using any cast to access private/internal if needed, though startGameInternal is usually handled via methods
      await (wsServer as any).startGameInternal(roomId);
      
      res.json({ success: true, roomId });
    } catch (err) {
      logger.error("System start game failed:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Add more AI agents to an existing room
  app.post("/api/system/add-agents", requireOperatorAuth, async (req: AuthenticatedRequest, res: Response) => {
    const { roomId, count = 1 } = req.body;
    
    if (!roomId) {
      res.status(400).json({ error: "roomId required" });
      return;
    }

    try {
      logger.info(`System request: Adding ${count} agents to room ${roomId}`);
      (wsServer as any).spawnAIAgentsForRoom(roomId, count);
      res.json({ success: true, roomId });
    } catch (err) {
      logger.error("System add agents failed:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============ SERVER INFO ============

  app.get("/api/server", (_req: Request, res: Response) => {
    const stats = wsServer.getStats();

    res.json({
      version: "1.2.0",
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
