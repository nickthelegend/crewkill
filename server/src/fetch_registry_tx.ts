import { SuiClient, getFullnodeUrl } from "@onelabs/sui/client";
import * as dotenv from "dotenv";

dotenv.config({ path: "/Users/jaibajrang/Desktop/Projects/onechain/crewkill/server/.env" });

const client = new SuiClient({ url: getFullnodeUrl("testnet") });
const MARKET_REGISTRY_ID = process.env.MARKET_REGISTRY_ID!;

async function fetchTX() {
  console.log(`Fetching last 100 transactions to registry ${MARKET_REGISTRY_ID}...`);
  const txs = await client.queryTransactionBlocks({
    filter: { InputObject: MARKET_REGISTRY_ID },
    limit: 100,
    options: { showEvents: true }
  });

  console.log(`Found ${txs.data.length} transactions.`);
  for (const tx of txs.data) {
     const marketEvent = tx.events?.find(e => e.type.includes('::MarketCreated'));
     if (marketEvent) {
        const json = marketEvent.parsedJson as any;
        console.log(`Game: ${json.game_id} -> Market: ${json.market_id}`);
     }
  }
}

fetchTX().catch(console.error);
