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
  }, [isConnected, id]);

  // Redirect to recap if game is over
  useEffect(() => {
    if (phase === GamePhase.Ended) {
      router.replace(`/game/${id}/recap`);
    }
  }, [phase, id, router]);

  if (!isConnected) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white/20 font-black uppercase tracking-[0.5em] animate-pulse">
           Connecting System...
        </div>
      </div>
    );
  }

  // Robust starts detection: prioritize database status as stable fallback IF available
  const isStarted = (currentRoom && ["playing", "discussion", "voting", "ejection"].includes(currentRoom.phase)) || (game && (game.status === "ACTIVE" || game.status === "COMPLETED"));
  const isLobby = !isStarted && (currentRoom?.phase === "lobby" || currentRoom?.phase === "boarding" || (game && game.status === "CREATED") || !currentRoom);
  
  // We'll let GameView handle phase-specific UI for a more seamless experience

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
