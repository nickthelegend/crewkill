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

    if (game.status === "COMPLETED" || game.status === "ENDED" || game.status === "SETTLED") {
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
    const betId = await ctx.db.insert("bets", {
      userId: userId!,
      address: args.address,
      gameId: args.gameId,
      selection: args.selection,
      amountMist: args.amountMist,
      status: "pending",
      txDigest: args.txDigest,
      createdAt: Date.now(),
    });

    // 3. Update total pot in games table
    const currentPot = BigInt(game.totalPot || "0");
    const newPot = currentPot + BigInt(args.amountMist);
    await ctx.db.patch(game._id, {
      totalPot: newPot.toString(),
    });

    return betId;
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
    winnerSide: v.number(), // 0 = Crew, 1 = Impostor
    impostorAddresses: v.array(v.string()), // Addresses of agents who were impostors
  },
  handler: async (ctx, args) => {
    const bets = await ctx.db
      .query("bets")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    if (bets.length === 0) return;

    const normalizedImpostors = (args.impostorAddresses || []).map((a: string) => a.toLowerCase());

    // 1. Calculate pools
    let totalPool = 0;
    let winningPool = 0;
    
    const winningBets = bets.filter(bet => {
      const isImpostor = normalizedImpostors.includes(bet.selection.toLowerCase());
      const selectedSide = isImpostor ? 1 : 0;
      return selectedSide === args.winnerSide;
    });

    for (const bet of bets) {
      totalPool += bet.amountMist;
    }
    
    for (const bet of winningBets) {
      winningPool += bet.amountMist;
    }

    const platformFeeMultiplier = 0.95; // 5% fee
    const distributablePool = totalPool * platformFeeMultiplier;

    // 2. Resolve each bet
    for (const bet of bets) {
      const isWinner = winningBets.some(wb => wb._id === bet._id);
      
      let payout = 0;
      if (isWinner && winningPool > 0) {
        // Individual winnings: (Your Bet / Win Pool) * Distributable Total
        payout = (bet.amountMist / winningPool) * distributablePool;
      }

      await ctx.db.patch(bet._id, {
        status: isWinner ? "won" : "lost",
        payout: Math.floor(payout),
      });

      // Update User stats
      if (isWinner) {
        const user = await ctx.db.get(bet.userId);
        if (user) {
          await ctx.db.patch(user._id, {
            wins: (user.wins || 0) + 1,
            xp: (user.xp || 0) + 100, // Bonus for winning prediction
          });
        }
      }
    }
    
    // 3. Mark game as settled in Convex
    const game = await ctx.db
      .query("games")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.gameId))
      .unique();
    if (game) {
      await ctx.db.patch(game._id, {
        status: "SETTLED",
        endedAt: Date.now(),
        crewmatesWon: args.winnerSide === 0,
      });
    }
  },
});

export const getBetsByGame = query({
  args: { gameId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bets")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();
  },
});
