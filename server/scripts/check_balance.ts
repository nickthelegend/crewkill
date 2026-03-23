import { SuiClient } from '@onelabs/sui/client';
import { Ed25519Keypair } from '@onelabs/sui/keypairs/ed25519';
import * as dotenv from 'dotenv';
dotenv.config();

async function checkBalance() {
  const rpc = process.env.ONECHAIN_RPC || 'https://rpc-testnet.onelabs.cc:443';
  const client = new SuiClient({ url: rpc });
  const operatorKey = process.env.OPERATOR_PRIV_KEY;
  if (!operatorKey) {
    console.error("No OPERATOR_PRIV_KEY");
    return;
  }
  const raw = Buffer.from(operatorKey, 'base64');
  const secretKey = raw.length === 33 ? raw.slice(1) : raw;
  const keypair = Ed25519Keypair.fromSecretKey(secretKey);
  const address = keypair.getPublicKey().toSuiAddress();
  
  console.log(`Checking balance for: ${address}`);
  const balance = await client.getBalance({ owner: address });
  console.log(`Balance: ${balance.totalBalance} MIST (${Number(balance.totalBalance) / 1e9} OCT)`);
  
  const coins = await client.getCoins({ owner: address });
  console.log(`Found ${coins.data.length} coin objects.`);
  coins.data.forEach(c => {
    console.log(`- ${c.coinObjectId}: ${c.balance} MIST`);
  });
}

checkBalance().catch(console.error);
