"use client"
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { SpaceBackground } from "@/components/game/SpaceBackground";
import { Suspense, useMemo } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { AmongUsSprite } from "@/components/game/AmongUsSprite";

function MarketContent() {
  const router = useRouter();
  const allGames = useQuery(api.crewkill.listGames, {}) || [];
  
  // Categorize games: Active/Upcoming vs Past
  const activeGames = useMemo(() => {
    return allGames.filter(g => g.status !== "COMPLETED" && g.status !== "ENDED").sort((a, b) => b._creationTime - a._creationTime);
  }, [allGames]);

  const pastGames = useMemo(() => {
    return allGames.filter(g => g.status === "COMPLETED" || g.status === "ENDED").sort((a, b) => b._creationTime - a._creationTime);
  }, [allGames]);

  if (allGames === undefined) {
    return (
       <div className="min-h-screen flex items-center justify-center font-mono text-[11px] tracking-[0.6em] text-white/20 uppercase animate-pulse">
          SCANNING_MARKET_SECTORS...
       </div>
    );
  }

  return (
    <div className="py-20 md:py-32 max-w-[1800px] mx-auto px-6 md:px-12 relative z-10">
      <header className="mb-24">
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <div className="flex items-center gap-4 mb-8">
            <div className="h-1 w-16 bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]" />
            <p className="text-white/30 font-space tracking-[0.4em] text-[11px] uppercase">OneChain Prediction Network</p>
          </div>
          <h1 className="text-7xl md:text-9xl font-black tracking-tighter uppercase leading-none text-white select-none font-space">
            MARKET <span className="text-red-500">FLOOR</span>
          </h1>
          <div className="flex items-center gap-6 mt-10">
            <p className="text-white/20 font-space tracking-[0.5em] text-[10px] uppercase whitespace-nowrap overflow-hidden py-2 border-y border-white/5">
              Select an active match to place your confidence bets • Real-time odds updated via OneChain
            </p>
          </div>
        </motion.div>
      </header>

      {/* Live Categories */}
      <section className="mb-32">
        <div className="flex items-center justify-between mb-12 border-b border-white/5 pb-6">
           <div className="flex items-center gap-4">
              <div className="w-2.5 h-2.5 rounded-none bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Live & Upcoming Matches</h2>
           </div>
           <div className="hidden md:block text-[10px] font-mono text-white/20 uppercase tracking-[0.3em]">
              ACTIVE_HEDGING_POOLS: {activeGames.length}
           </div>
        </div>

        {activeGames.length === 0 ? (
          <div className="p-20 border border-white/5 bg-white/[0.01] text-center rounded-none backdrop-blur-sm">
             <p className="text-white/20 font-mono text-[11px] uppercase tracking-[0.4em]">No active match signals detected in this sector.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {activeGames.map((game) => (
              <GameMarketCard key={game._id} game={game} onClick={() => router.push(`/game/${game.roomId}/bet`)} />
            ))}
          </div>
        )}
      </section>

      {/* Past Markets */}
      <section>
        <div className="flex items-center gap-4 mb-12 border-b border-white/5 pb-6">
           <div className="w-2.5 h-2.5 rounded-none bg-white/20" />
           <h2 className="text-2xl font-black text-white/30 uppercase tracking-tighter">Resolved Market Data</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 opacity-40 grayscale-0 transition-all">
           {pastGames.slice(0, 8).map((game) => (
             <GameMarketCard key={game._id} game={game} isPast onClick={() => router.push(`/game/${game.roomId}/bet`)} />
           ))}
        </div>
      </section>
    </div>
  );
}

