'use client';

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentAccount } from "@onelabs/dapp-kit";
import { motion } from "framer-motion";
import { AmongUsSprite } from "@/components/game/AmongUsSprite";
import { SpaceBackground } from "@/components/game/SpaceBackground";

export default function ProfilePage() {
  const account = useCurrentAccount();
  const address = account?.address || "";
  
  const profile = useQuery(api.users.getProfile, { address });
  const bets = useQuery(api.bets.getBetsByUser, { address });
  const replays = useQuery(api.replays.listReplays, { limit: 10 });

  if (!address) {
    return (
      <SpaceBackground>
        <div className="min-h-screen flex items-center justify-center p-8 bg-black/60 backdrop-blur-sm">
          <div className="text-center max-w-sm">
            <div className="mb-8 opacity-20 filter grayscale">
              <AmongUsSprite colorId={0} size={150} />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-4">ACCESS DENIED</h2>
            <p className="text-white/40 text-[10px] uppercase font-black tracking-[0.3em] leading-loose">
              Please connect your wallet to authorize access to your player profile.
            </p>
          </div>
        </div>
      </SpaceBackground>
    );
  }

  const rank = Math.floor((profile?.xp || 0) / 500) + 1;

  return (
    <SpaceBackground>
      <div className="min-h-screen pt-24 pb-20 px-4 max-w-7xl mx-auto font-sans">
        
        {/* ─── Profile Header Section ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          
          {/* Main Profile Info */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center gap-10 relative overflow-hidden group shadow-2xl"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-[100px] rounded-full -mr-32 -mt-32 group-hover:bg-cyan-500/20 transition-all duration-700" />
            
            <div className="w-32 h-32 md:w-36 md:h-36 rounded-full bg-black/40 border-2 border-white/10 p-2 flex items-center justify-center relative shadow-[0_0_50px_rgba(0,0,0,0.5)]">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-purple-600/20 rounded-full animate-pulse" />
               <AmongUsSprite colorId={rank % 12} size={80} />
            </div>
            
            <div className="flex-1 text-center md:text-left relative">
               <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                  <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase leading-none">
                    {address.slice(0, 6)}<span className="text-cyan-400">...</span>{address.slice(-4)}
                  </h1>
                  <div className="inline-flex px-4 py-1.2 bg-cyan-400 text-black text-[10px] font-black uppercase rounded-full shadow-lg self-center md:self-auto">
                    VERIFIED_PLAYER
                  </div>
               </div>
               
               <div className="flex flex-wrap items-center justify-center md:justify-start gap-8">
                  <div>
                     <div className="text-[9px] text-white/30 uppercase font-black tracking-widest mb-1">Player Rank</div>
                     <div className="text-2xl font-black text-white tracking-tighter">LEVEL {rank}</div>
                  </div>
                  <div className="h-10 w-px bg-white/10 hidden sm:block" />
                  <div>
                     <div className="text-[9px] text-white/30 uppercase font-black tracking-widest mb-1">Experience Points</div>
                     <div className="text-2xl font-black text-white tracking-tighter">{profile?.xp || 0} <span className="text-xs text-white/20 not-italic">XP</span></div>
                  </div>
               </div>
            </div>
          </motion.div>

          {/* Winning Stats Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-emerald-500/5 backdrop-blur-3xl border border-emerald-500/10 rounded-[2.5rem] p-10 flex flex-col justify-between relative overflow-hidden group shadow-2xl"
          >
             <div className="absolute top-4 right-8 text-5xl opacity-5 group-hover:opacity-10 transition-opacity">🏆</div>
             <div>
                <div className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                   <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_#10b981]" />
                   PREDICTIONS WON
                </div>
                <div className="text-7xl font-black text-white tracking-tighter tabular-nums leading-none">
                   {profile?.wins || 0}
                </div>
             </div>
             
             <div className="mt-8">
                <div className="flex justify-between items-end mb-3">
                   <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Efficiency</span>
                   <span className="text-[10px] font-black text-emerald-400">{(profile?.wins || 0) * 10}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                   <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(profile?.wins || 0) * 10}%` }}
                    className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400" 
                   />
                </div>
             </div>
          </motion.div>
        </div>

        {/* ─── Grid Section: History & Replays ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          {/* Prediction History */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
             <div className="flex items-center gap-3 mb-8">
                <div className="h-0.5 w-10 bg-yellow-400" />
                <h2 className="text-sm font-black text-white uppercase tracking-[0.4em] mb-0">Prediction History</h2>
             </div>
             
             <div className="space-y-4">
                {bets?.length === 0 ? (
                  <div className="p-16 border-2 border-dashed border-white/5 rounded-[2rem] flex flex-col items-center justify-center opacity-30">
                    <p className="text-[9px] font-black uppercase tracking-[0.4em]">No previous predictions</p>
                  </div>
                ) : (
                  bets?.map((bet, i) => (
                    <motion.div 
                      key={bet._id} 
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.1 * i }}
                      className="bg-white/5 border border-white/10 rounded-2xl p-6 flex justify-between items-center group hover:bg-white/[0.08] transition-all cursor-pointer shadow-lg"
                    >
                      <div className="flex items-center gap-6">
                         <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-inner ${
                           bet.status === 'won' ? 'bg-emerald-500/10 text-emerald-400' : 
                           bet.status === 'lost' ? 'bg-rose-500/10 text-rose-500' : 'bg-yellow-500/10 text-yellow-500'
                         }`}>
                           {bet.status === 'won' ? '↑' : bet.status === 'lost' ? '↓' : '•'}
                         </div>
                         <div>
                            <div className="text-sm font-black text-white uppercase tracking-tight group-hover:text-cyan-400 transition-colors">
                              {bet.amountMist / 1_000_000_000} <span className="text-[10px] opacity-40">OCT</span> Prediction
                            </div>
                            <div className="text-[9px] text-white/30 font-mono mt-1 uppercase">GAME: {bet.gameId.slice(0, 12)}...</div>
                         </div>
                      </div>
                      <div className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg border ${
                        bet.status === 'won' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' : 
                        bet.status === 'lost' ? 'text-rose-400 border-rose-500/20 bg-rose-500/5' : 
                        'text-yellow-400 border-yellow-500/20 bg-yellow-500/5'
                      }`}>
                        {bet.status}
                      </div>
                    </motion.div>
                  ))
                )}
             </div>
          </motion.div>

          {/* Game Replays */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
             <div className="flex items-center gap-3 mb-8">
                <div className="h-0.5 w-10 bg-purple-500" />
                <h2 className="text-sm font-black text-white uppercase tracking-[0.4em] mb-0">Game Replays</h2>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {replays?.length === 0 ? (
                  <div className="col-span-2 p-16 border-2 border-dashed border-white/5 rounded-[2rem] flex flex-col items-center justify-center opacity-30">
                    <p className="text-[9px] font-black uppercase tracking-[0.4em]">No replays saved</p>
                  </div>
                ) : (
                  replays?.map((replay, i) => (
                    <motion.div 
                      key={replay._id} 
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1 * i }}
                      className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden group hover:border-purple-500/40 transition-all flex flex-col shadow-xl"
                    >
                      <div className="h-32 bg-black relative overflow-hidden flex items-center justify-center">
                         <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent z-10" />
                         <div className="opacity-10 scale-150 rotate-12">
                           <AmongUsSprite colorId={i % 12} size={100} />
                         </div>
                         <div className="relative z-20 text-xs font-black text-white/40 tracking-[0.5em] uppercase group-hover:text-purple-400 transition-colors">
                            MATCH_{replay.gameId.slice(0, 4)}
                         </div>
                      </div>
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                           <div>
                              <div className="text-xs font-black text-white uppercase tracking-tight">#{replay.gameId.slice(0, 8)}</div>
                              <div className="text-[9px] text-white/30 uppercase font-black tracking-widest mt-1">{replay.rounds} Rounds Recorded</div>
                           </div>
                           <div className="bg-purple-500/10 text-purple-400 text-[8px] font-black px-2 py-1 rounded">ON-CHAIN</div>
                        </div>
                        <button className="w-full py-3 bg-white/5 hover:bg-purple-600 hover:text-white border border-white/10 rounded-xl text-white/50 text-[10px] font-black uppercase tracking-widest transition-all">
                          View Replay
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
             </div>
          </motion.div>

        </div>
      </div>
    </SpaceBackground>
  );
}
