import { SuiClient, getFullnodeUrl } from "@onelabs/sui/client";
import { Ed25519Keypair } from "@onelabs/sui/keypairs/ed25519";
import { Transaction } from "@onelabs/sui/transactions";

const client = new SuiClient({ url: getFullnodeUrl("testnet") });

// RAW SECRET KEYS (from keystore analysis, byte 1-32)
const EAGER_CYANITE_KEY = "JNxOb/MRLzCpnKdUYDsHgEYon/q7FwJUXXVZ9RyIr5M=";
const TENDER_EUCLASE_ADDR = "0x857466480a0d1f0b933d6ccf4f63c214303eba50a73f355fc1c673a85432a54b";

async function fund() {
  const keypair = Ed25519Keypair.fromSecretKey(Buffer.from(EAGER_CYANITE_KEY, 'base64'));
  const tx = new Transaction();
  
  console.log(`Funding TENDER-EUCLASE with 1.5 OCT...`);
  const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(1500000000)]);
  tx.transferObjects([coin], tx.pure.address(TENDER_EUCLASE_ADDR));

  const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: { showEffects: true }
  });
  console.log(`Funded! TX: ${result.digest}`);
}

fund().catch(console.error);
