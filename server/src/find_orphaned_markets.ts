import { SuiClient, getFullnodeUrl } from "@onelabs/sui/client";
import * as dotenv from "dotenv";

dotenv.config({ path: "/Users/jaibajrang/Desktop/Projects/onechain/crewkill/server/.env" });

const client = new SuiClient({ url: getFullnodeUrl("testnet") });
const PACKAGE_ID = process.env.PACKAGE_ID!;

async function findEvent() {
  console.log("Searching for MarketCreated events...");
  const events = await client.queryEvents({
    query: { MoveEventType: `${PACKAGE_ID}::prediction_market::MarketCreated` },
    limit: 50,
    order: "descending"
  });

  console.log(`Found ${events.data.length} events.`);
  for (const event of events.data) {
    const json = event.parsedJson as any;
    console.log(`Game: ${json.game_id} -> Market: ${json.market_id}`);
  }
}

findEvent().catch(console.error);
