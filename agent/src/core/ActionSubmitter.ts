import { SuiClient } from '@onelabs/sui/client';
import { Ed25519Keypair } from '@onelabs/sui/keypairs/ed25519';
import { Transaction } from '@onelabs/sui/transactions';
import { CONTRACT_CONFIG, ONECHAIN_RPC, GAME_CONFIG } from '../config.js';
import {
  Action,
  ActionType,
  ActionCommitment,
  Location,
  SabotageType,
} from '../types.js';

export class ActionSubmitter {
  private client: SuiClient;
  private keypair: Ed25519Keypair;
  private gameObjectId: string | null = null;

  constructor(privateKeyB64: string) {
    this.client = new SuiClient({ url: ONECHAIN_RPC });
    this.keypair = Ed25519Keypair.fromSecretKey(
      Buffer.from(privateKeyB64, 'base64')
    );
  }

  get address(): string {
    return this.keypair.getPublicKey().toSuiAddress();
  }

  setGame(gameObjectId: string): void {
    this.gameObjectId = gameObjectId;
  }

  // ============ SALT + COMMITMENT ============

  generateSalt(): Uint8Array {
    const salt = new Uint8Array(32);
    crypto.getRandomValues(salt);
    return salt;
  }

  async createActionCommitment(action: Action): Promise<ActionCommitment> {
    const salt = this.generateSalt();

    // Build bytes: action_type (1 byte) ++ salt (32 bytes) ++ address bytes (32 bytes)
    const addrBytes = Buffer.from(this.address.replace('0x', ''), 'hex');
    const preimage = new Uint8Array(1 + 32 + 32);
    preimage[0] = action.type;
    preimage.set(salt, 1);
    preimage.set(addrBytes, 33);

    // sha3_256 — matches Move's std::hash::sha3_256
    const hashBuffer = await crypto.subtle.digest('SHA-256', preimage);
    const commitment = Array.from(new Uint8Array(hashBuffer));

    return { commitment, action, salt };
  }

  // ============ CREATE GAME ============

  async createGame(): Promise<string> {
    const tx = new Transaction();
    tx.moveCall({
      target: `${CONTRACT_CONFIG.PACKAGE_ID}::game_settlement::create_game`,
      arguments: [
        tx.object(CONTRACT_CONFIG.GAME_MANAGER_ID),
        tx.object(CONTRACT_CONFIG.WAGER_VAULT_ID),
        tx.pure.u64(GAME_CONFIG.MAX_PLAYERS),
        tx.pure.u64(GAME_CONFIG.WAGER_AMOUNT_MIST),
        tx.pure.u64(GAME_CONFIG.TASKS_REQUIRED),
        tx.object(CONTRACT_CONFIG.CLOCK_ID),
      ],
    });
    
    const result = await this.client.signAndExecuteTransaction({
      signer: this.keypair,
      transaction: tx,
      options: { showEffects: true, showObjectChanges: true },
    });

    if (result.effects?.status?.status !== 'success') {
      throw new Error(`Game creation failed: ${JSON.stringify(result.effects?.status)}`);
    }

    // Find the shared Game object in objectChanges
    const createdObject = result.objectChanges?.find(
        (change: any) => change.type === 'created' && change.objectType.includes('::game_settlement::Game')
    );

    if (!createdObject || !('objectId' in createdObject)) {
        throw new Error('Game ID not found in transaction results');
    }

    return createdObject.objectId;
  }

  // ============ REGISTER ============

  async registerAgent(): Promise<string> {
    const tx = new Transaction();
    tx.moveCall({
      target: `${CONTRACT_CONFIG.PACKAGE_ID}::agent_registry::register_agent`,
      arguments: [tx.object(CONTRACT_CONFIG.AGENT_REGISTRY_ID)],
    });
    return this._execute(tx);
  }

  // ============ WAGER ============

