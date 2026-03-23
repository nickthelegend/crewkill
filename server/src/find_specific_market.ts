import { SuiClient, getFullnodeUrl } from "@onelabs/sui/client";
import * as dotenv from "dotenv";
import crypto from "crypto";

dotenv.config({ path: "/Users/jaibajrang/Desktop/Projects/onechain/crewkill/server/.env" });

const client = new SuiClient({ url: getFullnodeUrl("testnet") });
const PACKAGE_ID = process.env.PACKAGE_ID!;

async function findEvent() {
  console.log("Searching for ALL MarketCreated events (Limit 500)...");
  let cursor = null;
  let allEvents = [];
  
  for (let i = 0; i < 5; i++) {
    const events = await client.queryEvents({
      query: { MoveEventType: `${PACKAGE_ID}::prediction_market::MarketCreated` },
      limit: 100,
      cursor,
      order: "descending"
    });
    allEvents.push(...events.data);
    if (!events.hasNextPage) break;
    cursor = events.nextCursor;
  }

  const targetRoom = "0xffa5f9e4454f5ca6cdc38a2ada719a0648ce2e2b7bb48158dacef9954341d8f2";
  const targetHash = "0x" + crypto.createHash('sha256').update(targetRoom).digest('hex');
  console.log(`Target Room: ${targetRoom}`);
  console.log(`Target Hash: ${targetHash}`);

  for (const event of allEvents) {
    const json = event.parsedJson as any;
    if (json.game_id === targetHash || json.game_id === targetRoom) {
        console.log(`MATCH FOUND! Market: ${json.market_id}`);
        return json.market_id;
    }
  }
  console.log("No match found in last 500 events.");
}

findEvent().catch(console.error);
