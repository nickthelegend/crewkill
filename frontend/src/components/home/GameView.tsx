"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  AmongUsSprite,
  ScrollableMap,
  TaskBar,
} from "@/components/game";
import { ConnectWallet } from "@/components/wallet/ConnectWallet";
import { useState, useEffect, useRef } from "react";
import {
  Player,
  GameLog,
  DeadBody,
  LocationNames,
  PlayerColors,
  GamePhase,
} from "@/types/game";
import type { RoomState } from "@/hooks/useGameServer";
import { InviteModal } from "./InviteModal";
import { PredictionMarket } from "@/components/game/PredictionMarket";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

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
  activeSabotage?: number;
  actualImpostors?: string[];
}

const logIcons: Record<string, string> = {
  kill: "☠️",
  report: "🚨",
  meeting: "📢",
  vote: "🗳️",
  eject: "🚀",
  task: "✅",
  sabotage: "⚡",
  join: "👤",
  start: "🎮",
};

const logBorders: Record<string, string> = {
  kill: "border-l-red-500",
  report: "border-l-yellow-500",
  meeting: "border-l-blue-500",
  vote: "border-l-purple-500",
  eject: "border-l-orange-500",
  task: "border-l-emerald-500",
  sabotage: "border-l-red-400",
  join: "border-l-cyan-500",
  start: "border-l-green-400",
  move: "border-l-gray-400",
};

