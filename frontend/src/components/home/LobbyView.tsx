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

import { getExplorerTxUrl, getExplorerObjectUrl } from '@/lib/onechain';

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
 
  const getDisplayId = (id: string, marketId?: string) => {
    if (marketId) return marketId.slice(-8).toUpperCase();
    if (id.startsWith('0x')) return id.slice(-8).toUpperCase();
    
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padEnd(8, '0').slice(-8).toUpperCase();
  };

  return (
    <SpaceBackground>
      <div className="min-h-screen flex flex-col relative overflow-hidden font-sans bg-[#0d141e]/40">
        {/* Tactical Scanning Lines */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-5">
          <div className="absolute inset-0 bg-[linear-gradient(0deg,transparent_24%,rgba(34,211,238,0.05)_25%,rgba(34,211,238,0.05)_26%,transparent_27%,transparent_74%,rgba(34,211,238,0.05)_75%,rgba(34,211,238,0.05)_76%,transparent_77%)] bg-[length:50px_50px]" />
        </div>

        <div className="h-4 md:h-12" />

        {/* ─── Main Tactical Grid ─── */}
        <main className="flex-1 p-6 lg:p-10 relative z-10 flex min-h-0">
          <div className="max-w-[1800px] mx-auto w-full h-full grid grid-cols-1 lg:grid-cols-12 gap-1 bg-white/5 border border-white/10 backdrop-blur-[40px] p-1 shadow-2xl overflow-hidden">

            {/* ─── Left: Explorer (0px Radius) ─── */}
            <motion.div
              className="lg:col-span-3 flex flex-col min-h-0 bg-black/40 border-r border-white/5"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
            >
              <header className="px-8 py-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                <div>
                  <h2 className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] mb-2 flex items-center gap-3">
                    <span className="w-1.5 h-1.5 bg-cyan-400 rotate-45" />
                    Explorer
                  </h2>
                  <div className="text-2xl font-black text-white tracking-tighter uppercase leading-none">
                    Game <span className="text-cyan-400">Lobby</span>
                  </div>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
                {allActiveRooms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-32 opacity-20">
                    <div className="mb-8 border border-white/10 p-6 opacity-40">
                      <AmongUsSprite colorId={11} size={64} />
                    </div>
                    <p className="text-white text-[10px] font-black uppercase tracking-[0.3em]">No Signal Detected</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {allActiveRooms.map((room, i) => {
                      const isPlaying = room.phase === "playing";
                      const isSelected = currentRoom?.roomId === room.roomId;
                      return (
                        <motion.button
                          key={room.roomId}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() => onJoinRoom(room.roomId)}
                          className={`w-full text-left p-6 transition-all border-l-2 relative overflow-hidden flex flex-col gap-4 ${
                            isSelected
                              ? "bg-white/10 border-cyan-400"
                              : "bg-white/[0.02] border-transparent hover:bg-white/[0.05] hover:border-white/20"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-white/80 font-mono tracking-tighter uppercase">NODE_{getDisplayId(room.roomId, room.marketId)}</span>
                              {room.marketId && (
                                <a 
                                  href={getExplorerObjectUrl(room.marketId)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[8px] font-mono text-cyan-400/50 hover:text-cyan-400 uppercase tracking-widest mt-1"
                                >
                                  SCAN_MARKET
                                </a>
                              )}
                            </div>
                            <div className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                              isPlaying ? "bg-rose-500/10 text-rose-500" : "bg-cyan-500/10 text-cyan-400"
                            }`}>
                              {isPlaying ? "ENGAGED" : "OPEN"}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                             <div className="flex items-center -space-x-3">
                                {room.players.slice(0, 4).map((p, j) => (
                                  <div key={j} className="w-8 h-8 bg-black border border-white/10 flex items-center justify-center relative shadow-xl">
                                    <AmongUsSprite colorId={p.colorId} size={20} />
                                  </div>
                                ))}
                             </div>
                             <span className="font-mono text-[10px] text-white/40 tracking-[0.2em]">{room.players.length}/{room.maxPlayers} AGENTS</span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>
            </motion.div>

            {/* ─── Center: Mission Command (0px Radius) ─── */}
            <motion.div
              className="lg:col-span-6 flex flex-col min-h-0 bg-black/60 relative"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              {currentRoom ? (
                <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
                  {/* Strategic Briefing */}
                  <div className="p-10 lg:p-14 border-b border-white/5 bg-white/[0.01]">
                    <div className="flex items-start justify-between mb-16">
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                           <div className="w-1.5 h-1.5 bg-cyan-400 animate-pulse" />
                           <p className="text-[10px] text-cyan-400 font-black uppercase tracking-[0.3em]">Connection Active: ROOM_{getDisplayId(currentRoom.roomId, currentRoom.marketId)}</p>
                        </div>
                        <h2 className="text-5xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none mb-6">
                           GAME <span className="text-cyan-400">PROFILE</span>
                        </h2>
                        <div className="flex items-center gap-6">
                           <div className="px-5 py-2 bg-white/5 border border-white/10 text-[10px] font-black text-white uppercase tracking-widest">
                              PHASE: <span className={currentRoom.phase === 'lobby' ? 'text-cyan-400' : 'text-rose-500'}>{currentRoom.phase}</span>
                           </div>
                           {currentRoom.wagerAmount && (
                             <div className="text-xs font-black text-yellow-400 uppercase tracking-widest flex items-center gap-2">
                               <div className="w-1 h-1 bg-yellow-400 rotate-45" />
                               {Number(currentRoom.wagerAmount) / 1e9} $CREW ENTRY
                             </div>
                           )}
                        </div>
                      </div>

                      <div className="text-right hidden sm:block">
                         <div className="text-[10px] text-white/20 uppercase font-black tracking-widest mb-2 font-mono">Total Prize Pool</div>
                         <div className="text-5xl font-black text-white tracking-tighter tabular-nums leading-none">
                            {(Number(currentRoom.wagerAmount || 0) * currentRoom.players.length / 1e9).toFixed(1)} <span className="text-yellow-400 text-sm not-ml-1">$CREW</span>
                          </div>
                       </div>
                    </div>

                    {/* On-Chain Verification */}
                    {currentRoom.creationDigest && (
                      <div className="mb-8 p-4 bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-1.5 h-1.5 bg-cyan-400 rotate-45" />
                          <div className="min-w-0">
                            <p className="text-[10px] text-cyan-400 font-black uppercase tracking-widest">On-Chain Room Verified</p>
                            <p className="text-[9px] font-mono text-white/40 truncate">{currentRoom.creationDigest}</p>
                          </div>
                        </div>
                        <a 
                          href={getExplorerTxUrl(currentRoom.creationDigest)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-[9px] font-black text-white bg-cyan-600 hover:bg-cyan-500 px-3 py-2 uppercase tracking-widest transition-colors flex items-center gap-2"
                        >
                          VIEW_ON_SCAN [{currentRoom.creationDigest.slice(0, 8)}...]
                        </a>
                      </div>
                    )}

                    {/* Node Interface Grid */}
                    <div className="grid grid-cols-5 gap-1 bg-white/5 border border-white/5 p-1 mb-16">
                       {Array.from({ length: currentRoom.maxPlayers }).map((_, i) => {
                         const p = currentRoom.players[i];
                         return (
                           <motion.div
                            key={i}
                            className={`aspect-square border flex flex-col items-center justify-center relative group/p transition-all ${
                              p ? "bg-white/5 border-white/10" : "bg-black/20 border-white/5"
                            }`}
                            whileHover={p ? { scale: 0.98 } : {}}
                           >
                             <div className="absolute top-2 left-2 text-[8px] font-mono text-white/20 uppercase">Seat_{i+1}</div>
                             {p ? (
                               <div className="p-4 flex flex-col items-center">
                                 <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center relative">
                                   <AmongUsSprite colorId={p.colorId} size={64} />
                                   {p.isAIAgent && (
                                     <div className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-cyan-400 text-black text-[8px] font-black shadow-lg">AI</div>
                                   )}
                                 </div>
                                 <div className="mt-4 text-[10px] font-black text-white/40 uppercase tracking-widest truncate max-w-full px-2">
                                   {(p as any).name?.slice(0, 10) || p.address.slice(0, 8)}
                                 </div>
                               </div>
                             ) : (
                               <div className="w-1.5 h-1.5 bg-white/10 rounded-full" />
                             )}
                           </motion.div>
                         );
                       })}
                    </div>

                    {/* Tactical Options */}
                    <div className="space-y-1">
                       {currentRoom.phase === "playing" ? (
                         <div className="bg-rose-500/10 border border-rose-500/20 p-10 flex flex-col sm:flex-row items-center justify-between gap-8">
                            <div className="text-center sm:text-left">
                               <div className="text-rose-500 font-black text-3xl uppercase tracking-tighter mb-2">GAME IN PROGRESS</div>
                               <p className="text-white/30 text-[10px] uppercase font-black tracking-[0.4em] font-mono">Watch the live game and place bets.</p>
                            </div>
                            <Link 
                               href={`/game/${currentRoom.roomId}/live`}
                               className="px-12 py-6 bg-rose-600 text-white text-sm font-black uppercase hover:bg-rose-500 transition-all shadow-[0_20px_40px_rgba(255,0,60,0.2)]"
                            >
                               WATCH LIVE
                            </Link>
                         </div>
                       ) : (
                         <div className="bg-white/5 border border-white/10 p-10 flex flex-col sm:flex-row items-center justify-between gap-8">
                            <div className="text-center sm:text-left">
                             <div className="text-2xl font-black text-white uppercase tracking-tighter mb-2">
                                {currentRoom.players.length >= MIN_PLAYERS ? "ROSTER COMPLETE" : "RECRUITING AGENTS"}
                             </div>
                             <p className="text-white/30 text-[10px] uppercase font-black tracking-[0.4em] font-mono">
                                {currentRoom.players.length >= MIN_PLAYERS ? "All agents are authorized. Mission beginning soon." : `Awaiting ${MIN_PLAYERS - currentRoom.players.length} more specialized agents`}
                             </p>
                            </div>
                            <div className="flex gap-1">
                               {currentRoom.players.length < MIN_PLAYERS ? (
                                 <>
                                   <button
                                    onClick={() => setShowInviteModal(true)}
                                    className="px-8 py-5 bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase hover:bg-white/10 transition-all tracking-widest"
                                   >
                                    INVITE
                                   </button>
                                   <button
                                    onClick={() => onAddAIAgent?.(currentRoom.roomId)}
                                    className="px-8 py-5 bg-cyan-600 text-white text-[10px] font-black uppercase hover:bg-cyan-500 transition-all tracking-widest shadow-[0_0_30px_rgba(34,211,238,0.2)]"
                                   >
                                    DEPLOY AI AGENT
                                   </button>
                                 </>
                               ) : (
                                 currentRoom.creator?.toLowerCase() === currentAddress?.toLowerCase() && (
                                   <button
                                    onClick={onAddAIAgent?.bind(null, currentRoom.roomId)}
                                    className="px-12 py-6 bg-emerald-600 text-white text-sm font-black uppercase hover:bg-emerald-500 transition-all tracking-widest shadow-[0_20px_40px_rgba(16,185,129,0.2)]"
                                   >
                                    START GAME
                                   </button>
                                 )
                               )}
                            </div>
                         </div>
                       )}
                    </div>
                  </div>
                  
                  {/* Predictor Section (Integrated at bottom of scroll) */}
                  {currentRoom.phase === "lobby" && (
                     <div className="p-10 lg:p-14 bg-black/40 flex flex-col items-center justify-center border border-white/5 mt-4">
                        <div className="flex items-center gap-3 mb-6">
                           <div className="h-0.5 w-10 bg-yellow-500" />
                           <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Prediction Market Open</h3>
                        </div>
                        <Link 
                          href={`/game/${currentRoom.roomId}/bet`}
                          className="px-12 py-6 bg-red-600 hover:bg-red-500 text-white text-sm font-black uppercase tracking-[0.2em] transition-all shadow-[0_20px_40px_rgba(255,0,0,0.2)] flex items-center gap-3"
                        >
                          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                          ENTER MARKET FLOOR
                        </Link>
                     </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-20 text-center relative overflow-hidden">
                   <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.05)_0%,transparent_70%)] pointer-events-none" />
                   <motion.div
                    animate={{ y: [0, -20, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    className="mb-14 drop-shadow-[0_0_80px_rgba(34,211,238,0.1)] grayscale opacity-10"
                   >
                     <AmongUsSprite colorId={0} size={180} />
                   </motion.div>
                   <h2 className="text-3xl font-black text-white/20 uppercase tracking-[0.6em] mb-6 leading-none">NO ROOM SELECTED</h2>
                   <p className="max-w-sm text-white/10 text-[10px] font-black leading-loose tracking-[0.3em] uppercase bg-white/5 p-8 border border-white/5">
                     Please select a game room from the explorer on the left to view details.
                   </p>
                </div>
              )}
            </motion.div>

            {/* ─── Right: Signal Feed (0px Radius) ─── */}
            <motion.div
              className="lg:col-span-3 flex flex-col min-h-0 bg-black/40 border-l border-white/5"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
            >
              <header className="px-8 py-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                <div>
                  <h2 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em] mb-2 flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_#ff003c]" />
                    Feed
                  </h2>
                  <div className="text-2xl font-black text-white tracking-tighter uppercase leading-none">
                    Game <span className="text-rose-500">Logs</span>
                  </div>
                </div>
                <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest border border-white/10 px-2 py-1">Verified</span>
              </header>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar font-mono">
                {logs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-10 grayscale py-32">
                     <svg className="w-12 h-12 text-white mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                     </svg>
                     <span className="text-[10px] font-black uppercase tracking-[0.4em]">Loading...</span>
                  </div>
                ) : (
                  [...logs].reverse().map((log, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-5 border flex flex-col gap-3 transition-colors ${
                        log.type === "kill" ? "bg-rose-500/5 border-rose-500/20 shadow-[inset_0_0_20px_rgba(255,0,60,0.05)]" :
                        log.type === "report" ? "bg-yellow-500/5 border-yellow-500/20" :
                        "bg-white/[0.02] border-white/5"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                         <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">{log.type || "PROTOCOL"}</span>
                         <span className="text-[9px] font-mono text-white/20">[{new Date(log.timestamp).toLocaleTimeString().slice(0, 8)}]</span>
                      </div>
                      <p className={`text-[12px] font-bold leading-relaxed tracking-tight ${
                        log.type === "kill" ? "text-rose-400" :
                        log.type === "report" ? "text-yellow-400" :
                        "text-white/70"
                      }`}>
                        {log.message.toUpperCase()}
                      </p>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        </main>

        <InviteModal
          isOpen={showInviteModal && !!userRoom}
          roomId={userRoom?.roomId ?? ""}
          onClose={() => setShowInviteModal(false)}
        />

        {/* Global Footer Overlay */}
        <div className="fixed bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-cyan-400 to-red-600 opacity-20" />
      </div>
    </SpaceBackground>
  );
}
