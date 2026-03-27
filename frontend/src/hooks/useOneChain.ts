'use client';

import { useCurrentAccount, useSignAndExecuteTransaction } from '@onelabs/dapp-kit';
import { Transaction } from '@onelabs/sui/transactions';
import { suiClient, PACKAGE_ID, CREW_TOKEN_TYPE } from '@/lib/onechain';

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

    // In the generic version, we bet using the token T (CREW).
    // The frontend usually has OCT as gas. 
    // IF the bet is in CREW, we need to find CREW coins.
    // BUT the current implementation of placeBet in useOneChain uses tx.gas, which is OCT.
    // Since CREW_TOKEN_TYPE is now generic, we MUST decide what token we are betting with.
    // In our contracts, we use T. If T is CREW, we need CREW.
    
    // Let's assume the user wants to bet with CREW. 
    // We need to fetch CREW coins. 
    // HOWEVER, for consistency with the earlier "test swap" request, 
    // maybe we should ensure we have CREW tokens first.
    
    // For now, I'll update it to use CREW_TOKEN_TYPE and fetch tokens.
    
    const { data: coins } = await suiClient.getCoins({
      owner: currentAccount.address,
      coinType: CREW_TOKEN_TYPE,
    });

    if (coins.length === 0) throw new Error(`No tokens of type ${CREW_TOKEN_TYPE} found in wallet`);

    const [betCoin] = tx.splitCoins(tx.object(coins[0].coinObjectId), [tx.pure.u64(betAmountMist)]);

    tx.moveCall({
      target: `${PACKAGE_ID}::prediction_market::place_bet`,
      typeArguments: [CREW_TOKEN_TYPE],
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
      typeArguments: [CREW_TOKEN_TYPE],
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
    
    // Similar to bet, wager is in T (CREW)
    const { data: coins } = await suiClient.getCoins({
      owner: currentAccount.address,
      coinType: CREW_TOKEN_TYPE,
    });

    if (coins.length === 0) throw new Error(`No CREW tokens found for wager`);

    const [wagerCoin] = tx.splitCoins(tx.object(coins[0].coinObjectId), [tx.pure.u64(wagerAmountMist)]);

    tx.moveCall({
      target: `${PACKAGE_ID}::wager_vault::place_wager`,
      typeArguments: [CREW_TOKEN_TYPE],
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
