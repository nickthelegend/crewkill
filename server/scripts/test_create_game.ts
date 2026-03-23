import { ContractService } from '../src/ContractService.js';
import * as dotenv from 'dotenv';
dotenv.config();

async function testCreateGame() {
  const contract = new ContractService();
  console.log("Testing on-chain game creation...");
  
  try {
    // Attempt with exactly 10 players, 0.1 OCT, 5 tasks
    const result = await contract.createGame(10, 100000000 as any, 5);
    if (result) {
      console.log("✅ Success! Game ID:", result.gameId);
      console.log("Digest:", result.digest);
    } else {
      console.error("❌ Failed: createGame returned null.");
    }
  } catch (error: any) {
    console.error("🔥 Error during creation:", error);
    if (error.stack) console.error(error.stack);
  }
}

testCreateGame().catch(console.error);
