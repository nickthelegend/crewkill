import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ============ Operator Operations ============

export const upsertOperator = mutation({
  args: {
    name: v.string(),
    operatorKey: v.string(),
    walletAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("operators")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress.toLowerCase()))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        operatorKey: args.operatorKey,
        updatedAt: Date.now(),
      });
      return { ...existing, name: args.name, operatorKey: args.operatorKey };
    }

    const id = await ctx.db.insert("operators", {
      ...args,
      walletAddress: args.walletAddress.toLowerCase(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { _id: id, ...args };
  },
});

export const getOperatorByKey = query({
  args: { operatorKey: v.string() },
  handler: async (ctx, args) => {
    const operator = await ctx.db
      .query("operators")
      .withIndex("by_operatorKey", (q) => q.eq("operatorKey", args.operatorKey))
      .unique();
    return operator;
  },
});

// ============ Agent Operations ============

export const upsertAgent = mutation({
  args: {
    walletAddress: v.string(),
    name: v.string(),
    operatorId: v.id("operators"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("agents")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress.toLowerCase()))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        updatedAt: Date.now(),
      });
      return existing;
    }

    const id = await ctx.db.insert("agents", {
      ...args,
      walletAddress: args.walletAddress.toLowerCase(),
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      kills: 0,
      tasksCompleted: 0,
      balance: "0",
      totalDeposited: "0",
      totalWon: "0",
      totalLost: "0",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { _id: id, ...args };
  },
});

export const getAgentByWallet = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress.toLowerCase()))
      .unique();
  },
});

export const updateAgentStats = mutation({
  args: {
    walletAddress: v.string(),
    gamesPlayed: v.optional(v.number()),
    wins: v.optional(v.number()),
    losses: v.optional(v.number()),
    kills: v.optional(v.number()),
    tasksCompleted: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress.toLowerCase()))
      .unique();
    if (!agent) return null;

    await ctx.db.patch(agent._id, {
      gamesPlayed: (agent.gamesPlayed || 0) + (args.gamesPlayed || 0),
      wins: (agent.wins || 0) + (args.wins || 0),
      losses: (agent.losses || 0) + (args.losses || 0),
      kills: (agent.kills || 0) + (args.kills || 0),
      tasksCompleted: (agent.tasksCompleted || 0) + (args.tasksCompleted || 0),
      updatedAt: Date.now(),
    });
    return agent;
  },
});

// ============ Game Operations ============

export const createGame = mutation({
  args: { roomId: v.string() },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("games", {
      roomId: args.roomId,
      status: "CREATED",
      phase: "lobby",
      totalPot: "0",
      createdAt: Date.now(),
    });
    return id;
  },
});

export const createScheduledGame = mutation({
  args: {
    roomId: v.string(),
    scheduledAt: v.number(),
    bettingEndsAt: v.number(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("games", {
      roomId: args.roomId,
      status: "CREATED",
      phase: "lobby",
      totalPot: "0",
      scheduledAt: args.scheduledAt,
      bettingEndsAt: args.bettingEndsAt,
      createdAt: Date.now(),
    });
    return id;
  },
});

export const listActiveAgents = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    return await ctx.db
      .query("agents")
      .order("desc")
      .take(limit);
  },
});

export const startGame = mutation({
  args: {
    roomId: v.string(),
    totalPot: v.string(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .unique();
    if (!game) return null;

    await ctx.db.patch(game._id, {
      status: "ACTIVE",
      phase: "playing",
      totalPot: args.totalPot,
      startedAt: Date.now(),
    });
    return game;
  },
});

export const getGameByRoomId = query({
  args: { roomId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("games")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .unique();
  },
});

export const listGames = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("games")
      .order("desc")
      .take(args.limit || 50);
  },
});

export const getBettingStatus = query({
  args: { roomId: v.string() },
  handler: async (ctx, args) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .unique();

    if (!game) return { isOpen: false, error: "Game not found" };

    const now = Date.now();
    const bettingEndsAt = game.bettingEndsAt || 0;
    const isOpen = game.status === "CREATED" && (bettingEndsAt === 0 || now < bettingEndsAt);

    return {
      isOpen,
      bettingEndsAt,
      remainingMs: Math.max(0, bettingEndsAt - now),
      status: game.status,
    };
  },
});

// ============ Transaction Log ============

export const logTransaction = mutation({
  args: {
    type: v.string(),
    walletAddress: v.string(),
    amount: v.string(),
    gameRoomId: v.optional(v.string()),
    txHash: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("transactions", {
      ...args,
      walletAddress: args.walletAddress.toLowerCase(),
      createdAt: Date.now(),
    });
  },
});
