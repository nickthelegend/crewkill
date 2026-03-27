import "dotenv/config";
import { SuiClient } from '@onelabs/sui/client';
import { Transaction } from '@onelabs/sui/transactions';
import { Ed25519Keypair } from '@onelabs/sui/keypairs/ed25519';
import { contractService } from "../src/ContractService.js";
import { CONTRACT_CONFIG, ONECHAIN_RPC, CREW_TOKEN_TYPE } from "../src/config.js";

async function main() {
    console.log("🚀 STARTING GENERIC E2E PREDICTION MARKET PAYOUT TEST...");
    
    const client = new SuiClient({ url: ONECHAIN_RPC });
    const operatorKey = process.env.OPERATOR_PRIV_KEY!;
    const raw = Buffer.from(operatorKey, 'base64');
    const secretKey = raw.length === 33 ? raw.slice(1) : raw;
    const operatorKeypair = Ed25519Keypair.fromSecretKey(secretKey);
    const operatorAddress = operatorKeypair.getPublicKey().toSuiAddress();
    
    console.log(`Operator: ${operatorAddress}`);

    // 1. Create Game
    console.log("\n[1/5] Creating game on-chain...");
    const gameResult = await contractService.createGame(10, 100000000, 5);
    if (!gameResult) throw new Error("Game creation failed");
    const gameId = gameResult.gameId;
    console.log(`✅ Game ID: ${gameId}`);

    // 2. Create Market
    console.log("\n[2/5] Creating market for game...");
    const suspects = [
        "0x1111111111111111111111111111111111111111111111111111111111111111",
        "0x2222222222222222222222222222222222222222222222222222222222222222",
        operatorAddress 
    ];
    const marketId = await contractService.createMarket(gameId, suspects);
    if (!marketId) throw new Error("Market creation failed");
    console.log(`✅ Market ID: ${marketId}`);

    // Wait for a few seconds for the network to catch up
    await new Promise(r => setTimeout(r, 2000));

    // 3. Place a Bet
    console.log("\n[3/5] Placing a test bet...");
    const betAmount = 10000000n; // 0.01 CREW (minimum)
    
    const allCoins = await client.getAllCoins({ owner: operatorAddress });
    console.log(`Found ${allCoins.data.length} coins. Types: ${allCoins.data.map(c => c.coinType)}`);
    const crewCoins = allCoins.data.filter(c => c.coinType === CREW_TOKEN_TYPE);
    
    if (crewCoins.length === 0) {
        console.log("ALL COINS:", JSON.stringify(allCoins.data, null, 2));
        throw new Error("No CREW tokens found in operator wallet!");
    }

    const txBet = new Transaction();
    // Use the first CREW coin found
    const coinObj = txBet.object(crewCoins[0].coinObjectId);
    const [splitCoin] = txBet.splitCoins(coinObj, [txBet.pure.u64(betAmount)]);
    
    txBet.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::prediction_market::place_bet`,
        typeArguments: [CREW_TOKEN_TYPE],
        arguments: [
            txBet.object(marketId),
            txBet.pure.address(operatorAddress),
            splitCoin
        ],
    });

    console.log(`Sending bet transaction... (using CREW coin: ${crewCoins[0].coinObjectId})`);
    const betTx = await client.signAndExecuteTransaction({
        signer: operatorKeypair,
        transaction: txBet,
        options: { showEffects: true, showObjectChanges: true }
    });
    
    if (betTx.effects?.status.status !== 'success') {
        throw new Error(`Bet failed: ${betTx.effects?.status.error}`);
    }
    console.log(`✅ Bet placed! TX: ${betTx.digest}`);

    // 4. Resolve Market
    console.log("\n[4/5] Closing and Resolving Market...");
    await contractService.closeMarket(gameId, marketId);
    
    const impostors = [operatorAddress];
    // Resolve with manual bet info for the payout calculation
    const resolveResult = await contractService.resolveMarket(gameId, marketId, impostors, [
        { address: operatorAddress, selection: operatorAddress, amountMist: betAmount.toString() }
    ]);
    
    if (!resolveResult) throw new Error("Resolution failed");
    console.log(`✅ Market resolved and settled! Rewards pushed.`);

    console.log("\n===========================================");
    console.log("🏁 GENERIC E2E TEST COMPLETED!");
    console.log(`Room: ${gameId}`);
    console.log(`Market: ${marketId}`);
    console.log("===========================================\n");
}

main().catch(err => {
    console.error("\n❌ TEST FAILED!");
    console.error(err);
    process.exit(1);
});
