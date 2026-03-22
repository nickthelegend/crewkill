"use client"
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { SpaceBackground } from "@/components/game/SpaceBackground";
import { Suspense, useMemo } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

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
  const pot = 0; // In a full impl, we'd query the total pot from Sui or Convex

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      onClick={onClick}
      className={`group cursor-pointer border transition-all p-8 flex flex-col justify-between min-h-[300px] ${
        isPast ? "bg-white/[0.02] border-white/5" : "bg-white/5 border-white/10 hover:border-red-500/50 hover:bg-white/[0.08]"
      }`}
    >
      <div>
        <div className="flex justify-between items-start mb-8">
          <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest bg-white/5 px-3 py-1 border border-white/10">
            ROOM#{(game.roomId || "").slice(-6).toUpperCase()}
          </div>
          <div className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 ${
            game.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : 
            game.status === "CREATED" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" :
            "bg-white/5 text-white/20 border border-white/10"
          }`}>
            {game.status}
          </div>
        </div>

        <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none mb-2">
           Who is the <span className="text-red-500">Impostor?</span>
        </h3>
        <p className="text-white/40 text-[10px] uppercase font-black tracking-widest mb-6">Match Floor Confidence Market</p>
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-end border-t border-white/5 pt-6">
           <div>
              <div className="text-[9px] text-white/20 uppercase font-black tracking-widest mb-1">Participants</div>
              <div className="flex -space-x-2">
                 {players.slice(0, 5).map((p: any, i: number) => (
                   <div key={i} className={`w-6 h-6 rounded-full border border-black ${i % 2 === 0 ? "bg-red-500" : "bg-blue-500"}`} />
                 ))}
                 {players.length > 5 && (
                   <div className="w-6 h-6 rounded-full bg-white/10 border border-black flex items-center justify-center text-[8px] text-white font-black">+{players.length - 5}</div>
                 )}
              </div>
           </div>
           <div className="text-right">
              <div className="text-[9px] text-white/20 uppercase font-black tracking-widest mb-1">Created</div>
              <div className="text-[10px] font-mono text-white/60 lowercase italic">
                {formatDistanceToNow(game._creationTime)} ago
              </div>
           </div>
        </div>
        
        <button className={`w-full py-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all border ${
          isPast ? "border-white/10 text-white/20" : "bg-red-600 text-white border-red-600 group-hover:bg-red-500 shadow-[0_10px_20px_rgba(255,0,0,0.1)]"
        }`}>
          {isPast ? "View Results" : "Enter Market"}
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
