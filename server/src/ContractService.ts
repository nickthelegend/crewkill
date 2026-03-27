import { SuiClient, SuiEvent } from '@onelabs/sui/client';
import { Transaction } from '@onelabs/sui/transactions';
import { Ed25519Keypair } from '@onelabs/sui/keypairs/ed25519';
import { createLogger } from "./logger.js";
import { CONTRACT_CONFIG, ONECHAIN_RPC, CREW_TOKEN_TYPE } from "./config.js";
import crypto from 'crypto';

const logger = createLogger("contract-service");

export class ContractService {
  private client: SuiClient;
  private operatorKeypair: Ed25519Keypair | null = null;
  private enabled: boolean = false;

  constructor() {
    this.client = new SuiClient({ url: ONECHAIN_RPC });
    const operatorKey = process.env.OPERATOR_PRIV_KEY;
    if (operatorKey) {
      try {
        const raw = Buffer.from(operatorKey, 'base64');
        const secretKey = raw.length === 33 ? raw.slice(1) : raw;
        this.operatorKeypair = Ed25519Keypair.fromSecretKey(secretKey);
        this.enabled = true;
        logger.info(`Contract service initialized with operator: ${this.operatorKeypair.getPublicKey().toSuiAddress()}`);
      } catch (error) {
        logger.error("Failed to initialize operator keypair:", error);
      }
    } else {
      logger.warn("No OPERATOR_PRIV_KEY provided. Contract service running in read-only mode.");
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private async fetchGasPayment(tx: Transaction) {
    if (!this.operatorKeypair) return;
    try {
      const coins = await this.client.getCoins({ 
          owner: this.operatorKeypair.getPublicKey().toSuiAddress(),
          coinType: '0x2::oct::OCT'
      });
      const validCoins = coins.data
        .sort((a, b) => {
            const valA = BigInt(a.balance);
            const valB = BigInt(b.balance);
            if (valB > valA) return 1;
            if (valB < valA) return -1;
            return 0;
        });
        
      const bestCoin = validCoins[0];
      if (bestCoin) {
        logger.info(`Using gas coin ${bestCoin.coinObjectId} with balance ${bestCoin.balance}`);
      }
    } catch(e) {
      logger.error("Failed to fetch gas info:", e);
    }
  }

  async getBalance(agentAddress: string): Promise<bigint> {
    try {
      const balance = await this.client.getBalance({ owner: agentAddress });
      return BigInt(balance.totalBalance);
    } catch (error) {
      return BigInt(0);
    }
  }

  async isAgentRegistered(agentAddress: string): Promise<boolean> {
    return true; 
  }

  async settleGame(gameId: string, crewmatesWon: boolean, winners: string[], allPlayers: string[], playerKills: number[], playerTasks: number[]): Promise<boolean> {
    if (!this.operatorKeypair) return false;
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::game_settlement::settle_game`,
        typeArguments: [CREW_TOKEN_TYPE],
        arguments: [
          tx.object(gameId),
          tx.object(CONTRACT_CONFIG.GAME_MANAGER_ID),
          tx.object(CONTRACT_CONFIG.WAGER_VAULT_ID),
          tx.object(CONTRACT_CONFIG.AGENT_REGISTRY_ID),
          tx.pure.bool(crewmatesWon),
          tx.pure.vector('address', winners),
          tx.pure.vector('u64', playerKills.map(k => BigInt(k))),
          tx.pure.vector('u64', playerTasks.map(t => BigInt(t))),
        ],
      });
      await this.fetchGasPayment(tx);
      const result = await this.client.signAndExecuteTransaction({ signer: this.operatorKeypair, transaction: tx });
      logger.info(`Game ${gameId} settled on-chain. Digest: ${result.digest}`);
      return true;
    } catch (error) {
      logger.error(`Failed to settle game ${gameId}:`, error);
      return false;
    }
  }

  async getWalletBalance(address: string): Promise<bigint> {
    const balance = await this.client.getBalance({ owner: address });
    return BigInt(balance.totalBalance);
  }

  async createGame(maxPlayers: number, wagerAmountMist: number, tasksPerPlayer: number): Promise<{ gameId: string, digest: string } | null> {
    if (!this.operatorKeypair) return null;

    logger.info(`Creating NEW GAME on-chain (Max: ${maxPlayers}, Wager: ${wagerAmountMist}, Tasks: ${tasksPerPlayer})...`);
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const tx = new Transaction();
        tx.moveCall({
          target: `${CONTRACT_CONFIG.PACKAGE_ID}::game_settlement::create_game`,
          typeArguments: [CREW_TOKEN_TYPE],
          arguments: [
            tx.object(CONTRACT_CONFIG.GAME_MANAGER_ID),
            tx.object(CONTRACT_CONFIG.WAGER_VAULT_ID),
            tx.pure.u64(maxPlayers),
            tx.pure.u64(wagerAmountMist),
            tx.pure.u64(tasksPerPlayer),
            tx.object('0x6'),
          ],
        });
        await this.fetchGasPayment(tx);

        const result = await this.client.signAndExecuteTransaction({ 
          signer: this.operatorKeypair, 
          transaction: tx,
          options: { showEvents: true }
        });
        
        const event = result.events?.find(e => e.type.includes('::GameCreated'));
        const gameId = (event?.parsedJson as any)?.game_id;
        
        if (gameId) {
          logger.info(`Game created SUCCESSFULLY on-chain: ${gameId} [TX: ${result.digest}]`);
          return { gameId, digest: result.digest };
        }
        
        return null;
      } catch (error: any) {
        if (error.message.includes("lock") && attempt < 3) {
          logger.warn(`Gas coin lock collision! Retrying (Attempt ${attempt}/3)...`);
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }
        logger.error(`Error creating on-chain game (Attempt ${attempt}/3): ${error.message}`);
        return null;
      }
    }
    return null;
  }

  async createMarket(gameId: string, playerAddresses: string[]): Promise<string | null> {
    if (!this.operatorKeypair) return null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        logger.info(`Creating prediction market for room ${gameId} (Attempt ${attempt}/3)...`);
        const tx = new Transaction();
        tx.moveCall({
          target: `${CONTRACT_CONFIG.PACKAGE_ID}::prediction_market::create_market`,
          typeArguments: [CREW_TOKEN_TYPE],
          arguments: [
            tx.object(CONTRACT_CONFIG.MARKET_REGISTRY_ID),
            tx.pure.address(gameId),
            tx.pure.vector('address', playerAddresses),
          ],
        });
        await this.fetchGasPayment(tx);

        const result = await this.client.signAndExecuteTransaction({ 
          signer: this.operatorKeypair, 
          transaction: tx,
          options: { showEvents: true, showEffects: true } 
        });
        
        if (result.effects?.status.status !== 'success') {
          return null;
        }

        const event = result.events?.find(e => e.type.includes('::MarketCreated'));
        const marketId = (event?.parsedJson as any)?.market_id;
        
        if (marketId) {
          logger.info(`Prediction market created SUCCESSFULLY: ${marketId} for game ${gameId}`);
          return marketId;
        }
        
        return null;
      } catch (error: any) {
        if (error.message.includes("lock") && attempt < 3) {
          logger.warn(`Gas coin lock collision in createMarket! Retrying...`);
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }
        logger.error(`Critical error creating market for game ${gameId}: ${error.message}`);
        return null;
      }
    }
    return null;
  }

  async closeMarket(gameId: string, marketId: string): Promise<boolean> {
    if (!this.operatorKeypair) return false;
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::prediction_market::close_market`,
        typeArguments: [CREW_TOKEN_TYPE],
        arguments: [
          tx.object(marketId),
          tx.object(CONTRACT_CONFIG.MARKET_REGISTRY_ID),
        ],
      });
      await this.fetchGasPayment(tx);

      const result = await this.client.signAndExecuteTransaction({ 
        signer: this.operatorKeypair, 
        transaction: tx,
        options: { showEffects: true }
      });
      
      if (result.effects?.status.status !== 'success') return false;
      
      logger.info(`Prediction market closed for game ${gameId}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  async resolveMarket(gameId: string, marketId: string, impostors: string[], allBets: any[]): Promise<boolean> {
    if (!this.operatorKeypair) return false;
    try {
      // 1. Resolve market first
      const txResolve = new Transaction();
      txResolve.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::prediction_market::resolve_market`,
        typeArguments: [CREW_TOKEN_TYPE],
        arguments: [
          txResolve.object(marketId),
          txResolve.object(CONTRACT_CONFIG.MARKET_REGISTRY_ID),
          txResolve.pure.vector('address', impostors),
        ],
      });
      await this.fetchGasPayment(txResolve);
      await this.client.signAndExecuteTransaction({ signer: this.operatorKeypair, transaction: txResolve });

