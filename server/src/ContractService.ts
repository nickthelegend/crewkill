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
        this.operatorKeypair = Ed25519Keypair.fromSecretKey(Buffer.from(operatorKey, 'base64'));
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
      const suiGameId = `0x${crypto.createHash('sha256').update(gameId).digest('hex')}`;
      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::game_settlement::settle_game`,
        arguments: [
          tx.object(CONTRACT_CONFIG.GAME_MANAGER_ID),
          tx.object(CONTRACT_CONFIG.WAGER_VAULT_ID),
          tx.object(CONTRACT_CONFIG.AGENT_REGISTRY_ID),
          tx.pure.address(suiGameId),
          tx.pure.bool(crewmatesWon),
          tx.pure.vector('address', winners),
          tx.pure.vector('u64', playerKills.map(k => BigInt(k))),
          tx.pure.vector('u64', playerTasks.map(t => BigInt(t))),
        ],
      });
      const result = await this.client.signAndExecuteTransaction({ signer: this.operatorKeypair, transaction: tx });
      logger.info(`Game settled on-chain. Digest: ${result.digest}`);
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

  async createGame(gameId: string, playerAddresses: string[], impostorAddresses: string[]): Promise<boolean> {
    if (!this.operatorKeypair) return false;
    try {
      const tx = new Transaction();
      const suiGameId = `0x${crypto.createHash('sha256').update(gameId).digest('hex')}`;
      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::game_manager::create_game`,
        arguments: [
          tx.object(CONTRACT_CONFIG.GAME_MANAGER_ID),
          tx.pure.address(suiGameId),
          tx.pure.u64(BigInt("100000000")), // 0.1 OCT
          tx.pure.u64(BigInt(playerAddresses.length)),
          tx.pure.u64(BigInt(impostorAddresses.length)),
        ],
      });
      await this.client.signAndExecuteTransaction({ signer: this.operatorKeypair, transaction: tx });
      return true;
    } catch (error) { return false; }
  }

  async createMarket(gameId: string, playerAddresses: string[]): Promise<string | null> {
    if (!this.operatorKeypair) return null;
    try {
      const tx = new Transaction();
      // Deterministically hash room ID to valid Sui Address
      const hashedId = crypto.createHash('sha256').update(gameId).digest('hex');
      const suiGameId = `0x${hashedId}`;

      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::prediction_market::create_market`,
        arguments: [
          tx.object(CONTRACT_CONFIG.MARKET_REGISTRY_ID),
          tx.pure.address(suiGameId),
          tx.pure.vector('address', playerAddresses),
        ],
      });
      const result = await this.client.signAndExecuteTransaction({ 
        signer: this.operatorKeypair, 
        transaction: tx,
        options: { showEvents: true } 
      });
      
      const event = result.events?.find(e => e.type.includes('::MarketCreated'));
      const marketId = (event?.parsedJson as any)?.market_id;
      
      if (marketId) {
        logger.info(`Prediction market created: ${marketId} for game ${gameId}`);
        return marketId;
      }
      return null;
    } catch (error) {
      logger.error(`Failed to create market for game ${gameId}:`, error);
      return null;
    }
  }

  async resolveMarket(gameId: string, marketId: string, impostors: string[]): Promise<boolean> {
    if (!this.operatorKeypair) return false;
    try {
      const tx = new Transaction();
      // Ensure market registry is included from config
      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::prediction_market::resolve_market`,
        arguments: [
          tx.object(marketId),
          tx.object(CONTRACT_CONFIG.MARKET_REGISTRY_ID),
          tx.pure.vector('address', impostors),
        ],
      });

      const result = await this.client.signAndExecuteTransaction({ 
        signer: this.operatorKeypair, 
        transaction: tx 
      });
      logger.info(`Prediction market resolved for game ${gameId}: ${result.digest}`);
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
      const suiGameId = `0x${crypto.createHash('sha256').update(gameId).digest('hex')}`;
      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::game_manager::cancel_game`,
        arguments: [tx.object(CONTRACT_CONFIG.GAME_MANAGER_ID), tx.pure.address(suiGameId)],
      });
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
