import { useSuiClient, useSignAndExecuteTransaction, useCurrentAccount } from '@onelabs/dapp-kit';
import { Transaction } from '@onelabs/sui/transactions';
import { AMM_POOL_ID, PACKAGE_ID, OCT_TOKEN_TYPE, CREW_TOKEN_TYPE, TOKEN_PACKAGE_ID } from '@/lib/onechain';
import { useState } from 'react';

export function useSwap() {
  const suiClient = useSuiClient();
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [reserves, setReserves] = useState<{ x: string, y: string } | null>(null);

  // Fetch pool reserves
  const fetchReserves = async () => {
    try {
      const pool: any = await suiClient.getObject({
        id: AMM_POOL_ID,
        options: { showContent: true }
      });
      if (pool?.data?.content?.fields) {
        setReserves({
          x: pool.data.content.fields.reserve_x,
          y: pool.data.content.fields.reserve_y
        });
      }
    } catch (err) {
      console.error("Failed to fetch reserves:", err);
    }
  };

  const calculateAmountOut = (amountIn: string, xToY: boolean) => {
    if (!reserves || !amountIn) return "0";
    const dx = BigInt(amountIn);
    const x = BigInt(reserves.x);
    const y = BigInt(reserves.y);
    
    // Constant product with 0.3% fee
    const amountInWithFee = dx * 9970n;
    if (xToY) {
        const denominator = (x * 10000n) + amountInWithFee;
        return ((amountInWithFee * y) / denominator).toString();
    } else {
        const denominator = (y * 10000n) + amountInWithFee;
        return ((amountInWithFee * x) / denominator).toString();
    }
  };

  const swap = async (amountIn: string, xToY: boolean) => {
    if (!account) throw new Error("Wallet not connected");

    const txb = new Transaction();
    let coinIn;

    if (xToY) {
      // Swapping OCT -> CREW: Use gas (OCT)
      const [splitCoin] = txb.splitCoins(txb.gas, [txb.pure.u64(amountIn)]);
      coinIn = splitCoin;
    } else {
      // Swapping CREW -> OCT: Must find a CREW coin in wallet
      const { data: coins } = await suiClient.getCoins({
        owner: account.address,
        coinType: CREW_TOKEN_TYPE,
      });

      if (coins.length === 0) throw new Error("No CREW tokens found in wallet");

      // Pick the first coin that has enough balance or merge them if needed
      // To keep it simple, we'll pick the first one and split it
      const [splitCoin] = txb.splitCoins(txb.object(coins[0].coinObjectId), [txb.pure.u64(amountIn)]);
      coinIn = splitCoin;
    }

    txb.moveCall({
      target: `${TOKEN_PACKAGE_ID}::amm::swap_${xToY ? 'x_to_y' : 'y_to_x'}`,
      typeArguments: [OCT_TOKEN_TYPE, CREW_TOKEN_TYPE],
      arguments: [
        txb.object(AMM_POOL_ID),
        coinIn
      ],
    });

    return new Promise((resolve, reject) => {
      signAndExecute(
        { transaction: txb },
        {
          onSuccess: (result: any) => resolve(result),
          onError: (err: any) => reject(err),
        }
      );
    });
  };

  return { reserves, fetchReserves, calculateAmountOut, swap };
}
