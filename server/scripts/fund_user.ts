import { SuiClient, getFullnodeUrl } from '@onelabs/sui/client';
import { Ed25519Keypair } from '@onelabs/sui/keypairs/ed25519';
import { Transaction } from '@onelabs/sui/transactions';
import * as dotenv from 'dotenv';
import { fromB64 } from '@onelabs/sui/utils';

dotenv.config();

const PRIV_KEY = process.env.OPERATOR_PRIV_KEY!;
const TARGET_ADDRESS = "0xf097e2907931ef20ab18efda4d476c8da5513cbd035556517afb0f83fa345209";
const AMOUNT = 0.05 * 10**9; // 0.05 ONE

async function fundUser() {
    const raw = Buffer.from(PRIV_KEY, 'base64');
    const secretKey = raw.length === 33 ? raw.slice(1) : raw;
    const keypair = Ed25519Keypair.fromSecretKey(secretKey);
    const client = new SuiClient({ url: 'https://rpc-testnet.onelabs.cc:443' });

    console.log(`Operator Address: ${keypair.getPublicKey().toSuiAddress()}`);
    console.log(`Funding target: ${TARGET_ADDRESS} with ${AMOUNT / 1e9} SUI...`);

    const tx = new Transaction();
    const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(AMOUNT)]);
    tx.transferObjects([coin], tx.pure.address(TARGET_ADDRESS));

    try {
        const result = await client.signAndExecuteTransaction({ 
            signer: keypair, 
            transaction: tx,
            options: { showEffects: true }
        });
        
        console.log(`SUCCESS! Digest: ${result.digest}`);
        console.log(`Status: ${result.effects?.status.status}`);
    } catch (e: any) {
        console.error(`FAILED: ${e.message}`);
    }
}

fundUser();
