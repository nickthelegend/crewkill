"use client";

import { useParams, useRouter } from "next/navigation";
import { useGameServer } from "@/hooks/useGameServer";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useEffect, useState } from "react";
import { SpaceBackground } from "@/components/game/SpaceBackground";
import { AmongUsSprite } from "@/components/game/AmongUsSprite";
import { LocationNames, Location, PlayerColors, GamePhase, Player } from "@/types/game";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { GameView } from "@/components/home/GameView";

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

  const { isConnected, players: livePlayers, rawHistory, joinRoom } = useGameServer();
  const game = useQuery(api.crewkill.getGameByRoomId, { roomId: id });

  const [speed, setSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  
  // Local state for the "virtual" world at current playbackIndex
  const [replayPlayers, setReplayPlayers] = useState<Player[]>([]);
  const [replayLogs, setReplayLogs] = useState<any[]>([]);
  const [replayDeadBodies, setReplayDeadBodies] = useState<any[]>([]);
  const [replayPhase, setReplayPhase] = useState<number>(0);

  const [spotlightedPlayer, setSpotlightedPlayer] = useState<`0x${string}` | null>(null);
  const [selectedAgentInfo, setSelectedAgentInfo] = useState<`0x${string}` | null>(null);

  useEffect(() => {
    if (isConnected && id) {
      joinRoom(id, true);
    }
  }, [isConnected, id]);

  // Sync initial players when they are loaded
  useEffect(() => {
    if (livePlayers.length > 0 && replayPlayers.length === 0) {
      setReplayPlayers(livePlayers.map(p => ({ ...p, location: 0 as Location, isAlive: true, tasksCompleted: 0 })));
    }
  }, [livePlayers]);

  // Handle Playback Loop
  useEffect(() => {
    if (!isPlaying || !rawHistory || rawHistory.length === 0) return;

    const interval = setInterval(() => {
      setPlaybackIndex(prev => {
        if (prev >= rawHistory.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1000 / speed);

    return () => clearInterval(interval);
  }, [isPlaying, rawHistory, speed]);

  // Update visual state whenever playbackIndex changes
  useEffect(() => {
    if (!rawHistory || rawHistory.length === 0 || playbackIndex === 0) return;

    // Apply only the newest message at playbackIndex
    const m = rawHistory[playbackIndex];
    if (!m) return;

    if (m.type === "server:player_moved") {
      setReplayPlayers(prev => prev.map(p => 
        p.address.toLowerCase() === m.address.toLowerCase() 
          ? { ...p, location: m.to as Location } 
          : p
      ));
      setReplayLogs(prev => [{
        type: "move",
        message: `${m.address.slice(0, 8)}... moved to ${LocationNames[m.to as Location] || "Room " + m.to}`,
        address: m.address
      }, ...prev].slice(0, 50));
    } else if (m.type === "server:kill_occurred") {
      setReplayPlayers(prev => prev.map(p => 
        p.address.toLowerCase() === m.victim.toLowerCase() 
          ? { ...p, isAlive: false } 
          : p
      ));
      setReplayDeadBodies(prev => [...prev, { victim: m.victim, location: m.location }]);
      setReplayLogs(prev => [{
        type: "kill",
        message: `☠️ ${m.victim.slice(0, 8)}... was eliminated!`,
        address: m.killer
      }, ...prev].slice(0, 50));
    } else if (m.type === "server:task_completed") {
      setReplayPlayers(prev => prev.map(p => 
        p.address.toLowerCase() === m.player.toLowerCase() 
          ? { ...p, tasksCompleted: m.tasksCompleted } 
          : p
      ));
      setReplayLogs(prev => [{
        type: "task",
        message: `✅ ${m.player.slice(0, 8)}... completed a task (${m.tasksCompleted}/${m.totalTasks})`,
        address: m.player
      }, ...prev].slice(0, 50));
    } else if (m.type === "server:phase_changed") {
      setReplayPhase(m.phase);
    }
  }, [playbackIndex, rawHistory]);

  const progress = rawHistory && rawHistory.length > 0 
    ? (playbackIndex / (rawHistory.length - 1)) * 100 
    : 0;

  if (!isConnected) {
    return (
      <SpaceBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-white/20 font-black uppercase tracking-[0.5em] animate-pulse">
            Connecting System...
          </div>
        </div>
      </SpaceBackground>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-4 left-4 z-50">
        <button 
          onClick={() => router.push(`/game/${id}`)}
          className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] transition-all group bg-black/50 px-4 py-2 rounded-full border border-cyan-500/20 backdrop-blur-md"
        >
          <svg className="w-3 h-3 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>
      
      {/* Visual Game Review Wrapper */}
      <div className="w-full h-screen relative">
        <GameView 
          players={replayPlayers.length > 0 ? replayPlayers : livePlayers}
          deadBodies={replayDeadBodies}
          logs={replayLogs}
          currentRoom={null}
          currentPlayer={undefined}
          tasksCompleted={replayPlayers.reduce((s, p) => s + p.tasksCompleted, 0)}
          totalTasks={replayPlayers.reduce((s, p) => s + p.totalTasks, 0)}
          isConnected={isConnected}
          spotlightedPlayer={spotlightedPlayer}
          onSpotlightPlayer={setSpotlightedPlayer}
          selectedAgentInfo={selectedAgentInfo}
          onSelectAgentInfo={setSelectedAgentInfo}
          showInviteModal={false}
          onShowInviteModal={() => {}}
          onBack={() => router.push(`/game/${id}`)}
          gameObjectId={game?._id}
          marketObjectId={game?.marketId}
          gamePhase={replayPhase}
          activeSabotage={0}
        />

        {/* Playback HUD */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-4 shadow-2xl w-[400px]">
            <div className="text-[10px] font-black tracking-[0.2em] text-cyan-400 uppercase">
              Mission Recap Playback
            </div>
            
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden relative">
              <div 
                className="absolute top-0 left-0 h-full bg-cyan-400/80 transition-all duration-300" 
                style={{ width: `${progress}%` }} 
              />
            </div>
            
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                {[1, 2, 3].map(s => (
                  <button 
                    key={s} 
                    onClick={() => setSpeed(s)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-colors ${
                      speed === s ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'bg-white/5 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4">
                <button className="text-white/50 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M11 5L4 12L11 19V5M13 5L20 12L13 19V5Z"/></svg>
                </button>
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                >
                  {isPlaying ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19H10V5H6V19M14 5V19H18V5H14Z"/></svg>
                  ) : (
                    <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5V19L19 12L8 5Z"/></svg>
                  )}
                </button>
                <button className="text-white/50 hover:text-white transition-colors">
                  <svg className="w-6 h-6 rotate-180" fill="currentColor" viewBox="0 0 24 24"><path d="M11 5L4 12L11 19V5M13 5L20 12L13 19V5Z"/></svg>
                </button>
              </div>
              
              <div className="text-[10px] font-mono text-white/30 uppercase">
                {isPlaying ? 'Playing...' : 'Paused'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
