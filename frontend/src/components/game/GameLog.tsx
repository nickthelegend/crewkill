"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameLog as GameLogType, PlayerColors } from "@/types/game";
import {
  Skull,
  AlertTriangle,
  Users,
  Vote,
  UserX,
  CheckCircle,
  Zap,
  UserPlus,
  Play,
} from "lucide-react";

interface GameLogProps {
  logs: GameLogType[];
  maxHeight?: string;
}

const logIcons: Record<GameLogType["type"], React.ReactNode> = {
  kill: <Skull className="w-4 h-4 text-red-500" />,
  report: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
  meeting: <Users className="w-4 h-4 text-blue-500" />,
  vote: <Vote className="w-4 h-4 text-purple-500" />,
  eject: <UserX className="w-4 h-4 text-orange-500" />,
  task: <CheckCircle className="w-4 h-4 text-green-500" />,
  sabotage: <Zap className="w-4 h-4 text-red-400" />,
  join: <UserPlus className="w-4 h-4 text-cyan-500" />,
  start: <Play className="w-4 h-4 text-green-400" />,
};

const logColors: Record<GameLogType["type"], string> = {
  kill: "border-red-500/30 bg-red-500/10",
  report: "border-yellow-500/30 bg-yellow-500/10",
  meeting: "border-blue-500/30 bg-blue-500/10",
  vote: "border-purple-500/30 bg-purple-500/10",
  eject: "border-orange-500/30 bg-orange-500/10",
  task: "border-green-500/30 bg-green-500/10",
  sabotage: "border-red-400/30 bg-red-400/10",
  join: "border-cyan-500/30 bg-cyan-500/10",
  start: "border-green-400/30 bg-green-400/10",
};

export function GameLogPanel({ logs, maxHeight = "400px" }: GameLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs appear
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <motion.div
      className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      {/* Header */}
      <div className="bg-slate-700/50 px-4 py-2 border-b border-slate-600">
        <h3 className="text-white font-bold">Game Log</h3>
      </div>

      {/* Log entries */}
      <div
        ref={scrollRef}
        className="overflow-y-auto p-2 space-y-2"
        style={{ maxHeight }}
      >
        <AnimatePresence initial={false}>
          {logs.length === 0 ? (
            <div className="text-slate-500 text-center py-8">
              No events yet...
            </div>
          ) : (
            logs.map((log, index) => (
              <motion.div
                key={`${log.timestamp}-${index}`}
                className={`
                  flex items-start gap-2 p-2 rounded-lg border
                  ${logColors[log.type]}
                `}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mt-0.5">{logIcons[log.type]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 leading-tight">
                    {log.message}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500">
                      {formatTime(log.timestamp)}
                    </span>
                    {log.round !== undefined && (
                      <span className="text-xs text-slate-600">
                        Round {log.round.toString()}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
