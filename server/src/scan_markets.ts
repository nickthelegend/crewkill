import { SuiClient, getFullnodeUrl } from "@onelabs/sui/client";
import * as dotenv from "dotenv";
import crypto from "crypto";
import { ConvexHttpClient } from "convex/browser";

dotenv.config({ path: "/Users/jaibajrang/Desktop/Projects/onechain/crewkill/server/.env" });

const client = new SuiClient({ url: getFullnodeUrl("testnet") });
const CONVEX_URL = process.env.CONVEX_URL!;
const convex = new ConvexHttpClient(CONVEX_URL);

const PACKAGE_ID = process.env.PACKAGE_ID!;

async function scan() {
  const targetRoom = "0xcbbe4c6e84421cdf2606621591593e8406a962b70a84f099a7a73753661ac1ba";
  const targetHash = "0x" + crypto.createHash('sha256').update(targetRoom).digest('hex');
  console.log(`Scanning for MarketCreated events for hash: ${targetHash}`);

  // Query events by type - this is the most reliable
  const events = await client.queryEvents({
    query: { MoveEventType: `${PACKAGE_ID}::prediction_market::MarketCreated` },
    limit: 1000,
    order: "descending"
  });

  console.log(`Found ${events.data.length} recent market events.`);
  for (const event of events.data) {
    const json = event.parsedJson as any;
    if (json.game_id === targetHash || json.game_id === targetRoom) {
      console.log(`MATCH! Market: ${json.market_id}`);
      await convex.mutation("crewkill:updateGameMarketId" as any, {
        roomId: targetRoom,
        marketId: json.market_id
      });
      console.log("Convex updated.");
      return;
    }
  }
  
  // If not found in events, maybe it was created under the RAW roomId?
  // Let's print all recent game_ids to be sure.
  console.log("No exact match. Last 5 unique game_id hashes in events:");
  const unique = new Set(events.data.map(e => (e.parsedJson as any).game_id));
  console.log(Array.from(unique).slice(0, 5));
}

scan().catch(console.error);