function GameMarketCard({ game, onClick, isPast = false }: { game: any, onClick: () => void, isPast?: boolean }) {
  const players = game.players || [];
  const pot = parseFloat(game.totalPot || "0") / 1e9;
  const bettingEndsAt = game.bettingEndsAt ? new Date(game.bettingEndsAt) : null;
  const isBettingOpen = bettingEndsAt ? Date.now() < bettingEndsAt.getTime() : false;

  return (
    <motion.div 
      layout
      whileHover={!isPast ? { y: -4, backgroundColor: "rgba(255,255,255,0.08)" } : {}}
      onClick={onClick}
      className={`group cursor-pointer border transition-all duration-300 p-0 flex flex-col min-h-[420px] relative overflow-hidden ${
        isPast ? "bg-white/[0.01] border-white/5" : "bg-white/[0.04] border-white/10 hover:border-red-500/30"
      }`}
    >
      {/* Top Accent Line */}
      <div className={`h-1 w-full ${isPast ? 'bg-white/10' : isBettingOpen ? 'bg-emerald-600' : 'bg-red-600'} opacity-50 group-hover:opacity-100 transition-opacity duration-500`} />

      <div className="p-8 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-10">
          <div className="flex flex-col gap-1">
             <span className="text-[9px] font-space text-white/30 uppercase tracking-[0.2em]">ROOM_SIG</span>
             <div className="text-[11px] font-black text-white uppercase tracking-widest bg-white/5 px-3 py-1 border border-white/5 font-space">
                {(game.roomId || "").slice(-8).toUpperCase()}
             </div>
          </div>
          <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 border rounded-none flex items-center gap-2 ${
            game.status === "ACTIVE" || game.phase === "playing" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
            game.status === "CREATED" || game.phase === "lobby" ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" :
            "bg-white/5 text-white/20 border-white/10"
          }`}>
            <span className={`w-1 h-1 rounded-none ${
               (game.status === "ACTIVE" || game.phase === "playing") ? "bg-emerald-400 animate-pulse" : 
               (game.status === "CREATED" || game.phase === "lobby") ? "bg-cyan-400 animate-pulse" : "bg-white/20"
            }`} />
            {game.phase === "playing" ? "MISSION_ENGAGED" : game.status}
          </div>
        </div>

        <div className="mb-auto">
          <h3 className="text-4xl font-black text-white uppercase tracking-tighter leading-[0.9] mb-4 group-hover:text-red-500 transition-colors duration-500 font-space truncate whitespace-nowrap" title={game.roomId}>
             {game.roomId.replace("scheduled_", "OP-").replace("room_", "ROOM-")}
          </h3>
          <div className="flex items-center gap-3">
             <div className="h-[1px] w-8 bg-white/10" />
             <p className="text-white/30 text-[9px] uppercase font-black tracking-[0.3em] font-space">HEDGING_POOL_V1</p>
          </div>
        </div>

        <div className="mt-12 space-y-8">
          <div className="flex justify-between items-end border-t border-white/5 pt-8">
             <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <div className="text-[8px] text-white/20 uppercase font-black tracking-widest font-space">Active Operatives</div>
                  <div className="flex -space-x-3">
                     {players.slice(0, 6).map((p: any, i: number) => (
                       <div 
                         key={i} 
                         className="w-10 h-10 border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden transition-all duration-500 group-hover:-translate-y-1 relative backdrop-blur-md"
                         style={{ zIndex: 10 - i }}
                       >
                          <AmongUsSprite colorId={p.colorId ?? (i % 12)} size={24} isGhost={!p.isAlive} />
                          {!p.isAlive && <div className="absolute inset-0 bg-red-500/10 pointer-events-none" />}
                       </div>
                     ))}
                     {players.length > 6 && (
                       <div className="w-10 h-10 bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-white/40 font-black z-0">
                          +{players.length - 6}
                       </div>
                     )}
                  </div>
                </div>
             </div>

             <div className="text-right">
                <div className="text-[8px] text-white/20 uppercase font-black tracking-widest mb-2 font-space">Current_Volume</div>
                <div className="text-3xl font-black text-white tabular-nums tracking-tighter leading-none font-space">
                  {pot.toFixed(2)} <span className="text-red-500 text-[10px] align-top ml-1 font-space">OCT</span>
                </div>
             </div>
          </div>
          
          <button className={`w-full py-5 text-[10px] font-black uppercase tracking-[0.5em] transition-all duration-500 border rounded-none ${
            isPast ? "border-white/5 text-white/10 cursor-default" : "bg-white text-black border-white group-hover:bg-red-600 group-hover:text-white group-hover:border-red-600 shadow-[0_0_30px_rgba(255,255,255,0.05)]"
          }`}>
            {isPast ? "SECTOR_CLOSED" : "INITIATE_POSITION"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function MarketPage() {
  return (
    <SpaceBackground>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center font-mono text-[10px] tracking-[0.5em] text-white/20 uppercase animate-pulse">Loading market data...</div>
        </div>
      }>
         <MarketContent />
      </Suspense>
    </SpaceBackground>
  );
}
