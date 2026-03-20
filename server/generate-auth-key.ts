import { generateP256KeyPair } from '@privy-io/node';

async function main() {
  const { privateKey, publicKey } = await generateP256KeyPair();
  
  console.log('\n=== Generated Authorization Key Pair ===\n');
  console.log('PUBLIC KEY (register this in Privy Dashboard):');
  console.log(publicKey);
  console.log('\nPRIVATE KEY (put this in .env as PRIVY_WALLET_AUTHORIZATION_KEY):');
  console.log(privateKey);
  console.log('\n=========================================');
  console.log('\nSteps:');
  console.log('1. Go to Privy Dashboard > Authorization Keys');
  console.log('2. Create new key and paste the PUBLIC KEY above');
  console.log('3. Copy the KEY ID you receive');
  console.log('4. Update .env:');
  console.log('   PRIVY_WALLET_AUTHORIZATION_KEY_ID=<key-id-from-step-3>');
  console.log('   PRIVY_WALLET_AUTHORIZATION_KEY=<private-key-above>');
  console.log('5. Restart server and create a new agent wallet');
}

main().catch(console.error);
