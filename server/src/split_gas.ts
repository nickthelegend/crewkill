import { SuiClient } from "@onelabs/sui/client";
import { Ed25519Keypair } from "@onelabs/sui/keypairs/ed25519";
import { Transaction } from "@onelabs/sui/transactions";

// Direct reliable RPC
const client = new SuiClient({ url: "https://fullnode.testnet.sui.io:443" });

const TENDER_EUCLASE_RAW = "AIBTacrhqOvKQ5YPxPfA9RQ/ueqfoeItHu68ATCeMdoK=";

async function split() {
  const kpRaw = Buffer.from(TENDER_EUCLASE_RAW, 'base64');
  const keypair = Ed25519Keypair.fromSecretKey(kpRaw.slice(1));
  const address = keypair.toSuiAddress();
  console.log(`Splitting funds for ${address} via direct RPC...`);

  const tx = new Transaction();
  const res_coins = tx.splitCoins(tx.gas, [
      tx.pure.u64(200000000), tx.pure.u64(200000000), tx.pure.u64(200000000),
      tx.pure.u64(200000000), tx.pure.u64(200000000)
  ]);
  
  for (let i = 0; i < 5; i++) {
     tx.transferObjects([res_coins[i]], tx.pure.address(address));
  }

  try {
    const res = await client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: { showEffects: true }
    });
    console.log(`Split Success! TX: ${res.digest}`);
  } catch (e: any) {
    console.error(`Attempt failed: ${e.message}`);
  }
}

split().catch(console.error);
