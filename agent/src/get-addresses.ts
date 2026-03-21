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

keys.forEach((key, i) => {
  const kp = Ed25519Keypair.fromSecretKey(Buffer.from(key, 'base64'));
  console.log(`Agent ${i+1}: ${kp.toSuiAddress()}`);
});
