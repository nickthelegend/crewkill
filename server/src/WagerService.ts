import { createLogger } from "./logger.js";
import { contractService } from "./ContractService.js";
import { databaseService } from "./DatabaseService.js";

const logger = createLogger("wager-service");

// Default wager amount in Mist (0.1 OCT = 100,000,000 Mist)
const DEFAULT_WAGER_AMOUNT = BigInt("100000000"); 

interface AgentBalance {
  address: string;
  balance: bigint;
  totalDeposited: bigint;
  totalWon: bigint;
  totalLost: bigint;
}

interface GameWager {
  gameId: string;
  wagers: Map<string, bigint>; // address -> wager amount
  totalPot: bigint;
  settled: boolean;
}

export class WagerService {
  private gameWagers: Map<string, GameWager> = new Map();
  private wagerAmount: bigint;

  constructor(wagerAmount: bigint = DEFAULT_WAGER_AMOUNT) {
    this.wagerAmount = wagerAmount;
    logger.info(`Wager service initialized with wager amount: ${Number(wagerAmount) / 1e9} OCT`);
  }

  getWagerAmount(): bigint {
    return this.wagerAmount;
  }

  async getBalance(address: string): Promise<bigint> {
    return await contractService.getBalance(address);
  }

  async canAffordWager(address: string): Promise<boolean> {
    const balance = await this.getBalance(address);
    return balance >= this.wagerAmount;
  }

  hasWagered(gameId: string, address: string): boolean {
    return this.gameWagers.get(gameId)?.wagers.has(address) ?? false;
  }

  syncOnChainWager(gameId: string, address: string, amount?: bigint) {
    const amountToUse = amount || this.wagerAmount;
    let gameWager = this.gameWagers.get(gameId);
    if (!gameWager) {
      gameWager = { gameId, wagers: new Map(), totalPot: BigInt(0), settled: false };
      this.gameWagers.set(gameId, gameWager);
    }
    if (!gameWager.wagers.has(address)) {
      gameWager.wagers.set(address, amountToUse);
      gameWager.totalPot += amountToUse;
    }
  }

  getGamePot(gameId: string): bigint {
    return this.gameWagers.get(gameId)?.totalPot ?? BigInt(0);
  }

  getGameWager(gameId: string) {
    return this.gameWagers.get(gameId);
  }

  // Backwards compatibility methods
  async deposit(address: string, amount: bigint) { return true; }
  async submitWager(gameId: string, address: string, amount?: bigint) { 
    const balance = await this.getBalance(address);
    const required = amount || this.wagerAmount;
    if (balance < required) {
      return { success: false, error: "Insufficient balance" };
    }
    this.syncOnChainWager(gameId, address, amount);
    return { success: true };
  }
  distributeWinnings(gameId: string, winners: string[], losers: string[]) {
    const pot = this.getGamePot(gameId);
    const winningsPerPlayer = winners.length > 0 ? pot / BigInt(winners.length) : BigInt(0);
    return { success: true, winningsPerPlayer, totalPot: pot };
  }
  async getBalanceInfo(address: string): Promise<AgentBalance | null> {
    const balance = await this.getBalance(address);
    return { address, balance, totalDeposited: BigInt(0), totalWon: BigInt(0), totalLost: BigInt(0) };
  }
}

export const wagerService = new WagerService();
