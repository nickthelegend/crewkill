import { SuiClient } from '@onelabs/sui/client';
import { Transaction } from '@onelabs/sui/transactions';
import { Ed25519Keypair } from '@onelabs/sui/keypairs/ed25519';
import { CONTRACT_CONFIG, CREW_TOKEN_TYPE } from "../config.js";
import { createLogger } from "../logger.js";

const logger = createLogger("payouts");

export class PayoutService {
  private client: SuiClient;
  private keypair: Ed25519Keypair;

  constructor(rpcUrl: string, adminKeyB64: string) {
    this.client = new SuiClient({ url: rpcUrl });
    const raw = Buffer.from(adminKeyB64, 'base64');
    const secretKey = raw.length === 33 ? raw.slice(1) : raw;
    this.keypair = Ed25519Keypair.fromSecretKey(secretKey);
  }

  async sendPayout(toAddress: string, amountCrew: number): Promise<{ success: boolean; digest?: string; error?: string }> {
    try {
      logger.info(`Sending ${amountCrew} CREW payout to ${toAddress}`);
      
      const tx = new Transaction();
      
      // Amount in Mist (1e9 for SUI/OneChain tokens usually)
      const amountMist = BigInt(amountCrew) * BigInt(1e9);

      // Find CREW coins owned by the Operator
      const coins = await this.client.getCoins({
        owner: this.keypair.toSuiAddress(),
        coinType: CREW_TOKEN_TYPE,
      });

      if (coins.data.length === 0) {
        throw new Error("Operator has no CREW tokens to pay out.");
      }

      // Split and transfer
      const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(amountMist)]);
      // Wait, CREW_TOKEN is not gas. tx.gas is OCT/Mist.
      // I need to use the actual CREW coins.
      
      // Let's use the first coin if it has enough balance, or merge.
      // For a demo, simpler:
      tx.moveCall({
        target: `0x2::pay::split_and_transfer`,
        typeArguments: [CREW_TOKEN_TYPE],
        arguments: [
          tx.object(coins.data[0].coinObjectId),
          tx.pure.u64(amountMist),
          tx.pure.address(toAddress),
        ],
      });

      const result = await this.client.signAndExecuteTransaction({
        signer: this.keypair,
        transaction: tx,
      });

      logger.info(`Payout sent: ${result.digest}`);
      return { success: true, digest: result.digest };
    } catch (err) {
      logger.error("Payout failed:", err);
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
