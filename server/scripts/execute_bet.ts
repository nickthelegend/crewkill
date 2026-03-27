import "dotenv/config";
import { SuiClient } from "@onelabs/sui/client";
import { Transaction } from "@onelabs/sui/transactions";
import { Ed25519Keypair } from "@onelabs/sui/keypairs/ed25519";
import { fromB64 } from "@onelabs/sui/utils";

async function main() {
    const client = new SuiClient({ url: "https://rpc-testnet.onelabs.cc:443" });

    // Use OPERATOR_PRIV_KEY from server/.env
    const privKeyB64 = process.env.OPERATOR_PRIV_KEY || "";
    if (!privKeyB64) {
        console.error("OPERATOR_PRIV_KEY not found in .env");
        return;
    }

    let secretKey = fromB64(privKeyB64);
    if (secretKey.length === 33 && secretKey[0] === 0) {
        secretKey = secretKey.slice(1);
    }

    const keypair = Ed25519Keypair.fromSecretKey(secretKey);
    console.log(`Executing as: ${keypair.getPublicKey().toSuiAddress()}`);

    const packageId = "0xa8c65f156995f311fc7dc43a54b5194199f5d4cf39291d568f2b091c700c42d7";
    const marketId = "0x36c0d0537a94b0d5acfd3e1775cc3eafea2f04973497756c8aadfe524fc260bf";
    const suspectAddress = "0xaa114c821739da64cc7ae34a4b4dcbb3254103c0ad4c6a64e2db15200434184d";
    const amount = 100000000n; // 0.1 tokens 

    const crewTokenType = `${packageId}::crew_token::CREW_TOKEN`;

    // Find a CREW coin
    const { data: coins } = await client.getCoins({
        owner: keypair.getPublicKey().toSuiAddress(),
        coinType: crewTokenType,
    });

    if (coins.length === 0) {
        console.error("Operator has no CREW tokens!");
        return;
    }

    const tx = new Transaction();
    tx.setSender(keypair.getPublicKey().toSuiAddress());
    const [betCoin] = tx.splitCoins(tx.object(coins[0].coinObjectId), [tx.pure.u64(amount)]);
    
    tx.moveCall({
        target: `${packageId}::prediction_market::place_bet`,
        typeArguments: [crewTokenType],
        arguments: [
            tx.object(marketId),
            tx.pure.address(suspectAddress),
            betCoin
        ]
    });

    console.log("Building and executing transaction...");
    try {
        const bytes = await tx.build({ client });
        const { signature } = await keypair.signTransaction(bytes);
        
        const result = await client.executeTransactionBlock({
            transactionBlock: bytes,
            signature,
            options: {
                showEffects: true,
                showEvents: true,
            }
        });

        console.log(`Status: ${result.effects?.status.status}`);
        if (result.effects?.status.status === 'success') {
            console.log(`Success! Digest: ${result.digest}`);
        } else {
            console.error(`Execution failed: ${result.effects?.status.error}`);
        }
    } catch (err: any) {
        console.error("Execution error:", err.message);
    }
}

main().catch(console.error);
