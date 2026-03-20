import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    const operatorKey = "oper_PpO1htLYGmsAtb4Q";
    const wallets = [
        "0x0a1320c14d9573e3d813c3f786d29af7d1ceabde",
        "0xdbfe5173e185ae3d0a7a40ff4055e4528b3346e2"
    ];

    // 1. Find the operator
    const operator = await prisma.operator.findUnique({
        where: { operatorKey }
    });

    if (!operator) {
        console.error("Operator not found!");
        return;
    }

    for (const testWallet of wallets) {
        // 2. Insert the wallet as an agent
        const agent = await prisma.agent.upsert({
            where: { walletAddress: testWallet.toLowerCase() },
            update: {
                operatorId: operator.id,
                privyUserId: "mock_user_id_" + testWallet.slice(2, 6), // Dummy ID
                privyWalletId: "mock_wallet_id_" + testWallet.slice(2, 6) // Dummy ID
            },
            create: {
                walletAddress: testWallet.toLowerCase(),
                name: "Test Agent " + testWallet.slice(2, 6),
                operatorId: operator.id,
                privyUserId: "mock_user_id_" + testWallet.slice(2, 6),
                privyWalletId: "mock_wallet_id_" + testWallet.slice(2, 6),
                balance: "0",
                totalDeposited: "0",
                totalWon: "0",
                totalLost: "0"
            }
        });

        console.log(`Successfully registered test agent for ${testWallet}:`);
        console.log(JSON.stringify(agent, null, 2));
    }
}

main().finally(() => prisma.$disconnect());
