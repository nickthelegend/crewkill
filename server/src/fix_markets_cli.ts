import { ConvexHttpClient } from "convex/browser";
import * as dotenv from "dotenv";
import { execSync } from "child_process";
import crypto from "crypto";

dotenv.config({ path: "/Users/jaibajrang/Desktop/Projects/onechain/crewkill/server/.env" });

const CONVEX_URL = process.env.CONVEX_URL!;
const convex = new ConvexHttpClient(CONVEX_URL);

const PACKAGE_ID = process.env.PACKAGE_ID!;
const MARKET_REGISTRY_ID = process.env.MARKET_REGISTRY_ID!;

async function fix() {
  console.log("Fetching games...");
  const games = await convex.query("crewkill:listGames" as any, {});
  
  for (const game of games) {
    if (!game.marketId) {
      console.log(`Fixing room ${game.roomId}...`);
      
      const playerAddresses = game.players?.map((p: any) => p.address) || [];
      if (playerAddresses.length < 1) continue;

      const hashedId = crypto.createHash('sha256').update(game.roomId).digest('hex');
      const suiGameId = `0x${hashedId}`;
      const playersArg = `[${playerAddresses.join(',')}]`;

      console.log(`Deploying market via CLI (eager-cyanite)...`);
      // Note: We already switched to eager-cyanite in the CLI
      const cmd = `one client call --package ${PACKAGE_ID} --module prediction_market --function create_market --args ${MARKET_REGISTRY_ID} ${suiGameId} "${playersArg}" --gas-budget 100000000 --json`;
      
      try {
        const output = execSync(cmd).toString();
        const result = JSON.parse(output);
        
        // In the CLI output, events are in objectChanges or specifically in events if --json is used.
        // Let's look for events specifically.
        const event = result.events?.find((e: any) => e.type.includes('::MarketCreated'));
        const marketId = event?.parsedJson?.market_id;

        if (marketId) {
          console.log(`Market created: ${marketId}. Updating Convex...`);
          await convex.mutation("crewkill:updateGameMarketId" as any, {
            roomId: game.roomId,
            marketId: marketId
          });
          console.log("Sync complete.");
        } else {
             console.log("No market event found, but command succeeded?");
             console.log("Result:", JSON.stringify(result, null, 2));
        }
      } catch (e: any) {
        console.error(`CLI execution failed: ${e.message}`);
      }
    }
  }
}

fix().catch(console.error);
