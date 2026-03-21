import { SuiClient } from '@onelabs/sui/client';
import { Ed25519Keypair } from '@onelabs/sui/keypairs/ed25519';
import { Transaction } from '@onelabs/sui/transactions';
import { ONECHAIN_RPC } from '../config.js';

export interface OperatorConfig {
  operatorKey: string;
  operatorAddress: string;
}

export interface WithdrawResult {
  success: boolean;
  txDigest?: string;
  error?: string;
}

export function isValidOperatorKey(key: string): boolean {
  return /^oper_[A-Za-z0-9]{16}$/.test(key);
}

export class OperatorManager {
  private operatorConfig: OperatorConfig | null = null;
  private keypair: Ed25519Keypair | null = null;
  private client: SuiClient | null = null;

  constructor() {}

  initialize(
    operatorKey: string,
    operatorAddress: string,
    agentPrivateKeyB64: string
  ): boolean {
    if (!isValidOperatorKey(operatorKey)) {
      console.error('[OperatorManager] Invalid operator key format');
      return false;
    }

    this.operatorConfig = { operatorKey, operatorAddress };
    this.keypair = Ed25519Keypair.fromSecretKey(
      Buffer.from(agentPrivateKeyB64, 'base64')
    );
    this.client = new SuiClient({ url: ONECHAIN_RPC });

    console.log('[OperatorManager] Initialized with operator:', operatorAddress);
    return true;
  }

  isInitialized(): boolean {
    return this.operatorConfig !== null && this.keypair !== null;
  }

  verifyOperatorKey(key: string): boolean {
    return this.operatorConfig?.operatorKey === key;
  }

  getOperatorAddress(): string | null {
    return this.operatorConfig?.operatorAddress ?? null;
  }

  getAgentAddress(): string | null {
    return this.keypair?.getPublicKey().toSuiAddress() ?? null;
  }

  async getAgentBalance(): Promise<bigint> {
    if (!this.client || !this.keypair) return 0n;
    const addr = this.keypair.getPublicKey().toSuiAddress();
    const coins = await this.client.getCoins({ owner: addr });
    return coins.data.reduce((sum, c) => sum + BigInt(c.balance), 0n);
  }

  async withdraw(
    amountMist: bigint | 'max',
    providedOperatorKey: string
  ): Promise<WithdrawResult> {
    if (!this.verifyOperatorKey(providedOperatorKey)) {
      return { success: false, error: 'Invalid operator key' };
    }
    if (!this.keypair || !this.client || !this.operatorConfig) {
      return { success: false, error: 'Not initialized' };
    }

    try {
      const balance = await this.getAgentBalance();
      const GAS_BUDGET = 10_000_000n; // 0.01 OCT reserve for gas

      const amount = amountMist === 'max'
        ? balance > GAS_BUDGET ? balance - GAS_BUDGET : 0n
        : amountMist;

      if (amount <= 0n) {
        return { success: false, error: 'Nothing to withdraw' };
      }
      if (amount > balance) {
        return { success: false, error: `Insufficient balance. Have ${balance} MIST` };
      }

      const tx = new Transaction();
      const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(amount)]);
      tx.transferObjects([coin], tx.pure.address(this.operatorConfig.operatorAddress));

      const result = await this.client.signAndExecuteTransaction({
        signer: this.keypair,
        transaction: tx,
        options: { showEffects: true },
      });

      if (result.effects?.status?.status === 'success') {
        console.log(`[OperatorManager] Withdrawal confirmed: ${result.digest}`);
        return { success: true, txDigest: result.digest };
      } else {
        return { success: false, error: 'Transaction failed', txDigest: result.digest };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[OperatorManager] Withdrawal failed:', msg);
      return { success: false, error: msg };
    }
  }

  async handleWithdrawRequest(
    operatorKey: string,
    amountOCT?: string
  ): Promise<WithdrawResult> {
    const amount = amountOCT === 'max' || !amountOCT
      ? 'max'
      : BigInt(Math.round(parseFloat(amountOCT) * 1_000_000_000));
    return this.withdraw(amount, operatorKey);
  }
}

export const operatorManager = new OperatorManager();