  async placeWager(gameObjectId: string): Promise<string> {
    const tx = new Transaction();
    const [wagerCoin] = tx.splitCoins(tx.gas, [
      tx.pure.u64(GAME_CONFIG.WAGER_AMOUNT_MIST),
    ]);
    tx.moveCall({
      target: `${CONTRACT_CONFIG.PACKAGE_ID}::wager_vault::place_wager`,
      arguments: [
        tx.object(CONTRACT_CONFIG.WAGER_VAULT_ID),
        tx.pure.id(gameObjectId),
        wagerCoin,
      ],
    });
    return this._execute(tx);
  }

  // ============ JOIN GAME ============

  async joinGame(gameObjectId: string): Promise<string> {
    const tx = new Transaction();
    tx.moveCall({
      target: `${CONTRACT_CONFIG.PACKAGE_ID}::game_settlement::join_game`,
      arguments: [
        tx.object(gameObjectId),
        tx.object(CONTRACT_CONFIG.AGENT_REGISTRY_ID),
      ],
    });
    return this._execute(tx);
  }

  // ============ START GAME ============

  async startGame(gameObjectId: string): Promise<string> {
    const tx = new Transaction();
    tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::game_settlement::start_game`,
        arguments: [
            tx.object(gameObjectId),
            tx.object(CONTRACT_CONFIG.CLOCK_ID),
        ],
    });
    return this._execute(tx);
  }

  // ============ COMMIT ACTION ============

  async commitAction(
    gameObjectId: string,
    commitment: ActionCommitment
  ): Promise<string> {
    const tx = new Transaction();
    tx.moveCall({
      target: `${CONTRACT_CONFIG.PACKAGE_ID}::game_settlement::commit_action`,
      arguments: [
        tx.object(gameObjectId),
        tx.pure.vector('u8', Array.from(commitment.commitment)),
      ],
    });
    return this._execute(tx);
  }

  // ============ REVEAL ACTION ============

  async revealAction(
    gameObjectId: string,
    commitment: ActionCommitment
  ): Promise<string> {
    const { action, salt } = commitment;

    const tx = new Transaction();
    tx.moveCall({
      target: `${CONTRACT_CONFIG.PACKAGE_ID}::game_settlement::reveal_action`,
      arguments: [
        tx.object(gameObjectId),
        tx.pure.u8(action.type),
        tx.pure.address(action.target ?? '0x0000000000000000000000000000000000000000000000000000000000000000'),
        tx.pure.u8(action.destination ?? 0),
        tx.pure.u64(action.taskId ?? 0),
        tx.pure.vector('u8', Array.from(salt)),
      ],
    });
    return this._execute(tx);
  }

  // ============ HELPER ACTION BUILDERS ============

  createMoveAction(destination: Location): Action {
    return { type: ActionType.Move, destination };
  }

  createDoTaskAction(taskId: number): Action {
    return { type: ActionType.DoTask, taskId };
  }

  createFakeTaskAction(): Action {
    return { type: ActionType.FakeTask };
  }

  createKillAction(target: string): Action {
    return { type: ActionType.Kill, target };
  }

  createReportAction(): Action {
    return { type: ActionType.Report };
  }

  createCallMeetingAction(): Action {
    return { type: ActionType.CallMeeting };
  }

  createVentAction(destination: Location): Action {
    return { type: ActionType.Vent, destination };
  }

  createSabotageAction(sabotage: SabotageType): Action {
    return { type: ActionType.Sabotage, sabotage };
  }

  createVoteAction(target: string | null): Action {
    return { type: ActionType.Vote, target: target || '0x0000000000000000000000000000000000000000000000000000000000000000' };
  }

  createSkipAction(): Action {
    return { type: ActionType.Skip };
  }

  // ============ INTERNAL ============

  private async _execute(tx: Transaction): Promise<string> {
    const result = await this.client.signAndExecuteTransaction({
      signer: this.keypair,
      transaction: tx,
      options: { showEffects: true },
    });
    if (result.effects?.status?.status !== 'success') {
      throw new Error(`Transaction failed: ${JSON.stringify(result.effects?.status)}`);
    }
    return result.digest;
  }
}
