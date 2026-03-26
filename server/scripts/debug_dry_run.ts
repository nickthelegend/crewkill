import "dotenv/config";
import { SuiClient } from "@onelabs/sui/client";
import { Transaction } from "@onelabs/sui/transactions";

async function main() {
    const client = new SuiClient({ url: "https://rpc-testnet.onelabs.cc:443" });

    const packageId = "0x3aca3f16d20a6d0cfd6400b8f8c4591d2dc136037ab3c94cad32fb32f190f0e5";
    const marketId = "0x37aa56043aba23146fba159271114e6f80ee33ae022bf8d8e88b598b95b03673";
    const suspectAddress = "0xaa1e970cdf600544667a07140505c8112c5d49388c5ca914c8ab6eceee82e61e";
    const coinId = "0x7d8b1763558b24775b0cacf9c0138258575eee1dcbc540d83266983b010b5187";
    const amount = 10000000n; // 0.01 OCT

    const tx = new Transaction();
    
    // Commands: split coin and call place_bet
    const [betCoin] = tx.splitCoins(tx.object(coinId), [tx.pure.u64(amount)]);
    
    tx.moveCall({
        target: `${packageId}::prediction_market::place_bet`,
        arguments: [
            tx.object(marketId),
            tx.pure.address(suspectAddress),
            betCoin
        ]
    });

    tx.setSender("0xf097e2907931ef20ab18efda4d476c8da5513cbd035556517afb0f83fa345209");

    console.log("Running dry run...");
    try {
        const result = await client.dryRunTransactionBlock({
            transactionBlock: await tx.build({ client })
        });
        console.log("Dry Run EFFECTS STATUS:");
        console.log(JSON.stringify(result.effects.status, null, 2));
    } catch (err: any) {
        console.error("Dry run THREW error:");
        if (err.cause && err.cause.effects) {
            console.log("Effects Status from Cause:");
            console.log(JSON.stringify(err.cause.effects.status, null, 2));
        } else {
            console.error(err);
        }
    }
}

main().catch(console.error);
