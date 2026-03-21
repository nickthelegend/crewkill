import { SuiClient } from '@onelabs/sui/client';
import { Transaction } from '@onelabs/sui/transactions';
import { Ed25519Keypair } from '@onelabs/sui/keypairs/ed25519';
import 'dotenv/config';

const RPC_URL = 'https://rpc-testnet.onelabs.cc:443';
const PACKAGE_ID = '0xada4ae4117b0e7ab228e8828c5d658ca048379741bda051361dca52342c4d43a';
const GAME_MANAGER_ID = '0x5c4deb1c8987531ebbfe43a2b1f2e2c528a7d411b8c5f964f25f9732225b43f7';
const GAME_ID = process.argv[2];

if (!GAME_ID) {
  console.error("Usage: npx tsx src/assign-roles.ts <GAME_ID>");
  process.exit(1);
}

const client = new SuiClient({ url: RPC_URL });
const keypair = Ed25519Keypair.fromSecretKey(Buffer.from(process.env.OPERATOR_PRIV_KEY!, 'base64'));

async function main() {
  console.log(`Assigning roles randomly for game: ${GAME_ID}...`);
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::game_settlement::assign_roles_randomly`,
    arguments: [
      tx.object(GAME_ID),
      tx.object(GAME_MANAGER_ID),
      tx.object('0x8'), // Random object
    ],
  });

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showEffects: true },
  });

  console.log("Roles assigned! Status:", result.effects?.status.status);
}

main().catch(console.error);
