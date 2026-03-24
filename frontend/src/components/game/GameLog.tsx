"use client";

import { useRef, useEffect, useState } from "react";
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
  ArrowRight,
  MessageSquare
} from "lucide-react";

interface GameLogProps {
  logs: GameLogType[];
  maxHeight?: string;
}

type DisplayLogType = GameLogType & { displayTime?: string };

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
  move: <ArrowRight className="w-4 h-4 text-cyan-400" />,
  chat: <MessageSquare className="w-4 h-4 text-white/40" />,
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
  move: "border-cyan-400/20 bg-cyan-400/5",
  chat: "border-white/10 bg-white/5",
};

export function GameLogPanel({ logs: rawLogs, maxHeight = "400px" }: GameLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [displayLogs, setDisplayLogs] = useState<DisplayLogType[]>([]);
  const queueRef = useRef<GameLogType[]>([]);
  const streamingRef = useRef(false);

  // Auto-scroll to bottom when new logs appear
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayLogs]);

  // Streaming Effect: Take raw logs and "play" them in real-time
  useEffect(() => {
    // 1. Identify new logs
    const existingKeys = new Set(displayLogs.map(l => `${l.timestamp}-${l.message}`));
    const newLogs = rawLogs.filter(l => !existingKeys.has(`${l.timestamp}-${l.message}`));
    
    if (newLogs.length > 0) {
      queueRef.current.push(...newLogs);
      
      if (!streamingRef.current) {
         streamNext();
      }
    }
  }, [rawLogs, displayLogs]); // Added displayLogs to dependencies to ensure existingKeys is up-to-date

  const streamNext = () => {
     if (queueRef.current.length === 0) {
        streamingRef.current = false;
        return;
     }

     streamingRef.current = true;
     const next = queueRef.current.shift();
     if (!next) {
        streamingRef.current = false;
        return;
     }
     
     // Mock the time to be NOW as requested
     const mockedLog: DisplayLogType = {
        ...next,
        displayTime: new Date().toLocaleTimeString("en-US", {
           hour: "2-digit",
           minute: "2-digit",
           second: "2-digit",
        })
     };

     setDisplayLogs(prev => [...prev, mockedLog]);
     
     // Small delay between logs for organic "streaming" feel
     setTimeout(streamNext, 400); 
  };

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
      className="bg-black/40 rounded-none border border-white/10 overflow-hidden"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      {/* Header */}
      <div className="bg-white/5 px-6 py-4 border-b border-white/10">
        <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">Game Simulation Intel</h3>
      </div>

      {/* Log entries */}
      <div
        ref={scrollRef}
        className="overflow-y-auto p-2 space-y-2"
        style={{ maxHeight }}
      >
        <AnimatePresence initial={false}>
          {displayLogs.length === 0 ? (
            <div className="text-slate-500 text-center py-8 text-[10px] uppercase font-black font-space">
              No events yet...
            </div>
          ) : (
            displayLogs.map((log, index) => (
              <motion.div
                key={`${log.timestamp}-${index}`}
                className={`flex items-start gap-4 p-4 rounded-none border-l-2 ${logColors[log.type as keyof typeof logColors]}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mt-0.5 w-6 h-6 flex items-center justify-center bg-black/40 border border-white/5">
                  {logIcons[log.type as keyof typeof logIcons]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-white/80 uppercase tracking-tight leading-snug font-space">
                    {log.message}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[9px] font-mono text-white/20 tracking-tighter">
                      {log.displayTime || log.timestamp}
                    </span>
                    {log.round !== undefined && (
                      <span className="text-[9px] font-black text-white/10 uppercase tracking-[0.2em] font-space">
                        RD {log.round}
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
