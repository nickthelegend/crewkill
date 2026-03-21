import { Ed25519Keypair } from '@onelabs/sui/keypairs/ed25519';

const mnemonic = "company large motor acid zoo square gloom theme heart judge december symbol";
const kp = Ed25519Keypair.deriveKeypair(mnemonic);
console.log(`Address: ${kp.toSuiAddress()}`);

// Get the raw 32-byte secret key
// @ts-ignore - access internal keypair to get raw bytes
const rawBytes = kp.keypair.secretKey.slice(0, 32);
console.log(`Raw Private Key (B64): ${Buffer.from(rawBytes).toString('base64')}`);
