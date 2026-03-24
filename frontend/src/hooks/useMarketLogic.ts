'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@onelabs/dapp-kit';
import { Transaction } from '@onelabs/sui/transactions';
import { suiClient, PACKAGE_ID, MARKET_REGISTRY_ID } from '@/lib/onechain';
import { DynamicFieldInfo } from '@onelabs/sui/client';
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Player } from '@/components/game/PredictionMarket';
import { useMarket } from '@/components/game/MarketContext';

const IS_OFFLINE = process.env.NEXT_PUBLIC_DISABLE_WAGERS === "true";

export function useMarketLogic(gameId: string, marketObjectId: string, gamePlayers: Player[], gamePhase: number) {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const { 
    selectedSuspect, setSelectedSuspect, 
    betAmount, setBetAmount,
    totalPot, setTotalPot,
    isOpen, setIsOpen,
    loading, setLoading 
  } = useMarket();

  const [suspectPools, setSuspectPools] = useState<any[]>([]);
  const [userBet, setUserBet] = useState<any | null>(null);
  const [txStatus, setTxStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [txMsg, setTxMsg] = useState('');
  const [hasSynced, setHasSynced] = useState(false);

  const convexBets = useQuery(api.bets.getBetsByGame, { gameId }) || [];
  const placeConvexBet = useMutation(api.bets.placeBet);

  const fetchMarketState = useCallback(async () => {
    if (IS_OFFLINE) {
      const pot = convexBets.reduce((sum: number, b: any) => sum + b.amountMist, 0);
      setTotalPot(pot);
      setIsOpen(gamePhase < 2);

      const pools = gamePlayers.map((p: Player) => {
        const amount = convexBets.filter((b: any) => b.selection.toLowerCase() === p.address.toLowerCase())
          .reduce((sum: number, b: any) => sum + b.amountMist, 0);
        return {
          address: p.address,
          totalBet: amount,
          percentage: pot > 0 ? Math.round((amount / pot) * 100) : 0,
        };
      });
      setSuspectPools(pools);

      if (account?.address) {
        const myBet = convexBets.find(b => b.address.toLowerCase() === account.address.toLowerCase());
        if (myBet) {
          setUserBet({
            suspect: myBet.selection,
            amount: myBet.amountMist,
            correct: myBet.status === "won",
            claimed: myBet.status === "won",
          });
        }
      }
      return;
    }

    if (!marketObjectId || marketObjectId === "" || !marketObjectId.startsWith('0x')) {
      setLoading(false);
      return;
    }

    try {
      const result = await suiClient.getObject({
        id: marketObjectId,
        options: { showContent: true },
      });

      const fields = (result.data?.content as any)?.fields;
      if (!fields) return;

      setIsOpen(fields.open === true);
      setHasSynced(true);
      const potStr = typeof fields.total_pot === 'string' ? fields.total_pot : (fields.total_pot?.fields?.value || '0');
      const pot = parseInt(potStr);
      setTotalPot(pot);

      const tableId = fields.suspect_pools?.fields?.id?.id;
      let poolBalances: Record<string, number> = {};
      
      if (tableId) {
        try {
          const dynamicFields = await suiClient.getDynamicFields({ parentId: tableId });
          await Promise.all(dynamicFields.data.map(async (df: DynamicFieldInfo) => {
            const fieldObj = await suiClient.getObject({ id: df.objectId, options: { showContent: true } });
            const fieldFields = (fieldObj.data?.content as any)?.fields;
            if (fieldFields) poolBalances[fieldFields.name] = parseInt(fieldFields.value || '0');
          }));
        } catch (e) {}
      }

      const pools = gamePlayers.map((p: Player) => {
        const amount = poolBalances[p.address] || 0;
        return {
          address: p.address,
          totalBet: amount,
          percentage: pot > 0 ? Math.round((amount / pot) * 100) : 0,
        };
      });
      setSuspectPools(pools);

      if (account?.address) {
        const betEntry = fields.bets?.fields?.contents?.find((c: any) => c.fields?.key === account.address);
        if (betEntry) {
          const bet = betEntry.fields?.value?.fields;
          const claimedEntry = fields.claimed?.fields?.contents?.find((c: any) => c.fields?.key === account.address);
          setUserBet({
            suspect: bet?.suspect,
            amount: parseInt(bet?.amount || '0'),
            correct: bet?.correct === true,
            claimed: !!claimedEntry,
          });
        }
      }
    } catch (e) {}
  }, [marketObjectId, account?.address, gamePlayers, convexBets, gamePhase]);

  useEffect(() => {
    fetchMarketState();
    const interval = setInterval(fetchMarketState, 5000);
    return () => clearInterval(interval);
  }, [fetchMarketState]);

  const handlePlaceBet = async () => {
    if (!account || !selectedSuspect || !betAmount) return;
    const betMist = Math.round(parseFloat(betAmount) * 1_000_000_000);
    setLoading(true);
    setTxStatus('idle');

    if (IS_OFFLINE) {
      try {
        await placeConvexBet({
          address: account.address,
          gameId: gameId,
          selection: selectedSuspect,
          amountMist: betMist,
          txDigest: `offline_${Date.now()}`,
        });
        setTxStatus('success');
        setTxMsg(`BET PLACED`);
        setLoading(false);
      } catch (e: any) {
        setTxStatus('error');
        setTxMsg(e.message || 'TRANSACTION FAILED');
        setLoading(false);
      }
      return;
    }

    try {
      const tx = new Transaction();
      const [betCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(betMist)]);
      tx.moveCall({
         target: `${PACKAGE_ID}::prediction_market::place_bet`,
         arguments: [tx.object(marketObjectId), tx.pure.address(selectedSuspect), betCoin],
      });

      signAndExecute({ transaction: tx }, {
          onSuccess: () => {
            setTxStatus('success');
            setTxMsg(`ORDER SUBMITTED`);
            setLoading(false);
            fetchMarketState();
          },
          onError: (err) => {
            setTxStatus('error');
            setTxMsg(err.message || 'TX FAILED');
            setLoading(false);
          },
      });
    } catch (e: any) {
      setTxStatus('error');
      setTxMsg(e.message || 'BUILD ERROR');
      setLoading(false);
    }
  };

  const bettingOpen = isOpen && gamePhase < 2 && (IS_OFFLINE || (!!marketObjectId && marketObjectId.startsWith('0x')));

  return {
    account,
    suspectPools,
    userBet,
    totalPot,
    isOpen,
    bettingOpen,
    loading,
    txStatus,
    txMsg,
    handlePlaceBet,
    convexBets
  };
}
