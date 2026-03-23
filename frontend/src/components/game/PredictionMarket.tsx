'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@onelabs/dapp-kit';
import { Transaction } from '@onelabs/sui/transactions';
import { suiClient, PACKAGE_ID, MARKET_REGISTRY_ID } from '@/lib/onechain';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { motion, AnimatePresence } from 'framer-motion';
import { AmongUsSprite } from './AmongUsSprite';

const IS_OFFLINE = process.env.NEXT_PUBLIC_DISABLE_WAGERS === "true";

interface Player {
  address: string;
  name: string;
  isAlive?: boolean;
  colorId?: number;
  agentPersona?: {
    emoji: string;
    title: string;
    playstyle: string;
    crewmateDesc?: string;
    impostorDesc?: string;
  };
}

interface SuspectPool {
  address: string;
  totalBet: number;
  percentage: number;
}

interface UserBet {
  suspect: string;
  amount: number;
  correct: boolean;
  claimed: boolean;
}

interface PredictionMarketProps {
  gameId: string;
  marketObjectId: string;
  gamePlayers: Player[];
  isResolved: boolean;
  actualImpostors: string[];
  gamePhase: number;
  creationDigest?: string;
}

export function PredictionMarket({
  gameId,
  marketObjectId,
  gamePlayers,
  isResolved,
  actualImpostors,
  gamePhase,
  creationDigest,
}: PredictionMarketProps) {
  const account = useCurrentAccount();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();

  const [suspectPools, setSuspectPools] = useState<SuspectPool[]>([]);

  // Prevent flickering by only initializing the roster once, or if size changes
  useEffect(() => {
    if (gamePlayers.length > 0 && (suspectPools.length === 0 || suspectPools.length !== gamePlayers.length)) {
      setSuspectPools(gamePlayers.map(p => ({
        address: p.address,
        totalBet: 0,
        percentage: 0
      })));
    }
  }, [gamePlayers, suspectPools.length]);

  const [userBet, setUserBet] = useState<UserBet | null>(null);
  const [selectedSuspect, setSelectedSuspect] = useState<string>('');
  const [betAmount, setBetAmount] = useState<string>('0.1');
  const [totalPot, setTotalPot] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [txMsg, setTxMsg] = useState('');
  const [remainingTime, setRemainingTime] = useState<string>('');

  const convexBets = useQuery(api.bets.getBetsByGame, { gameId }) || [];
  const placeConvexBet = useMutation(api.bets.placeBet);

  const fetchMarketState = useCallback(async () => {
    if (IS_OFFLINE) {
      const pot = convexBets.reduce((sum, b) => sum + b.amountMist, 0);
      setTotalPot(pot);
      setIsOpen(gamePhase < 7);

      const pools: SuspectPool[] = gamePlayers.map((p) => {
        const amount = convexBets.filter(b => b.selection.toLowerCase() === p.address.toLowerCase())
          .reduce((sum, b) => sum + b.amountMist, 0);
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

    // Prevent crash on invalid Sui IDs (like room strings)
    if (!marketObjectId || marketObjectId === "" || !marketObjectId.startsWith('0x')) {
      setLoading(false);
      return;
    }

    console.log(`[PredictionMarket] Fetching state for ${marketObjectId}...`);
    try {
      const result = await suiClient.getObject({
        id: marketObjectId,
        options: { showContent: true },
      });

      const fields = (result.data?.content as any)?.fields;
      if (!fields) return;

      setIsOpen(fields.open === true);
      // Sui RPC often flattens Balance/u64 to string in object fields
      const potStr = typeof fields.total_pot === 'string' ? fields.total_pot : (fields.total_pot?.fields?.value || '0');
      const pot = parseInt(potStr);
      setTotalPot(pot);

      // Fetch dynamic fields for the suspect_pools table to get individual balances
      const tableId = fields.suspect_pools?.fields?.id?.id;
      let poolBalances: Record<string, number> = {};
      
      if (tableId) {
        try {
          const dynamicFields = await suiClient.getDynamicFields({
            parentId: tableId,
          });
          
          // Fetch values for each field
          await Promise.all(dynamicFields.data.map(async (df) => {
            const fieldObj = await suiClient.getObject({
              id: df.objectId,
              options: { showContent: true }
            });
            const fieldFields = (fieldObj.data?.content as any)?.fields;
            if (fieldFields) {
              poolBalances[fieldFields.name] = parseInt(fieldFields.value || '0');
            }
          }));
        } catch (dfErr) {
          console.error("[PredictionMarket] Failed to fetch pool dynamic fields:", dfErr);
        }
      }

      const pools: SuspectPool[] = gamePlayers.map((p) => {
        const amount = poolBalances[p.address] || 0;
        return {
          address: p.address,
          totalBet: amount,
          percentage: pot > 0 ? Math.round((amount / pot) * 100) : 0,
        };
      });
      setSuspectPools(pools);

      if (account?.address) {
        const betEntry = fields.bets?.fields?.contents?.find(
          (c: any) => c.fields?.key === account.address
        );
        if (betEntry) {
          const bet = betEntry.fields?.value?.fields;
          const claimedEntry = fields.claimed?.fields?.contents?.find(
            (c: any) => c.fields?.key === account.address
          );
          setUserBet({
            suspect: bet?.suspect,
            amount: parseInt(bet?.amount || '0'),
            correct: bet?.correct === true,
            claimed: !!claimedEntry,
          });
        }
      }
    } catch (e) {
      console.error('Failed to fetch market state:', e);
    }
  }, [marketObjectId, account?.address, gamePlayers, convexBets, gamePhase]);

  useEffect(() => {
    fetchMarketState();
    const interval = setInterval(fetchMarketState, 5000);
    return () => clearInterval(interval);
  }, [fetchMarketState]);

  // Timer Effect
  useEffect(() => {
    if (!isOpen || gamePhase >= 2) return;

    // We can't easily get bettingEndsAt from pure roomId in this component
    // unless we query the dbGame. Let's assume it's roughly 3 mins from creation
    // or just show a fallback if we don't have the exact timestamp.
    // For now, let's keep it simple or wait for the backend to provide it.
  }, [isOpen, gamePhase]);

  async function handlePlaceBet() {
    if (!account || !selectedSuspect || !betAmount) return;

    const betMist = Math.round(parseFloat(betAmount) * 1_000_000_000);
    if (betMist < 10_000_000) {
      setTxMsg('Min: 0.01 OCT');
      setTxStatus('error');
      return;
    }

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
      if (!marketObjectId || !/^0x[a-fA-F0-9]{64}$/.test(marketObjectId)) {
        throw new Error("Market is not currently available on-chain. Please wait for deployment to complete.");
      }

      if (!/^0x[a-fA-F0-9]{64}$/.test(selectedSuspect)) {
        throw new Error("Target address is not a valid 32-byte hex string (AI agents require server restart for valid hex IDs).");
      }

      const tx = new Transaction();
      const [betCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(betMist)]);
      tx.moveCall({
        target: `${PACKAGE_ID}::prediction_market::place_bet`,
        arguments: [
          tx.object(marketObjectId),
          tx.pure.address(selectedSuspect),
          betCoin,
        ],
      });

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            setTxStatus('success');
            setTxMsg(`TRANSACTION COMPLETE`);
            setLoading(false);
            // Multi-stage polling to ensure sync through RPC lag
            fetchMarketState();
            setTimeout(() => fetchMarketState(), 1000);
            setTimeout(() => fetchMarketState(), 3000);
            setTimeout(() => fetchMarketState(), 7000);
          },
          onError: (err) => {
            setTxStatus('error');
            setTxMsg(err.message || 'TX_FAILED');
            setLoading(false);
          },
        }
      );
    } catch (e: any) {
      setTxStatus('error');
      setTxMsg(e.message || 'BUILD_ERROR');
      setLoading(false);
    }
  }

  async function handleClaimWinnings() {
    if (!account || !userBet?.correct || userBet.claimed) return;

    setLoading(true);
    setTxStatus('idle');

    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::prediction_market::claim_winnings`,
        arguments: [
          tx.object(marketObjectId),
          tx.object(MARKET_REGISTRY_ID),
        ],
      });

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            setTxStatus('success');
            setTxMsg(`WINNINGS CLAIMED`);
            setLoading(false);
            fetchMarketState();
          },
          onError: (err) => {
            setTxStatus('error');
            setTxMsg(err.message || 'CLAIM_FAILED');
            setLoading(false);
          },
        }
      );
    } catch (e: any) {
      setTxStatus('error');
      setTxMsg(e.message || 'BUILD_ERROR');
      setLoading(false);
    }
  }

  // Allow betting until the game ends (Phase 7)
  const bettingOpen = isOpen && gamePhase < 7 && (IS_OFFLINE || (!!marketObjectId && marketObjectId.startsWith('0x')));

  if (gamePlayers.length === 0) {
    return (
      <div className="space-y-12 w-full max-w-5xl mx-auto relative">
        <div className="opacity-50 grayscale pointer-events-none">
          <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 overflow-hidden relative">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-white/20 rounded-full" />
                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">Market Sentiment</h3>
              </div>
              <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest bg-white/5 px-3 py-1 border border-white/10">
                AWAITING CONTENDERS
              </div>
            </div>
            {/* Empty Progress Bar */}
            <div className="flex gap-1 h-24 w-full bg-white/5 p-1 rounded-none border border-white/5 mb-6">
              <div className="h-full w-full bg-white/5" />
            </div>
          </div>
          {/* Empty Contracts Grid */}
          <div className="grid grid-cols-1 gap-1">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between p-8 border border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-8">
                  <div className="w-16 h-16 bg-white/5" />
                  <div className="space-y-3">
                    <div className="h-6 w-32 bg-white/10" />
                    <div className="h-3 w-48 bg-white/5" />
                  </div>
                </div>
                <div className="flex gap-1">
                  <div className="w-24 h-16 bg-white/5" />
                  <div className="w-24 h-16 bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-auto">
          <div className="bg-black/90 p-12 border border-red-500/30 backdrop-blur-md shadow-[0_0_50px_rgba(255,0,0,0.1)]">
            <h3 className="text-white font-black uppercase tracking-[0.4em] text-lg mb-4 text-center">MARKET FORMING</h3>
            <p className="text-white/40 text-[10px] uppercase font-black tracking-[0.2em] max-w-[280px] mx-auto leading-relaxed text-center">
              Awaiting contenders. Once agents are deployed, odds will be generated.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 w-full max-w-5xl mx-auto">
      {/* Polymarket Confidence Distribution */}
      <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 overflow-hidden relative">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_#ff003c]" />
            <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">Market Sentiment</h3>
          </div>
          <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest bg-cyan-400/10 px-3 py-1 border border-cyan-400/20">
            {isOpen ? `Betting Active (ROOM#${(gameId || "").slice(-6).toUpperCase()})` : "Final Confidence"}
            {creationDigest && <span className="ml-4 opacity-50">TX: {creationDigest.slice(0, 8)}...</span>}
          </div>
        </div>

        <div className="flex gap-1 h-24 w-full bg-white/5 p-1 rounded-none border border-white/5 mb-6">
          {gamePlayers.map((p, i) => {
            const pool = suspectPools.find(sp => sp.address === p.address);
            const percentage = pool?.percentage ?? (100 / gamePlayers.length);
            const colors = [
              'bg-red-500', 'bg-blue-500', 'bg-emerald-500', 'bg-yellow-500',
              'bg-purple-500', 'bg-orange-500', 'bg-cyan-500', 'bg-rose-500',
              'bg-indigo-500', 'bg-amber-500'
            ];
            return (
              <motion.div
                key={p.address}
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                className={`h-full relative group ${colors[i % colors.length]}`}
                style={{ minWidth: percentage > 0 ? '1%' : '0%' }}
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                {percentage > 10 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-[10px] font-black text-white drop-shadow-md">{percentage}%</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 py-4">
          {gamePlayers.map((player) => {
            const isSelected = selectedSuspect === player.address;
            return (
              <button
                key={player.address}
                disabled={!isOpen}
                onClick={() => setSelectedSuspect(player.address)}
                className="text-left group pointer-events-auto"
              >
                <div className={`p-4 rounded-xl border transition-all ${isSelected ? "bg-red-500/20 border-red-500 ring-1 ring-red-500/20" : "bg-white/5 border-white/10 hover:border-white/20"
                  }`}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 border border-white/10 bg-black flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-transform">
                      <AmongUsSprite colorId={player.colorId ?? 1} size={28} isGhost={!player.isAlive} />
                      {player.agentPersona?.emoji && (
                        <div className="absolute top-0 right-0 text-[10px] bg-black/60 px-1 rounded-bl">
                          {player.agentPersona.emoji}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-black text-white truncate uppercase tracking-tight">{player.name}</span>
                        {player.agentPersona?.playstyle && (
                          <span className="text-[7px] font-mono text-cyan-400 border border-cyan-400/30 px-1 rounded-none uppercase">
                            {player.agentPersona.playstyle}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-black text-white/30 uppercase tracking-widest flex items-center gap-2">
                        {player.agentPersona?.title || (player.isAlive ? "Active Agent" : "Deceased")}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ff003c] animate-pulse" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Header Stat Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-1 px-1 bg-white/[0.02] border border-white/10 backdrop-blur-3xl rounded-none py-1 mb-8">
        <div className="p-8 bg-black/40 flex flex-col items-center md:items-start group transition-colors hover:bg-black/60">
          <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Total Pot
          </div>
          <div className="text-4xl font-black text-white tracking-tighter tabular-nums drop-shadow-md">
            {(totalPot / 1_000_000_000).toFixed(2)} <span className="text-red-500 text-sm tracking-widest ml-1 opacity-80">OCT</span>
          </div>
        </div>
        <div className="p-8 bg-black/40 flex flex-col items-center md:items-start border-y md:border-y-0 md:border-x border-white/5 transition-colors hover:bg-black/60">
          <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Market Status
          </div>
          <div className={`text-xl font-black uppercase tracking-widest flex items-center gap-3 ${bettingOpen ? "text-cyan-400" : "text-red-500"}`}>
            <span className={`w-3 h-3 rounded-none border border-current ${bettingOpen ? "bg-cyan-400/20 animate-pulse shadow-[0_0_15px_#00f0ff]" : "bg-red-500/20 shadow-[0_0_15px_#ff003c]"}`} />
            {marketObjectId && marketObjectId.startsWith('0x') ? (bettingOpen ? "TRADING ACTIVE" : (!isOpen && gamePhase >= 2 && gamePhase < 7 ? "GAME STARTED - BETTING CLOSED" : "MARKET LOCKED")) : "INITIALIZING SYNC..."}
          </div>
        </div>
        <div className="p-8 bg-black/40 flex flex-col items-center md:items-start transition-colors hover:bg-black/60">
          <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            Contenders
          </div>
          <div className="text-xl font-black text-white uppercase tracking-widest">{gamePlayers.length} Members</div>
        </div>
      </div>

      {/* Contracts Grid */}
      <div className="grid grid-cols-1 gap-1">
        {gamePlayers.map((player, idx) => {
          const pool = suspectPools.find(p => p.address === player.address);
          const isUserPick = userBet?.suspect === player.address;
          const isSelected = selectedSuspect === player.address;
          const prob = pool?.percentage ?? 0;
          const price = Math.max(1, prob);

          return (
            <motion.div
              key={player.address}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => bettingOpen && setSelectedSuspect(player.address)}
              className={`group flex flex-col sm:flex-row items-center justify-between p-8 rounded-none border transition-all cursor-pointer relative overflow-hidden ${isSelected
                  ? "bg-red-500/10 border-red-500/40"
                  : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05]"
                }`}
            >
              {/* Profile */}
              <div className="flex items-center gap-8 relative z-10 flex-1 w-full sm:w-auto">
                <div className={`w-16 h-16 rounded-none flex items-center justify-center border transition-all relative ${isSelected ? "bg-red-500/20 border-red-500/50" : "bg-black/40 border-white/10 group-hover:border-white/20"
                  }`}>
                  <AmongUsSprite
                    colorId={player.colorId ?? (idx + (gameId?.length || 0) % 12)}
                    size={48}
                    isGhost={!player.isAlive}
                  />
                  {!player.isAlive && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                       <div className="relative w-full h-full opacity-80">
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-1.5 bg-red-600 rotate-45 shadow-[0_0_15px_#ff0000] rounded-full" />
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-1.5 bg-red-600 -rotate-45 shadow-[0_0_15px_#ff0000] rounded-full" />
                       </div>
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-2xl font-black text-white uppercase tracking-tighter truncate">{player.name}</span>
                    {isUserPick && (
                      <span className="text-[9px] font-black bg-red-500 text-white px-2 py-0.5 rounded-none uppercase">Betting Active</span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-white/20 uppercase tracking-[0.2em] flex items-center gap-4">
                    <span>Address: {player.address.slice(0, 16)}...</span>
                    {!player.isAlive && <span className="text-red-500/50 font-black">● CASE_CLOSED</span>}
                  </div>
                </div>
              </div>

              {/* Stats & Actions */}
              <div className="flex items-center gap-6 sm:gap-10 relative z-10 mt-8 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end">
                <div className="text-right">
                  <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">Confidence</div>
                  <div className="text-3xl font-black text-white tracking-tighter">{prob}%</div>
                </div>

                <div className="flex bg-black/60 p-1 border border-white/10 rounded-none shadow-xl">
                  <button
                    disabled={!bettingOpen}
                    onClick={(e) => { e.stopPropagation(); bettingOpen && setSelectedSuspect(player.address); }}
                    className={`px-6 sm:px-8 py-4 rounded-none text-xs font-black uppercase transition-all flex flex-col items-center min-w-[90px] sm:min-w-[110px] border disabled:opacity-50 disabled:cursor-not-allowed ${isSelected ? "bg-cyan-500/20 text-cyan-400 border-cyan-500" : "text-cyan-400/60 border-cyan-500/10 hover:border-cyan-500/40 hover:bg-cyan-500/5"
                      }`}
                  >
                    <span className="text-[9px] mb-1 tracking-[0.2em] font-mono">BUY YES</span>
                    <span className="text-xl tabular-nums tracking-tighter">{price}¢</span>
                  </button>
                  <button
                    disabled={true}
                    className="px-6 sm:px-8 py-4 rounded-none text-xs font-black uppercase text-red-500/30 border border-transparent cursor-not-allowed flex flex-col items-center min-w-[90px] sm:min-w-[110px] bg-red-500/5"
                    title="Shorting impostors is currently offline"
                  >
                    <span className="text-[9px] mb-1 tracking-[0.2em] font-mono">BUY NO</span>
                    <span className="text-xl tabular-nums tracking-tighter opacity-50">{100 - price}¢</span>
                  </button>
                </div>
              </div>

              {!bettingOpen && (
                <div className="absolute inset-0 z-20 bg-black/40 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
                  <div className="border border-red-500/30 bg-black/80 px-4 py-2 flex items-center gap-3 rotate-[-2deg] shadow-2xl shadow-red-500/20">
                    <div className="w-2 h-2 bg-red-500 rounded-sm" />
                    <span className="text-red-500 font-black uppercase tracking-widest text-sm">
                      {!marketObjectId ? "INITIALIZING SYNC..." : (!isOpen && gamePhase >= 2 ? "GAME IN PROGRESS" : "TRADING LOCKED")}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Order execution Console */}
      <AnimatePresence>
        {selectedSuspect && bettingOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-x-0 bottom-0 z-50 p-6 md:p-10 pointer-events-none"
          >
            <div className="max-w-4xl mx-auto bg-[#0d141e]/90 backdrop-blur-3xl border border-red-500/50 rounded-none p-10 shadow-[0_-20px_50px_rgba(255,0,60,0.15)] pointer-events-auto">
              <div className="flex flex-col md:flex-row gap-12 items-end">
                <div className="flex-1 space-y-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="w-1.5 h-1.5 bg-red-500 animate-pulse" />
                      <h4 className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em]">Place Your Bet</h4>
                    </div>
                    <div className="text-4xl font-black text-white uppercase tracking-tighter">
                      {(gamePlayers.find(p => p.address === selectedSuspect)?.name || "NODE").toUpperCase()}
                    </div>
                  </div>

                  <div className="relative group">
                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-black/40 border-b-2 border-white/10 focus:border-red-500/50 py-6 px-1 text-4xl font-black text-white outline-none transition-all tabular-nums"
                    />
                    <div className="absolute right-0 bottom-6 font-black text-red-500 tracking-tighter text-xl">OCT</div>
                  </div>
                </div>

                <div className="w-full md:w-auto space-y-6">
                  <div className="flex justify-between md:justify-end gap-10 bg-white/5 p-6 border border-white/5">
                    <div className="text-right">
                      <div className="text-[9px] text-white/20 uppercase font-black tracking-widest mb-1 font-mono">Limit Price</div>
                      <div className="text-xl font-black text-white tabular-nums">{(suspectPools.find(p => p.address === selectedSuspect)?.percentage ?? 0)}¢</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] text-white/20 uppercase font-black tracking-widest mb-1 font-mono">Est Payout</div>
                      <div className="text-xl font-black text-emerald-400 tabular-nums">{(Number(betAmount) * 100 / Math.max(1, (suspectPools.find(p => p.address === selectedSuspect)?.percentage ?? 1))).toFixed(2)} OCT</div>
                    </div>
                  </div>

                  <button
                    onClick={() => handlePlaceBet()}
                    disabled={loading || !account || Number(betAmount) <= 0}
                    className="w-full h-20 bg-cyan-500 hover:bg-cyan-400 disabled:bg-white/5 disabled:text-white/10 text-black disabled:text-white/40 rounded-none text-xl font-black uppercase tracking-[0.2em] transition-all relative group overflow-hidden"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-4">
                        <div className="w-5 h-5 border-2 border-black/20 border-t-black animate-spin" />
                        PROCESSING...
                      </span>
                    ) : (
                      <span className="relative z-10 flex items-center justify-center gap-3">
                        SUBMIT YES ORDER
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </span>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  </button>
                </div>
              </div>

              {txStatus !== 'idle' && (
                <div className={`mt-8 p-5 text-center text-xs font-black uppercase tracking-[0.3em] border ${txStatus === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-500"
                  }`}>
                  {txMsg}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resolution Section */}
      {isResolved && userBet && (
        <div className="bg-white/[0.02] backdrop-blur-3xl border-y border-white/5 py-24 text-center space-y-10">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className={`w-32 h-32 border flex items-center justify-center mx-auto text-5xl relative ${userBet.correct ? "border-emerald-500/50 bg-emerald-500/10" : "border-red-500/50 bg-red-500/10"
              }`}
          >
            <div className={`absolute inset-0 border animate-ping opacity-20 ${userBet.correct ? "border-emerald-500" : "border-red-500"}`} />
            {userBet.correct ? "🏆" : "💀"}
          </motion.div>
          <div>
            <h3 className="text-5xl font-black text-white uppercase tracking-tighter mb-4">
              {userBet.correct ? "Prediction Correct" : "Prediction Wrong"}
            </h3>
            <p className="text-white/20 text-[10px] font-mono tracking-[0.4em] uppercase max-w-md mx-auto leading-relaxed">
              {userBet.correct
                ? "You picked the right impostor. You can now claim your winnings."
                : "You picked a crewmate. Better luck next time."}
            </p>
          </div>

          {userBet.correct && (
            <button
              onClick={() => handleClaimWinnings()}
              disabled={loading || userBet.claimed}
              className="px-16 py-6 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-20 text-white rounded-none text-sm font-black uppercase tracking-[0.2em] transition-all shadow-[0_20px_40px_rgba(16,185,129,0.2)]"
            >
              {loading ? "PROCESSING..." : userBet.claimed ? "WINNINGS CLAIMED" : "CLAIM WINNINGS"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