// Helper function to colorize player references in logs
function renderLogMessage(log: GameLog, players: Player[]) {
  let msg = log.message;
  let parsedElements = [];
  
  // Quick check if there's any substitution
  const hasAddr = log.address && players.some(p => p.address === log.address);
  const hasTarget = log.targetAddress && players.some(p => p.address === log.targetAddress);

  if (!hasAddr && !hasTarget) return msg;

  let player = hasAddr ? players.find(p => p.address === log.address) : null;
  let target = hasTarget ? players.find(p => p.address === log.targetAddress) : null;

  if (player) {
    const shortAddr = `${player.address.slice(0,8)}...`;
    msg = msg.replace(shortAddr, `[PLAYER_${player.colorId}]`);
  }
  if (target) {
    const targetShortAddr = `${target.address.slice(0,8)}...`;
    msg = msg.replace(targetShortAddr, `[PLAYER_${target.colorId}]`);
  }

  const parts = msg.split(/(\[PLAYER_\d+\])/);
  return parts.map((part, i) => {
    const match = part.match(/\[PLAYER_(\d+)\]/);
    if (match) {
      const colorId = parseInt(match[1]);
      const colorData = PlayerColors[colorId];
      if (!colorData) return <span key={i}>{part}</span>;
      return (
        <span key={i} className="font-extrabold px-1 rounded mx-0.5 whitespace-nowrap" style={{ color: colorData.light, backgroundColor: `${colorData.hex}33`, border: `1px solid ${colorData.hex}66` }}>
          {colorData.name}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
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
  activeSabotage = 0,
  actualImpostors = [],
}: GameViewProps) {
  // Persistence layer to prevent HUD flickering during WebSocket blips
  const [stablePlayers, setStablePlayers] = useState<Player[]>(players);
  const [stableRoom, setStableRoom] = useState<RoomState | null>(currentRoom);
  const logEndRef = useRef<HTMLDivElement>(null);
  const [sidebarTab, setSidebarTab] = useState<"agents" | "logs" | "market">("agents");

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (sidebarTab === "logs" && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, sidebarTab]);

  useEffect(() => {
    if (players.length > 0) setStablePlayers(players);
    if (currentRoom) setStableRoom(currentRoom);
  }, [players, currentRoom]);

  // Auto-scroll logs
  useEffect(() => {
    if (sidebarTab === "logs") {
      logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, sidebarTab]);

  // Use stable data for rendering — deduplicate by address
  const activePlayers = Array.from(
    new Map(stablePlayers.map(p => [p.address, p])).values()
  );
  const activeRoom = stableRoom;
  const currentPhaseValue = gamePhase || activeRoom?.detailedPhase || (activeRoom?.phase === 'boarding' ? 1 : activeRoom?.phase === 'playing' ? 2 : activeRoom?.phase === 'ended' ? 7 : 0);
  
  const aliveCount = activePlayers.filter(p => p.isAlive).length;
  const deadCount = activePlayers.length - aliveCount;
  const isEnded = currentPhaseValue === 7;
  const isBoarding = currentPhaseValue === 1;
  const isVoting = currentPhaseValue === 5;
  const isDiscussion = currentPhaseValue === 4;
  const isEjection = currentPhaseValue === 6;

  // Countdown timer for boarding phase
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if ((!isBoarding && !isVoting && !isDiscussion) || !activeRoom?.startedAt) {
      setTimeLeft(null);
      return;
    }

    // Boarding is 3 mins, others use 30s based on metadata from useGameServer or hardcoded
    // For now use a simple check
    let targetTime = activeRoom.startedAt + 180000; // 3 mins default for boarding
    
    if (isVoting || isDiscussion) {
      targetTime = activeRoom.startedAt + 30000; // 30s for meetings
    }
    
    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isBoarding, isVoting, isDiscussion, activeRoom?.startedAt]);

  // Convex bets data for the predictions tab
  const convexBets = useQuery(api.bets.getBetsByGame, gameObjectId ? { gameId: gameObjectId } : "skip") || [];
  const totalBetAmount = convexBets.reduce((sum: number, b: any) => sum + b.amountMist, 0);

  return (
    <div key="game" className="fixed inset-0 bg-black font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Boarding Phase Overlay */}
      <AnimatePresence>
        {isBoarding && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="relative bg-black/80 border border-cyan-500/30 rounded-3xl p-12 text-center max-w-lg shadow-[0_0_50px_rgba(6,182,212,0.1)] pointer-events-auto"
            >
              <div className="flex justify-center gap-4 mb-8">
                {activePlayers.slice(0, 5).map((p, i) => (
                  <motion.div
                    key={p.address}
                    animate={{ y: [0, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 2, delay: i * 0.2 }}
                  >
                    <AmongUsSprite colorId={p.colorId} size={40} />
                  </motion.div>
                ))}
              </div>
              <h2 className="text-4xl font-black text-white mb-2 tracking-tighter italic uppercase">Game Starting Soon</h2>
              <p className="text-cyan-400/60 text-xs font-black uppercase tracking-[0.4em] mb-8">Boarding Phase Active</p>
              
              <div className="flex flex-col items-center">
                <div className="text-6xl font-black text-white font-mono tabular-nums mb-2">
                  {timeLeft !== null ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}` : "0:00"}
                </div>
                <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-cyan-500"
                    initial={{ width: "100%" }}
                    animate={{ width: timeLeft !== null ? `${(timeLeft / 180) * 100}%` : "0%" }}
                    transition={{ duration: 1, ease: "linear" }}
                  />
                </div>
                <p className="mt-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] max-w-xs">
                  Placing bets is open. The mission will begin once the timer reaches zero.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Voting & Discussion Phase Overlay */}
        {(isVoting || isDiscussion || isEjection) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
          >
            <div className="absolute inset-0 bg-red-950/60 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="relative bg-black/90 border border-red-500/50 rounded-3xl p-8 text-center max-w-2xl shadow-[0_0_80px_rgba(239,68,68,0.2)] pointer-events-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                  <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                    {isDiscussion ? "Meeting: Discussion" : isVoting ? "Meeting: Voting" : "Meeting: Ejection"}
                  </h2>
                </div>
                <div className="text-3xl font-black text-red-500 font-mono tabular-nums">
                  {timeLeft !== null ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}` : "0:00"}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                {activePlayers.map((p) => (
                  <div 
                    key={p.address}
                    className={`relative p-4 rounded-2xl border transition-all ${
                      p.isAlive 
                        ? 'bg-white/5 border-white/10' 
                        : 'bg-black/40 border-white/5 opacity-50'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <AmongUsSprite colorId={p.colorId} size={32} isAlive={p.isAlive} />
                      <p className="text-[10px] font-black text-white/80 uppercase truncate w-full text-center">
                        {p.name}
                      </p>
                      {p.hasVoted && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 bg-green-500 text-black rounded-full p-1"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                          </svg>
                        </motion.div>
                      )}
                    </div>
                  </div>
                ))}

              </div>

              <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">
                {isDiscussion ? "Gathering intelligence. Prepare to vote soon." : 
                 isVoting ? "Cast your votes now. Majority decides the fate." :
                 "The results are in. Someone is going into space."}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Map */}
      <ScrollableMap
        players={activePlayers}
        deadBodies={deadBodies}
        currentPlayer={currentPlayer || ("0x0" as `0x${string}`)}
        onPlayerMove={() => {}} // Spectators don't move
        spotlightedPlayer={spotlightedPlayer}
        onSpotlightPlayer={onSpotlightPlayer}
        activeSabotage={activeSabotage}
        gamePhase={gamePhase}
      />

      {/* ─── HUD OVERLAY ─── */}
      <div className="fixed inset-0 pointer-events-none z-40">
        
        {/* Top Header Bar */}
        <div className="p-4 mt-16 flex flex-col w-full gap-4 pointer-events-none">
           {/* Primary Header Row */}
           <div className="flex items-start justify-between w-full">
             <div className="pointer-events-auto flex flex-wrap items-center gap-3">
                <button 
                  onClick={onBack}
                  className="w-10 h-10 rounded-xl bg-black/60 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all text-white/50 hover:text-white"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-2 flex items-center gap-3">
                   <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"}`} />
                   <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">{isConnected ? "LIVE" : "OFFLINE"}</span>
                   <div className="h-4 w-px bg-white/10" />
                    <span className="text-[10px] font-black text-white uppercase tracking-wider">
                      #{(activeRoom?.roomId || "LOBBY").slice(-6).toUpperCase()}
                    </span>
                </div>
                {/* Phase indicator */}
                <div className={`bg-black/60 backdrop-blur-xl border rounded-xl px-4 py-2 ${isEnded ? "border-red-500/30" : "border-cyan-500/30"}`}>
                  <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isEnded ? "text-red-400" : "text-cyan-400"}`}>
                    {isEnded ? "GAME OVER" : gamePhase >= 4 ? "MEETING" : gamePhase >= 2 ? "ACTION" : "WAITING"}
                  </span>
                </div>
             </div>

             {/* Right: Stats */}
             <div className="pointer-events-auto flex items-center gap-3">
                <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-2 flex items-center gap-3 hidden sm:flex">
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] font-black text-white/20 uppercase">ALIVE</span>
                    <span className="text-lg font-black text-emerald-400 leading-none">{aliveCount}</span>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] font-black text-white/20 uppercase">DEAD</span>
                    <span className="text-lg font-black text-red-400 leading-none">{deadCount}</span>
                  </div>
                </div>
                <ConnectWallet />
             </div>
           </div>

           {/* Secondary Header Row: Task Bar (Top Left below headers) */}
           <div className="pointer-events-auto flex flex-col items-start mt-2 ml-1">
              <TaskBar completed={tasksCompleted} total={totalTasks} />
              <div className="mt-2 text-[10px] font-black text-white/60 uppercase tracking-[0.3em]">
                Tasks Progress: {tasksCompleted}/{totalTasks}
              </div>
           </div>
        </div>

        {/* ─── RIGHT SIDEBAR ─── */}
        <div className="absolute top-20 right-4 bottom-4 w-80 flex flex-col pointer-events-auto">
          {/* Tab Switcher */}
          <div className="flex mb-2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
            {([
              { id: "agents" as const, label: "Players", icon: "👥" },
              { id: "logs" as const, label: "Logs", icon: "📡" },
              { id: "market" as const, label: "Bets", icon: "📊" },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setSidebarTab(tab.id)}
                className={`flex-1 py-2.5 text-[9px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-1.5 ${
                  sidebarTab === tab.id 
                    ? "bg-white/10 text-white border-b-2 border-cyan-400" 
                    : "text-white/30 hover:text-white/60 hover:bg-white/5"
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
                {tab.id === "logs" && logs.length > 0 && (
                  <span className="w-4 h-4 bg-red-500/80 rounded-full text-[7px] flex items-center justify-center text-white">{Math.min(logs.length, 99)}</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden flex flex-col">
            
            {/* ─── AGENTS TAB ─── */}
            {sidebarTab === "agents" && (
              <>
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                  <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Player Status</span>
                  <span className="text-[9px] font-black text-emerald-400/60">{aliveCount}/{activePlayers.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                  <div className="space-y-1">
                    {activePlayers.map((player) => {
                      const isSpotlighted = player.address === spotlightedPlayer;
                      const isDead = !player.isAlive;
                      return (
                        <button
                          key={player.address}
                          onClick={() => {
                            if (player.isAlive) onSpotlightPlayer(isSpotlighted ? null : player.address);
                            onSelectAgentInfo(selectedAgentInfo === player.address ? null : player.address);
                          }}
                          className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl transition-all ${
                            isDead ? "opacity-40 grayscale" : "hover:bg-white/5"
                          } ${isSpotlighted ? "bg-cyan-500/10 border border-cyan-500/30" : "border border-transparent"}`}
                        >
                          <div className="relative flex-shrink-0">
                            <AmongUsSprite colorId={player.colorId} size={28} showShadow={false} isGhost={isDead} />
                            {isDead && (
                              <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center text-[6px]">💀</div>
                            )}
                            {isSpotlighted && (
                              <motion.div 
                                layoutId="spotlight"
                                className="absolute -inset-1 rounded-lg border border-cyan-400 animate-pulse pointer-events-none" 
                              />
                            )}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-black text-white truncate uppercase">
                                {PlayerColors[player.colorId]?.name || `Agent ${player.colorId}`}
                              </span>
                              {(player as any).isAIAgent && (
                                <span className="text-[7px] bg-cyan-500/20 text-cyan-400 px-1 py-0.5 rounded font-black">AI</span>
                              )}
                              {isEnded && player.role === 2 && (
                                <span className="text-[7px] bg-red-500/30 text-red-400 px-1 py-0.5 rounded font-black animate-pulse">IMP</span>
                              )}
                            </div>
                            <div className="text-[8px] text-white/25 font-mono flex items-center gap-1 mt-0.5">
                              <span className={isDead ? "text-red-400" : "text-emerald-400/60"}>{isDead ? "DEAD" : LocationNames[player.location] || "?"}</span>
                              {!isDead && <span>• T:{player.tasksCompleted}/{player.totalTasks}</span>}
                            </div>
                          </div>
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isDead ? "bg-red-500" : "bg-emerald-400 animate-pulse"}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* ─── MISSION LOGS TAB ─── */}
            {sidebarTab === "logs" && (
              <>
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                  <span className="text-[9px] font-black text-rose-400/60 uppercase tracking-[0.2em]">Game Events</span>
                  <span className="text-[9px] font-mono text-white/20">{logs.length} entries</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                  {logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6">
                      <div className="text-3xl mb-3 opacity-20">📡</div>
                      <div className="text-white/20 text-[10px] font-black uppercase tracking-widest">Scanning for signals...</div>
                      <div className="text-white/10 text-[9px] mt-1">Events will appear here in real-time</div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {logs.map((log, index) => (
                        <motion.div
                          key={`${log.timestamp}-${index}`}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`flex items-start gap-2.5 p-2.5 rounded-lg border-l-2 bg-white/[0.02] ${logBorders[log.type] || "border-l-white/20"}`}
                        >
                          <span className="text-sm leading-none mt-0.5 flex-shrink-0">{logIcons[log.type] || "📌"}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-bold text-white/80 leading-snug break-words">
                              {renderLogMessage(log, activePlayers)}
                            </div>
                            <span className="text-[8px] font-mono text-white/20 mt-1 block">
                              {new Date(log.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                      <div ref={logEndRef} />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ─── PREDICTIONS/MARKET TAB ─── */}
            {sidebarTab === "market" && (
              <>
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                  <span className="text-[9px] font-black text-purple-400/60 uppercase tracking-[0.2em]">Predictions</span>
                  <span className="text-[9px] font-black text-white/20">{(totalBetAmount / 1e9).toFixed(2)} OCT</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                  {activePlayers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6">
                      <div className="text-3xl mb-3 opacity-20">📊</div>
                      <div className="text-white/20 text-[10px] font-black uppercase tracking-widest">No predictions yet</div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activePlayers.map((player) => {
                        const playerBets = convexBets.filter((b: any) => b.selection.toLowerCase() === player.address.toLowerCase());
                        const playerAmount = playerBets.reduce((sum: number, b: any) => sum + b.amountMist, 0);
                        const percentage = totalBetAmount > 0 ? (playerAmount / totalBetAmount * 100) : 0;
                        const isDead = !player.isAlive;
                        
                        return (
                          <div 
                            key={player.address}
                            className={`rounded-xl p-3 border transition-all ${
                              isDead ? "opacity-40 border-red-500/20 bg-red-500/5" : "border-white/5 bg-white/[0.02]"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <AmongUsSprite colorId={player.colorId} size={20} showShadow={false} isGhost={isDead} />
                              <span className="text-[9px] font-black text-white uppercase flex-1 truncate">
                                {PlayerColors[player.colorId]?.name || `Agent`}
                              </span>
                              {isDead && <span className="text-[7px] text-red-400 font-black">DEAD</span>}
                              <span className="text-[10px] font-black text-cyan-400">{percentage.toFixed(0)}%</span>
                            </div>
                            {/* Prediction bar */}
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <motion.div
                                className={`h-full rounded-full ${isDead ? "bg-red-500/50" : "bg-cyan-400/70"}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                              />
                            </div>
                            {playerBets.length > 0 && (
                              <div className="text-[8px] text-white/20 font-mono mt-1">
                                {playerBets.length} bet{playerBets.length > 1 ? "s" : ""} • {(playerAmount / 1e9).toFixed(3)} OCT
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ─── BOTTOM HUD ─── */}
        <div className="absolute bottom-4 left-4 right-[22rem] pointer-events-none">
           <div className="flex items-center gap-4">
             {/* Kill feed - last event */}
             {logs.length > 0 && (
               <motion.div 
                 key={logs[logs.length - 1]?.timestamp}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="pointer-events-auto bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-2.5 flex items-center gap-3 max-w-lg"
               >
                 <span className="text-sm">{logIcons[logs[logs.length - 1]?.type] || "📌"}</span>
                 <span className="text-[10px] font-bold text-white/70 truncate">{renderLogMessage(logs[logs.length - 1], activePlayers)}</span>
               </motion.div>
             )}
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
