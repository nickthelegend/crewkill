import { ConvexHttpClient } from "convex/browser";
import * as dotenv from "dotenv";
import { SuiClient, getFullnodeUrl } from "@onelabs/sui/client";
import { Ed25519Keypair } from "@onelabs/sui/keypairs/ed25519";
import { Transaction } from "@onelabs/sui/transactions";
import crypto from "crypto";

dotenv.config({ path: "/Users/jaibajrang/Desktop/Projects/onechain/crewkill/server/.env" });

const CONVEX_URL = process.env.CONVEX_URL!;
const convex = new ConvexHttpClient(CONVEX_URL);
const client = new SuiClient({ url: getFullnodeUrl("testnet") });

const PACKAGE_ID = process.env.PACKAGE_ID!;
const MARKET_REGISTRY_ID = process.env.MARKET_REGISTRY_ID!;
const OPERATOR_PRIV_KEY = process.env.OPERATOR_PRIV_KEY!;

async function fetchGasPayment(tx: Transaction, address: string) {
    const coins = await client.getCoins({ owner: address });
    const sorted = coins.data.sort((a, b) => Number(b.balance) - Number(a.balance));
    // Alternate coin selection to bypass locks
    const gasCoin = (Date.now() % 2 === 0) ? sorted[0] : (sorted[1] || sorted[0]);
    tx.setGasPayment([{
      objectId: gasCoin.coinObjectId,
      version: gasCoin.version,
      digest: gasCoin.digest,
    }]);
}

async function fix() {
  console.log("Fetching games...");
  const games = await convex.query("crewkill:listGames" as any, {});
  const keypair = Ed25519Keypair.fromSecretKey(Buffer.from(OPERATOR_PRIV_KEY, 'base64'));
  const address = keypair.toSuiAddress();

  for (const game of games) {
    if (!game.marketId) {
      console.log(`Fixing room ${game.roomId}...`);
      
      const playerAddresses = game.players?.map((p: any) => p.address) || [];
      if (playerAddresses.length < 1) continue;

      let success = false;
      for (let attempt = 1; attempt <= 10; attempt++) {
        try {
          console.log(`Deploying market (Attempt ${attempt}/10)...`);
          const tx = new Transaction();
          const hashedId = crypto.createHash('sha256').update(game.roomId).digest('hex');
          const suiGameId = `0x${hashedId}`;

          tx.moveCall({
            target: `${PACKAGE_ID}::prediction_market::create_market`,
            arguments: [
              tx.object(MARKET_REGISTRY_ID),
              tx.pure.address(suiGameId),
              tx.pure.vector('address', playerAddresses),
            ],
          });
          await fetchGasPayment(tx, address);

          const result = await client.signAndExecuteTransaction({
            signer: keypair,
            transaction: tx,
            options: { showEvents: true }
          });

          const event = result.events?.find(e => e.type.includes('::MarketCreated'));
          const marketId = (event?.parsedJson as any)?.market_id;

          if (marketId) {
            console.log(`Market created: ${marketId}. Updating Convex...`);
            await convex.mutation("crewkill:updateGameMarketId" as any, {
              roomId: game.roomId,
              marketId: marketId
            });
            console.log(`Sync complete for ${game.roomId}`);
            success = true;
            break;
          }
        } catch (e: any) {
          console.error(`Attempt ${attempt} failed: ${e.message}`);
          await new Promise(r => setTimeout(r, 5000));
        }
      }
    }
  }
}

fix().catch(console.error);
