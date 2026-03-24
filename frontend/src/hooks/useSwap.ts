import { useSuiClient, useSignAndExecuteTransaction } from '@onelabs/dapp-kit';
import { Transaction } from '@onelabs/sui/transactions';
import { AMM_POOL_ID, PACKAGE_ID, OCT_TOKEN_TYPE, CREW_TOKEN_TYPE } from '@/lib/onechain';
import { useState } from 'react';

export function useSwap() {
  const suiClient = useSuiClient();
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
    const txb = new Transaction();
    
    // Split coin from gas if it's OCT
    const [coinIn] = txb.splitCoins(
        xToY ? txb.gas : txb.object('0x123'), // Placeholder for user's CREW coin object
        [txb.pure.u64(amountIn)]
      );

    txb.moveCall({
      target: `${PACKAGE_ID}::amm::swap_${xToY ? 'x_to_y' : 'y_to_x'}`,
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