      // 2. Disperse
      const winningBets = allBets.filter(b => impostors.some(imp => imp.toLowerCase() === b.selection.toLowerCase()));
      if (winningBets.length === 0) return true;

      const totalPotBalance = allBets.reduce((sum, b) => sum + BigInt(b.amountMist), 0n);
      const totalWinningBetsBalance = winningBets.reduce((sum, b) => sum + BigInt(b.amountMist), 0n);
      const distributablePot = (totalPotBalance * 95n) / 100n;
      
      const winnersAddresses: string[] = [];
      const winnerPayouts: bigint[] = [];

      for (const bet of winningBets) {
        const payout = (BigInt(bet.amountMist) * distributablePot) / totalWinningBetsBalance;
        if (payout > 0n) {
          winnersAddresses.push(bet.address);
          winnerPayouts.push(payout);
        }
      }

      if (winnersAddresses.length > 0) {
        const txSettle = new Transaction();
        txSettle.moveCall({
          target: `${CONTRACT_CONFIG.PACKAGE_ID}::prediction_market::settle_market`,
          typeArguments: [CREW_TOKEN_TYPE],
          arguments: [
            txSettle.object(marketId),
            txSettle.object(CONTRACT_CONFIG.MARKET_REGISTRY_ID),
            txSettle.pure.vector('address', winnersAddresses),
            txSettle.pure.vector('u64', winnerPayouts),
          ],
        });
        await this.fetchGasPayment(txSettle);
        await this.client.signAndExecuteTransaction({ signer: this.operatorKeypair, transaction: txSettle });
      }

      return true;
    } catch (error) {
      logger.error(`Failed to resolve market for game ${gameId}:`, error);
      return false;
    }
  }

  async cancelGame(gameId: string): Promise<boolean> {
    if (!this.operatorKeypair) return false;
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::game_manager::cancel_game`,
        arguments: [tx.object(CONTRACT_CONFIG.GAME_MANAGER_ID), tx.pure.address(gameId)],
      });
      await this.fetchGasPayment(tx);
      await this.client.signAndExecuteTransaction({ signer: this.operatorKeypair, transaction: tx });
      return true;
    } catch (error) { return false; }
  }

  async hasWagered(agentAddress: string, gameId: string): Promise<boolean> {
    // Simplified for now, just check if player is in game_players list?
    // In production, check wager_vault::table
    return false;
  }

  getVaultAddress(): string {
    return CONTRACT_CONFIG.WAGER_VAULT_ID;
  }

  subscribeToEvents(onEvent: (event: SuiEvent) => void) {
    return this.client.subscribeEvent({
      filter: { Package: CONTRACT_CONFIG.PACKAGE_ID } as any,
      onMessage: onEvent,
    });
  }
}

export const contractService = new ContractService();
