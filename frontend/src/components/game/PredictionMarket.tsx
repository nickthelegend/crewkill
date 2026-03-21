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
  name: string; // agent display name e.g. "Agent 0x857..."
}

interface SuspectPool {
  address: string;
  totalBet: number; // in MIST
  percentage: number;
}

interface UserBet {
  suspect: string;
  amount: number;
  correct: boolean;
  claimed: boolean;
}

interface PredictionMarketProps {
  gameId: string;           // the Game shared object ID
  marketObjectId: string;   // the PredictionMarket shared object ID
  gamePlayers: Player[];
  isResolved: boolean;
  actualImpostors: string[];
  gamePhase: number;        // 0=LOBBY, 1=ROLE_ASSIGN, 2+=betting closed
}

export function PredictionMarket({
  gameId,
  marketObjectId,
  gamePlayers,
  isResolved,
  actualImpostors,
  gamePhase,
}: PredictionMarketProps) {
  const account = useCurrentAccount();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();

  const [suspectPools, setSuspectPools] = useState<SuspectPool[]>([]);
  const [userBet, setUserBet] = useState<UserBet | null>(null);
  const [selectedSuspect, setSelectedSuspect] = useState<string>('');
  const [betAmount, setBetAmount] = useState<string>('0.1'); // OCT
  const [totalPot, setTotalPot] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [txMsg, setTxMsg] = useState('');

  // Convex integration for offline mode
  const convexBets = useQuery(api.bets.getBetsByGame, { gameId }) || [];
  const placeConvexBet = useMutation(api.bets.placeBet);

  const fetchMarketState = useCallback(async () => {
    if (IS_OFFLINE) {
        // Use Convex data to build pool
        const pot = convexBets.reduce((sum, b) => sum + b.amountMist, 0);
        setTotalPot(pot);
        setIsOpen(gamePhase < 2); // Open during lobby

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
              claimed: myBet.status === "won", // Mock claimed if won in offline
            });
          }
        }
        return;
    }

    if (!marketObjectId || marketObjectId === '0x_FILL_AFTER_DEPLOY') return;

    try {
      const result = await suiClient.getObject({
        id: marketObjectId,
        options: { showContent: true },
      });

      const fields = (result.data?.content as any)?.fields;
      if (!fields) return;

      setIsOpen(fields.open === true);
      const pot = parseInt(fields.total_pot?.fields?.value || '0');
      setTotalPot(pot);

      // Build suspect pool display
      const pools: SuspectPool[] = gamePlayers.map((p) => {
        const poolEntry = fields.suspect_pools?.fields?.contents?.find(
          (c: any) => c.fields?.key === p.address
        );
        const amount = parseInt(poolEntry?.fields?.value || '0');
        return {
          address: p.address,
          totalBet: amount,
          percentage: pot > 0 ? Math.round((amount / pot) * 100) : 0,
        };
      });
      setSuspectPools(pools);

      // Check if user has a bet
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

  // Fetch market state periodically
  useEffect(() => {
    fetchMarketState();
    const interval = setInterval(fetchMarketState, 5000);
    return () => clearInterval(interval);
  }, [fetchMarketState]);

  async function handlePlaceBet() {
    if (!account || !selectedSuspect || !betAmount) return;

    const betMist = Math.round(parseFloat(betAmount) * 1_000_000_000);
    if (betMist < 10_000_000) {
      setTxMsg('Minimum bet is 0.01 OCT');
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
        setTxMsg(`Prediction locked via Neural Link (Offline)`);
        setLoading(false);
      } catch (e: any) {
        setTxStatus('error');
        setTxMsg(e.message || 'Failed to place prediction');
        setLoading(false);
      }
      return;
    }

    try {
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
        { transaction: tx, options: { showEffects: true } },
        {
          onSuccess: (result) => {
            setTxStatus('success');
            setTxMsg(`Bet placed successfully!`);
            setLoading(false);
            fetchMarketState();
          },
          onError: (err) => {
            setTxStatus('error');
            setTxMsg(err.message || 'Transaction failed');
            setLoading(false);
          },
        }
      );
    } catch (e: any) {
      setTxStatus('error');
      setTxMsg(e.message || 'Error building transaction');
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
        { transaction: tx, options: { showEffects: true } },
        {
          onSuccess: (result) => {
            setTxStatus('success');
            setTxMsg(`Winnings claimed!`);
            setLoading(false);
            fetchMarketState();
          },
          onError: (err) => {
            setTxStatus('error');
            setTxMsg(err.message || 'Claim failed');
            setLoading(false);
          },
        }
      );
    } catch (e: any) {
      setTxStatus('error');
      setTxMsg(e.message || 'Error building transaction');
      setLoading(false);
    }
  }

  const bettingOpen = isOpen && gamePhase < 2 && !userBet;

  if (gamePlayers.length === 0) {
    return (
      <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-16 text-center">
        <div className="w-20 h-20 rounded-full bg-cyan-500/10 flex items-center justify-center mx-auto mb-8 relative">
           <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-ping" />
           <div className="w-10 h-10 rounded-full border-4 border-t-cyan-400 border-white/5 animate-spin" />
        </div>
        <h3 className="text-white/40 font-black uppercase tracking-[0.4em] text-[10px] mb-4">Neural Synchronization in Progress...</h3>
        <p className="text-white/10 text-[9px] uppercase font-bold tracking-widest max-w-[200px] mx-auto leading-relaxed">
          Waiting for agents to board the ship. Market contracts will generate upon deployment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Total Pot Banner */}
      <div className="bg-gradient-to-r from-cyan-900/20 to-transparent border border-white/10 rounded-3xl p-6 flex items-center justify-between overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[100px] rounded-full -mr-32 -mt-32 transition-colors group-hover:bg-cyan-500/10" />
        <div className="relative z-10">
          <div className="text-[10px] font-black text-cyan-400/60 uppercase tracking-widest mb-1">Total Trading Volume</div>
          <div className="text-3xl font-black text-white tabular-nums italic">{(totalPot / 1_000_000_000).toFixed(3)} <span className="text-cyan-400 text-sm">OCT</span></div>
        </div>
        <div className="relative z-10 text-right">
          <div className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Status</div>
          <div className={`text-xs font-black uppercase tracking-tighter italic ${isOpen ? "text-green-400" : "text-rose-500"}`}>
            {isOpen ? "● ACTIVE_EXCHANGE" : "● MARKET_HALTED"}
          </div>
        </div>
      </div>

      {/* Contracts List */}
      <div className="space-y-3">
        {gamePlayers.map((player, idx) => {
          const pool = suspectPools.find(p => p.address === player.address);
          const isUserPick = userBet?.suspect === player.address;
          const isSelected = selectedSuspect === player.address;
          const prob = pool?.percentage ?? 0;
          const price = Math.max(1, prob);

          return (
            <motion.div
              key={player.address}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => bettingOpen && setSelectedSuspect(player.address)}
              className={`group flex items-center justify-between p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                isSelected 
                  ? "bg-cyan-500/15 border-cyan-500/50 shadow-[0_0_30px_rgba(34,211,238,0.1)]" 
                  : "bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10"
              }`}
            >
              {/* Profile & Name */}
              <div className="flex items-center gap-4 relative z-10 flex-1 min-w-0">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${
                  isSelected ? "bg-cyan-400 border-white/20" : "bg-black/40 border-white/10 group-hover:border-white/30"
                }`}>
                  <AmongUsSprite colorId={idx + (gameId.length % 10)} size={32} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white uppercase truncate">{player.name}</span>
                    {isUserPick && (
                      <span className="text-[8px] font-black bg-cyan-500 text-black px-1.5 py-0.5 rounded italic whitespace-nowrap">HOLDING</span>
                    )}
                  </div>
                  <div className="text-[9px] font-mono text-white/20 mt-0.5 uppercase tracking-tighter truncate opacity-60">ID: {player.address.slice(0, 10)}...</div>
                </div>
              </div>

              {/* Sparkline Visual (Dummy) */}
              <div className="hidden md:flex flex-1 justify-center px-8 relative z-10">
                <div className="h-6 w-32 flex items-end gap-1 opacity-20 group-hover:opacity-40 transition-opacity">
                  {[...Array(8)].map((_, i) => (
                    <div 
                      key={i} 
                      className="flex-1 bg-white/40 border-t border-white" 
                      style={{ height: `${20 + Math.random() * 80}%` }} 
                    />
                  ))}
                </div>
              </div>

              {/* Binary Pricing Buttons */}
              <div className="flex items-center gap-2 relative z-10">
                <div className="text-right mr-4 hidden sm:block">
                   <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-0.5">Chance</div>
                   <div className="text-sm font-black text-white italic">{prob}%</div>
                </div>
                
                <div className="flex gap-1 bg-black/40 rounded-xl p-1 border border-white/10">
                   <button 
                      disabled={!bettingOpen}
                      className={`px-4 py-2.5 rounded-lg text-xs font-black uppercase transition-all flex flex-col items-center min-w-[70px] ${
                        isSelected ? "bg-cyan-400 text-black shadow-lg" : "text-cyan-400 hover:bg-cyan-500/10"
                      }`}
                   >
                      <span className="text-[8px] opacity-60">YES</span>
                      <span>{price}¢</span>
                   </button>
                   <button 
                      disabled={true}
                      className="px-4 py-2.5 rounded-lg text-xs font-black uppercase text-rose-500/40 cursor-not-allowed flex flex-col items-center min-w-[70px]"
                   >
                      <span className="text-[8px] opacity-40">NO</span>
                      <span>{100 - price}¢</span>
                   </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Betting Console (Visible when selected) */}
      <AnimatePresence>
        {selectedSuspect && bettingOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white/5 border border-cyan-500/30 rounded-[2.5rem] p-8 shadow-[0_0_50px_rgba(6,182,212,0.1)]">
              <div className="flex flex-col md:flex-row gap-8 items-end">
                <div className="flex-1 space-y-4">
                  <div>
                    <h4 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1">Order Execution: BUY_YES</h4>
                    <div className="text-2xl font-black text-white uppercase italic">
                      {(gamePlayers.find(p => p.address === selectedSuspect)?.name || "Unknown").toUpperCase()}
                    </div>
                  </div>
                  
                  <div className="relative">
                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      placeholder="0.0"
                      className="w-full bg-black/40 border-2 border-white/10 rounded-2xl py-5 px-6 text-2xl font-black text-white italic outline-none focus:border-cyan-500/50 transition-colors"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-cyan-400 tracking-tighter">OCT</div>
                  </div>
                </div>

                <div className="w-full md:w-auto h-full space-y-4">
                   <div className="grid grid-cols-2 gap-4 text-center md:text-left">
                      <div className="bg-black/20 p-3 rounded-xl min-w-[120px]">
                         <div className="text-[9px] text-white/20 uppercase font-black">Contract Price</div>
                         <div className="text-sm font-bold text-white italic">{(suspectPools.find(p => p.address === selectedSuspect)?.percentage ?? 0)}¢</div>
                      </div>
                      <div className="bg-black/20 p-3 rounded-xl min-w-[120px]">
                         <div className="text-[9px] text-white/20 uppercase font-black">Max Payout</div>
                         <div className="text-sm font-bold text-emerald-400 italic">{(Number(betAmount) * 2).toFixed(2)} OCT</div>
                      </div>
                   </div>

                   <button
                    onClick={() => handlePlaceBet()}
                    disabled={loading || !account || Number(betAmount) <= 0}
                    className="w-full h-[76px] bg-cyan-500 hover:bg-cyan-400 disabled:bg-white/5 disabled:text-white/20 text-black rounded-2xl text-lg font-black uppercase tracking-widest transition-all shadow-[0_10px_30px_rgba(6,182,212,0.3)] hover:-translate-y-1 active:translate-y-0"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-3">
                        <div className="w-5 h-5 border-4 border-black/20 border-t-black rounded-full animate-spin" />
                        EXECUTING...
                      </span>
                    ) : (
                      "EXECUTE TRADE"
                    )}
                  </button>
                </div>
              </div>

              {txStatus !== 'idle' && (
                <div className={`mt-6 p-4 rounded-xl text-center text-xs font-bold uppercase tracking-widest border ${
                  txStatus === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
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
        <div className="bg-white/5 border border-emerald-500/30 rounded-[2.5rem] p-10 text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-4xl">
            {userBet.correct ? "🏆" : "💥"}
          </div>
          <div>
            <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">
              {userBet.correct ? "Prediction Validated" : "Neural Misalignment"}
            </h3>
            <p className="text-white/40 text-xs font-bold uppercase mt-2">
              {userBet.correct ? "Selection confirmed as Impostor" : "Selection identified as Crewmate"}
            </p>
          </div>
          
          {userBet.correct && (
            <button
              onClick={() => handleClaimWinnings()}
              disabled={loading || userBet.claimed}
              className="px-12 py-5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 text-black rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-[0_10px_30px_rgba(16,185,129,0.3)]"
            >
              {loading ? "PROCESSING..." : userBet.claimed ? "WINNINGS_CLAIMED" : "CLAIM_PAYOUT_OCT"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
