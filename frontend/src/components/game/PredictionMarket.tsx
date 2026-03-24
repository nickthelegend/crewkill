'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AmongUsSprite } from './AmongUsSprite';
import { useMarket } from './MarketContext';
import { useMarketLogic } from '@/hooks/useMarketLogic';

export interface Player {
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

export interface PredictionMarketProps {
  gameId: string;
  marketObjectId: string;
  gamePlayers: Player[];
  isResolved: boolean;
  actualImpostors: string[];
  gamePhase: number;
  creationDigest?: string;
  isSidebar?: boolean;
}

// Kalshi-style Line Chart for Sentiment
export function MarketChart({ players, bets, totalPot }: { players: Player[], bets: any[], totalPot: number }) {
  const chartData = useMemo(() => {
    if (bets.length === 0) return [];
    const sortedBets = [...bets].sort((a, b) => a.createdAt - b.createdAt);
    const timePoints = 20;
    const startTime = sortedBets[0].createdAt;
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const points = [];
    for (let i = 0; i <= timePoints; i++) {
        const t = startTime + (duration * (i / timePoints));
        const betsToT = sortedBets.filter((b: any) => b.createdAt <= t);
        const potToT = betsToT.reduce((sum: number, b: any) => sum + b.amountMist, 0);
        const distribution = players.map((p: Player) => {
            const pool = betsToT.filter((b: any) => b.selection === p.address).reduce((sum: number, b: any) => sum + b.amountMist, 0);
            return potToT > 0 ? (pool / potToT) * 100 : 100 / players.length;
        });
        points.push({ time: i, distribution });
    }
    return points;
  }, [bets, players]);

  return (
    <div className="h-64 w-full relative group">
      <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
        {players.map((p, pIdx) => {
           const colors = ['#ef4444', '#3b82f6', '#10b981', '#eab308', '#a855f7', '#f97316', '#22d3ee', '#f43f5e'];
           const pathData = chartData.map((pt: any, i: number) => {
              const x = (i / (chartData.length - 1)) * 100;
              const y = 100 - pt.distribution[pIdx];
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
           }).join(' ');
           return (
             <motion.path
               key={p.address}
               initial={{ pathLength: 0, opacity: 0 }}
               animate={{ pathLength: 1, opacity: 0.6 }}
               d={pathData}
               vectorEffect="non-scaling-stroke"
               stroke={colors[pIdx % colors.length]}
               strokeWidth="2"
               fill="none"
               strokeLinecap="round"
             />
           );
        })}
        <line x1="0" y1="25" x2="100" y2="25" stroke="white" strokeOpacity="0.05" strokeWidth="1" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="white" strokeOpacity="0.05" strokeWidth="1" />
        <line x1="0" y1="75" x2="100" y2="75" stroke="white" strokeOpacity="0.05" strokeWidth="1" />
      </svg>
      <div className="absolute top-4 right-4 flex gap-4">
         {players.slice(0, 3).map((p, i) => {
            const pool = bets.filter((b: any) => b.selection === p.address).reduce((sum: number, b: any) => sum + b.amountMist, 0);
            const percentage = totalPot > 0 ? (pool / totalPot * 100).toFixed(1) : (100 / players.length).toFixed(1);
            return (
              <div key={p.address} className="flex flex-col items-end">
                 <span className={`text-[8px] font-black uppercase tracking-widest ${['text-red-500', 'text-blue-500', 'text-emerald-500'][i%3]}`}>{p.name}</span>
                 <span className="text-xl font-black text-white font-space tracking-tight">{percentage}%</span>
              </div>
            );
         })}
      </div>
    </div>
  );
}

export function PredictionMarket({
  gameId, marketObjectId, gamePlayers, isResolved, gamePhase, isSidebar = false 
}: PredictionMarketProps) {
  const { selectedSuspect, setSelectedSuspect, totalPot, isOpen } = useMarket();
  const { suspectPools, userBet, convexBets, bettingOpen } = useMarketLogic(gameId, marketObjectId, gamePlayers, gamePhase);

  return (
    <div className={`w-full ${isSidebar ? "max-w-none space-y-4" : "max-w-7xl mx-auto space-y-8"}`}>
      <div className="bg-white/[0.03] border border-white/10 p-0 overflow-hidden relative backdrop-blur-3xl">
        <div className="p-6 md:p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
             <div className="flex items-center gap-3 mb-4">
               <div className="w-2.5 h-2.5 bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)] animate-pulse" />
               <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] font-space">{isOpen ? "Market Live" : "Market Resolved"}</h3>
             </div>
             <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter font-space">Market Sentiment</h2>
          </div>
          <div className="text-left md:text-right">
             <div className="text-[9px] text-white/20 font-black uppercase tracking-[0.3em] mb-2 font-space">Global Volume</div>
             <div className="text-3xl md:text-5xl font-black text-white font-space tracking-tighter">{(totalPot / 1e9).toFixed(2)} <span className="text-red-500 text-sm">OCT</span></div>
          </div>
        </div>

        <div className="p-6 md:p-8 border-b border-white/5">
           <MarketChart players={gamePlayers} bets={convexBets} totalPot={totalPot} />
        </div>

        <div className="divide-y divide-white/5 bg-black/20">
          <div className="grid grid-cols-12 p-4 md:p-6 bg-white/[0.02] border-b border-white/5">
             <div className="col-span-12 md:col-span-6 text-[10px] font-black text-white/20 uppercase tracking-[0.3em] font-space mb-4 md:mb-0">Contender_Outcome</div>
             <div className="hidden md:block md:col-span-2 text-center text-[10px] font-black text-white/20 uppercase tracking-[0.3em] font-space">Confidence_Sync</div>
             <div className="hidden md:block md:col-span-4 text-right text-[10px] font-black text-white/20 uppercase tracking-[0.3em] font-space">Hedging_Order_Matrix</div>
          </div>
          
          {gamePlayers.map((player, idx) => {
            const pool = suspectPools.find(p => p.address === player.address);
            const prob = pool?.percentage ?? (100 / gamePlayers.length);
            const isSelected = selectedSuspect === player.address;
            const colors = ['border-red-500', 'border-blue-500', 'border-emerald-500', 'border-yellow-500', 'border-purple-500', 'border-orange-500'];

            return (
              <motion.div
                key={player.address}
                onClick={() => bettingOpen && setSelectedSuspect(player.address)}
                className={`grid grid-cols-12 items-center p-4 md:p-6 transition-all group cursor-pointer ${
                  !bettingOpen ? "opacity-30 grayscale cursor-not-allowed" : 
                  isSelected ? "bg-red-500/[0.05]" : "hover:bg-white/[0.03]"
                }`}
              >
                <div className="col-span-12 md:col-span-6 flex items-center gap-6 mb-4 md:mb-0">
                   <div className={`w-14 h-14 border-l-2 ${colors[idx % colors.length]} bg-black flex items-center justify-center relative`}>
                      <AmongUsSprite colorId={player.colorId ?? idx} size={32} isGhost={!player.isAlive} />
                      {!player.isAlive && <div className="absolute inset-0 bg-red-900/40 backdrop-grayscale" />}
                   </div>
                   <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-xl font-black text-white uppercase tracking-tighter font-space truncate">{player.name}</span>
                      <span className="text-[9px] text-white/20 font-black uppercase tracking-[0.2em] font-space truncate">
                         {player.isAlive ? "Active Agent" : "Agent Terminated"}
                      </span>
                   </div>
                </div>
                
                <div className="col-span-6 md:col-span-2 text-left md:text-center">
                   <div className="text-[10px] md:hidden text-white/20 font-black uppercase tracking-widest mb-1 font-space">Confidence</div>
                   <div className="text-2xl font-black text-white font-space tracking-tighter">
                      {prob.toFixed(0)}%
                   </div>
                </div>

                <div className="col-span-6 md:col-span-4 flex justify-end">
                   <button 
                      className={`w-full md:w-48 py-3 font-black text-[11px] uppercase tracking-widest transition-all duration-300 border-2 font-space pointer-events-none ${
                         isSelected ? "bg-cyan-500 text-black border-cyan-500" : "bg-white/[0.03] text-cyan-400 border-cyan-400/20 group-hover:border-cyan-400 group-hover:bg-cyan-400/10"
                      }`}
                   >
                      SUBMIT YES {prob.toFixed(0)}¢
                   </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {isResolved && userBet && (
        <div className="bg-white/[0.02] backdrop-blur-3xl border-y border-white/5 py-12 text-center space-y-6">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className={`w-24 h-24 border flex items-center justify-center mx-auto text-4xl relative ${userBet.correct ? "border-emerald-500/50 bg-emerald-500/10" : "border-red-500/50 bg-red-500/10"}`}
          >
            {userBet.correct ? "🏆" : "💀"}
          </motion.div>
          <div>
            <h3 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-4 font-space">
              {userBet.correct ? "Prediction Complete" : "Prediction Failed"}
            </h3>
            <p className="text-white/20 text-[10px] font-mono tracking-[0.4em] uppercase max-w-md mx-auto leading-relaxed">
              Target node validation completed. Settlement protocol active.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
