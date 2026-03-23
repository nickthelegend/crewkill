import { ContractService } from './ContractService.js';
import { databaseService } from './DatabaseService.js';
import { createLogger } from './logger.js';
import * as dotenv from 'dotenv';
dotenv.config();

const logger = createLogger('test');

async function test() {
  await databaseService.connect();
  const gameInfo = await databaseService.getGameByRoomId('0xdb108ebb3d034cda8dfdfaba0edb745341a73a8f027d84e4210cfeab2347fea1');
  const contract = new ContractService();
  logger.info("Starting test...");
  
  const players = gameInfo.players.map(p => p.address);
  console.log("Creating market for:", players);
  
  try {
    const marketId = await contract.createMarket('0xdb108ebb3d034cda8dfdfaba0edb745341a73a8f027d84e4210cfeab2347fea1', players);
    console.log("Market ID:", marketId);
  } catch(e) {
    console.error(e);
  }
}

test().catch(console.error);
