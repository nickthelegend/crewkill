import "dotenv/config";
import { WebSocket } from "ws";
(global as any).WebSocket = WebSocket;
import { contractService } from "../src/ContractService.js";
import { ConvexHttpClient } from "convex/browser";

async function main() {
    const convexUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL || "";
    const convex = new ConvexHttpClient(convexUrl);

    console.log("Creating FULL test room (On-Chain + Convex)...");
    const maxPlayers = 10;
    const wagerAmount = 100000000;
    const tasksRequired = 5;

    console.log("1. Creating game on-chain...");
    const onChainResult = await contractService.createGame(maxPlayers, wagerAmount, tasksRequired);
    if (!onChainResult) {
        console.error("Failed to create game on-chain");
        return;
    }
    const roomId = onChainResult.gameId;
    console.log(`Game created: ${roomId}`);

    // Mock players (all 9 agents)
    const playerAddresses = [
        "0xaa1cba9ba129198424795eec3db35f79ae4eaf124389438464ca86b2c80d863d",
        "0xaa15f15cb0a588d449ea3b9b2466661c0207c1cc37317354a999170725776232",
        "0xaa1e782b09efc31496aae26319f6b638d5cfc2eaecd63b94bfb940ed13c974f1",
        "0xaa10fc88e591d8e4b0aa1929e6bd5415e58219dcc9ecc3f445699fad7ed9789f",
        "0xaa1dbeb8bade54747fca435cfa11a22e10505be69cbbfe643ac916553d8f27cc",
        "0xaa1aac5f410fd894b99b3a58da2d4ee7d57673fd95ff6554636bf2f1e0e38a23",
        "0xaa1d286b68703d647d7b5a75810c82f9fbf8e96b41353694b528979e3312016a",
        "0xaa14eccd4ea00ac461d83d94fe9b349bfc0678745bb2e7b44e9a35ff3c161ab6",
        "0xaa1d49983e3e8654db0a5d276044055938b1906f78cf5ff4047b9d85c606af35"
    ];

    console.log(`2. Creating market on-chain with ${playerAddresses.length} players...`);
    const marketId = await contractService.createMarket(roomId, playerAddresses);
    
    if (!marketId) {
        console.error("Market creation failed");
        return;
    }
    console.log(`Market created: ${marketId}`);

    console.log("3. Registering in Convex...");
    const now = Date.now();
    const scheduledAt = now + 5 * 60 * 1000; // 5 min from now
    const bettingEndsAt = scheduledAt;

    await convex.mutation("crewkill:createScheduledGame" as any, {
        roomId,
        scheduledAt,
        bettingEndsAt,
    });

    // Update with marketId 
    await convex.mutation("crewkill:updateGameMarketId" as any, {
        roomId,
        marketId,
    });

    // Update with players
    await convex.mutation("crewkill:updateGamePlayers" as any, {
        roomId,
        players: playerAddresses.map((addr, i) => ({
            address: addr,
            name: `Agent ${i+1}`,
            colorId: i,
            isAIAgent: true,
            agentPersona: { emoji: "🤖", title: "Test Bot", playstyle: "Adaptive" }
        })),
    });

    console.log("\n===========================================");
    console.log("SUCCESS! Test room is ready.");
    console.log(`Room ID:   ${roomId}`);
    console.log(`Market ID: ${marketId}`);
    console.log(`URL:       http://localhost:3000/game/${roomId}/bet`);
    console.log("===========================================\n");
}

main().catch(console.error);
