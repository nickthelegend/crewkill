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
       <div className="min-h-screen flex items-center justify-center font-mono text-[10px] tracking-[0.5em] text-white/20 uppercase animate-pulse">
          Scanning Active Sectors...
       </div>
    );
  }

  return (
    <div className="py-20 md:py-32 max-w-7xl mx-auto px-6 relative z-10">
      <header className="mb-20">
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <div className="flex items-center gap-4 mb-6">
            <div className="h-0.5 w-12 bg-red-500" />
            <p className="text-white/40 font-mono tracking-[0.3em] text-[10px] uppercase">OneChain Prediction Network</p>
          </div>
          <h1 className="text-7xl md:text-8xl font-black italic tracking-tighter uppercase leading-none text-white">
            MARKET <span className="text-red-500">FLOOR</span>
          </h1>
          <p className="text-white/20 font-mono tracking-[0.4em] text-[10px] mt-8 uppercase whitespace-nowrap overflow-hidden">
            Select an active match to place your confidence bets • Real-time odds updated via OneChain
          </p>
        </motion.div>
      </header>

      {/* Live Categories */}
      <section className="mb-24">
        <div className="flex items-center gap-4 mb-10">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
           <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">Live & Upcoming Matches</h2>
        </div>

        {activeGames.length === 0 ? (
          <div className="p-12 border border-white/5 bg-white/[0.02] text-center rounded-none">
             <p className="text-white/20 font-mono text-[10px] uppercase tracking-[0.3em]">No active matches found. Create one from the terminal.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
            {activeGames.map((game) => (
              <GameMarketCard key={game._id} game={game} onClick={() => router.push(`/game/${game.roomId}/bet`)} />
            ))}
          </div>
        )}
      </section>

      {/* Past Markets */}
      <section>
        <div className="flex items-center gap-4 mb-10">
           <div className="w-2 h-2 rounded-full bg-white/20" />
           <h2 className="text-xl font-black text-white/40 italic uppercase tracking-tighter">Resolved Markets</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 opacity-50 grayscale transition-all hover:grayscale-0 hover:opacity-100">
           {pastGames.slice(0, 6).map((game) => (
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

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      onClick={onClick}
      className={`group cursor-pointer border transition-all p-10 flex flex-col justify-between min-h-[350px] relative overflow-hidden ${
        isPast ? "bg-white/[0.02] border-white/5 opacity-60" : "bg-white/[0.04] border-white/10 hover:border-red-500/50 hover:bg-white/[0.08]"
      }`}
    >
      {/* Visual background accent */}
      {!isPast && (
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/10 blur-[60px] rounded-full group-hover:bg-red-500/20 transition-all duration-700" />
      )}

      <div>
        <div className="flex justify-between items-start mb-10">
          <div className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] bg-white/5 px-4 py-1.5 border border-white/10">
            ROOM#{(game.roomId || "").slice(-8).toUpperCase()}
          </div>
          <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 border rounded-none flex items-center gap-2 ${
            game.status === "ACTIVE" || game.phase === "playing" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
            game.status === "CREATED" || game.phase === "lobby" ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" :
            "bg-white/5 text-white/20 border-white/10"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
               (game.status === "ACTIVE" || game.phase === "playing") ? "bg-emerald-400 animate-pulse" : 
               (game.status === "CREATED" || game.phase === "lobby") ? "bg-cyan-400 animate-pulse" : "bg-white/20"
            }`} />
            {game.phase === "playing" ? "GAME_ACTIVE" : game.status}
          </div>
        </div>

        <h3 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none mb-3 group-hover:text-red-500 transition-colors">
           Confidence <span className="text-red-500">Market</span>
        </h3>
        <p className="text-white/40 text-[10px] uppercase font-black tracking-widest opacity-60">Settling on OneChain Network</p>
      </div>

      <div className="space-y-8">
        <div className="flex justify-between items-end border-t border-white/10 pt-10">
           <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <div className="text-[9px] text-white/20 uppercase font-black tracking-widest mb-1">Participants</div>
                <div className="flex -space-x-3">
                   {players.slice(0, 6).map((p: any, i: number) => (
                     <div key={i} className={`w-9 h-9 border border-white/10 bg-black flex items-center justify-center overflow-hidden transition-transform hover:-translate-y-1 relative z-[${10-i}]`}>
                        <AmongUsSprite colorId={p.colorId ?? (i % 12)} size={22} isGhost={!p.isAlive} />
                        {!p.isAlive && <div className="absolute inset-0 bg-red-600/30 backdrop-grayscale" />}
                     </div>
                   ))}
                   {players.length > 6 && (
                     <div className="w-9 h-9 bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-white font-black z-0">
                        +{players.length - 6}
                     </div>
                   )}
                </div>
              </div>
           </div>

           <div className="text-right">
              <div className="text-[9px] text-white/20 uppercase font-black tracking-widest mb-1 font-mono">Total Stake</div>
              <div className="text-3xl font-black text-white tabular-nums italic tracking-tighter">
                {pot.toFixed(2)} <span className="text-red-500 text-sm not-italic ml-0.5">OCT</span>
              </div>
           </div>
        </div>
        
        <button className={`w-full py-5 text-[11px] font-black uppercase tracking-[0.4em] transition-all border shadow-lg ${
          isPast ? "border-white/10 text-white/20 cursor-default" : "bg-white text-black border-white group-hover:bg-red-500 group-hover:text-white group-hover:border-red-500 shadow-white/5"
        }`}>
          {isPast ? "MARKET CLOSED" : "JOIN FLOOR"}
        </button>
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
