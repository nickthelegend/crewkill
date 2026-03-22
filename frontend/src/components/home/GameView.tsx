"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  AmongUsSprite,
  ScrollableMap,
  TaskBar,
  GameLogPanel,
} from "@/components/game";
import { ConnectWallet } from "@/components/wallet/ConnectWallet";
import { OperatorKeyPanel } from "@/components/operator/OperatorKeyPanel";
import { useState, useEffect } from "react";
import {
  Player,
  GameLog,
  DeadBody,
  LocationNames,
  PlayerColors,
} from "@/types/game";
import type { RoomState } from "@/hooks/useGameServer";
import { InviteModal } from "./InviteModal";
import { PredictionMarket } from "@/components/game/PredictionMarket";

export interface GameViewProps {
  players: Player[];
  deadBodies: DeadBody[];
  logs: GameLog[];
  currentRoom: RoomState | null;
  currentPlayer: `0x${string}` | undefined;
  tasksCompleted: number;
  totalTasks: number;
  isConnected: boolean;
  spotlightedPlayer: `0x${string}` | null;
  onSpotlightPlayer: (address: `0x${string}` | null) => void;
  selectedAgentInfo: `0x${string}` | null;
  onSelectAgentInfo: (address: `0x${string}` | null) => void;
  showInviteModal: boolean;
  onShowInviteModal: (show: boolean) => void;
  onBack: () => void;
  gameObjectId?: string;
  marketObjectId?: string;
  gamePhase?: number;
  actualImpostors?: string[];
}

