import { SuiClient, SuiEvent } from '@onelabs/sui/client';
import { Transaction } from '@onelabs/sui/transactions';
import { Ed25519Keypair } from '@onelabs/sui/keypairs/ed25519';
import { ConvexHttpClient } from "convex/browser";
import { uploadToPinata } from "../lib/pinata.js";
import { CONTRACT_CONFIG } from "../config.js";
import { createLogger } from "../logger.js";

const logger = createLogger("keeper");

/**
 * KeeperService — Automates game phase transitions and settles markets.
 */
export class KeeperService {
  private client: SuiClient;
  private keypair: Ed25519Keypair;
  private convex: ConvexHttpClient;

  constructor(rpcUrl: string, adminKeyB64: string, convexUrl: string) {
    this.client = new SuiClient({ url: rpcUrl });
    const raw = Buffer.from(process.env.OPERATOR_PRIV_KEY!, 'base64');
    const secretKey = raw.length === 33 ? raw.slice(1) : raw;
    this.keypair = Ed25519Keypair.fromSecretKey(secretKey);
    this.convex = new ConvexHttpClient(convexUrl);
  }

  async start() {
    console.log('Keeper Bot started. Listening for CrewKill events...');
    
    // Temporarily disabled due to 405 error on custom RPC
    // this.client.subscribeEvent({
    //   filter: { Package: CONTRACT_CONFIG.PACKAGE_ID } as any,
    //   onMessage: (event) => this.handleEvent(event),
    // });
    logger.warn('Keeper Bot subscription disabled (RPC 405). Manual automation required.');
  }

  async createOnChainGame(roomId: string, wagerAmount: string, maxPlayers: number) {
    logger.info(`Creating on-chain game for room: ${roomId}`);
    const tx = new Transaction();
    tx.moveCall({
      target: `${CONTRACT_CONFIG.PACKAGE_ID}::game_settlement::create_game`,
      arguments: [
        tx.object(CONTRACT_CONFIG.GAME_MANAGER_ID),
        tx.object(CONTRACT_CONFIG.WAGER_VAULT_ID),
        tx.pure.u64(maxPlayers),
        tx.pure.u64(wagerAmount),
        tx.pure.u64(5), // tasks required
        tx.object('0x6'), // Clock
      ],
    });

    return await this.client.signAndExecuteTransaction({
      signer: this.keypair,
      transaction: tx,
    });
  }

  private async handleEvent(event: SuiEvent) {
    const { type, parsedJson } = event;
    console.log(`Event received: ${type}`);

    if (type.endsWith('::game_settlement::GameEnded')) {
      await this.handleGameEnded(parsedJson as any);
    } else if (type.endsWith('::prediction_market::BetPlaced')) {
      await this.handleBetPlaced(parsedJson as any);
    } else if (type.endsWith('::game_settlement::PhaseChanged')) {
      await this.handlePhaseChanged(parsedJson as any);
    }
  }

  private async handlePhaseChanged(data: any) {
    // Phase 1 = PHASE_STARTING
    if (data.new_phase === 1) {
      logger.info(`Game ${data.game_id} starting. Assigning roles randomly...`);
      const tx = new Transaction();
      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::game_settlement::assign_roles_randomly`,
        arguments: [
          tx.object(data.game_id),
          tx.object(CONTRACT_CONFIG.GAME_MANAGER_ID),
          tx.object('0x8'), // Random object ID on Sui/OneChain
        ],
      });

      await this.client.signAndExecuteTransaction({
        signer: this.keypair,
        transaction: tx,
      });
    }
  }

  private async handleBetPlaced(data: any) {
    console.log('Processing bet for Convex indexing...');
    // Sync with Convex using string-based mutation path
    await this.convex.mutation("bets:placeBet" as any, {
      address: data.better,
      gameId: data.game_id,
      selection: data.selection,
      amountMist: parseInt(data.amount),
      txDigest: data.game_id, 
    });
  }

  private async handleGameEnded(data: any) {
    console.log('Game Ended! Finalizing results...');
    
    // 1. Resolve Prediction Market on-chain
    const tx = new Transaction();
    tx.moveCall({
      target: `${CONTRACT_CONFIG.PACKAGE_ID}::prediction_market::resolve_market`,
      arguments: [
        tx.object(CONTRACT_CONFIG.MARKET_REGISTRY_ID),
        tx.pure.address(data.game_id), // placeholder
        tx.pure.u8(data.winner),
      ],
    });

    const result = await this.client.signAndExecuteTransaction({
      signer: this.keypair,
      transaction: tx,
    });
    console.log('Market resolved:', result.digest);

    // 2. Resolve Convex Bets & Award XP
    await this.convex.mutation("bets:resolveBets" as any, {
      gameId: data.game_id,
      winnerSide: data.winner,
      winningAgentAddress: "", 
    });

    // 3. Mint GameReplayNFT
    const mockCid = "QmPlaceholder"; // Would be uploaded by ReplayLogger
    const mintTx = new Transaction();
    mintTx.moveCall({
      target: `${CONTRACT_CONFIG.PACKAGE_ID}::game_replay::mint_replay`,
      arguments: [
        tx.object(CONTRACT_CONFIG.MINT_CAP_ID), // Need MintCap ID
        tx.pure.id(data.game_id),
        tx.pure.string(mockCid),
        tx.pure.u64(data.round),
        tx.pure.u8(data.winner),
        tx.pure.u64(Date.now()),
        tx.pure.vector('address', []), // Player list
        tx.pure.address(this.keypair.toSuiAddress()), // Sent to admin for later distribution
      ],
    });

    await this.client.signAndExecuteTransaction({
      signer: this.keypair,
      transaction: mintTx,
    });
  }
}
