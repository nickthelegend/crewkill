"use client";

import { motion } from "framer-motion";
import { PlayerColors } from "@/types/game";

// Flexible player type that works in lobby (no role) and game (with role)
export interface AgentCardPlayer {
  address: `0x${string}` | string;
  colorId: number;
  isAlive: boolean;
  tasksCompleted: number;
  totalTasks: number;
  isAIAgent?: boolean;
  agentPersona?: {
    emoji: string;
    title: string;
    playstyle: string;
  };
  agentStats?: {
    gamesPlayed: number;
    wins: number;
    winRate: number;
  };
}

export interface AgentCardProps {
  player: AgentCardPlayer;
  index: number;
}

export function AgentCard({ player, index }: AgentCardProps) {
  if (!player.isAIAgent || !player.agentPersona) {
    // Not an AI agent, show regular player card
    return (
      <motion.div
        className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold"
          style={{
            borderColor: PlayerColors[player.colorId]?.hex || "#888",
            background: `${PlayerColors[player.colorId]?.hex || "#888"}15`,
            color: PlayerColors[player.colorId]?.hex || "#888",
          }}
        >
          {PlayerColors[player.colorId]?.name?.[0] || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-white/80 truncate">
            {PlayerColors[player.colorId]?.name || "Player"}
          </div>
          <div className="text-[10px] text-white/40">
            {player.address.slice(0, 6)}...{player.address.slice(-4)}
          </div>
        </div>
      </motion.div>
    );
  }

  // AI Agent card with persona
  const { emoji, title, playstyle } = player.agentPersona;

  return (
    <motion.div
      className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-sm"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02, borderColor: "hexa(255,255,255,0.15)" }}
    >
      {/* Glow effect */}
      <div
        className="absolute inset-0 opacity-20 blur-xl"
        style={{
          background: `radial-gradient(circle at top, ${PlayerColors[player.colorId]?.hex || "#888"}40, transparent)`,
        }}
      />

      <div className="relative p-3 flex items-start gap-3">
        {/* Agent Avatar */}
        <div
          className="w-12 h-12 rounded-xl border-2 flex items-center justify-center text-2xl shrink-0"
          style={{
            borderColor: PlayerColors[player.colorId]?.hex || "#888",
            background: `${PlayerColors[player.colorId]?.hex || "#888"}20`,
          }}
        >
          {emoji}
        </div>

        {/* Agent Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className="text-xs font-bold truncate"
              style={{ color: PlayerColors[player.colorId]?.hex || "#888" }}
            >
              {PlayerColors[player.colorId]?.name || "Agent"}
            </span>
            <div className="px-1.5 py-0.5 rounded bg-white/[0.08] text-[9px] font-bold text-white/60 uppercase tracking-wide">
              AI
            </div>
          </div>

          <div className="text-[11px] font-semibold text-white/90 mb-1">
            {title}
          </div>

          <div className="flex items-center gap-1.5">
            <div className="px-1.5 py-0.5 rounded-md bg-white/[0.06] text-[9px] font-medium text-white/50">
              {playstyle}
            </div>
            {player.agentStats && player.agentStats.gamesPlayed > 0 && (
              <div className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-[9px] font-bold text-emerald-400">
                {player.agentStats.winRate}% WR
              </div>
            )}
            <div className="flex items-center gap-0.5 text-[10px] text-white/40">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span>{player.tasksCompleted}/{player.totalTasks}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
