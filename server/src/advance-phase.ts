import { SuiClient } from '@onelabs/sui/client';
import { Transaction } from '@onelabs/sui/transactions';
import { Ed25519Keypair } from '@onelabs/sui/keypairs/ed25519';
import 'dotenv/config';

const RPC_URL = 'https://rpc-testnet.onelabs.cc:443';
const PACKAGE_ID = '0x942fbf96595b0028372afa420f6dba46a90b88c3fc55fd1be189c26f3c9321f6';
const GAME_MANAGER_ID = '0xc88150479da933ccdef62687e3bb2256d3eb17cdab4d78dc773d2f4e17ad24aa';
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
