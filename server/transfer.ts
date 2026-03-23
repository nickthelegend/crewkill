import { SuiClient } from '@onelabs/sui/client';
import { Transaction } from '@onelabs/sui/transactions';
import { Ed25519Keypair } from '@onelabs/sui/keypairs/ed25519';
import { ONECHAIN_RPC } from './src/config.js';

const oldKeyBase64 = "gFNpyuGo68pDlg/E98D1FD+56p+h4i0e7rwBMJ4x2go=";
const oldKeypair = Ed25519Keypair.fromSecretKey(Buffer.from(oldKeyBase64, 'base64'));

const newAddress = "0x5c2e0472f92aef6a680cef592845927cc16298b7189828f770c67860d3368fb7";

async function transfer() {
    const client = new SuiClient({ url: ONECHAIN_RPC });
    console.log("Sending from:", oldKeypair.getPublicKey().toSuiAddress());
    
    const tx = new Transaction();
    const [coin] = tx.splitCoins(tx.gas, [1000000000]); // 1 OCT
    tx.transferObjects([coin], newAddress);

    try {
        const result = await client.signAndExecuteTransaction({
            signer: oldKeypair,
            transaction: tx,
            options: { showEffects: true }
        });
        console.log("Transfer successful:", result.digest);
    } catch (e) {
        console.error("Transfer failed:", e);
    }
}

transfer();
