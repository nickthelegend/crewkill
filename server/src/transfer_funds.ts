import { SuiClient, getFullnodeUrl } from "@onelabs/sui/client";
import { Ed25519Keypair } from "@onelabs/sui/keypairs/ed25519";
import { Transaction } from "@onelabs/sui/transactions";
import * as dotenv from "dotenv";

dotenv.config({ path: "/Users/jaibajrang/Desktop/Projects/onechain/crewkill/server/.env" });

const client = new SuiClient({ url: getFullnodeUrl("testnet") });
const OPERATOR_PRIV_KEY = process.env.OPERATOR_PRIV_KEY!;
const TO_ADDRESS = "0xf097e2907931ef20ab18efda4d476c8da5513cbd035556517afb0f83fa345209";

async function send() {
  const keypair = Ed25519Keypair.fromSecretKey(Buffer.from(OPERATOR_PRIV_KEY, 'base64'));
  const tx = new Transaction();
  
  console.log(`Sending 1.0 OCT from ${keypair.toSuiAddress()} to ${TO_ADDRESS}...`);
  
  const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(1000000000)]);
  tx.transferObjects([coin], tx.pure.address(TO_ADDRESS));

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showEffects: true }
  });

  if (result.effects?.status.status === 'success') {
    console.log(`Success! TX: ${result.digest}`);
  } else {
    console.error(`Failed: ${result.effects?.status.error}`);
  }
}

send().catch(console.error);
