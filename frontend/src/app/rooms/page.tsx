"use client"
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { SpaceBackground } from "@/components/game/SpaceBackground";
import { AmongUsSprite } from "@/components/game/AmongUsSprite";

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
      <div className="py-12 max-w-6xl mx-auto px-4">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none">
              Combat <span className="text-red-500">Zones</span>
            </h1>
            <p className="text-white/40 font-mono tracking-widest text-[10px] mt-4 uppercase">
              Neural Link Status: <span className="text-emerald-400">ACTIVE</span> • Select an arena below
            </p>
          </div>

          <div className="flex bg-white/5 backdrop-blur-3xl p-1.5 rounded-2xl border border-white/10 self-start md:self-auto">
            <button 
              onClick={() => setFilter("LIVE")}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                filter === "LIVE" ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "text-white/40 hover:text-white"
              }`}
            >
              Live Missions
            </button>
            <button 
              onClick={() => setFilter("ARCHIVE")}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                filter === "ARCHIVE" ? "bg-white/10 text-white shadow-lg" : "text-white/40 hover:text-white"
              }`}
            >
              Archived
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGames.map((game) => (
            <RoomCard key={game.roomId} game={game} />
          ))}

          {filteredGames.length === 0 && (
            <div className="col-span-full py-32 text-center bg-black/40 backdrop-blur-3xl rounded-[3rem] border border-white/5 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <p className="text-white/20 font-black uppercase tracking-[0.3em] text-xs">No matching zones found</p>
            </div>
          )}
        </div>
      </div>
    </SpaceBackground>
  );
}

function RoomCard({ game }: { game: any }) {
  const isStarting = game.status === "CREATED";
  const startAt = game.scheduledAt ? new Date(game.scheduledAt) : null;
  const bettingEndsAt = game.bettingEndsAt ? new Date(game.bettingEndsAt) : null;
  const isBettingOpen = bettingEndsAt ? Date.now() < bettingEndsAt.getTime() : false;

  return (
    <div className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 hover:bg-white/10 transition-all border-l-4 border-l-red-500">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-black text-white uppercase truncate w-40">
            {game.roomId.replace("scheduled_", "ALPHA-")}
          </h3>
          <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest">
            {game.status}
          </p>
        </div>
        <div className="flex -space-x-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-gray-900 overflow-hidden flex items-center justify-center">
              <AmongUsSprite colorId={i + (game.roomId.length % 10)} size={20} />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 mb-8">
        <div className="flex justify-between items-center text-xs font-bold uppercase">
          <span className="text-white/30">Scheduled For</span>
          <span className="text-white">{startAt ? formatDistanceToNow(startAt, { addSuffix: true }) : "N/A"}</span>
        </div>
        <div className="flex justify-between items-center text-xs font-bold uppercase">
          <span className="text-white/30">Betting Status</span>
          <span className={isBettingOpen ? "text-green-400" : "text-red-500"}>
            {isBettingOpen ? "OPEN" : "CLOSED"}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <Link
          href={`/game/${game.roomId}`}
          className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs font-black py-4 rounded-2xl text-center transition-all uppercase tracking-widest"
        >
          Details
        </Link>
        {game.status === "CREATED" ? (
          <Link
            href={`/market?roomId=${game.roomId}`}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white text-xs font-black py-4 rounded-2xl text-center transition-all uppercase tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.3)]"
          >
            Predict
          </Link>
        ) : (
          <Link
            href={`/game/${game.roomId}/live`}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs font-black py-4 rounded-2xl text-center transition-all uppercase tracking-widest shadow-[0_0_20px_rgba(22,163,74,0.3)]"
          >
            Live View
          </Link>
        )}
      </div>
    </div>
  );
}
