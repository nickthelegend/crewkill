"use client";

import { useQuery } from "convex/react";
import { api as convexApi } from "../../../../../convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { SpaceBackground } from "@/components/game/SpaceBackground";
import { PredictionMarket } from "@/components/game/PredictionMarket";
import { useGameServer } from "@/hooks/useGameServer";
import { useEffect, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function GameBettingPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  // Real-time WebSocket connection
  const { 
    isConnected, 
    currentRoom, 
    joinRoom, 
    phase: wsPhase 
  } = useGameServer();

  // Database persistent state
  const games = useQuery(convexApi.crewkill.listGames, {}) || [];
  const dbGame = games.find((g) => g.roomId === roomId || g.marketId === roomId);
  const actualRoomId = dbGame?.roomId || roomId; // Handle hash vs full id

  // Auto-join room via WebSocket when entering this page
  useEffect(() => {
    if (isConnected && (!currentRoom || currentRoom.roomId !== actualRoomId)) {
      joinRoom(actualRoomId, true);
    }
  }, [isConnected, actualRoomId, currentRoom, joinRoom]);

  // Deterministic hash for non-hex IDs
  const displayId = useMemo(() => {
    if (!dbGame) return "";
    if (dbGame.marketId) return dbGame.marketId;
    if (dbGame.roomId.startsWith('0x')) return dbGame.roomId;
    
    let hash = 0;
    for (let i = 0; i < dbGame.roomId.length; i++) {
        hash = ((hash << 5) - hash) + dbGame.roomId.charCodeAt(i);
        hash |= 0;
    }
    return `0x${Math.abs(hash).toString(16).padEnd(64, '0')}`;
  }, [dbGame]);

  if (!dbGame) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-white/20 font-black uppercase tracking-[0.5em] animate-pulse">Establishing Connection to Prediction Market...</div>
      </div>
    );
  }

  const isLive = (currentRoom?.phase === "playing" || dbGame.status === "ACTIVE") && dbGame.status !== "COMPLETED";

  return (
    <SpaceBackground>
      <div className="min-h-screen pt-24 pb-12 px-4 md:px-8 relative z-10 w-full font-sans">
        <div className="max-w-[1200px] mx-auto">
          {/* Top Navbar Style (Polymarket match) */}
          <div className="flex items-center gap-6 mb-12 text-[10px] font-black uppercase tracking-[0.3em] text-white/40 overflow-x-auto pb-4 custom-scrollbar">
            <Link href="/bet" className="hover:text-cyan-400 transition-colors shrink-0">Prediction Markets</Link>
            <span className="shrink-0">&gt;</span>
            <Link href="/" className="hover:text-cyan-400 transition-colors shrink-0">Crewkill</Link>
            <span className="shrink-0">&gt;</span>
            <span className="text-white shrink-0">Room #{displayId.slice(-8).toUpperCase()}</span>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <button 
                onClick={() => router.push(`/game/${actualRoomId}`)}
                className="mb-6 text-cyan-400 hover:text-cyan-300 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] transition-all group"
              >
                <svg className="w-3 h-3 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Game Lobby
              </button>

              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500 flex items-center justify-center p-2 mb-2">
                  <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-black">
                     <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM12.5 13H15V14H9V13L11 9H8.5V8H14.5L12.5 13Z" fill="currentColor"/>
                  </svg>
                </div>
                <div>
                   <h2 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Games • Crewkill • Room #{displayId.slice(-6).toUpperCase()}</h2>
                   <h1 className="text-3xl md:text-5xl font-black text-white italic tracking-tighter uppercase leading-none mt-1">
                     Who is the Impostor?
                   </h1>
                </div>
              </div>
            </motion.div>

            <div className="text-[10px] font-black uppercase tracking-widest text-white/30 text-right">
              Welcome to the market floor
              <div className="mt-1 text-white">Select a player to bet on</div>
            </div>
          </div>

          {/* Full Width Prediction Market Component */}
          <div className="bg-white/5 backdrop-blur-[100px] border border-white/10 rounded-[3rem] p-1 shadow-2xl relative">
            <div className="p-8">
              <PredictionMarket 
                gameId={dbGame._id}
                marketObjectId={dbGame.marketId || dbGame.roomId}
                gamePlayers={(currentRoom?.players?.length ? currentRoom.players : (dbGame.players || [])).map((p: any) => ({
                  address: p.address,
                  name: p.isAIAgent ? (p.agentPersona?.title || `Agent ${p.address.slice(-4)}`) : (p.name || `Human ${p.address.slice(-4)}`),
                  isAlive: p.isAlive ?? true,
                  colorId: p.colorId
                }))}
                isResolved={dbGame.status === "COMPLETED"}
                actualImpostors={[]} 
                gamePhase={wsPhase || (dbGame.status === "COMPLETED" ? 2 : 0)}
              />
            </div>
          </div>
        </div>
      </div>
    </SpaceBackground>
  );
}
