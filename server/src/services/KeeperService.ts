import { SuiClient, SuiEvent } from '@onelabs/sui/client';
import { Transaction } from '@onelabs/sui/transactions';
import { Ed25519Keypair } from '@onelabs/sui/keypairs/ed25519';
import { ConvexHttpClient } from "convex/browser";
import { uploadToPinata } from "../lib/pinata.js";
import { CONTRACT_CONFIG } from "../config.js";

/**
 * KeeperService — Automates game phase transitions and settles markets.
 */
export class KeeperService {
  private client: SuiClient;
  private keypair: Ed25519Keypair;
  private convex: ConvexHttpClient;

  constructor(rpcUrl: string, adminKeyB64: string, convexUrl: string) {
    this.client = new SuiClient({ url: rpcUrl });
    this.keypair = Ed25519Keypair.fromSecretKey(Buffer.from(adminKeyB64, 'base64'));
    this.convex = new ConvexHttpClient(convexUrl);
  }

  async start() {
    console.log('Keeper Bot started. Listening for CrewKill events...');
    
    // Subscribe to all events from the package
    this.client.subscribeEvent({
      filter: { Package: CONTRACT_CONFIG.PACKAGE_ID } as any,
      onMessage: (event) => this.handleEvent(event),
    });
  }

  private async handleEvent(event: SuiEvent) {
    const { type, parsedJson } = event;
    console.log(`Event received: ${type}`);

    if (type.endsWith('::game_settlement::GameEnded')) {
      await this.handleGameEnded(parsedJson as any);
    } else if (type.endsWith('::prediction_market::BetPlaced')) {
      await this.handleBetPlaced(parsedJson as any);
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
