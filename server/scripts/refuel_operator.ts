import "dotenv/config";
import { WebSocket } from "ws";
(global as any).WebSocket = WebSocket;
import { Ed25519Keypair } from "@onelabs/sui/keypairs/ed25519";
import { SuiClient, getFullnodeUrl } from "@onelabs/sui/client";
import { Transaction } from "@onelabs/sui/transactions";

async function main() {
    const rpcUrl = process.env.ONECHAIN_RPC || "https://rpc-testnet.onelabs.cc:443";
    const client = new SuiClient({ url: rpcUrl });

    // Agent 1 Private Key (from agent/.env)
    const agentPk = "O0Qde3yv5MSdroGBmKUtaAn5yksPqHGySwyvJIa8+vY="; // Private Key 1
    const agentKp = Ed25519Keypair.fromSecretKey(Buffer.from(agentPk, "base64").length === 33 ? Buffer.from(agentPk, "base64").slice(1) : Buffer.from(agentPk, "base64"));
    
    // Operator Address (0x4b68...)
    const operatorAddress = "0x4b680774f1c28fcc5f4ae4386b36e878c7ac5fae48382fc253131c1214e40a09";

    console.log(`Transferring 100,000,000 MIST (0.1 OCT) from Agent 1 to Operator...`);
    
    const tx = new Transaction();
    const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(100000000)]);
    tx.transferObjects([coin], tx.pure.address(operatorAddress));

    const result = await client.signAndExecuteTransaction({
        signer: agentKp,
        transaction: tx,
    });

    console.log(`Refuel SUCCESS! TX: ${result.digest}`);
    console.log(`Operator ${operatorAddress} should now have enough gas.`);
}

main().catch(console.error);
