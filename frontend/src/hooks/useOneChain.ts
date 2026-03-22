'use client';

import { useCurrentAccount, useSignAndExecuteTransaction } from '@onelabs/dapp-kit';
import { Transaction } from '@onelabs/sui/transactions';
import { suiClient, PACKAGE_ID } from '@/lib/onechain';

export function useOneChain() {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();

  const address = currentAccount?.address;
  const isConnected = !!currentAccount;

  // Place a bet on who the impostor is
  async function placeBet(
    marketObjectId: string,
    marketRegistryId: string,
    suspectAddress: string,
    betAmountMist: bigint,
  ) {
    if (!isConnected) throw new Error('Wallet not connected');

    const tx = new Transaction();

    // Split bet amount from gas coin
    const [betCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(betAmountMist)]);

    tx.moveCall({
      target: `${PACKAGE_ID}::prediction_market::place_bet`,
      arguments: [
        tx.object(marketObjectId),
        tx.pure.address(suspectAddress),
        betCoin,
      ],
    });

    return new Promise((resolve, reject) => {
      signAndExecute(
        { transaction: tx },
        { onSuccess: resolve, onError: reject }
      );
    });
  }

  // Claim prediction market winnings
  async function claimWinnings(
    marketObjectId: string,
    marketRegistryId: string,
  ) {
    if (!isConnected) throw new Error('Wallet not connected');

    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::prediction_market::claim_winnings`,
      arguments: [
        tx.object(marketObjectId),
        tx.object(marketRegistryId),
      ],
    });

    return new Promise((resolve, reject) => {
      signAndExecute(
        { transaction: tx },
        { onSuccess: resolve, onError: reject }
      );
    });
  }

  // Register as an agent
  async function registerAgent(registryObjectId: string) {
    if (!isConnected) throw new Error('Wallet not connected');

    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::agent_registry::register_agent`,
      arguments: [tx.object(registryObjectId)],
    });

    return new Promise((resolve, reject) => {
      signAndExecute(
        { transaction: tx },
        { onSuccess: resolve, onError: reject }
      );
    });
  }

  // Place wager to join a game
  async function placeWager(
    vaultObjectId: string,
    gameId: string,
    wagerAmountMist: bigint,
  ) {
    if (!isConnected) throw new Error('Wallet not connected');

    const tx = new Transaction();
    const [wagerCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(wagerAmountMist)]);

    tx.moveCall({
      target: `${PACKAGE_ID}::wager_vault::place_wager`,
      arguments: [
        tx.object(vaultObjectId),
        tx.pure.id(gameId),
        wagerCoin,
      ],
    });

    return new Promise((resolve, reject) => {
      signAndExecute(
        { transaction: tx },
        { onSuccess: resolve, onError: reject }
      );
    });
  }

  // Read game state from chain
  async function getGameState(gameObjectId: string) {
    const result = await suiClient.getObject({
      id: gameObjectId,
      options: { showContent: true },
    });
    return result.data?.content;
  }

  // Read prediction market state
  async function getMarketState(marketObjectId: string) {
    const result = await suiClient.getObject({
      id: marketObjectId,
      options: { showContent: true },
    });
    return result.data?.content;
  }

  return {
    address,
    isConnected,
    isPending,
    placeBet,
    claimWinnings,
    registerAgent,
    placeWager,
    getGameState,
    getMarketState,
  };
}
