"use client"
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { SpaceBackground } from "@/components/game/SpaceBackground";
import { AmongUsSprite } from "@/components/game/AmongUsSprite";
import { motion, AnimatePresence } from "framer-motion";

export default function RoomsPage() {
  const [filter, setFilter] = useState<"LIVE" | "ARCHIVE">("LIVE");
  const games = useQuery(api.crewkill.listGames, {}) || [];

  const filteredGames = games.filter((game) => {
    const isLive = ["CREATED", "ACTIVE", "DISCUSSION", "VOTING"].includes(game.status);
    return filter === "LIVE" ? isLive : !isLive;
  });

  return (
    <SpaceBackground>
      <div className="py-20 md:py-32 max-w-[1800px] mx-auto px-6 md:px-12 font-sans">
        <header className="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-10">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
          >
            <h1 className="text-7xl md:text-9xl font-black tracking-tighter uppercase leading-none text-white select-none font-space">
              GAME <span className="text-red-500">ROOMS</span>
            </h1>
            <div className="flex items-center gap-4 mt-8">
              <div className="h-1 w-16 bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]" />
              <p className="text-white/30 font-space tracking-[0.4em] text-[11px] uppercase">
                SYSTEM: <span className="text-emerald-400 animate-pulse">OPERATIONAL</span> • QUANTUM_LINK_ESTABLISHED
              </p>
            </div>
          </motion.div>

          <motion.div
            className="flex bg-white/[0.03] backdrop-blur-3xl p-1 rounded-none border border-white/10"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <button
              onClick={() => setFilter("LIVE")}
              className={`px-12 py-5 rounded-none text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-300 ${filter === "LIVE" ? "bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]" : "text-white/20 hover:text-white/50 hover:bg-white/5"
                }`}
            >
              Live Ops
            </button>
            <button
              onClick={() => setFilter("ARCHIVE")}
              className={`px-12 py-5 rounded-none text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-300 ${filter === "ARCHIVE" ? "bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]" : "text-white/20 hover:text-white/50 hover:bg-white/5"
                }`}
            >
              Archived Data
            </button>
          </motion.div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredGames.map((game, i) => (
              <RoomCard key={game._id} game={game} index={i} />
            ))}
          </AnimatePresence>

          {filteredGames.length === 0 && (
            <motion.div
              className="col-span-full py-48 text-center bg-white/[0.01] backdrop-blur-sm border border-dashed border-white/5 flex flex-col items-center justify-center p-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="w-24 h-24 rounded-none border border-white/5 flex items-center justify-center mb-10 relative overflow-hidden group">
                <div className="absolute inset-0 bg-red-500/5 animate-ping opacity-20" />
                <svg className="w-10 h-10 text-white/10 group-hover:text-red-500/20 transition-colors duration-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M11 5.882V19.297A7.477 7.477 0 005.188 17.07Q2.594 17.07 1 18.06V5.79q1.594-.99 4.188-.99a7.405 7.405 0 015.812 2.082zM13 5.882V19.297a7.477 7.477 0 015.812-2.227q2.594 0 4.188.99V5.79q-1.594-.99-4.188-.99a7.405 7.405 0 00-5.812 2.082z" />
                </svg>
              </div>
              <h3 className="text-2xl font-black text-white/40 uppercase tracking-tighter mb-4">No active game sectors detected</h3>
              <p className="text-white/10 font-mono uppercase tracking-[0.4em] text-[10px] max-w-sm leading-relaxed">Initiate a new terminal match sequence to populate this sector.</p>
            </motion.div>
          )}
        </div>
      </div>
    </SpaceBackground>
  );
}

