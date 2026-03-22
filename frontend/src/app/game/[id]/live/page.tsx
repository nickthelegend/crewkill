"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGameServer } from "@/hooks/useGameServer";
import { GamePhase } from "@/types/game";
import { GameView } from "@/components/home/GameView";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";

export default function LiveRoomPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { 
    currentRoom, 
    isConnected, 
    players, 
    deadBodies, 
    logs, 
    phase, 
    activeSabotage,
    tasksCompleted, 
    totalTasks,
    joinRoom,
    leaveRoom
  } = useGameServer();

  const [spotlightedPlayer, setSpotlightedPlayer] = useState<`0x${string}` | null>(null);
  const [selectedAgentInfo, setSelectedAgentInfo] = useState<`0x${string}` | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Fetch Convex data for transaction context (market ID etc)
  const game = useQuery(api.crewkill.getGameByRoomId, { roomId: id });

  useEffect(() => {
    if (isConnected && id) {
      joinRoom(id, true); // Join as spectator
    }
    return () => {
      leaveRoom();
    };
  }, [isConnected, id, joinRoom, leaveRoom]);

  if (!isConnected) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white/20 font-black uppercase tracking-[0.5em] animate-pulse">
           Connecting...
        </div>
      </div>
    );
  }

  // Robust started check to fix flickering: prioritize actual room phase
  const isStarted = currentRoom && currentRoom.phase !== "lobby";
  const isLobby = phase === GamePhase.Lobby || (!isStarted && game && game.status === "CREATED");
  
  if (isLobby && !isStarted) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-center p-6 z-50">
        <div className="w-24 h-24 border border-white/5 flex items-center justify-center mb-8 relative">
           <div className="absolute inset-0 border border-cyan-500/20 animate-pulse" />
           <div className="text-3xl grayscale opacity-30">⏳</div>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase leading-none mb-4">
           GAME NOT <span className="text-cyan-500">STARTED</span>
        </h1>
        <p className="text-white/40 text-[10px] uppercase font-black tracking-[0.2em] max-w-sm mb-12 leading-relaxed">
           The live simulation has not begun. The agents are currently locked in the prediction market phase.
        </p>
        <button
           onClick={() => router.push(`/game/${id}/bet`)}
           className="px-12 py-6 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-black uppercase tracking-[0.2em] transition-all shadow-[0_20px_40px_rgba(34,211,238,0.2)]"
        >
           DO YOUR PREDICTIONS HERE
        </button>
      </div>
    );
  }

  return (
    <GameView 
      players={players}
      deadBodies={deadBodies}
      logs={logs}
      currentRoom={currentRoom}
      currentPlayer={undefined} // Spectator
      tasksCompleted={tasksCompleted}
      totalTasks={totalTasks}
      isConnected={isConnected}
      spotlightedPlayer={spotlightedPlayer}
      onSpotlightPlayer={setSpotlightedPlayer}
      selectedAgentInfo={selectedAgentInfo}
      onSelectAgentInfo={setSelectedAgentInfo}
      showInviteModal={showInviteModal}
      onShowInviteModal={setShowInviteModal}
      onBack={() => router.push(`/game/${id}`)}
      gameObjectId={game?._id}
      marketObjectId={game?.marketId}
      gamePhase={phase}
      activeSabotage={activeSabotage}
    />
  );
}
