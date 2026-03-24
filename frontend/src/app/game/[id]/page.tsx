"use client";

import { useQuery } from "convex/react";
import { api as convexApi } from "../../../../convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { SpaceBackground } from "@/components/game/SpaceBackground";
import { AmongUsSprite } from "@/components/game/AmongUsSprite";
import { PredictionMarket } from "@/components/game/PredictionMarket";
import { formatDistanceToNow } from "date-fns";
import { useGameServer } from "@/hooks/useGameServer";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function RoomDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  // Real-time WebSocket connection
  const { 
    isConnected, 
    currentRoom, 
    joinRoom, 
    players: wsPlayers,
    phase: wsPhase 
  } = useGameServer();

  // Database persistent state
  const games = useQuery(convexApi.crewkill.listGames, {}) || [];
  const dbGame = games.find((g) => g.roomId === roomId);

  // Auto-join room via WebSocket when entering this page
  useEffect(() => {
    if (isConnected && (!currentRoom || currentRoom.roomId !== roomId)) {
      joinRoom(roomId, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, roomId]);

  // Deterministic hash for non-hex IDs (matches server logic)
  const displayId = useMemo(() => {
    if (!dbGame) return "";
    if (dbGame.marketId) return dbGame.marketId;
    if (dbGame.roomId.startsWith('0x')) return dbGame.roomId;
    
    // Fallback: simple hash of roomId (same as server ideally)
    let hash = 0;
    for (let i = 0; i < dbGame.roomId.length; i++) {
      hash = ((hash << 5) - hash) + dbGame.roomId.charCodeAt(i);
      hash |= 0;
    }
    return `0x${Math.abs(hash).toString(16).padEnd(64, '0')}`;
  }, [dbGame]);

  const startAt = dbGame ? (dbGame.scheduledAt ? new Date(dbGame.scheduledAt) : null) : null;
  const bettingEndsAt = dbGame ? (dbGame.bettingEndsAt ? new Date(dbGame.bettingEndsAt) : null) : null;
  const isBettingOpen = bettingEndsAt ? Date.now() < bettingEndsAt.getTime() : false;
  
  const isEnded = dbGame ? (dbGame.status === "COMPLETED" || dbGame.status === "SETTLED" || dbGame.phase === "ended" || currentRoom?.phase === "ended") : false;
  const isLive = dbGame ? ((currentRoom?.phase === "playing" || dbGame.status === "ACTIVE") && !isEnded) : false;

  if (!dbGame) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-white/20 font-black uppercase tracking-[0.5em] animate-pulse">Scanning System...</div>
      </div>
    );
  }

  return (
    <SpaceBackground>
      <div className="min-h-screen pt-24 pb-12 px-4 md:px-8 relative z-10">
        <div className="max-w-[1400px] mx-auto">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
            >
              <button 
                onClick={() => router.push('/')}
                className="mb-6 text-cyan-400 hover:text-cyan-300 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] transition-all group"
              >
                <svg className="w-3 h-3 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Menu
              </button>
              
              <div className="flex items-center gap-4 mb-4">
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-[0.2em] uppercase ${
                  isLive ? "bg-red-500/20 text-red-500 border border-red-500/30" : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                }`}>
                  {isLive ? "● LIVE GAME" : isEnded ? "GAME OVER" : "LOBBY OPEN"}
                </div>
                <div className="h-4 w-px bg-white/10" />
                <span className="text-cyan-400 font-black text-[10px] uppercase tracking-widest bg-cyan-400/10 px-3 py-1 border border-cyan-400/20">
                   NETWORK_ID: #{displayId.slice(-12).toUpperCase()}
                </span>
              </div>
              
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter uppercase text-white leading-[0.9]">
                Game <span className="text-cyan-400">Arena</span><br/>
                <span className="text-3xl md:text-5xl opacity-50 block mt-2">VERSION_{dbGame._id.slice(-4).toUpperCase()}</span>
              </h1>
            </motion.div>

            <motion.div 
              className="flex flex-col items-end gap-4"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
            >
              {/* Live View button for active games */}
              {isLive && (
                <Link 
                  href={`/game/${roomId}/live`}
                  className="group relative px-12 py-6 bg-red-600 hover:bg-red-500 text-white rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_50px_rgba(220,38,38,0.4)] overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:animate-shimmer" />
                  <span className="relative z-10 text-lg font-black uppercase tracking-[0.2em] flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    Watch Live
                  </span>
                </Link>
              )}
              
              {/* Recap button — always available */}
              <Link 
                href={`/game/${roomId}/recap`}
                className="group relative px-12 py-6 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(147,51,234,0.3)] overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:animate-shimmer" />
                <span className="relative z-10 text-sm font-black uppercase tracking-[0.2em] flex items-center gap-3">
                  📋 {isEnded ? "View Recap" : "View Events"}
                </span>
              </Link>
              
              <div className="text-right">
                <div className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Current Pool</div>
                <div className="text-4xl font-black text-white">{(parseFloat(dbGame.totalPot || "0") / 1e9).toFixed(2)} <span className="text-cyan-400">OCT</span></div>
              </div>
            </motion.div>
          </div>

          {/* Victory/Outcome Banner */}
          {isEnded && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`mb-12 p-8 rounded-[2.5rem] border-2 flex flex-col items-center justify-center text-center relative overflow-hidden ${
                dbGame.crewmatesWon 
                  ? "bg-emerald-500/10 border-emerald-500/30" 
                  : "bg-red-500/10 border-red-500/30"
              }`}
            >
              <div className={`absolute top-0 left-0 w-full h-1 ${dbGame.crewmatesWon ? "bg-emerald-500" : "bg-red-500"}`} />
              <div className="text-sm font-black uppercase tracking-[0.4em] text-white/40 mb-2">Simulated Outcome</div>
              <h2 className={`text-5xl md:text-7xl font-black uppercase tracking-tighter mb-4 ${dbGame.crewmatesWon ? "text-emerald-400" : "text-red-400"}`}>
                {dbGame.crewmatesWon ? "Crewmates Win" : "Impostors Win"}
              </h2>
              <div className="flex items-center gap-4 text-white/60 font-black uppercase tracking-widest text-xs">
                 <span>REASON: {dbGame.winReason?.toUpperCase()}</span>
                 <span className="w-1 h-1 rounded-full bg-white/20" />
                 <span>DURATION: {Math.floor(((dbGame.endedAt || 0) - (dbGame.startedAt || 0)) / 1000)}s</span>
              </div>
            </motion.div>
          )}

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left: Market Info & Stats */}
            <div className="lg:col-span-4 space-y-6 order-2 lg:order-1">
              {/* Counter Section */}
              <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-[50px] rounded-full -mr-16 -mt-16 group-hover:bg-cyan-500/10 transition-colors" />
                
                <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Temporal Status
                </h3>
                
                <div className="space-y-6">
                  <DetailStat 
                    label="Lobby Lock" 
                    value={startAt ? formatDistanceToNow(startAt, { addSuffix: true }) : "IMMEDIATE"} 
                    subvalue={startAt?.toLocaleTimeString()}
                  />
                  <DetailStat 
                    label="Prediction Cutoff" 
                    value={bettingEndsAt ? formatDistanceToNow(bettingEndsAt, { addSuffix: true }) : "CLOSED"} 
                    subvalue={bettingEndsAt?.toLocaleTimeString()}
                    highlight={isBettingOpen}
                  />
                </div>
              </div>

              {/* Participants Card */}
              <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8">
                <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                   Players ({currentRoom?.players.filter(p => p.isAlive).length || 0}/{currentRoom?.players.length || 0} alive)
                </h3>
                
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {currentRoom?.players.map((p, idx) => {
                      const isDead = !p.isAlive;
                      const isGameOver = dbGame.status === "COMPLETED" || wsPhase === 7;
                      const isImpostor = p.role === 2 || (isGameOver && dbGame.impostorAddresses?.includes(p.address.toLowerCase()));
                      return (
                        <motion.div 
                          key={p.address}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className={`border rounded-xl p-3 flex items-center gap-4 group transition-colors ${
                            isDead 
                              ? "bg-red-500/5 border-red-500/20 opacity-60" 
                              : "bg-white/[0.04] border-white/5 hover:bg-white/[0.08]"
                          }`}
                        >
                           <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center border border-white/10 group-hover:border-cyan-500/30 transition-colors relative overflow-hidden">
                              <AmongUsSprite colorId={p.colorId} size={28} isGhost={isDead} />
                              {isDead && (
                                <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[7px]">💀</div>
                              )}
                           </div>
                           <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-black text-white uppercase truncate flex items-center gap-2">
                                 {p.address.slice(0, 10)}...
                                 {p.isAIAgent && <span className="text-[8px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">AI</span>}
                                 {isGameOver && isImpostor && (
                                   <span className="text-[8px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded animate-pulse">IMPOSTOR</span>
                                 )}
                              </div>
                              <div className="text-[8px] font-mono mt-0.5 uppercase flex items-center gap-2">
                                 <span className={isDead ? "text-red-400" : "text-emerald-400"}>{isDead ? "💀 DEAD" : "🟢 ALIVE"}</span>
                                 <span className="text-white/10">•</span>
                                 <span className="text-white/30">Tasks {p.tasksCompleted}/{p.totalTasks}</span>
                              </div>
                           </div>
                           {(p as any).agentPersona && (
                             <div className="text-lg">{(p as any).agentPersona.emoji}</div>
                           )}
                           <div className={`w-1.5 h-1.5 rounded-full ${isDead ? "bg-red-500" : "bg-emerald-500"} ${isDead ? "" : "animate-pulse"}`} />
                        </motion.div>
                      );
                    })}
                    {!currentRoom?.players.length && (
                      <div className="text-center py-12 opacity-20 text-sm">Waiting for participants...</div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Right: The Prediction Market (Kalshi Style) */}
            <div className="lg:col-span-8 order-1 lg:order-2">
              <div className="bg-white/5 backdrop-blur-[100px] border border-white/10 rounded-[3rem] p-1 shadow-2xl overflow-hidden relative">
                {/* Visual Header Decoration */}
                <div className="h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
                
                <div className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-2xl font-black text-white tracking-tight uppercase">Prediction Market</h2>
                      <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] mt-1 font-bold">Predict the Winner</p>
                    </div>
                    {isBettingOpen && (
                      <div className="flex items-center gap-2 text-[10px] font-black text-cyan-400 bg-cyan-500/10 px-4 py-2 rounded-full border border-cyan-500/20">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        MARKET_OPEN
                      </div>
                    )}
                  </div>

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
                    actualImpostors={[]} // Hidden during lobby
                    gamePhase={wsPhase || (dbGame.status === "COMPLETED" ? 2 : 0)}
                    creationDigest={currentRoom?.creationDigest}
                  />
                  
                  {/* Market Sentiment Disclaimer */}
                  <div className="mt-8 p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                    <p className="text-[10px] text-white/30 leading-relaxed font-bold uppercase tracking-wider text-center">
                      Market will settle automatically upon game completion. 
                      Impostor identities are hidden until the game ends.
                    </p>
                  </div>
                </div>
              </div>

              {/* Market Chart Placeholder / Visual */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/[0.03] border border-cyan-500/20 rounded-[2rem] p-8 relative overflow-hidden">
                   <div className="text-xs font-black text-cyan-400 uppercase tracking-widest mb-4">Sentiment Index</div>
                   <div className="h-32 flex items-end gap-2">
                      {[...Array(12)].map((_, i) => (
                        <motion.div 
                          key={i}
                          className="flex-1 bg-cyan-500/20 border-t-2 border-cyan-400"
                          initial={{ height: 0 }}
                          animate={{ height: `${20 + Math.random() * 80}%` }}
                          transition={{ delay: i * 0.1, duration: 1 }}
                        />
                      ))}
                   </div>
                </div>
                <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-8 flex flex-col justify-center">
                   <div className="text-xs font-black text-white/30 uppercase tracking-widest mb-2">Historical Accuracy</div>
                   <div className="text-4xl font-black text-white">98.4%</div>
                   <p className="text-[10px] text-white/20 mt-2 font-bold leading-tight">PREDICTIVE STABILITY ENHANCED VIA SMART CONTRACTS</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </SpaceBackground>
  );
}

function DetailStat({ label, value, subvalue, highlight = false }: { label: string; value: string; subvalue?: string, highlight?: boolean }) {
  return (
    <div className="relative">
       <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">{label}</div>
       <div className={`text-xl font-black truncate ${highlight ? 'text-cyan-400' : 'text-white'}`}>{value}</div>
       {subvalue && <div className="text-[9px] font-mono text-white/20 mt-1">{subvalue}</div>}
    </div>
  );
}
