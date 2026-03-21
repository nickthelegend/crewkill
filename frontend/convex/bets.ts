import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const placeBet = mutation({
  args: {
    address: v.string(),
    gameId: v.string(),
    selection: v.string(),
    amountMist: v.number(),
    txDigest: v.string(),
  },
  handler: async (ctx, args) => {
    // 0. Check if betting is still open
    const game = await ctx.db
      .query("games")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.gameId))
      .unique();

    if (!game) {
      throw new Error(`Game not found: ${args.gameId}`);
    }

    if (game.bettingEndsAt && Date.now() >= game.bettingEndsAt) {
      throw new Error("Betting is closed for this game (3 mins before start)");
    }

    if (game.status !== "CREATED") {
      throw new Error(`Betting is closed for games in ${game.status} status`);
    }

    // 1. Get or create user
    const user = await ctx.db
      .query("users")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .unique();

    const userId = user ? user._id : await ctx.db.insert("users", {
      address: args.address,
      xp: 0,
      gamesPlayed: 0,
      wins: 0,
      createdAt: Date.now(),
    });

    // 2. Create bet entry
    return await ctx.db.insert("bets", {
      userId: userId!,
      address: args.address,
      gameId: args.gameId,
      selection: args.selection,
      amountMist: args.amountMist,
      status: "pending",
      txDigest: args.txDigest,
      createdAt: Date.now(),
    });
  },
});

export const getBetsByUser = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bets")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .order("desc")
      .collect();
  },
});

export const resolveBets = mutation({
  args: {
    gameId: v.string(),
    winnerSide: v.number(),
    winningAgentAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const bets = await ctx.db
      .query("bets")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    for (const bet of bets) {
      const isWin = bet.selection === args.winningAgentAddress;
      await ctx.db.patch(bet._id, {
        status: isWin ? "won" : "lost",
        payout: isWin ? bet.amountMist * 1.95 : 0, // Mock 5% fee
      });

      // Update User wins
      if (isWin) {
        const user = await ctx.db.get(bet.userId);
        if (user) {
          await ctx.db.patch(user._id, {
            wins: user.wins + 1,
            xp: user.xp + 100, // XP for winning a bet
          });
        }
      }
    }
  },
});
