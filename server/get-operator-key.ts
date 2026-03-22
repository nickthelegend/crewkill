import "dotenv/config";
import { databaseService } from "./src/DatabaseService.js";

async function run() {
    await databaseService.connect();
    const operator = await databaseService.getOperatorByAddress("0x857466480a0d1f0b933d6ccf4f63c214303eba50a73f355fc1c673a85432a54b");
    console.log("Operator:", JSON.stringify(operator, null, 2));
    process.exit(0);
}

run();
