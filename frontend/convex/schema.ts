import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    address: v.string(), // Sui Address
    name: v.optional(v.string()),
    xp: v.number(),
    gamesPlayed: v.number(),
    wins: v.number(),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_address", ["address"]),

  bets: defineTable({
    userId: v.id("users"),
    address: v.string(), // Sui Address
    gameId: v.string(),  // Sui Object ID
    selection: v.string(), // Address of the agent betted on
    amountMist: v.number(),
    status: v.string(), // "pending", "won", "lost"
    payout: v.optional(v.number()),
    txDigest: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_game", ["gameId"])
    .index("by_address", ["address"]),

  game_replays: defineTable({
    gameId: v.string(),
    winnerSide: v.number(),
    blobId: v.string(), // Walrus or Arweave
    players: v.array(v.string()),
    impostors: v.array(v.string()),
    rounds: v.number(),
    logJsonl: v.string(), // Captured log
    timestamp: v.number(),
  }).index("by_game", ["gameId"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(), // "bet_won", "xp_earned"
    message: v.string(),
    read: v.boolean(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
});
