import "dotenv/config";
import { WebSocket } from "ws";
(global as any).WebSocket = WebSocket;
import { contractService } from "../src/ContractService.js";

async function main() {
    console.log("Creating market manually for a test room...");
    const maxPlayers = 10;
    const wagerAmount = 100000000;
    const tasksRequired = 5;

    console.log("1. Creating game on-chain...");
    const onChainResult = await contractService.createGame(maxPlayers, wagerAmount, tasksRequired);
    if (!onChainResult) {
        console.error("Failed to create game on-chain");
        return;
    }
    console.log(`Game created: ${onChainResult.gameId}`);

    // Mock players (8 AI agents for testing)
    const players = [
      "0xaa13bc492c3000b054a5d03661058512c18989f0dd8a67c2b782a13190000001",
      "0xaa13bc492c3000b054a5d03661058512c18989f0dd8a67c2b782a13190000002",
      "0xaa13bc492c3000b054a5d03661058512c18989f0dd8a67c2b782a13190000003",
      "0xaa13bc492c3000b054a5d03661058512c18989f0dd8a67c2b782a13190000004",
      "0xaa13bc492c3000b054a5d03661058512c18989f0dd8a67c2b782a13190000005",
      "0xaa13bc492c3000b054a5d03661058512c18989f0dd8a67c2b782a13190000006",
      "0xaa13bc492c3000b054a5d03661058512c18989f0dd8a67c2b782a13190000007",
      "0xaa13bc492c3000b054a5d03661058512c18989f0dd8a67c2b782a13190000008"
    ];

    console.log(`2. Creating market on-chain with ${players.length} players...`);
    const marketId = await contractService.createMarket(onChainResult.gameId, players);
    
    if (marketId) {
        console.log(`SUCCESS! Market created: ${marketId}`);
        console.log(`Now you can bet on any of the ${players.length} players in market ${marketId}`);
        console.log(`Game ID (Room ID): ${onChainResult.gameId}`);
    } else {
        console.error("Market creation failed");
    }
}

main().catch(console.error);
