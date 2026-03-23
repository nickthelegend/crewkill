import { SuiClient, getFullnodeUrl } from "@onelabs/sui/client";
import * as dotenv from "dotenv";
import crypto from "crypto";
import { ConvexHttpClient } from "convex/browser";

dotenv.config({ path: "/Users/jaibajrang/Desktop/Projects/onechain/crewkill/server/.env" });

const client = new SuiClient({ url: getFullnodeUrl("testnet") });
const CONVEX_URL = process.env.CONVEX_URL!;
const convex = new ConvexHttpClient(CONVEX_URL);

const PACKAGE_ID = process.env.PACKAGE_ID!;

async function findEvent() {
  const targetRoom = "0xcbbe4c6e84421cdf2606621591593e8406a962b70a84f099a7a73753661ac1ba";
  const targetHash = "0x" + crypto.createHash('sha256').update(targetRoom).digest('hex');
  console.log(`Target Hash: ${targetHash}`);

  console.log("Searching for MarketCreated events...");
  const events = await client.queryEvents({
    query: { MoveEventType: `${PACKAGE_ID}::prediction_market::MarketCreated` },
    limit: 50,
    order: "descending"
  });

  for (const event of events.data) {
    const json = event.parsedJson as any;
    if (json.game_id === targetHash || json.game_id === targetRoom) {
        const marketId = json.market_id;
        console.log(`MATCH! Market: ${marketId}. Updating Convex...`);
        await convex.mutation("crewkill:updateGameMarketId" as any, {
          roomId: targetRoom,
          marketId: marketId
        });
        console.log("Success! Convex synced.");
        return;
    }
  }
  console.log("No market found on-chain for this room ID yet.");
}

findEvent().catch(console.error);
