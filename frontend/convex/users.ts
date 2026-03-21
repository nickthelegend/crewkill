import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getOrCreateUser = mutation({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .unique();

    if (user) return user;

    const id = await ctx.db.insert("users", {
      address: args.address,
      xp: 0,
      gamesPlayed: 0,
      wins: 0,
      createdAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

export const addXP = mutation({
  args: { address: v.string(), amount: v.number() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .unique();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      xp: user.xp + args.amount,
    });

    // Award notification
    await ctx.db.insert("notifications", {
      userId: user._id,
      type: "xp_earned",
      message: `You earned ${args.amount} XP!`,
      read: false,
      createdAt: Date.now(),
    });
  },
});

export const getProfile = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .unique();
    return user;
  },
});
