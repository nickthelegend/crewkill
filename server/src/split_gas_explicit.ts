import { SuiClient, getFullnodeUrl } from "@onelabs/sui/client";
import { Ed25519Keypair } from "@onelabs/sui/keypairs/ed25519";
import { Transaction } from "@onelabs/sui/transactions";

const client = new SuiClient({ url: "https://fullnode.testnet.sui.io:443" });

const TENDER_EUCLASE_RAW = "AIBTacrhqOvKQ5YPxPfA9RQ/ueqfoeItHu68ATCeMdoK=";
const ADDR = "0x857466480a0d1f0b933d6ccf4f63c214303eba50a73f355fc1c673a85432a54b";

async function split() {
  const kpRaw = Buffer.from(TENDER_EUCLASE_RAW, 'base64');
  const keypair = Ed25519Keypair.fromSecretKey(kpRaw.slice(1));
  
  const tx = new Transaction();
  
  // EXPLICIT GAS PAYMENT - BYPASS THE LOCK!
  tx.setGasPayment([{
      objectId: "0x48f3b0e90853dccda7bcdbc79ee8a434680edf3447221b780c8c678985bc4811",
      version: "397598680",
      digest: "HaRbdMF2pGcvXQCnThNBL6ymPZDVjzx5bdzj9r39Kn3J"
  }]);
  tx.setGasBudget(50000000);

  const res_coins = tx.splitCoins(tx.gas, [
      tx.pure.u64(300000000), tx.pure.u64(300000000), tx.pure.u64(300000000),
      tx.pure.u64(300000000), tx.pure.u64(300000000)
  ]);
  
  for (let i = 0; i < 5; i++) {
     tx.transferObjects([res_coins[i]], tx.pure.address(ADDR));
  }

  console.log(`Executing EXPLICIT split for ${ADDR}...`);
  const res = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: { showEffects: true }
  });
  console.log(`Success! TX: ${res.digest}`);
}

split().catch(console.error);
