import "dotenv/config";
import { SuiClient } from "@onelabs/sui/client";
import { Transaction } from "@onelabs/sui/transactions";

async function main() {
    const client = new SuiClient({ url: "https://rpc-testnet.onelabs.cc:443" });

    // Data from the user's failing transaction JSON
    const senderAddress = "0xf097e2907931ef20ab18efda4d476c8da5513cbd035556517afb0f83fa345209";
    const packageId = "0xa8c65f156995f311fc7dc43a54b5194199f5d4cf39291d568f2b091c700c42d7";
    const marketId = "0x36c0d0537a94b0d5acfd3e1775cc3eafea2f04973497756c8aadfe524fc260bf";
    const suspectAddress = "0xaa114c821739da64cc7ae34a4b4dcbb3254103c0ad4c6a64e2db15200434184d";
    const sourceCoinId = "0xf1acc50e4a3705985cb2cedfaf7efb3385e195dae01789de5574642fca616783";
    const amount = 10000000000n; // 10 tokens

    const crewTokenType = `${packageId}::crew_token::CREW_TOKEN`;

    async function runTest(withTypeArgs: boolean) {
        console.log(`\n--- Testing ${withTypeArgs ? "WITH" : "WITHOUT"} typeArguments ---`);
        try {
            const tx = new Transaction();
            tx.setSender(senderAddress);
            
            const [betCoin] = tx.splitCoins(tx.object(sourceCoinId), [tx.pure.u64(amount)]);
            
            const callArgs: any = {
                target: `${packageId}::prediction_market::place_bet`,
                arguments: [
                    tx.object(marketId),
                    tx.pure.address(suspectAddress),
                    betCoin
                ]
            };
            
            if (withTypeArgs) {
                callArgs.typeArguments = [crewTokenType];
            }

            tx.moveCall(callArgs);

            const dryRun = await tx.build({ client });
            const result = await client.dryRunTransactionBlock({ transactionBlock: dryRun });
            
            console.log(`Execution Status: ${result.effects.status.status}`);
            if (result.effects.status.error) {
                console.log(`Detailed Error: ${result.effects.status.error}`);
            }
        } catch (err: any) {
            console.log(`Dry run threw error: ${err.message}`);
        }
    }

    await runTest(false);
    await runTest(true);
}

main().catch(console.error);
