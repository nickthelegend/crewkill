import { Ed25519Keypair } from '@onelabs/sui/keypairs/ed25519';

const mnemonic = "mouse defy rate drift first hollow legend mushroom wear project major giggle";
const kp = Ed25519Keypair.deriveKeypair(mnemonic);
const secretKeyBytes = kp.keypair.secretKey.slice(0, 32); 
const base64Key = Buffer.from(secretKeyBytes).toString('base64');
console.log('BASE64:', base64Key);
console.log('ADDRESS:', kp.getPublicKey().toSuiAddress());
