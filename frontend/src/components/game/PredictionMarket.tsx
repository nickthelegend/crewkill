'use client';

import { useState, useEffect } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@onelabs/dapp-kit';
import { Transaction } from '@onelabs/sui/transactions';
import { suiClient, PACKAGE_ID, MARKET_REGISTRY_ID } from '@/lib/onechain';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

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

import { motion, AnimatePresence } from 'framer-motion';

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

  // Fetch market state from chain
  useEffect(() => {
    if (!marketObjectId || marketObjectId === '0x_FILL_AFTER_DEPLOY') return;
    fetchMarketState();
    const interval = setInterval(fetchMarketState, 5000);
    return () => clearInterval(interval);
  }, [marketObjectId, account?.address, gamePlayers]);

  async function fetchMarketState() {
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
  }

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
  const canClaim = isResolved && userBet?.correct && !userBet.claimed;

  if (gamePlayers.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-12 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
           <div className="w-8 h-8 rounded-full border-4 border-t-red-500 border-white/10 animate-spin" />
        </div>
        <h3 className="text-white/40 font-black uppercase tracking-[0.3em] text-xs">Waiting for participants...</h3>
        <p className="text-white/10 text-[10px] mt-4 uppercase">Market will open once agents board the ship</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 max-w-lg w-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h3 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">
            Suspect <span className="text-red-500">Board</span>
          </h3>
          <p className="text-[10px] font-mono text-white/30 uppercase mt-2 tracking-widest">Identify the impostor</p>
        </div>
        <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
          isResolved ? "bg-emerald-500/20 text-emerald-400" : isOpen ? "bg-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]" : "bg-red-500/20 text-red-400"
        }`}>
          {isResolved ? "MISSION_ENDED" : isOpen ? "BETTING_ACTIVE" : "MARKET_CLOSED"}
        </div>
      </div>

      {/* Total pot */}
      <div className="bg-black/40 rounded-3xl p-6 mb-10 border border-white/5 text-center relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="text-4xl font-black text-white italic tracking-tighter tabular-nums mb-1">
          {(totalPot / 1_000_000_000).toFixed(3)} <span className="text-red-500 text-sm">OCT</span>
        </div>
        <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">Total Mission Pool</div>
      </div>

      {/* Suspect list */}
      <div className="space-y-3 mb-10">
        <AnimatePresence mode="popLayout">
          {gamePlayers.map((player) => {
            const pool = suspectPools.find(p => p.address === player.address);
            const isActualImpostor = isResolved && actualImpostors.includes(player.address);
            const isUserPick = userBet?.suspect === player.address;
            const isSelected = selectedSuspect === player.address;

            return (
              <motion.div
                key={player.address}
                layout
                onClick={() => bettingOpen && setSelectedSuspect(player.address)}
                className={`relative group p-4 rounded-2xl transition-all cursor-pointer border ${
                  isSelected ? "bg-red-500/10 border-red-500/40 ring-1 ring-red-500/20" : 
                  isActualImpostor ? "bg-emerald-500/10 border-emerald-500/40" : 
                  "bg-white/[0.02] border-white/5 hover:bg-white/5"
                }`}
              >
                <div className="flex justify-between items-center relative z-10">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-[10px] font-bold ${
                      isSelected ? "bg-red-500 text-white" : "bg-white/5 text-white/40"
                    }`}>
                      {player.address.slice(2, 4).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white uppercase tracking-tight">{player.name}</span>
                        {isUserPick && <span className="text-[8px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded leading-none">YOUR_PICK</span>}
                        {isActualImpostor && <span className="text-[8px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded leading-none">IMPOSTOR</span>}
                      </div>
                      <div className="text-[9px] font-mono text-white/20 mt-0.5">ID: {player.address.slice(0, 10)}...</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-white italic tracking-tighter">{pool?.percentage ?? 0}%</div>
                    <div className="text-[9px] font-black text-white/20 uppercase">{( (pool?.totalBet ?? 0) / 1e9).toFixed(2)} OCT</div>
                  </div>
                </div>

                {/* Pool Progress Bar */}
                <div className="mt-3 h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${pool?.percentage ?? 0}%` }}
                    className={`h-full rounded-full ${isActualImpostor ? "bg-emerald-500" : isSelected ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-white/20"}`}
                  />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Bet input — only shown if betting open and user hasn't bet */}
      {bettingOpen && account && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={betAmount}
                onChange={e => setBetAmount(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white font-black italic tracking-tighter focus:outline-none focus:border-red-500/50 transition-all placeholder:text-white/10"
                placeholder="BET_AMOUNT"
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/20 uppercase tracking-widest">OCT</div>
            </div>
            <button
              onClick={handlePlaceBet}
              disabled={!selectedSuspect || loading || isPending}
              className={`px-10 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${
                selectedSuspect 
                  ? "bg-red-500 text-white hover:bg-red-400 shadow-[0_0_30px_rgba(239,68,68,0.3)] shadow-red-500/20" 
                  : "bg-white/5 text-white/20 cursor-not-allowed"
              }`}
            >
              {loading || isPending ? "SYNCING..." : "CONFIRM_STAKE"}
            </button>
          </div>
          <p className="text-center text-[9px] font-mono text-white/20 uppercase tracking-widest leading-relaxed">
            Final confirmation will lock your stake <br/> Transmitting protocol via OneChain
          </p>
        </div>
      )}

      {/* Not connected */}
      {bettingOpen && !account && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
           <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Authorization Required • Connect Wallet to Stake</p>
        </div>
      )}

      {/* User existing bet display */}
      {userBet && !canClaim && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black text-emerald-400/40 uppercase tracking-[0.2em] mb-1">Locked Transaction</div>
            <div className="text-lg font-black text-white italic tracking-tighter">
              {(userBet.amount / 1_000_000_000).toFixed(3)} OCT <span className="text-emerald-400/60 font-mono text-xs not-italic ml-2 on">→ {gamePlayers.find(p => p.address === userBet.suspect)?.name || 'Suspect'}</span>
            </div>
          </div>
          {isResolved && (
            <div className={`text-xs font-black uppercase tracking-widest ${userBet.correct ? "text-emerald-400" : "text-red-500"}`}>
              {userBet.correct ? "PROTOCOL_WIN" : "PROTOCOL_FAIL"}
            </div>
          )}
        </div>
      )}

      {/* Claim winnings button */}
      {canClaim && (
        <button
          onClick={handleClaimWinnings}
          disabled={loading || isPending}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black uppercase text-[10px] tracking-[0.3em] py-5 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all"
        >
          {loading || isPending ? "CLAIMING..." : "EXTRACT_WINNINGS"}
        </button>
      )}

      {/* Tx status */}
      <AnimatePresence>
        {txStatus !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mt-6 p-4 rounded-xl text-[10px] font-black tracking-widest uppercase border ${
              txStatus === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}
          >
            {txMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
