import { requestSuiFromFaucetV0 } from '@onelabs/sui/faucet';
import { Ed25519Keypair } from '@onelabs/sui/keypairs/ed25519';
import 'dotenv/config';

const keys = [
  process.env.PRIVATE_KEY_1,
  process.env.PRIVATE_KEY_2,
  process.env.PRIVATE_KEY_3,
  process.env.PRIVATE_KEY_4,
  process.env.PRIVATE_KEY_5,
  process.env.PRIVATE_KEY_6,
].filter((k): k is string => !!k);

const FAUCET_HOST = 'https://faucet-testnet.onelabs.cc';

async function fundAll() {
  for (const [i, key] of keys.entries()) {
    const kp = Ed25519Keypair.fromSecretKey(Buffer.from(key, 'base64'));
    const address = kp.toSuiAddress();
    console.log(`Funding Agent ${i+1}: ${address}...`);
    try {
      const resp = await requestSuiFromFaucetV0({
        host: FAUCET_HOST,
        recipient: address,
      });
      console.log(`Agent ${i+1} fund success:`, resp);
    } catch (e) {
      console.error(`Agent ${i+1} fund failed:`, e);
    }
    // Small delay between requests
    await new Promise(r => setTimeout(r, 1000));
  }
}

fundAll();
