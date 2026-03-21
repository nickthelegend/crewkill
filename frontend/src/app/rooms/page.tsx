"use client"
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { SpaceBackground } from "@/components/game/SpaceBackground";
import { AmongUsSprite } from "@/components/game/AmongUsSprite";
import { motion, AnimatePresence } from "framer-motion";

export default function RoomsPage() {
  const [filter, setFilter] = useState<"LIVE" | "ARCHIVE">("LIVE");
  const games = useQuery(api.crewkill.listGames, {}) || [];

  const filteredGames = games.filter((game) => {
    if (filter === "LIVE") {
      return game.status === "CREATED" || game.status === "ACTIVE" || game.status === "DISCUSSION" || game.status === "VOTING";
    } else {
      return game.status === "DONE" || game.status === "ENDED";
    }
  });

  return (
    <SpaceBackground>
      <div className="py-20 md:py-32 max-w-7xl mx-auto px-6 font-sans">
        <header className="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-10">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
          >
            <h1 className="text-7xl md:text-8xl font-black italic tracking-tighter uppercase leading-none text-white">
              COMBAT <span className="text-red-500">ZONES</span>
            </h1>
            <div className="flex items-center gap-4 mt-6">
              <div className="h-0.5 w-12 bg-red-500" />
              <p className="text-white/40 font-mono tracking-[0.3em] text-[10px] uppercase">
                NEURAL LINK: <span className="text-emerald-400">ACTIVE</span> • SELECT SECTOR
              </p>
            </div>
          </motion.div>

          <motion.div 
            className="flex bg-white/5 backdrop-blur-3xl p-1 rounded-none border border-white/10"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <button 
              onClick={() => setFilter("LIVE")}
              className={`px-10 py-4 rounded-none text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                filter === "LIVE" ? "bg-red-500 text-white" : "text-white/30 hover:text-white"
              }`}
            >
              Live Missions
            </button>
            <button 
              onClick={() => setFilter("ARCHIVE")}
              className={`px-10 py-4 rounded-none text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                filter === "ARCHIVE" ? "bg-white/10 text-white" : "text-white/30 hover:text-white"
              }`}
            >
              Archive
            </button>
          </motion.div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredGames.map((game, i) => (
              <RoomCard key={game._id} game={game} index={i} />
            ))}
          </AnimatePresence>

          {filteredGames.length === 0 && (
            <motion.div 
              className="col-span-full py-40 text-center bg-white/[0.02] backdrop-blur-3xl rounded-none border border-white/5 flex flex-col items-center justify-center p-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="w-20 h-20 rounded-none border border-white/10 flex items-center justify-center mb-8 relative group">
                <div className="absolute inset-0 bg-white/5 animate-pulse" />
                <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 5.882V19.297A7.477 7.477 0 005.188 17.07Q2.594 17.07 1 18.06V5.79q1.594-.99 4.188-.99a7.405 7.405 0 015.812 2.082zM13 5.882V19.297a7.477 7.477 0 015.812-2.227q2.594 0 4.188.99V5.79q-1.594-.99-4.188-.99a7.405 7.405 0 00-5.812 2.082z" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-white italic uppercase tracking-tighter mb-2">Signal Silence</h3>
              <p className="text-white/20 font-mono uppercase tracking-[0.3em] text-[10px] max-w-xs leading-relaxed">No active combat signatures detected in the current mission parameters.</p>
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

  const getStatusColor = () => {
    if (game.status === "DONE" || game.status === "ENDED") return "bg-white/20";
    if (isStarting) return "bg-cyan-500";
    return "bg-red-500";
  }

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`group relative bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-none p-8 hover:bg-white/5 transition-all border-l-4 ${getStatusColor().replace('bg-', 'border-')}`}
    >
      <div className="flex items-start justify-between mb-10">
        <div>
          <span className="text-[10px] text-white/30 font-mono uppercase tracking-[0.2em] mb-2 block">
            ID: {game.roomId.slice(-8).toUpperCase()}
          </span>
          <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none">
            {game.roomId.replace("scheduled_", "MISSION-").replace("room_", "NODE-")}
          </h3>
          <div className="inline-flex items-center gap-2 mt-3 px-3 py-1 bg-white/5 border border-white/5">
            <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor()}`} />
            <span className="text-[9px] text-white font-black uppercase tracking-widest">{game.status}</span>
          </div>
        </div>
        
        <div className="flex items-center -space-x-3 opacity-60 group-hover:opacity-100 transition-opacity">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-10 h-10 rounded-none border border-white/10 bg-black/40 flex items-center justify-center backdrop-blur-md">
              <AmongUsSprite colorId={i + (game.roomId.length % 12)} size={24} />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 mb-10 bg-black/20 p-5 border border-white/5">
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em]">
          <span className="text-white/20 font-mono italic text-[9px]">LIFT_OFF:</span>
          <span className="text-white">{startAt ? formatDistanceToNow(startAt, { addSuffix: true }) : "UNKNOWN"}</span>
        </div>
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em]">
          <span className="text-white/20 font-mono italic text-[9px]">WAGERS:</span>
          <span className={isBettingOpen ? "text-emerald-400" : "text-red-500/50"}>
            {isBettingOpen ? "PERMITTED" : "RESTRICTED"}
          </span>
        </div>
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em]">
          <span className="text-white/20 font-mono italic text-[9px]">POT_SIZE:</span>
          <span className="text-yellow-400/80">{(parseFloat(game.totalPot || "0") / 1e9).toFixed(2)} OCT</span>
        </div>
      </div>

      <div className="flex gap-1">
        <Link
          href={`/game/${game.roomId}`}
          className="flex-1 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black py-4 rounded-none text-center transition-all uppercase tracking-[0.2em] border border-white/10"
        >
          Details
        </Link>
        {game.status === "CREATED" ? (
          <Link
            href={`/market?roomId=${game.roomId}`}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black py-4 rounded-none text-center transition-all uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(220,38,38,0.2)]"
          >
            Predict
          </Link>
        ) : (
          <Link
            href={`/game/${game.roomId}/live`}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black py-4 rounded-none text-center transition-all uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(16,185,129,0.2)]"
          >
            Watch
          </Link>
        )}
      </div>
    </motion.div>
  );
}
