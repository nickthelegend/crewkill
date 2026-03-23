"use client";

import { useParams, useRouter } from "next/navigation";
import { useGameServer } from "@/hooks/useGameServer";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useEffect, useState } from "react";
import { SpaceBackground } from "@/components/game/SpaceBackground";
import { AmongUsSprite } from "@/components/game/AmongUsSprite";
import { LocationNames, Location, PlayerColors, GamePhase } from "@/types/game";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const eventIcons: Record<string, string> = {
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

const eventColors: Record<string, string> = {
  kill: "border-red-500/40 bg-red-500/10",
  report: "border-yellow-500/40 bg-yellow-500/10",
  meeting: "border-blue-500/40 bg-blue-500/10",
  vote: "border-purple-500/40 bg-purple-500/10",
  eject: "border-orange-500/40 bg-orange-500/10",
  task: "border-emerald-500/40 bg-emerald-500/10",
  sabotage: "border-red-400/40 bg-red-400/10",
  join: "border-cyan-500/40 bg-cyan-500/10",
  start: "border-green-400/40 bg-green-400/10",
};

export default function RecapPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { currentRoom, isConnected, players, logs, phase, joinRoom, leaveRoom } = useGameServer();

  const game = useQuery(api.crewkill.getGameByRoomId, { roomId: id });

  useEffect(() => {
    if (isConnected && id) {
      joinRoom(id, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, id]);

  const isEnded = phase === GamePhase.Ended || game?.status === "COMPLETED";
  const gamePlayers = currentRoom?.players || [];
  const impostors = gamePlayers.filter(p => p.role === 2); // Role.Impostor = 2

  // Filter meaningful logs (skip generic sync messages)
  const meaningfulLogs = logs.filter(l => 
    l.type !== "start" || l.message.includes("WIN") || l.message.includes("Phase") || l.message.includes("CREWMATES") || l.message.includes("IMPOSTORS")
  );

  return (
    <SpaceBackground>
      <div className="min-h-screen pt-24 pb-12 px-4 md:px-8 relative z-10">
        <div className="max-w-[1200px] mx-auto">
          {/* Header */}
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <button 
              onClick={() => router.push(`/game/${id}`)}
              className="mb-6 text-cyan-400 hover:text-cyan-300 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] transition-all group"
            >
              <svg className="w-3 h-3 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Game
            </button>

            <div className="flex items-center gap-4 mb-4">
              <div className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-[0.2em] uppercase ${
                isEnded ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
              }`}>
                {isEnded ? "● GAME OVER" : "● IN PROGRESS"}
              </div>
            </div>

            <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase text-white leading-[0.9] mb-8">
              Mission <span className="text-red-500">Recap</span>
            </h1>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
            {[
              { label: "Total Events", value: meaningfulLogs.length.toString(), color: "text-cyan-400" },
              { label: "Kills", value: meaningfulLogs.filter(l => l.type === "kill").length.toString(), color: "text-red-500" },
              { label: "Tasks Done", value: meaningfulLogs.filter(l => l.type === "task").length.toString(), color: "text-emerald-400" },
              { label: "Votes", value: meaningfulLogs.filter(l => l.type === "vote").length.toString(), color: "text-purple-400" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/[0.03] border border-white/10 rounded-2xl p-6"
              >
                <div className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mb-2">{stat.label}</div>
                <div className={`text-3xl font-black ${stat.color} tracking-tighter`}>{stat.value}</div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Player Status */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02]">
                  <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                    Crew Status ({gamePlayers.filter(p => p.isAlive).length}/{gamePlayers.length} alive)
                  </h3>
                </div>
                <div className="p-4 space-y-2">
                  {gamePlayers.map((player, idx) => {
                    const isImpostor = player.role === 2;
                    return (
                      <motion.div
                        key={player.address}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          !player.isAlive ? "opacity-40 border-red-500/20 bg-red-500/5" : "border-white/5 bg-white/[0.02]"
                        }`}
                      >
                        <div className="relative">
                          <AmongUsSprite colorId={player.colorId} size={36} isGhost={!player.isAlive} />
                          {!player.isAlive && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                              <span className="text-[8px]">💀</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white uppercase truncate">
                              {player.address.slice(0, 8)}...
                            </span>
                            {player.isAIAgent && (
                              <span className="text-[7px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded font-black">AI</span>
                            )}
                            {isEnded && isImpostor && (
                              <span className="text-[7px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-black animate-pulse">IMPOSTOR</span>
                            )}
                          </div>
                          <div className="text-[9px] text-white/30 font-mono mt-0.5 flex items-center gap-2">
                            <span>{player.isAlive ? "🟢 Alive" : "🔴 Dead"}</span>
                            <span>•</span>
                            <span>Tasks: {player.tasksCompleted}/{player.totalTasks}</span>
                          </div>
                        </div>
                        {player.agentPersona && (
                          <div className="text-lg">{player.agentPersona.emoji}</div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Event Timeline */}
            <div className="lg:col-span-8">
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Event Timeline</h3>
                  <span className="text-[10px] font-mono text-white/20">{meaningfulLogs.length} events</span>
                </div>
                <div className="p-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  {meaningfulLogs.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="text-4xl mb-4 opacity-30">📡</div>
                      <div className="text-white/30 text-sm font-black uppercase tracking-widest">No events recorded yet</div>
                      <div className="text-white/15 text-[10px] mt-2 uppercase tracking-wider">
                        {isEnded ? "This game has ended but no events were captured in this session." : "Events will appear here as the game progresses."}
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-6 top-4 bottom-4 w-px bg-white/10" />
                      
                      <div className="space-y-3">
                        <AnimatePresence>
                          {meaningfulLogs.map((log, index) => (
                            <motion.div
                              key={`${log.timestamp}-${index}`}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.03 }}
                              className={`relative flex items-start gap-4 p-4 rounded-xl border-l-2 ml-3 ${eventColors[log.type] || 'border-white/10 bg-white/5'}`}
                            >
                              {/* Timeline dot */}
                              <div className="absolute -left-[calc(0.75rem+1px)] top-5 w-3 h-3 rounded-full bg-black border-2 border-white/30" />
                              
                              <div className="text-xl leading-none mt-0.5">{eventIcons[log.type] || "📌"}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-black text-white/80 uppercase tracking-tight leading-snug">
                                  {log.message}
                                </p>
                                <div className="flex items-center gap-3 mt-2">
                                  <span className="text-[9px] font-mono text-white/30">
                                    {new Date(log.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                  </span>
                                  <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded ${eventColors[log.type] || 'bg-white/5 text-white/30'}`}>
                                    {log.type}
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SpaceBackground>
  );
}
