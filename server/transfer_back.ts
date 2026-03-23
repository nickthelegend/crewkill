import { SuiClient } from '@onelabs/sui/client';
import { Transaction } from '@onelabs/sui/transactions';
import { Ed25519Keypair } from '@onelabs/sui/keypairs/ed25519';
import { ONECHAIN_RPC } from './src/config.js';

const newKeyBase64 = "Ntf4Ld9oFq0J5Fj8kOTlkLeh9UbgTIVU67CQyfb2SHM=";
const newKeypair = Ed25519Keypair.fromSecretKey(Buffer.from(newKeyBase64, 'base64'));

const oldAddress = "0x857466480a0d1f0b933d6ccf4f63c214303eba50a73f355fc1c673a85432a54b";

async function transfer() {
    const client = new SuiClient({ url: ONECHAIN_RPC });
    console.log("Sending from:", newKeypair.getPublicKey().toSuiAddress());
    
    const tx = new Transaction();
    const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(500000000)]); // 0.5 OCT
    tx.transferObjects([coin], oldAddress);

    try {
        const result = await client.signAndExecuteTransaction({
            signer: newKeypair,
            transaction: tx,
            options: { showEffects: true }
        });
        console.log("Transfer successful:", result.digest);
    } catch (e) {
        console.error("Transfer failed:", e);
    }
}

transfer();