export function GameView({
  players,
  deadBodies,
  logs,
  currentRoom,
  currentPlayer,
  tasksCompleted,
  totalTasks,
  isConnected,
  spotlightedPlayer,
  onSpotlightPlayer,
  selectedAgentInfo,
  onSelectAgentInfo,
  showInviteModal,
  onShowInviteModal,
  onBack,
  gameObjectId,
  marketObjectId,
  gamePhase = 0,
  actualImpostors = [],
}: GameViewProps) {
  // Persistence layer to prevent HUD flickering during WebSocket blips
  const [stablePlayers, setStablePlayers] = useState<Player[]>(players);
  const [stableRoom, setStableRoom] = useState<RoomState | null>(currentRoom);

  useEffect(() => {
    if (players.length > 0) setStablePlayers(players);
    if (currentRoom) setStableRoom(currentRoom);
  }, [players, currentRoom]);

  // Use stable data for rendering
  const activePlayers = stablePlayers;
  const activeRoom = stableRoom;

  return (
    <div key="game" className="fixed inset-0 bg-black font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Fullscreen Map */}
      <ScrollableMap
        players={activePlayers}
        deadBodies={deadBodies}
        currentPlayer={currentPlayer || ("0x0" as `0x${string}`)}
        onPlayerMove={() => {}} // Spectators don't move
        spotlightedPlayer={spotlightedPlayer}
        onSpotlightPlayer={onSpotlightPlayer}
      />

      {/* ─── HUD OVERLAY ─── */}
      <div className="fixed inset-0 pointer-events-none z-40">
        
        {/* Top Header Bar */}
        <div className="p-6 flex items-start justify-between w-full">
           <div className="pointer-events-auto flex items-center gap-4">
              <button 
                onClick={onBack}
                className="w-12 h-12 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all text-white/50 hover:text-white"
              >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
              </button>
              <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-3 flex items-center gap-3">
                 <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"}`} />
                 <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{isConnected ? "SYNCED" : "DESYNC"}</span>
                 <div className="h-4 w-px bg-white/10 mx-1" />
                 <span className="text-sm font-black text-white uppercase italic tracking-tighter">
                   {activeRoom?.roomId || "ORBIT_01"}
                 </span>
              </div>
           </div>

           <div className="pointer-events-auto flex flex-col items-center">
              <TaskBar completed={tasksCompleted} total={totalTasks} />
              <div className="mt-2 text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">Current Tasks</div>
           </div>

           <div className="pointer-events-auto flex items-center gap-3">
              {activeRoom && (
                <button
                  onClick={() => onShowInviteModal(true)}
                  className="px-6 py-3 rounded-2xl bg-cyan-400 text-black text-xs font-black uppercase tracking-widest hover:bg-cyan-300 transition-all shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                >
                  ADD PLAYER
                </button>
              )}
              <ConnectWallet />
           </div>
        </div>

        {/* ─── SIDEBAR (Right) ─── */}
        <div className="absolute top-24 right-6 bottom-24 w-72 flex flex-col gap-4">
            
            {/* PRIZE POOL */}
            {activeRoom?.wagerAmount && activePlayers.length > 0 && (
              <motion.div 
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="bg-gradient-to-br from-yellow-400/20 to-amber-600/5 backdrop-blur-3xl rounded-[2rem] p-6 border border-yellow-400/20 pointer-events-auto"
              >
                  <div className="text-[9px] font-black text-yellow-400/40 uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-yellow-400" /> TOTAL POT
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-yellow-400 italic tracking-tighter leading-none">
                      {(Number(activeRoom.wagerAmount) * activePlayers.length / 1e18).toFixed(3)}
                    </span>
                    <span className="text-xs font-black text-yellow-400/40 uppercase tracking-widest">OCT</span>
                  </div>
              </motion.div>
            )}

            {/* AGENT ROSTER */}
            <motion.div 
               initial={{ x: 50, opacity: 0 }}
               animate={{ x: 0, opacity: 1 }}
               transition={{ delay: 0.1 }}
               className="h-[45%] bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] overflow-hidden flex flex-col pointer-events-auto"
            >
               <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Active Agents</span>
                  <span className="text-[10px] font-black text-emerald-400/60 uppercase">{activePlayers.filter(p => p.isAlive).length}/{activePlayers.length}</span>
               </div>
               
               <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                  <div className="space-y-1">
                    {activePlayers.map((player) => {
                      const isSpotlighted = player.address === spotlightedPlayer;
                      const isInfoOpen = player.address === selectedAgentInfo;
                      return (
                        <div key={player.address} className="relative group">
                          <button
                            onClick={() => {
                              if (player.isAlive) {
                                onSpotlightPlayer(isSpotlighted ? null : player.address);
                              }
                              onSelectAgentInfo(isInfoOpen ? null : player.address);
                            }}
                            className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
                              !player.isAlive ? "opacity-30 grayscale" : "hover:bg-white/5"
                            } ${isSpotlighted ? "bg-cyan-500/10 border border-cyan-500/30 ring-1 ring-cyan-500/20" : "border border-transparent"}`}
                          >
                            <div className="relative">
                              <AmongUsSprite colorId={player.colorId} size={32} showShadow={false} />
                              {isSpotlighted && (
                                <motion.div 
                                  layoutId="spotlight"
                                  className="absolute -inset-1 rounded-lg border border-cyan-400 animate-pulse pointer-events-none" 
                                />
                              )}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-black text-white truncate uppercase tracking-tight">
                                  {PlayerColors[player.colorId]?.name || `Agent ${player.colorId}`}
                                </span>
                                {!player.isAlive && <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest bg-rose-500/10 px-1.5 py-0.5 rounded">Terminated</span>}
                              </div>
                              <div className="text-[9px] text-white/30 font-mono flex items-center gap-1.5 mt-0.5">
                                 <div className="w-1 h-1 rounded-full bg-white/20" />
                                 {LocationNames[player.location] || "Unknown Sect"}
                              </div>
                            </div>
                          </button>

                          {/* Agent Info Details */}
                          <AnimatePresence>
                            {isInfoOpen && (
                              <motion.div
                                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                                animate={{ opacity: 1, height: "auto", scale: 1 }}
                                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                                className="mx-2 mb-2 p-4 bg-black/60 rounded-2xl border border-white/5 overflow-hidden"
                              >
                                <div className="space-y-3 font-mono text-[9px] uppercase tracking-wider">
                                   <div className="flex justify-between border-b border-white/5 pb-2">
                                      <span className="text-white/30">Identifier:</span>
                                      <span className="text-cyan-400">{player.address.slice(0, 10)}...</span>
                                   </div>
                                   <div className="flex justify-between border-b border-white/5 pb-2">
                                      <span className="text-white/30">Status:</span>
                                      <span className={player.isAlive ? "text-emerald-400" : "text-rose-500"}>{player.isAlive ? "Active" : "Offline"}</span>
                                   </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
               </div>
            </motion.div>

            {/* MISSION LOGS (Moved from bottom) */}
            <motion.div
               initial={{ x: 50, opacity: 0 }}
               animate={{ x: 0, opacity: 1 }}
               transition={{ delay: 0.15 }}
               className="flex-1 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] overflow-hidden flex flex-col pointer-events-auto min-h-[200px]"
            >
               <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                  <span className="text-[10px] font-black text-rose-500/60 uppercase tracking-[0.2em]">Mission Logs</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-tighter">{deadBodies.length} LOST</span>
                    <div className="w-1 h-1 rounded-full bg-rose-500 animate-pulse" />
                  </div>
               </div>
               <div className="flex-1 p-3 overflow-hidden">
                  <GameLogPanel logs={logs} maxHeight="100%" />
               </div>
            </motion.div>

            {/* PREDICTION MARKET INTEGRATION */}
            {gameObjectId && marketObjectId && (
               <motion.div
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="pointer-events-auto"
               >
                 <PredictionMarket
                   gameId={gameObjectId}
                   marketObjectId={marketObjectId}
                   gamePlayers={activePlayers.map((p) => ({
                     address: p.address,
                     name: `Agent ${p.address.slice(0, 6)}...${p.address.slice(-4)}`,
                   }))}
                   isResolved={gamePhase === 7} // PHASE_ENDED is 7 in aligned Move
                   actualImpostors={actualImpostors}
                   gamePhase={gamePhase}
                 />
               </motion.div>
            )}
        </div>

        {/* ─── BOTTOM HUD ─── */}
        <div className="absolute bottom-6 left-6 right-80 flex items-end justify-between pointer-events-none">
           <div className="pointer-events-auto">
              <OperatorKeyPanel />
           </div>
           
           {/* Simple Status Indicator */}
           <div className="flex items-center gap-4 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-2xl px-6 py-3">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Telemetry</span>
                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest italic">Stable</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="text-right">
                <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Latent Signals</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-black text-white italic tracking-tighter">0.42</span>
                  <span className="text-[8px] font-black text-white/40 uppercase">ms</span>
                </div>
              </div>
           </div>
        </div>

      </div>

      {/* Game Invite Modal */}
      <InviteModal
        isOpen={showInviteModal && !!activeRoom}
        roomId={activeRoom?.roomId ?? ""}
        onClose={() => onShowInviteModal(false)}
      />
    </div>
  );
}