function RoomCard({ game, index }: { game: any; index: number }) {
  const isStarting = game.status === "CREATED";
  const startAt = game.scheduledAt ? new Date(game.scheduledAt) : null;
  const bettingEndsAt = game.bettingEndsAt ? new Date(game.bettingEndsAt) : null;
  const isBettingOpen = bettingEndsAt ? Date.now() < bettingEndsAt.getTime() : false;

  const getStatusInfo = () => {
    if (game.status === "DONE" || game.status === "ENDED" || game.status === "COMPLETED" || game.status === "SETTLED") {
      return { color: "text-white/30", bg: "bg-white/10", label: "MISSION COMPLETE", accent: "border-white/20" };
    }
    if (game.status === "ACTIVE") return { color: "text-emerald-400", bg: "bg-emerald-500/10", label: "IN PROGRESS", accent: "border-emerald-500/30" };
    if (isStarting) return { color: "text-cyan-400", bg: "bg-cyan-500/10", label: "INITIALIZING", accent: "border-cyan-500/30" };
    return { color: "text-red-500", bg: "bg-red-500/10", label: game.status, accent: "border-red-500/30" };
  }

  const status = getStatusInfo();
  const createdAt = game.createdAt ? new Date(game.createdAt) : null;
  const startedAt = game.startedAt ? new Date(game.startedAt) : null;
  const endedAt = game.endedAt ? new Date(game.endedAt) : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4, backgroundColor: "rgba(255,255,255,0.06)" }}
      className={`group relative bg-white/[0.03] backdrop-blur-3xl border border-white/5 rounded-none p-0 flex flex-col transition-all duration-300`}
    >
      {/* Top Accent Line */}
      <div className={`h-1 w-full ${status.bg} border-b ${status.accent}`} />
      
      <div className="p-8 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className={`inline-flex items-center gap-1.5 mb-4 px-2 py-0.5 ${status.bg} border ${status.accent}`}>
              <span className={`w-1 h-1 rounded-full ${status.color.replace('text-', 'bg-')} animate-pulse`} />
              <span className={`text-[8px] font-black uppercase tracking-[0.2em] font-space ${status.color}`}>
                {status.label}
              </span>
            </div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none mb-2 truncate whitespace-nowrap font-space" title={game.roomId}>
              {game.roomId.length > 20 
                ? `${game.roomId.slice(0, 8)}...${game.roomId.slice(-6)}`
                : game.roomId.replace("scheduled_", "OP-").replace("room_", "ROOM-")}
            </h3>
            <span className="text-[9px] text-white/20 font-space uppercase tracking-[0.3em] block">
              SECTOR_ID_#{game.roomId.slice(-8).toUpperCase()}
            </span>
          </div>

          <div className="flex items-center -space-x-4 opacity-40 group-hover:opacity-100 transition-all duration-500 transform group-hover:scale-110">
            {[...Array(3)].map((_, i) => (
              <div 
                key={i} 
                className="w-12 h-12 rounded-none border border-white/5 bg-black/60 flex items-center justify-center backdrop-blur-xl relative"
                style={{ zIndex: 3 - i }}
              >
                <AmongUsSprite colorId={i + (game.roomId.length % 12)} size={28} />
              </div>
            ))}
          </div>
        </div>

        {/* Tactical Timeline */}
        <div className="mb-10 px-4 py-6 bg-black/40 border-y border-white/5 relative overflow-hidden group/timeline">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
          
          <div className="space-y-6">
             {/* Init Step */}
             <div className="flex gap-4 items-start relative pb-6 border-l border-white/10 ml-1.5 font-space">
               <div className="absolute -left-[4.5px] top-0 w-2 h-2 bg-white/20 border border-black" />
               <div className="flex-1 -mt-1 pl-4">
                 <div className="text-[8px] text-white/20 font-black tracking-widest uppercase mb-1">Initialized</div>
                 <div className="text-[10px] text-white/70 uppercase font-black">{createdAt ? format(createdAt, "MMM dd HH:mm") : "---"}</div>
               </div>
             </div>

             {/* Start Step */}
             <div className={`flex gap-4 items-start relative pb-6 border-l ${startedAt ? 'border-emerald-500/30' : 'border-white/10'} ml-1.5 font-space`}>
               <div className={`absolute -left-[4.5px] top-0 w-2 h-2 ${startedAt ? 'bg-emerald-500' : 'bg-white/20'} border border-black`} />
               <div className="flex-1 -mt-1 pl-4">
                 <div className={`text-[8px] ${startedAt ? 'text-emerald-500/50' : 'text-white/20'} font-black tracking-widest uppercase mb-1`}>Started At</div>
                 <div className={`text-[10px] ${startedAt ? 'text-emerald-400' : 'text-white/40'} uppercase font-black`}>
                    {startedAt 
                      ? format(startedAt, "MMM dd HH:mm")
                      : startAt ? `EST ${formatDistanceToNow(startAt)}` : "ASAP"}
                 </div>
               </div>
             </div>

             {/* End Step */}
             <div className="flex gap-4 items-start relative ml-1.5 font-space">
               <div className={`absolute -left-[4.5px] top-0 w-2 h-2 ${endedAt ? 'bg-red-500' : 'bg-white/5'} border border-black`} />
               <div className="flex-1 -mt-1 pl-4">
                 <div className={`text-[8px] ${endedAt ? 'text-red-500/50' : 'text-white/10'} font-black tracking-widest uppercase mb-1`}>Terminated</div>
                 <div className={`text-[10px] ${endedAt ? 'text-white/80' : 'text-white/10'} uppercase font-black`}>
                    {endedAt ? format(endedAt, "MMM dd HH:mm") : "RUNNING"}
                 </div>
               </div>
             </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 mt-auto">
          <div className="flex justify-between items-center px-4 py-3 bg-white/[0.02] border border-white/5">
            <div className="space-y-1">
              <span className="text-[8px] text-white/20 font-black tracking-widest uppercase block">Pool Volume</span>
              <span className="text-lg font-black text-yellow-500/90 leading-none">
                {(parseFloat(game.totalPot || "0") / 1e9).toFixed(2)} <span className="text-[10px] text-white/30 ml-1">OCT</span>
              </span>
            </div>
            <div className="text-right space-y-1">
              <span className="text-[8px] text-white/20 font-black tracking-widest uppercase block">Access Status</span>
              <span className={`text-[10px] font-black uppercase tracking-tighter ${isBettingOpen ? "text-emerald-400" : "text-white/40"}`}>
                {isBettingOpen ? "OPEN_ENROLLMENT" : "LOCKED"}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/game/${game.roomId}`}
              className="px-6 py-4 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white text-[10px] font-black rounded-none text-center transition-all uppercase tracking-[0.3em] border border-white/5"
            >
              Log
            </Link>
            {game.status === "CREATED" ? (
              <Link
                href={`/market?roomId=${game.roomId}`}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black py-4 rounded-none text-center transition-all uppercase tracking-[0.3em] shadow-[0_0_20px_rgba(220,38,38,0.2)]"
              >
                Predict
              </Link>
            ) : (
              <Link
                href={`/game/${game.roomId}/live`}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black py-4 rounded-none text-center transition-all uppercase tracking-[0.3em] shadow-[0_0_20px_rgba(16,185,129,0.2)]"
              >
                Intercept
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
