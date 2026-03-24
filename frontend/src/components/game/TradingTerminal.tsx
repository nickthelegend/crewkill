'use client';

import { motion } from 'framer-motion';
import { useMarket } from './MarketContext';
import { useMarketLogic } from '@/hooks/useMarketLogic';
import { Player } from './PredictionMarket';
import { getExplorerTxUrl } from '@/lib/onechain';

export function TradingTerminal({ gameId, marketObjectId, gamePlayers, gamePhase }: { 
  gameId: string, 
  marketObjectId: string, 
  gamePlayers: Player[], 
  gamePhase: number 
}) {
  const { selectedSuspect, setSelectedSuspect, betAmount, setBetAmount } = useMarket();
  const { account, suspectPools, bettingOpen, loading, txStatus, txMsg, txDigest, handlePlaceBet } = useMarketLogic(gameId, marketObjectId, gamePlayers, gamePhase);

  const selectedPlayer = gamePlayers.find(p => p.address === selectedSuspect);
  const pool = suspectPools.find(p => p.address === selectedSuspect);
  const prob = pool?.percentage ?? 0;

  if (!selectedSuspect || !bettingOpen) {
    return (
      <div className="bg-white/[0.03] border border-white/10 backdrop-blur-3xl p-8 flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]">
        <div className="w-12 h-12 border border-white/10 flex items-center justify-center bg-black/40">
           <div className="w-2 h-2 bg-white/20" />
        </div>
        <div>
           <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] mb-2 font-space">Market Terminal</h3>
           <p className="text-[11px] text-white/20 uppercase font-black tracking-widest leading-relaxed max-w-[200px] font-space">
             Select a contender to execute hedging orders
           </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f1721] border border-red-500/50 backdrop-blur-3xl overflow-hidden flex flex-col h-full shadow-[0_0_50px_rgba(239,68,68,0.1)]">
      <div className="bg-red-600/10 border-b border-white/5 p-4 md:p-6">
        <h3 className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em] flex items-center gap-3 font-space">
           <span className="w-1.5 h-1.5 bg-red-500 animate-pulse" />
           Place Hedging Order
        </h3>
      </div>
      
      <div className="p-6 flex-1 space-y-4">
        <div className="space-y-4">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-black border border-white/10 flex items-center justify-center">
                 <div className="w-6 h-6 bg-red-500/10" />
              </div>
              <div className="flex flex-col">
                 <span className="text-[9px] text-white/20 font-black uppercase tracking-[0.2em] font-space">Active Position: YES</span>
                 <span className="text-xl font-black text-white uppercase tracking-tighter font-space">{selectedPlayer?.name || "Target Node"}</span>
              </div>
           </div>
           
           <div className="grid grid-cols-2 gap-px bg-white/5 border border-white/5">
              <div className="bg-black/40 p-4">
                 <div className="text-[8px] text-white/20 font-black uppercase tracking-widest mb-1 font-space">Order Price</div>
                 <div className="text-xl font-black text-white font-space tabular-nums">{prob.toFixed(0)}¢</div>
              </div>
              <div className="bg-black/40 p-4">
                 <div className="text-[8px] text-white/20 font-black uppercase tracking-widest mb-1 font-space">Est. Payout</div>
                 <div className="text-xl font-black text-emerald-400 font-space tabular-nums">
                    {(Number(betAmount) * 100 / Math.max(1, prob)).toFixed(2)} <span className="text-[10px] uppercase">$CREW</span>
                 </div>
              </div>
           </div>
        </div>

        <div className="space-y-4">
           <div className="flex justify-between items-end mb-2">
              <span className="text-[9px] text-white/40 font-black uppercase tracking-widest font-space">Stake Amount</span>
              <span className="text-[9px] text-white/20 font-black uppercase tracking-widest font-space">Balance: --</span>
           </div>
           <div className="relative group">
              <input 
                 type="number"
                 value={betAmount}
                 onChange={(e) => setBetAmount(e.target.value)}
                 className="w-full bg-black/40 border border-white/10 focus:border-red-500/50 py-4 px-6 text-3xl font-black text-white outline-none transition-all tabular-nums font-space"
                 placeholder="0.00"
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-black text-red-500 font-space">$CREW</div>
           </div>
        </div>

        <div className="pt-4">
           <button 
              onClick={() => handlePlaceBet()}
              disabled={loading || !account || Number(betAmount) <= 0}
              className="w-full h-20 bg-cyan-500 hover:bg-cyan-400 disabled:bg-white/5 disabled:text-white/10 text-black rounded-none text-sm font-black uppercase tracking-[0.3em] transition-all relative group overflow-hidden font-space"
           >
              {loading ? "Processing_Order..." : "Submit_Yes_Order"}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
           </button>
           
           {txStatus !== 'idle' && (
              <div className={`mt-6 p-4 text-[10px] font-black uppercase tracking-[0.2em] border font-space ${
                 txStatus === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-500"
              }`}>
                 <div className="flex justify-between items-center">
                    <span>{txMsg}</span>
                    {txStatus === 'success' && txDigest && (
                       <a 
                          href={getExplorerTxUrl(txDigest)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 underline underline-offset-4"
                       >
                          VIEW_ON_SCAN [{txDigest.slice(0, 10)}...]
                       </a>
                    )}
                 </div>
              </div>
           )}
        </div>
      </div>
      
      <div className="p-6 bg-black/40 border-t border-white/5 text-center">
         <p className="text-[8px] text-white/10 font-black uppercase tracking-[0.4em] font-space">
            Authorized_Hedging_Terminal_v2.0
         </p>
      </div>
    </div>
  );
}
