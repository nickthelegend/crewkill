"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AmongUsSprite,
  SpaceBackground,
  AgentCard,
  PredictWinner,
} from "@/components/game";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { OperatorKeyPanel } from "@/components/operator/OperatorKeyPanel";
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
      <div className="min-h-screen flex flex-col relative" style={{ zIndex: 10 }}>
        {/* ─── Top Nav ─── */}
        <motion.nav
          className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-black/40 backdrop-blur-md border-b border-white/[0.06]"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Left — Back + Status */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="group flex items-center gap-1.5 text-white/50 hover:text-white transition-all text-xs font-semibold"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Back</span>
            </button>

            <div className="w-px h-4 bg-white/10" />

            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
              isConnected
                ? "bg-emerald-500/15 border border-emerald-500/25 text-emerald-400"
                : "bg-red-500/15 border border-red-500/25 text-red-400"
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
              {isConnected ? "LIVE" : "OFFLINE"}
            </div>

            <span className="hidden md:inline text-[11px] text-white/30 font-mono">
              {allActiveRooms.length} room{allActiveRooms.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Center — Title */}
          <h1 className="hidden sm:block text-sm md:text-base font-black text-white/90 tracking-tight uppercase">
            Operation <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Lobby</span>
          </h1>

          {/* Right — Actions */}
          <div className="flex items-center gap-2">
            <ConnectButton />
          </div>
        </motion.nav>

        {/* ─── Main Content ─── */}
        <div className="flex-1 p-4 sm:p-5 min-h-0 overflow-hidden">
          <div className="max-w-6xl mx-auto h-full grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">

            {/* ─── Left: Room List ─── */}
            <motion.div
              className="lg:col-span-4 flex flex-col min-h-0"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden flex flex-col flex-1 min-h-0">
                {/* Header */}
                <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                  <div>
                    <h2 className="text-xs font-bold text-white/90 uppercase tracking-wider">Rooms</h2>
                    <p className="text-[10px] text-white/30 mt-0.5">{allActiveRooms.length} active</p>
                  </div>
                  {!hasActiveRoom && (
                    isAuthenticated ? (
                      <motion.button
                        onClick={onCreateRoom}
                        className="px-3 py-1.5 rounded-lg bg-white/90 text-gray-900 text-[10px] font-bold uppercase tracking-wide hover:bg-white transition-colors"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        + New Room
                      </motion.button>
                    ) : (
                      <button
                        onClick={onLogin}
                        className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white/50 text-[10px] font-bold uppercase tracking-wide hover:bg-white/[0.1] transition-colors"
                      >
                        Login to Create
                      </button>
                    )
                  )}
                </div>

                {/* Room List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar min-h-0">
                  {allActiveRooms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <motion.div
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="mb-4"
                      >
                        <AmongUsSprite colorId={3} size={48} />
                      </motion.div>
                      <p className="text-white/30 text-xs font-medium">No rooms yet</p>
                      <p className="text-white/15 text-[10px] mt-1">Create one to get started</p>
                    </div>
                  ) : (
                    allActiveRooms.map((room) => {
                      const isPlaying = room.phase === "playing";
                      const isSelected = currentRoom?.roomId === room.roomId;
                      const isYours = room.creator?.toLowerCase() === currentAddress?.toLowerCase();

                      return (
                        <motion.button
                          key={room.roomId}
                          onClick={() => onJoinRoom(room.roomId)}
                          className={`w-full text-left p-3.5 rounded-xl border transition-all relative overflow-hidden group ${
                            isSelected
                              ? "bg-cyan-500/[0.08] border-cyan-500/30 shadow-[0_0_15px_-5px_rgba(6,182,212,0.2)]"
                              : isPlaying
                              ? "bg-red-500/[0.04] border-red-500/15 hover:bg-red-500/[0.08] hover:border-red-500/25"
                              : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.1]"
                          }`}
                          whileHover={{ x: 3 }}
                          whileTap={{ scale: 0.99 }}
                        >
                          {/* Left accent bar */}
                          <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-full transition-opacity ${
                            isSelected ? "bg-cyan-400 opacity-80" : isPlaying ? "bg-red-500 opacity-40 group-hover:opacity-70" : "bg-white opacity-0 group-hover:opacity-10"
                          }`} />

                          <div className="flex items-center justify-between mb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white/90 font-mono tracking-tight">{room.roomId}</span>
                              {isYours && (
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/20">YOU</span>
                              )}
                            </div>
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                              isPlaying
                                ? "bg-red-500/15 text-red-400 border border-red-500/20"
                                : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                            }`}>
                              {isPlaying ? "Playing" : "Lobby"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              {room.players.slice(0, 5).map((p, i) => (
                                <div key={i} className="w-6 h-6 bg-white/[0.06] rounded-md p-0.5">
                                  <AmongUsSprite colorId={p.colorId} size={20} />
                                </div>
                              ))}
                              {room.players.length > 5 && (
                                <span className="text-[10px] text-white/40 font-bold ml-0.5">+{room.players.length - 5}</span>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-[11px] font-bold text-white/60 font-mono">
                                {room.players.length}/{room.maxPlayers}
                              </div>
                              {room.wagerAmount && room.players.length > 0 && (
                                <div className="text-[9px] font-bold text-yellow-400/70 font-mono">
                                  {(Number(room.wagerAmount) * room.players.length / 1e18).toFixed(2)} ETH
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.button>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>

            {/* ─── Center: Room Detail ─── */}
            <motion.div
              className="lg:col-span-5 flex flex-col min-h-0"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden flex-1 flex flex-col min-h-0">
                {/* Header */}
                <div className={`px-5 py-4 border-b flex items-center justify-between ${
                  currentRoom ? "border-cyan-500/20 bg-cyan-500/[0.04]" : "border-white/[0.06]"
                }`}>
                  <h2 className="text-sm font-bold text-white/90">
                    {currentRoom ? (
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        Room {currentRoom.roomId}
                      </span>
                    ) : "Room Details"}
                  </h2>
                  {currentRoom && (
                    <span className="text-[10px] font-bold text-white/40 font-mono uppercase">
                      {currentRoom.phase}
                    </span>
                  )}
                </div>

                <div className="flex-1 p-5">
                  <AnimatePresence mode="wait">
                    {currentRoom ? (
                      <motion.div
                        key={currentRoom.roomId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        {/* Prize Pool */}
                        {currentRoom.wagerAmount && currentRoom.players.length > 0 && (
                          <div className="mb-5 bg-gradient-to-r from-yellow-500/[0.08] to-amber-500/[0.06] border border-yellow-500/20 rounded-xl p-4 text-center">
                            <div className="text-[9px] text-yellow-400/60 uppercase tracking-widest mb-1">Prize Pool</div>
                            <div className="text-2xl font-black text-yellow-400 tabular-nums">
                              {(Number(currentRoom.wagerAmount) * currentRoom.players.length / 1e18).toFixed(2)} ETH
                            </div>
                            <div className="text-[10px] text-white/30 mt-1">
                              {currentRoom.players.length} x {(Number(currentRoom.wagerAmount) / 1e18).toFixed(2)} ETH
                            </div>
                          </div>
                        )}

                        {/* Players Grid */}
                        <div className="mb-5">
                          <div className="text-xs text-white/40 mb-3 flex items-center justify-between">
                            <span>Players</span>
                            <span className="font-mono font-bold text-white/60">{currentRoom.players.length}/{currentRoom.maxPlayers}</span>
                          </div>
                          <div className={`grid gap-2 ${currentRoom.maxPlayers > 9 ? "grid-cols-4 sm:grid-cols-5" : "grid-cols-3"}`}>
                            {Array.from({ length: currentRoom.maxPlayers }).map((_, i) => {
                              const player = currentRoom.players[i];
                              return (
                                <motion.div
                                  key={i}
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ delay: i * 0.03 }}
                                  className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-all ${
                                    player
                                      ? "bg-white/[0.06] border border-white/[0.08]"
                                      : "bg-white/[0.02] border border-dashed border-white/[0.06]"
                                  }`}
                                >
                                  {player ? (
                                    <>
                                      <div className="w-8 h-8 mb-0.5 relative">
                                        <AmongUsSprite colorId={player.colorId} size={32} />
                                        {player.address.startsWith("0xAI") && (
                                          <span className="absolute -top-1 -right-1 px-1 py-0.5 rounded text-[6px] font-bold bg-purple-500/30 text-purple-300 border border-purple-500/30 leading-none">
                                            AI
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[9px] text-white/50 font-medium">
                                        {PlayerColors[player.colorId]?.name || `P${i + 1}`}
                                      </div>
                                    </>
                                  ) : (
                                    <div className="text-white/10 text-lg">?</div>
                                  )}
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>

                        {/* AI Agents Detail Section */}
                        {currentRoom.players.some(p => p.isAIAgent) && (
                          <div className="mb-5">
                            <div className="text-xs text-white/40 mb-3 flex items-center gap-2">
                              <span>AI Agents</span>
                              <div className="flex-1 h-px bg-gradient-to-r from-purple-500/20 to-transparent" />
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {currentRoom.players
                                .filter(p => p.isAIAgent)
                                .map((player, idx) => (
                                  <AgentCard key={player.address} player={player} index={idx} />
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Prediction System */}
                        {currentRoom.players.length >= MIN_PLAYERS && (
                          <div className="mb-5">
                            <PredictWinner
                              onPredict={(team) => console.log("Predicted:", team)}
                              disabled={currentRoom.phase !== "lobby"}
                            />
                          </div>
                        )}

                        {/* Status */}
                        {currentRoom.phase === "playing" ? (
                          <div className="p-4 bg-red-500/[0.08] rounded-xl border border-red-500/20 text-center">
                            <div className="text-red-400 font-bold text-sm mb-1">Game in Progress</div>
                            <div className="text-xs text-white/40">Watch the action unfold</div>
                          </div>
                        ) : currentRoom.players.length >= MIN_PLAYERS ? (
                          <div className="p-4 bg-emerald-500/[0.08] rounded-xl border border-emerald-500/20 text-center">
                            <div className="text-emerald-400 font-bold text-sm mb-1 animate-pulse">Starting Soon</div>
                            <div className="text-xs text-white/40">Game will auto-start</div>
                          </div>
                        ) : (
                          <div className="p-4 bg-white/[0.03] rounded-xl border border-white/[0.06] flex flex-col items-center">
                            <div className="text-white/50 text-sm mb-3">
                              Waiting for {MIN_PLAYERS - currentRoom.players.length} more agent{MIN_PLAYERS - currentRoom.players.length !== 1 ? "s" : ""}
                            </div>
                            {currentRoom.creator?.toLowerCase() === currentAddress?.toLowerCase() && (
                              <div className="flex flex-col items-center gap-2 mb-3">
                                <button
                                  onClick={() => setShowInviteModal(true)}
                                  className="px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-[10px] font-bold uppercase tracking-wider transition-all hover:bg-cyan-500/20"
                                >
                                  Invite Agents
                                </button>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => onAddAIAgent?.(currentRoom.roomId)}
                                    disabled={currentRoom.players.length >= currentRoom.maxPlayers}
                                    className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/25 text-purple-400 text-[10px] font-bold uppercase tracking-wider transition-all hover:bg-purple-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    + AI Agent
                                  </button>
                                  <button
                                    onClick={() => onRemoveAIAgent?.(currentRoom.roomId)}
                                    disabled={!currentRoom.players.some(p => p.address.startsWith("0xAI"))}
                                    className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-[10px] font-bold uppercase tracking-wider transition-all hover:bg-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    - AI Agent
                                  </button>
                                </div>
                              </div>
                            )}
                            <div className="flex gap-1.5">
                              {[0, 1, 2].map((i) => (
                                <motion.div
                                  key={i}
                                  className="w-1.5 h-1.5 bg-cyan-400/50 rounded-full"
                                  animate={{ opacity: [0.3, 1, 0.3] }}
                                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Operator Key */}
                        <div className="mt-4">
                          <OperatorKeyPanel silent />
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center h-full py-16 text-center"
                      >
                        <motion.div
                          animate={{ y: [0, -8, 0], rotate: [0, 5, 0, -5, 0] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                          className="mb-5"
                        >
                          <AmongUsSprite colorId={7} size={56} />
                        </motion.div>
                        <p className="text-white/40 text-sm font-medium mb-1">Select a room</p>
                        <p className="text-white/20 text-xs">Click any room from the list to preview it</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>

            {/* ─── Right: Activity Log ─── */}
            <motion.div
              className="lg:col-span-3 flex flex-col min-h-0"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden flex-1 flex flex-col min-h-0">
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                  <h2 className="text-xs font-bold text-white/80 uppercase tracking-wider">Activity</h2>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-[10px] text-white/30 font-medium">Live</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 min-h-0">
                  {logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-8 h-8 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-2">
                        <svg className="w-4 h-4 text-white/15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-white/20 text-xs">Waiting for activity</p>
                      <p className="text-white/10 text-[10px] mt-0.5">Join a room to see live events</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {logs.map((log, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-white/[0.03] transition-colors"
                        >
                          <span className="text-white/20 text-[10px] font-mono flex-shrink-0 mt-0.5">
                            {new Date(log.timestamp).toLocaleTimeString().slice(0, 5)}
                          </span>
                          <span className={`text-xs leading-relaxed ${
                            log.type === "kill" ? "text-red-400/80" :
                            log.type === "report" ? "text-yellow-400/80" :
                            log.type === "vote" || log.type === "eject" ? "text-orange-400/80" :
                            "text-white/50"
                          }`}>
                            {log.message}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Invite Modal */}
        <InviteModal
          isOpen={showInviteModal && !!userRoom}
          roomId={userRoom?.roomId ?? ""}
          onClose={() => setShowInviteModal(false)}
        />
      </div>
    </SpaceBackground>
  );
}
