import { Ed25519Keypair } from '@onelabs/sui/keypairs/ed25519';
import { mnemonicToSeedSync } from 'bip39';

const mnemonic = "company large motor acid zoo square gloom theme heart judge december symbol";
const kp = Ed25519Keypair.deriveKeypair(mnemonic);
console.log(`Address: ${kp.toSuiAddress()}`);
const secretKey = kp.getSecretKey();
console.log(`Private Key (B64): ${Buffer.from(secretKey).toString('base64')}`);
