import { SuiClient, SuiEvent } from '@onelabs/sui/client';
import { Transaction } from '@onelabs/sui/transactions';
import { Ed25519Keypair } from '@onelabs/sui/keypairs/ed25519';
import { createLogger } from "./logger.js";
import { CONTRACT_CONFIG, ONECHAIN_RPC } from "./config.js";
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
      const coins = await this.client.getCoins({ owner: this.operatorKeypair.getPublicKey().toSuiAddress() });
      const badCoin = "0x48f3b0e90853dccda7bcdbc79ee8a434680edf3447221b780c8c678985bc4811";
      const unlockedCoin = coins.data.find(c => c.coinObjectId !== badCoin);
      if (unlockedCoin) {
        tx.setGasPayment([{ objectId: unlockedCoin.coinObjectId, version: unlockedCoin.version, digest: unlockedCoin.digest }]);
      }
    } catch(e) {
      logger.error("Failed to fetch gas payment bypass:", e);
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
      // gameId is the object ID, don't hash it!
      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::game_settlement::settle_game`,
        arguments: [
          tx.object(gameId), // game: &mut Game
          tx.object(CONTRACT_CONFIG.GAME_MANAGER_ID),
          tx.object(CONTRACT_CONFIG.WAGER_VAULT_ID),
          tx.object(CONTRACT_CONFIG.AGENT_REGISTRY_ID),
          tx.pure.bool(crewmatesWon), // winner_side_is_crew
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

  hasWagered(agentAddress: string, gameId: string): Promise<boolean> {
    return Promise.resolve(false);
  }

  getVaultAddress(): string {
    return CONTRACT_CONFIG.WAGER_VAULT_ID;
  }

  async createGame(maxPlayers: number, wagerAmountMist: number, tasksPerPlayer: number): Promise<{ gameId: string, digest: string } | null> {
    if (!this.operatorKeypair) return null;

    logger.info(`Creating NEW GAME on-chain (Max: ${maxPlayers}, Wager: ${wagerAmountMist}, Tasks: ${tasksPerPlayer})...`);
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const tx = new Transaction();
        tx.moveCall({
          target: `${CONTRACT_CONFIG.PACKAGE_ID}::game_settlement::create_game`,
          arguments: [
            tx.object(CONTRACT_CONFIG.GAME_MANAGER_ID),
            tx.object(CONTRACT_CONFIG.WAGER_VAULT_ID),
            tx.pure.u64(maxPlayers),
            tx.pure.u64(wagerAmountMist),
            tx.pure.u64(tasksPerPlayer),
            tx.object('0x6'), // Clock
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
        
        logger.error(`Game ID not found in event. Result type: ${JSON.stringify(result.events?.map(e => e.type))}`);
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
    if (!this.operatorKeypair) {
      logger.error("Cannot create market: Operator keypair missing");
      return null;
    }
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        logger.info(`Creating prediction market for room ${gameId} with ${playerAddresses.length} players (Attempt ${attempt}/3)...`);
        const tx = new Transaction();
        const hashedId = crypto.createHash('sha256').update(gameId).digest('hex');
        const suiGameId = `0x${hashedId}`;

        tx.moveCall({
          target: `${CONTRACT_CONFIG.PACKAGE_ID}::prediction_market::create_market`,
          arguments: [
            tx.object(CONTRACT_CONFIG.MARKET_REGISTRY_ID),
            tx.pure.address(gameId), // Just pass the ID directly
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
          const errMsg = result.effects?.status.error || "Unknown error";
          if (errMsg.includes("already_registered") || errMsg.includes("aborted with code 6")) {
            // Find existing market if already registered
            logger.info(`Market for game ${gameId} already registered on-chain. Sync should happen via event scan.`);
            // Note: Returning null here and letting the background sync handle it if possible
            return null;
          }
          logger.error(`Prediction market creation TX failed: ${errMsg}`);
          return null;
        }

        const event = result.events?.find(e => e.type.includes('::MarketCreated'));
        const marketId = (event?.parsedJson as any)?.market_id;
        
        if (marketId) {
          logger.info(`Prediction market created SUCCESSFULLY: ${marketId} for game ${gameId}`);
          return marketId;
        }
        
        logger.error(`Market ID not found in event for game ${gameId}. Result type: ${JSON.stringify(result.events?.map(e => e.type))}`);
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
      
      if (result.effects?.status.status !== 'success') {
        logger.error(`Prediction market closure TX failed: ${result.effects?.status.error || "Unknown error"}`);
        return false;
      }
      
      logger.info(`Prediction market closed for game ${gameId}: ${result.digest}`);
      return true;
    } catch (error) {
      logger.error(`Failed to close market for game ${gameId}:`, error);
      return false;
    }
  }

  async resolveMarket(gameId: string, marketId: string, impostors: string[], allBets: any[]): Promise<boolean> {
    if (!this.operatorKeypair) return false;
    try {
      // 1. Resolve market first (reveal impostors)
      const txResolve = new Transaction();
      txResolve.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::prediction_market::resolve_market`,
        arguments: [
          txResolve.object(marketId),
          txResolve.object(CONTRACT_CONFIG.MARKET_REGISTRY_ID),
          txResolve.pure.vector('address', impostors),
        ],
      });
      await this.fetchGasPayment(txResolve);
      await this.client.signAndExecuteTransaction({ signer: this.operatorKeypair, transaction: txResolve });
      logger.info(`Prediction market resolved for game ${gameId}`);

      // 2. Calculate and push rewards (disperse)
      // winners = bettors who picked any of the impostors
      const winningBets = allBets.filter(b => impostors.includes(b.selection));
      if (winningBets.length === 0) {
        logger.info(`No winners for prediction market ${gameId}`);
        return true;
      }

      const totalPotBalance = allBets.reduce((sum, b) => sum + BigInt(b.amountMist), 0n);
      const totalWinningBetsBalance = winningBets.reduce((sum, b) => sum + BigInt(b.amountMist), 0n);
      
      // Pro-rata disbursement
      // Fee: 5%
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
          arguments: [
            txSettle.object(marketId),
            txSettle.object(CONTRACT_CONFIG.MARKET_REGISTRY_ID),
            txSettle.pure.vector('address', winnersAddresses),
            txSettle.pure.vector('u64', winnerPayouts),
          ],
        });
        await this.fetchGasPayment(txSettle);
        const result = await this.client.signAndExecuteTransaction({ signer: this.operatorKeypair, transaction: txSettle });
        logger.info(`Prediction market rewards dispersed for game ${gameId}. Digest: ${result.digest}`);
      }

      return true;
    } catch (error) {
      logger.error(`Failed to resolve/settle market for game ${gameId}:`, error);
      return false;
    }
  }

  async cancelGame(gameId: string): Promise<boolean> {
    if (!this.operatorKeypair) return false;
    try {
      const tx = new Transaction();
      const suiGameId = `0x${crypto.createHash('sha256').update(gameId).digest('hex')}`;
      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::game_manager::cancel_game`,
        arguments: [tx.object(CONTRACT_CONFIG.GAME_MANAGER_ID), tx.pure.address(suiGameId)],
      });
      await this.fetchGasPayment(tx);
      await this.client.signAndExecuteTransaction({ signer: this.operatorKeypair, transaction: tx });
      return true;
    } catch (error) { return false; }
  }

  async placeWager(agentAddress: string, gameId: string): Promise<boolean> {
    return true; 
  }

  subscribeToEvents(onEvent: (event: SuiEvent) => void) {
    return this.client.subscribeEvent({
      filter: { Package: CONTRACT_CONFIG.PACKAGE_ID } as any,
      onMessage: onEvent,
    });
  }
}

export const contractService = new ContractService();
