"use client";

import { useQuery } from "convex/react";
import { api as convexApi } from "../../../../../convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { SpaceBackground } from "@/components/game/SpaceBackground";
import { PredictionMarket } from "@/components/game/PredictionMarket";
import { useGameServer } from "@/hooks/useGameServer";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { GameLogPanel, TaskBar } from "@/components/game";

export default function GameBettingPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  // Real-time WebSocket connection
  const { 
    isConnected, 
    currentRoom, 
    joinRoom, 
    phase: wsPhase,
    players,
    logs,
    tasksCompleted,
    totalTasks
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

  return (
    <SpaceBackground>
      <div className="min-h-screen pt-24 pb-12 px-4 md:px-8 relative z-10 w-full font-sans">
        <div className="max-w-[1500px] mx-auto">
          {/* Dashboard Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12">
            <div>
              <div className="flex items-center gap-6 mb-8 text-[10px] font-black uppercase tracking-[0.3em] text-white/40 overflow-x-auto custom-scrollbar">
                <Link href="/market" className="hover:text-red-500 transition-colors shrink-0">Prediction Markets</Link>
                <span className="shrink-0">&gt;</span>
                <span className="text-white shrink-0">Room #{displayId.slice(-8).toUpperCase()}</span>
              </div>
              
              <div className="flex flex-col gap-1">
                 <h2 className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em] mb-2 flex items-center gap-3">
                   <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_#ff003c]" />
                   Live Deployment Active
                 </h2>
                 <h1 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter uppercase leading-none">
                   Who is the <span className="text-red-500">Impostor?</span>
                 </h1>
              </div>
            </div>

            <div className="flex flex-col gap-4 items-end">
               <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[9px] text-white/20 uppercase font-black tracking-widest leading-none mb-1">Live Feed</div>
                    <div className="text-[10px] text-emerald-400 font-mono italic">SECURE CONNECTION VERIFIED</div>
                  </div>
                  <div className="w-10 h-10 border border-emerald-500/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  </div>
               </div>
               <TaskBar completed={tasksCompleted} total={totalTasks} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-1 bg-white/5 border border-white/10 backdrop-blur-[100px] rounded-none">
             {/* Left Panel: The Market (8/12) */}
              <div className="lg:col-span-8 p-8 border-b lg:border-b-0 lg:border-r border-white/10 overflow-y-auto max-h-[85vh] custom-scrollbar">
                {dbGame.marketId && !dbGame.marketId.includes('scheduled') ? (
                  <PredictionMarket 
                    gameId={dbGame._id}
                    marketObjectId={dbGame.marketId}
                    gamePlayers={(currentRoom?.players?.length ? currentRoom.players : (dbGame.players || [])).map((p: any) => ({
                      address: p.address,
                      name: p.name || `Player ${p.address.slice(-4)}`,
                      isAlive: p.isAlive ?? true,
                      colorId: p.colorId,
                      agentPersona: p.agentPersona
                    }))}
                    isResolved={dbGame.status === "COMPLETED" || dbGame.status === "ENDED"}
                    actualImpostors={[]} 
                    gamePhase={wsPhase || (dbGame.status === "COMPLETED" ? 7 : 0)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-20 text-center space-y-6">
                    <div className="w-16 h-16 border-2 border-cyan-500/20 border-t-cyan-500 animate-spin rounded-full" />
                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-white italic tracking-tighter uppercase">Initializing Market</h3>
                      <p className="text-white/40 text-[10px] uppercase tracking-widest leading-relaxed max-w-xs">
                        The prediction market is being deployed on OneChain. This portal will synchronize shortly.
                      </p>
                    </div>
                  </div>
                )}
              </div>

             {/* Right Panel: Live Intel & Roster (4/12) */}
             <div className="lg:col-span-4 flex flex-col bg-black/40 overflow-hidden max-h-[85vh]">
                {/* Scrollable Intel Area */}
                <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar">
                   {/* Roster Segment */}
                   <section>
                      <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] mb-8 flex items-center gap-3">
                         <span className="w-1 h-1 bg-red-500" />
                         Live Roster Status
                      </h3>
                      <div className="grid grid-cols-1 gap-1">
                         {players.map((p, idx) => (
                           <div key={p.address} className="flex items-center justify-between p-4 border border-white/5 bg-white/[0.02]">
                              <div className="flex items-center gap-4">
                                 <div className={`w-8 h-8 ${p.isAlive ? "bg-red-500/10" : "bg-red-500/80"} border border-white/10 flex items-center justify-center transition-colors`}>
                                    <span className={`text-[8px] font-mono ${p.isAlive ? "text-white/40" : "text-white font-black"}`}>{p.isAlive ? `#${idx + 1}` : "XXX"}</span>
                                 </div>
                                 <div className="flex flex-col">
                                    <span className={`text-[11px] font-black uppercase tracking-tighter ${p.isAlive ? "text-white" : "text-white/20"}`}>
                                       {p.name || `Player ${p.address.slice(-4)}`}
                                    </span>
                                    <span className="text-[8px] font-mono text-white/20 tracking-tighter opacity-50">{p.address.slice(0, 16)}...</span>
                                 </div>
                              </div>
                              <span className={`text-[9px] font-black uppercase tracking-widest ${p.isAlive ? "text-emerald-400" : "text-red-500"}`}>
                                 {p.isAlive ? "ACTIVE" : "DEAD"}
                              </span>
                           </div>
                         ))}
                      </div>
                   </section>

                   {/* Live Communications (Logs) */}
                   <section>
                      <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] mb-8 flex items-center gap-3">
                         <span className="w-1 h-1 bg-red-500" />
                         Communications Feed
                      </h3>
                      <div className="border border-white/5 bg-black/40">
                         <GameLogPanel logs={logs} maxHeight="350px" />
                      </div>
                   </section>
                </div>

                {/* Fixed Footer Actions */}
                <div className="p-8 border-t border-white/5 bg-black/60">
                   <div className="p-6 border border-emerald-500/20 bg-emerald-500/5 mb-6">
                      <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="w-1 h-1 bg-emerald-400 animate-pulse" />
                        Live Multi-Chain Intel
                      </p>
                      <p className="text-[10px] text-white/40 leading-relaxed italic">
                        Real-time simulation updates are processed through OneChain settlement layer. Market confidence is derived from global agent behavior.
                      </p>
                   </div>
                   <button 
                      onClick={() => router.push(`/game/${actualRoomId}/live`)}
                      className="w-full py-6 bg-white/5 border border-white/10 hover:border-red-500/40 hover:bg-red-500/10 text-white/40 hover:text-white text-[10px] font-black uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-4"
                   >
                      Switch to Live Map Feed
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                   </button>
                </div>
             </div>
          </div>
        </div>
      </div>
    </SpaceBackground>
  );
}
