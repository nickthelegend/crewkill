import { ContractService } from './src/ContractService.js';
import { createLogger } from './src/logger.js';
const logger = createLogger('test');
async function test() {
  const contract = new ContractService();
  logger.info("Starting test...");
  const res = await contract.createGame(10, "100000000", 5);
  console.log("Result:", res);
}
test().catch(console.error);
