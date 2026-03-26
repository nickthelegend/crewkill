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

    // Mock players (ONLY 1 to test gas)
    const players = [
        "0xaa1cba9ba129198424795eec3db35f79ae4eaf124389438464ca86b2c80d863d"
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
