import { SuiClient, getFullnodeUrl } from "@onelabs/sui/client";
import * as dotenv from "dotenv";
import crypto from "crypto";
import { ConvexHttpClient } from "convex/browser";

dotenv.config({ path: "/Users/jaibajrang/Desktop/Projects/onechain/crewkill/server/.env" });

const client = new SuiClient({ url: getFullnodeUrl("testnet") });
const CONVEX_URL = process.env.CONVEX_URL!;
const convex = new ConvexHttpClient(CONVEX_URL);

const PACKAGE_ID = process.env.PACKAGE_ID!;

async function sync() {
  const targetRoom = "0x3646f52a065b4c99376b8fc0156293664725d70aae893539f7fe2e21b6411416";
  const targetHash = "0x" + crypto.createHash('sha256').update(targetRoom).digest('hex');
  console.log(`Syncing market for hash: ${targetHash}`);

  const events = await client.queryEvents({
    query: { MoveEventType: `${PACKAGE_ID}::prediction_market::MarketCreated` },
    limit: 20,
    order: "descending"
  });

  for (const event of events.data) {
    const json = event.parsedJson as any;
    console.log(`Checking ${json.game_id}...`);
    if (json.game_id === targetHash) {
      console.log(`FOUND! Market: ${json.market_id}. Updating Convex...`);
      await convex.mutation("crewkill:updateGameMarketId" as any, {
        roomId: targetRoom,
        marketId: json.market_id
      });
      console.log("Sync complete.");
      return;
    }
  }
}

sync().catch(console.error);
