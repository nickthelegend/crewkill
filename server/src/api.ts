import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { createLogger } from "./logger.js";
import { wagerService } from "./WagerService.js";
import type { WebSocketRelayServer } from "./WebSocketServer.js";
import { databaseService } from "./DatabaseService.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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

  // ============ DOCUMENTATION ============

  // Serve documentation files (onboard.md, play.md, skill.md)
  app.get("/api/docs/:filename", (req: Request, res: Response) => {
    const filename = String(req.params.filename);
    
    // Only allow specific documentation files
    const allowedFiles = ["onboard.md", "play.md", "skill.md"];
    if (!allowedFiles.includes(filename)) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Path relative to server/src/api.ts
    // server is at /crewkill/server/src/api.ts
    // frontend is at /crewkill/frontend/public
    const docPath = path.resolve(__dirname, "../../frontend/public", filename);
    
    if (!fs.existsSync(docPath)) {
      logger.error(`Document not found on disk: ${docPath}`);
      res.status(500).json({ error: "Document not found on server" });
      return;
    }

    const content = fs.readFileSync(docPath, "utf8");
    res.type("text/markdown").send(content);
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

  // ============ AGENTS ============

  // Register a new agent (Operator Only)
  app.post("/api/agents", requireOperatorAuth, async (req: AuthenticatedRequest, res: Response) => {
    const { walletAddress, name } = req.body;
    
    if (!walletAddress) {
      res.status(400).json({ error: "walletAddress required" });
      return;
    }

    try {
      await databaseService.upsertAgent({
        walletAddress: walletAddress.toLowerCase(),
        name: name || `Agent ${walletAddress.slice(0, 6)}`,
        operatorId: req.operator._id || req.operator.id,
      });

      res.json({
        success: true,
        agentAddress: walletAddress.toLowerCase(),
        operator: req.operator.name
      });
    } catch (err) {
      logger.error("Failed to register agent:", err);
      res.status(500).json({ error: "Agent registration failed" });
    }
  });

  // Get agent balance (Public)
  app.get("/api/agents/:address/balance", async (req: Request, res: Response) => {
    const address = String(req.params.address);
    
    try {
      const balance = await wagerService.getBalance(address);
      const minWager = wagerService.getWagerAmount();
      
      res.json({
        address,
        balance: balance.toString(),
        minWager: minWager.toString(),
        canAfford: balance >= minWager,
        currency: "OCT"
      });
    } catch (err) {
      logger.error(`Failed to get balance for ${address}:`, err);
      res.status(500).json({ error: "Failed to retrieve balance" });
    }
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
        id: req.operator?.id || req.operator?._id,
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
      const rooms = wsServer.getRooms();
      const room = rooms.find(r => r.roomId === roomId);
      if (!room) {
        res.status(404).json({ error: "Room not found" });
        return;
      }

      logger.info(`System request: Manually starting game for room ${roomId}`);
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

  // Get impostors for a room (Admin testing only)
  app.post("/api/system/impostors", requireOperatorAuth, (req: AuthenticatedRequest, res: Response) => {
    const { roomId } = req.body;
    if (!roomId) {
      res.status(400).json({ error: "roomId required" });
      return;
    }
    
    const impostors = wsServer.getImpostors(roomId);
    res.json({ roomId, impostors });
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
