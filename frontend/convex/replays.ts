import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const saveReplay = mutation({
  args: {
    gameId: v.string(),
    winnerSide: v.number(),
    blobId: v.string(),
    players: v.array(v.string()),
    impostors: v.array(v.string()),
    rounds: v.number(),
    logJsonl: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("game_replays", {
      gameId: args.gameId,
      winnerSide: args.winnerSide,
      blobId: args.blobId,
      players: args.players,
      impostors: args.impostors,
      rounds: args.rounds,
      logJsonl: args.logJsonl,
      timestamp: Date.now(),
    });
  },
});

export const getReplayByGameId = query({
  args: { gameId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("game_replays")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .unique();
  },
});

export const listReplays = query({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("game_replays")
      .order("desc")
      .take(args.limit);
  },
});
