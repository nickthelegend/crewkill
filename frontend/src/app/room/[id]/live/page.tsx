"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGameServer } from "@/hooks/useGameServer";
import { GameView } from "@/components/home/GameView";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";

export default function LiveRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  const {
    isConnected,
    currentRoom,
    players,
    deadBodies,
    logs,
    phase,
    tasksCompleted,
    totalTasks,
    joinRoom,
    leaveRoom,
  } = useGameServer();

  const [spotlightedPlayer, setSpotlightedPlayer] = useState<`0x${string}` | null>(null);
  const [selectedAgentInfo, setSelectedAgentInfo] = useState<`0x${string}` | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Fetch Convex data for transaction context (market ID etc)
  const game = useQuery(api.crewkill.getGameByRoomId, { roomId });

  useEffect(() => {
    if (isConnected && roomId) {
      joinRoom(roomId, true); // Join as spectator
    }
    return () => {
      leaveRoom();
    };
  }, [isConnected, roomId, joinRoom, leaveRoom]);

  if (!isConnected) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white/20 font-black uppercase tracking-[0.5em] animate-pulse">
           Establishing Neural Link...
        </div>
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
      onBack={() => router.push(`/room/${roomId}`)}
      gameObjectId={game?._id}
      marketObjectId={undefined} // Registry ID should be used
      gamePhase={phase}
    />
  );
}
