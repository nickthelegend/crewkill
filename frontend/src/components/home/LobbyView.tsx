"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AmongUsSprite,
  SpaceBackground,
  AgentCard,
  PredictWinner,
} from "@/components/game";
import { ConnectWallet } from "@/components/wallet/ConnectWallet";
import { OperatorKeyPanel } from "@/components/operator/OperatorKeyPanel";
import Link from "next/link";
import { Player, GameLog, PlayerColors } from "@/types/game";
import type { RoomState } from "@/hooks/useGameServer";
import type { RoomInfo, ServerStats } from "@/lib/api";
import { InviteModal } from "./InviteModal";

export interface LobbyViewProps {
  isConnected: boolean;
  rooms: RoomInfo[];
  currentRoom: RoomState | null;
  players: Player[];
  logs: GameLog[];
  stats?: ServerStats | null;
  onJoinRoom: (roomId: string) => void;
  onBack: () => void;
  onCreateRoom: () => void;
  isAuthenticated: boolean;
  onLogin?: () => void;
  currentAddress?: string;
  onAddAIAgent?: (roomId: string) => void;
  onRemoveAIAgent?: (roomId: string) => void;
}

export function LobbyView({
  isConnected,
  rooms,
  currentRoom,
  players,
  logs,
  stats,
  onJoinRoom,
  onBack,
  onCreateRoom,
  isAuthenticated,
  onLogin,
  currentAddress,
  onAddAIAgent,
  onRemoveAIAgent,
}: LobbyViewProps) {
  const lobbyRooms = rooms.filter((r) => r.phase === "lobby");
  const playingRooms = rooms.filter((r) => r.phase === "playing");
  const allActiveRooms = [...playingRooms, ...lobbyRooms];
  const MIN_PLAYERS = stats?.limits.minPlayersToStart ?? 2;
  const [showInviteModal, setShowInviteModal] = useState(false);

  const userRoom = currentAddress
    ? rooms.find(
        (r) =>
          r.creator?.toLowerCase() === currentAddress.toLowerCase() &&
          r.phase !== "ended"
      )
    : null;
  const hasActiveRoom = !!userRoom;

  return (
    <SpaceBackground>
      <div className="min-h-screen flex flex-col relative overflow-hidden font-sans">
        {/* Animated Orbs for Depth */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="h-4 md:h-8" />

        {/* ─── Main Content ─── */}
        <main className="flex-1 p-6 relative z-10 flex min-h-0">
          <div className="max-w-[1600px] mx-auto w-full h-full grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* ─── Left: Explorer ─── */}
            <motion.div
              className="lg:col-span-3 flex flex-col min-h-0"
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-2xl overflow-hidden flex flex-col flex-1 shadow-2xl relative group">
                {/* Decorative glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                <header className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                  <div>
                    <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                      <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      Total Rooms
                    </h2>
                    <p className="text-[10px] text-white/40 mt-1 font-mono">{allActiveRooms.length} TOTAL_ROOMS</p>
                  </div>
                  {!hasActiveRoom && isAuthenticated && (
                    <motion.button
                      onClick={onCreateRoom}
                      className="w-8 h-8 rounded-lg bg-cyan-500 text-black flex items-center justify-center hover:bg-cyan-400 transition-colors shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                      </svg>
                    </motion.button>
                  )}
                </header>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {allActiveRooms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-40 grayscale group-hover:grayscale-0 transition-all">
                      <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 4, repeat: Infinity }}
                        className="mb-6"
                      >
                        <AmongUsSprite colorId={11} size={80} />
                      </motion.div>
                      <p className="text-white text-xs font-black uppercase tracking-[0.2em]">No Rooms Found</p>
                      <p className="text-white/30 text-[10px] mt-2 font-mono">WAITING FOR NETWORK BROADCAST...</p>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {allActiveRooms.map((room, i) => {
                        const isPlaying = room.phase === "playing";
                        const isSelected = currentRoom?.roomId === room.roomId;
                        return (
                          <motion.button
                            key={room.roomId}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => onJoinRoom(room.roomId)}
                            className={`w-full text-left p-4 rounded-2xl border transition-all relative overflow-hidden group/item ${
                              isSelected
                                ? "bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.1)]"
                                : "bg-white/[0.03] border-white/5 hover:border-white/20 hover:bg-white/[0.06]"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-black text-white/90 font-mono tracking-tighter">ROOM_{room.roomId.slice(-6)}</span>
                              <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${
                                isPlaying ? "bg-rose-500/20 text-rose-400" : "bg-cyan-500/20 text-cyan-400"
                              }`}>
                                {isPlaying ? "ENGAGED" : "RECRUITING"}
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <div className="flex -space-x-2">
                                {room.players.slice(0, 4).map((p, j) => (
                                  <div key={j} className="w-6 h-6 rounded-lg bg-black/40 border border-white/10 p-1 flex items-center justify-center">
                                    <AmongUsSprite colorId={p.colorId} size={16} />
                                  </div>
                                ))}
                                {room.players.length > 4 && (
                                  <div className="w-6 h-6 rounded-lg bg-black/80 border border-white/10 flex items-center justify-center text-[8px] font-bold text-white/60">
                                    +{room.players.length - 4}
                                  </div>
                                )}
                              </div>
                              <span className="font-mono text-white/40">{room.players.length}/{room.maxPlayers}</span>
                            </div>
                          </motion.button>
                        );
                      })}
                    </AnimatePresence>
                  )}
                </div>
              </section>
            </motion.div>

            {/* ─── Center: Mission Control ─── */}
            <motion.div
              className="lg:col-span-6 flex flex-col min-h-0"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <section className="rounded-[2.5rem] border border-white/10 bg-white/[0.02] backdrop-blur-3xl overflow-hidden flex-1 flex flex-col shadow-2xl overflow-y-auto custom-scrollbar">
                {currentRoom ? (
                  <div className="p-8">
                    {/* Hero Header */}
                    <div className="flex items-start justify-between mb-8">
                      <div>
                        <div className="text-[10px] text-cyan-400 font-black uppercase tracking-[0.3em] mb-2">Active Protocol</div>
                        <h2 className="text-4xl font-black text-white uppercase tracking-tight">Mission {currentRoom.roomId.slice(-8)}</h2>
                        <div className="flex items-center gap-4 mt-3">
                           <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 border border-white/10">
                              <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                              <span className="text-[10px] font-bold text-white/60 uppercase">{currentRoom.phase}</span>
                           </div>
                           {currentRoom.wagerAmount && (
                             <div className="text-xs font-black text-yellow-400 uppercase tracking-widest">
                               💰 {Number(currentRoom.wagerAmount) / 1e9} OCT ENTRY
                             </div>
                           )}
                        </div>
                      </div>

                      <div className="text-right">
                         <div className="text-[10px] text-white/20 uppercase font-black tracking-widest mb-1">Total Pool</div>
                         <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500">
                           {(Number(currentRoom.wagerAmount || 0) * currentRoom.players.length / 1e9).toFixed(1)} OCT
                         </div>
                      </div>
                    </div>

                    {/* Tactics Grid */}
                    <div className="grid grid-cols-5 gap-3 mb-8">
                       {Array.from({ length: currentRoom.maxPlayers }).map((_, i) => {
                         const p = currentRoom.players[i];
                         return (
                           <motion.div
                            key={i}
                            className={`aspect-square rounded-3xl border flex flex-col items-center justify-center relative group/p ${
                              p ? "bg-white/5 border-white/10" : "bg-black/20 border-white/5 border-dashed"
                            }`}
                            whileHover={p ? { y: -5, scale: 1.05 } : {}}
                           >
                             {p ? (
                               <>
                                 <div className="w-12 h-12 relative drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                                   <AmongUsSprite colorId={p.colorId} size={48} />
                                   {p.isAIAgent && (
                                     <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center text-[8px] font-black text-white shadow-lg">AI</div>
                                   )}
                                 </div>
                                 <div className="absolute bottom-2 text-[9px] font-black text-white/30 uppercase group-hover/p:text-white/60 transition-colors">
                                   {PlayerColors[p.colorId]?.name.slice(0, 4)}
                                 </div>
                               </>
                             ) : (
                               <span className="text-white/5 text-xl font-black tracking-tighter">—</span>
                             )}
                           </motion.div>
                         );
                       })}
                    </div>

                    {/* AI Intelligence Sector */}
                    {currentRoom.players.some(p => p.isAIAgent) && (
                      <div className="mb-10 p-6 rounded-[2rem] bg-purple-500/5 border border-purple-500/20">
                         <h3 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-purple-400" />
                            Deployed Intelligence
                         </h3>
                         <div className="grid gap-3 sm:grid-cols-2">
                           {currentRoom.players.filter(p => p.isAIAgent).map((player, idx) => (
                             <AgentCard key={player.address} player={player} index={idx} />
                           ))}
                         </div>
                      </div>
                    )}

                    {/* Market Prediction */}
                    {currentRoom.players.length >= MIN_PLAYERS && (
                      <div className="mb-8">
                        <PredictWinner
                          onPredict={(team) => console.log("Predicted:", team)}
                          disabled={currentRoom.phase !== "lobby"}
                        />
                      </div>
                    )}

                    {/* Start Action */}
                    <div className="mt-auto">
                       {currentRoom.phase === "playing" ? (
                         <div className="w-full p-6 bg-rose-500/10 border border-rose-500/20 rounded-3xl text-center flex items-center justify-between">
                            <div className="text-left">
                               <div className="text-rose-400 font-black text-lg uppercase tracking-widest mb-1">Combat Engaged</div>
                               <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest">Awaiting terminal results...</p>
                            </div>
                            <Link 
                               href={`/game/${currentRoom.roomId}/live`}
                               className="px-8 py-4 bg-white text-black text-xs font-black uppercase rounded-2xl hover:bg-cyan-400 transition-colors shadow-lg"
                            >
                               Watch Live
                            </Link>
                         </div>
                       ) : currentRoom.players.length >= MIN_PLAYERS ? (
                         <div className="w-full p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl text-center flex items-center justify-between">
                            <div className="text-left">
                               <div className="text-emerald-400 font-black text-lg uppercase tracking-tight">Full Squad</div>
                               <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest">Launch protocol authorized</p>
                            </div>
                            <div className="flex gap-2">
                               {currentRoom.creator?.toLowerCase() === currentAddress?.toLowerCase() && (
                                 <button
                                  onClick={onAddAIAgent?.bind(null, currentRoom.roomId)}
                                  className="px-6 py-3 rounded-2xl bg-white text-black text-xs font-black uppercase hover:bg-cyan-400 transition-colors"
                                 >
                                  Deploy Now
                                 </button>
                               )}
                            </div>
                         </div>
                       ) : (
                         <div className="w-full p-8 border-2 border-white/5 border-dashed rounded-[2.5rem] flex flex-col items-center">
                            <p className="text-white/50 text-sm font-bold mb-6">RECRUITING {MIN_PLAYERS - currentRoom.players.length} MORE AGENTS</p>
                            <div className="flex gap-4">
                               <button
                                onClick={() => setShowInviteModal(true)}
                                className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-xs font-black uppercase hover:bg-white/10 transition-all"
                               >
                                Invite Players
                               </button>
                               <button
                                onClick={() => onAddAIAgent?.(currentRoom.roomId)}
                                className="px-6 py-3 rounded-2xl bg-cyan-500 text-black text-xs font-black uppercase hover:bg-cyan-400 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                               >
                                + Force Add AI
                               </button>
                            </div>
                         </div>
                       )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
                     <motion.div
                      animate={{ y: [0, -20, 0], scale: [1, 1.1, 1] }}
                      transition={{ duration: 5, repeat: Infinity }}
                      className="mb-10 drop-shadow-[0_0_50px_rgba(6,182,212,0.3)] grayscale opacity-20"
                     >
                       <AmongUsSprite colorId={0} size={160} />
                     </motion.div>
                     <h2 className="text-2xl font-black text-white/20 uppercase tracking-[0.5em] mb-4">No Sector Selected</h2>
                     <p className="max-w-xs text-white/10 text-xs font-bold leading-relaxed tracking-widest italic uppercase">
                       Awaiting operator selection to initiate neural interface and begin the hunt.
                     </p>
                  </div>
                )}
              </section>
            </motion.div>

            {/* ─── Right: Signal Log ─── */}
            <motion.div
              className="lg:col-span-3 flex flex-col min-h-0"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-2xl overflow-hidden flex-1 flex flex-col shadow-2xl">
                <header className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                  <h2 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    Signal Feed
                  </h2>
                  <span className="text-[9px] font-mono text-white/30 uppercase tracking-[0.2em]">ENCRYPTED</span>
                </header>

                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                  {logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20">
                       <svg className="w-8 h-8 text-white mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                       </svg>
                       <span className="text-[10px] font-black uppercase tracking-widest">No Signals</span>
                    </div>
                  ) : (
                    logs.map((log, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-white/5 border border-white/5 rounded-xl flex gap-3"
                      >
                         <span className="text-[9px] font-mono text-white/20 mt-0.5">{new Date(log.timestamp).toLocaleTimeString().slice(0, 5)}</span>
                         <p className={`text-[11px] font-bold leading-relaxed ${
                            log.type === "kill" ? "text-rose-400" :
                            log.type === "report" ? "text-yellow-400" :
                            "text-white/60"
                         }`}>
                           {log.message}
                         </p>
                      </motion.div>
                    ))
                  )}
                </div>
              </section>
            </motion.div>
          </div>
        </main>

        <InviteModal
          isOpen={showInviteModal && !!userRoom}
          roomId={userRoom?.roomId ?? ""}
          onClose={() => setShowInviteModal(false)}
        />
      </div>
    </SpaceBackground>
  );
}
