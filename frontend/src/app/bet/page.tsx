"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { SpaceBackground } from "@/components/game/SpaceBackground";
import { AmongUsSprite } from "@/components/game/AmongUsSprite";
import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo } from "react";

export default function PredictionMarketDirectory() {
  const games = useQuery(api.crewkill.listGames, {}) || [];

  const getDisplayId = (id: string, marketId?: string) => {
    if (marketId) return marketId.slice(-8).toUpperCase();
    if (id.startsWith('0x')) return id.slice(-8).toUpperCase();
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = ((hash << 5) - hash) + id.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(16).padEnd(8, '0').slice(-8).toUpperCase();
  };

  const { liveGames, pastGames } = useMemo(() => {
    const live = [];
    const past = [];
    for (const g of games) {
      if (g.status === "COMPLETED" || g.phase === "ended") {
        past.push(g);
      } else {
        live.push(g);
      }
    }
    return { liveGames: live, pastGames: past };
  }, [games]);

  return (
    <SpaceBackground>
      <div className="min-h-screen pt-24 pb-12 px-4 md:px-8 relative z-10 w-full font-sans">
        <div className="max-w-[1200px] mx-auto">
          {/* Header */}
          <div className="mb-16">
            <Link 
              href="/"
              className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 hover:text-cyan-300 transition-colors mb-6 group"
            >
              <svg className="w-3 h-3 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
              </svg>
              Back Home
            </Link>
            <h1 className="text-6xl md:text-8xl font-black text-white uppercase tracking-tighter leading-none mb-4">
              Prediction <span className="text-cyan-400">Market</span>
            </h1>
            <p className="text-sm font-black text-white/40 uppercase tracking-[0.3em]">
              Welcome to the market floor • Select a game to bet on
            </p>
          </div>

          {/* Live Section */}
          <div className="mb-16">
            <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-3">
                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_#ff003c]" />
                Live Markets
              </h2>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30">
                {liveGames.length} Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveGames.length === 0 ? (
                <div className="col-span-full py-16 text-center border border-white/5 bg-white/[0.02]">
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-white/20">No live markets right now.</p>
                </div>
              ) : (
                liveGames.map((game, i) => (
                  <MarketCard key={game._id} game={game} getDisplayId={getDisplayId} index={i} isLive />
                ))
              )}
            </div>
          </div>

          {/* Past Section */}
          <div>
            <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
              <h2 className="text-2xl font-black text-white/60 tracking-tighter uppercase">
                Resolved Markets
              </h2>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30">
                {pastGames.length} Past
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60 hover:opacity-100 transition-opacity">
              {pastGames.length === 0 ? (
                <div className="col-span-full py-16 text-center border border-white/5 bg-white/[0.02]">
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-white/20">No past markets.</p>
                </div>
              ) : (
                pastGames.map((game, i) => (
                  <MarketCard key={game._id} game={game} getDisplayId={getDisplayId} index={i} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </SpaceBackground>
  );
}

function MarketCard({ game, getDisplayId, index, isLive = false }: { game: any, getDisplayId: any, index: number, isLive?: boolean }) {
  const displayId = getDisplayId(game.roomId, game.marketId);
  const totalPot = parseFloat(game.totalPot || "0") / 1e9;
  const playersCount = game.players?.length || 0;

  return (
    <Link href={`/game/${game.roomId}/bet`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className={`block p-6 bg-white/[0.03] backdrop-blur-xl border rounded-[1.5rem] transition-all group overflow-hidden relative cursor-pointer ${
          isLive ? "border-cyan-500/20 hover:border-cyan-400 hover:bg-white/[0.05]" : "border-white/5 hover:border-white/10 hover:bg-white/[0.04]"
        }`}
      >
        {isLive && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-[40px] rounded-full -mr-16 -mt-16 group-hover:bg-cyan-500/20 transition-colors" />
        )}
        
        <div className="flex justify-between items-start mb-6">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 flex items-center gap-2">
               GAMES &gt; CREWKILL &gt; #{displayId}
            </span>
            <h3 className="text-xl font-black text-white tracking-tighter leading-tight mt-1">
              Who is the Impostor?
            </h3>
          </div>
        </div>

        <div className="flex items-end justify-between mt-8">
          <div>
             <div className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Total Pot</div>
             <div className="text-2xl font-black text-white tracking-tighter">
               {totalPot > 0 ? totalPot.toFixed(2) : "0.00"} <span className="text-cyan-400 text-sm not-ml-1">OCT</span>
             </div>
          </div>
          <div className="flex -space-x-3">
             {game.players?.slice(0, 4).map((p: any, j: number) => (
                <div key={j} className="w-8 h-8 rounded bg-black flex items-center justify-center border border-white/10 z-10">
                  <AmongUsSprite colorId={p.colorId} size={20} />
                </div>
             ))}
             {playersCount > 4 && (
                <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center border border-white/10 z-0 text-[8px] font-black text-white">
                  +{playersCount - 4}
                </div>
             )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
