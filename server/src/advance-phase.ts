import { SuiClient } from '@onelabs/sui/client';
import { Transaction } from '@onelabs/sui/transactions';
import { Ed25519Keypair } from '@onelabs/sui/keypairs/ed25519';
import 'dotenv/config';

const RPC_URL = 'https://rpc-testnet.onelabs.cc:443';
const PACKAGE_ID = '0xf2f49ca2d13215c2f33274096544594a0d8d7cd2a84b46f4c76a46db18cce181';
const GAME_MANAGER_ID = '0x3b27263b05400d61dcb41a56d19d7954cc1a10fe396e03f51bd0c52d0586e990';
const GAME_ID = process.argv[2];

if (!GAME_ID) {
  console.error("Usage: npx tsx src/advance-phase.ts <GAME_ID>");
  process.exit(1);
}

const client = new SuiClient({ url: RPC_URL });
const keypair = Ed25519Keypair.fromSecretKey(Buffer.from(process.env.OPERATOR_PRIV_KEY!, 'base64'));

async function main() {
  console.log(`Advancing phase for game: ${GAME_ID}...`);
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::game_settlement::advance_phase`,
    arguments: [
      tx.object(GAME_ID),
      tx.object(GAME_MANAGER_ID),
    ],
  });

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showEffects: true },
  });

  console.log("Phase advanced! Status:", result.effects?.status.status);
}

main().catch(console.error);
