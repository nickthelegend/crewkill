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

  operators: defineTable({
    name: v.string(),
    operatorKey: v.string(),
    walletAddress: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_operatorKey", ["operatorKey"])
    .index("by_wallet", ["walletAddress"]),

  agents: defineTable({
    walletAddress: v.string(),
    name: v.string(),
    operatorId: v.id("operators"),
    gamesPlayed: v.number(),
    wins: v.number(),
    losses: v.number(),
    kills: v.number(),
    tasksCompleted: v.number(),
    balance: v.string(), // in wei as string
    totalDeposited: v.string(),
    totalWon: v.string(),
    totalLost: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_wallet", ["walletAddress"])
    .index("by_operator", ["operatorId"]),

  games: defineTable({
    roomId: v.string(),
    status: v.string(), // "CREATED", "ACTIVE", "SETTLED", "CANCELLED"
    phase: v.string(), // "lobby", "playing", "ended"
    crewmatesWon: v.optional(v.boolean()),
    winReason: v.optional(v.string()),
    totalPot: v.string(),
    winningsPerPlayer: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    scheduledAt: v.optional(v.number()),
    bettingEndsAt: v.optional(v.number()),
    players: v.optional(v.array(v.object({
      address: v.string(),
      name: v.string(),
      colorId: v.number(),
    }))),
    createdAt: v.number(),
    marketId: v.optional(v.string()),
    settlementTxHash: v.optional(v.string()),
  }).index("by_roomId", ["roomId"])
    .index("by_status", ["status"]),

  transactions: defineTable({
    type: v.string(), // "DEPOSIT", "WAGER", "WINNINGS", "REFUND", "WITHDRAWAL"
    walletAddress: v.string(),
    amount: v.string(), // in wei
    gameRoomId: v.optional(v.string()),
    txHash: v.optional(v.string()),
    blockNumber: v.optional(v.number()),
    description: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_wallet", ["walletAddress"])
    .index("by_type", ["type"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(), // "bet_won", "xp_earned"
    message: v.string(),
    read: v.boolean(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
});
