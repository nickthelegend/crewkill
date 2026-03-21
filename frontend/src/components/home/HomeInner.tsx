"use client";

import { useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCurrentAccount } from "@onelabs/dapp-kit";
import {
  MainMenu,
  VotingScreen,
  DeadBodyReportedScreen,
  AmongUsGameEndScreen,
  EjectionScreen,
} from "@/components/game";
import { UserDashboard } from "@/components/operator/UserDashboard";
import { GamePhase, Role, PlayerColors } from "@/types/game";
import { useGameServer } from "@/hooks/useGameServer";
import { useServerData } from "@/hooks/useServerData";
import { api, type RoomInfo } from "@/lib/api";
import { useHomeReducer } from "./useHomeReducer";
import { GameView } from "./GameView";
import { LobbyView } from "./LobbyView";
import { CreateRoomModal } from "./CreateRoomModal";

export interface HomeInnerProps {
  authenticated: boolean;
  ready: boolean;
  login: () => void;
  getAccessToken: () => Promise<string | null>;
  userAddress?: string;
}

export function HomeInner({
  authenticated,
  ready,
  login,
  getAccessToken,
  userAddress,
}: HomeInnerProps) {
  const [state, dispatch] = useHomeReducer();
  const currentAccount = useCurrentAccount();
  const router = useRouter();

  // HTTP API for menu/lobby data (rooms, stats, leaderboard)
  const {
    rooms: httpRooms,
    stats: httpStats,
    leaderboard: httpLeaderboard,
    error: httpError,
  } = useServerData(5000);

  // Authentication state — with dapp-kit, connected = wallet available
  const isAuthenticated = !!currentAccount || authenticated;

  // Sync with server privy status (simplified — always bypass)
  useEffect(() => {
    dispatch({ type: "SET_SERVER_PRIVY_ENABLED", enabled: false });
  }, [dispatch]);

  // WebSocket for real-time gameplay
  const {
    isConnected,
    error: wsError,
    currentRoom,
    rooms: wsRooms,
    stats: wsStats,
    players,
    deadBodies,
    logs,
    phase,
    tasksCompleted,
    totalTasks,
    joinRoom,
    leaveRoom,
    addAIAgent,
    removeAIAgent,
  } = useGameServer();

  // Use WebSocket data when connected for real-time updates, fallback to HTTP
  const rooms: RoomInfo[] | undefined = isConnected && wsRooms.length > 0
    ? wsRooms.map(r => ({
        ...r,
        players: r.players.map(p => ({
          address: p.address,
          colorId: p.colorId,
          location: p.location,
          isAlive: p.isAlive,
          tasksCompleted: p.tasksCompleted,
          totalTasks: p.totalTasks,
          hasVoted: p.hasVoted,
          isAIAgent: p.isAIAgent,
          agentPersona: p.agentPersona,
          agentStats: p.agentStats,
        })),
        spectators: r.spectators.length,
      }))
    : httpRooms;
  const stats = isConnected && wsStats ? wsStats : httpStats;
  const leaderboard = httpLeaderboard;
  const error = wsError || httpError;

  // Current player (first player for spectator view)
  const currentPlayer = players[0]?.address;
  const currentPlayerData = players.find((p) => p.address === currentPlayer);

  const handlePlay = useCallback(() => {
    dispatch({ type: "SET_VIEW", view: "lobby" });
  }, [dispatch]);

  const handleJoinRoom = useCallback((roomId: string) => {
    const room = rooms?.find(r => r.roomId === roomId);
    if (room?.phase === "playing") {
      router.push(`/game/${roomId}/live`);
      return;
    }
    joinRoom(roomId, true);
  }, [joinRoom, rooms, router]);

  // Watch for phase changes from WebSocket
  useEffect(() => {
    if (phase === GamePhase.ActionCommit && state.view === "lobby") {
      dispatch({ type: "SET_VIEW", view: "game" });
    } else if (phase === GamePhase.Ended && state.view === "game") {
      dispatch({ type: "SHOW_GAME_END" });
    }
  }, [phase, state.view, dispatch]);

  // Timer countdown for voting
  useEffect(() => {
    if (state.view === "voting" && state.timeRemaining > 0) {
      const timer = setInterval(() => {
        dispatch({ type: "TICK_TIMER" });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [state.view, state.timeRemaining, dispatch]);

  const handleBodyReportedDismiss = useCallback(() => {
    dispatch({ type: "DISMISS_BODY_REPORTED" });
  }, [dispatch]);

  // Auto-dismiss body reported screen after 3 seconds
  useEffect(() => {
    if (state.showBodyReported) {
      const timer = setTimeout(handleBodyReportedDismiss, 3000);
      return () => clearTimeout(timer);
    }
  }, [state.showBodyReported, handleBodyReportedDismiss]);

  const handleVote = useCallback(() => {
    dispatch({ type: "VOTE" });
  }, [dispatch]);

  const handleEjectionDismiss = useCallback(() => {
    dispatch({ type: "DISMISS_EJECTION" });
  }, [dispatch]);

  // Auto-dismiss ejection screen after 4 seconds
  useEffect(() => {
    if (state.showEjection) {
      const timer = setTimeout(handleEjectionDismiss, 4000);
      return () => clearTimeout(timer);
    }
  }, [state.showEjection, handleEjectionDismiss]);

  // Close create room modal when room is effectively created
  useEffect(() => {
    if (currentRoom) {
      dispatch({ type: "SET_SHOW_CREATE_ROOM_MODAL", show: false });
    }
  }, [currentRoom, dispatch]);

  const handleBack = useCallback(() => {
    if (currentRoom) {
      leaveRoom();
    }
    dispatch({ type: "SET_VIEW", view: "menu" });
  }, [currentRoom, leaveRoom, dispatch]);

  const handleCreateRoom = useCallback(async (max: number, imp: number, wager: string, aiAgentCount?: number) => {
    try {
      const token = "bypass";

      const result = await api.createRoom(token, {
        maxPlayers: max,
        impostorCount: imp,
        wagerAmount: wager,
        aiAgentCount,
      });

      if (result.success) {
        dispatch({ type: "SET_SHOW_CREATE_ROOM_MODAL", show: false });
      } else {
        console.error("Room creation failed:", result.error);
      }
    } catch (err) {
      console.error("Error in onCreate workflow:", err);
    }
  }, [dispatch]);

  return (
    <>
      <AnimatePresence mode="wait">
        {state.view === "menu" && (
          <MainMenu
            key="menu"
            onPlay={handlePlay}
            onOpenDashboard={() => dispatch({ type: "SET_VIEW", view: "dashboard" })}
            isConnected={isConnected}
            error={error}
            rooms={rooms}
            stats={stats}
            leaderboard={leaderboard}
          />
        )}

        {state.view === "lobby" && (
          <LobbyView
            key="lobby"
            isConnected={isConnected}
            isAuthenticated={isAuthenticated}
            rooms={rooms}
            currentRoom={currentRoom}
            players={players}
            logs={logs}
            stats={stats}
            onJoinRoom={handleJoinRoom}
            onBack={() => dispatch({ type: "SET_VIEW", view: "menu" })}
            onCreateRoom={() => dispatch({ type: "SET_SHOW_CREATE_ROOM_MODAL", show: true })}
            onLogin={login}
            currentAddress={userAddress}
            onAddAIAgent={addAIAgent}
            onRemoveAIAgent={removeAIAgent}
          />
        )}

        {state.view === "dashboard" && (
          <UserDashboard
            key="dashboard"
            onClose={() => dispatch({ type: "SET_VIEW", view: "menu" })}
            onJoinGame={(roomId) => {
              dispatch({ type: "SET_VIEW", view: "lobby" });
              handleJoinRoom(roomId);
            }}
            allRooms={httpRooms}
          />
        )}

        {state.view === "game" && (
          <GameView
            key="game"
            players={players}
            deadBodies={deadBodies}
            logs={logs}
            currentRoom={currentRoom}
            currentPlayer={currentPlayer}
            tasksCompleted={tasksCompleted}
            totalTasks={totalTasks}
            isConnected={isConnected}
            spotlightedPlayer={state.spotlightedPlayer}
            onSpotlightPlayer={(addr) => dispatch({ type: "SET_SPOTLIGHTED_PLAYER", address: addr })}
            selectedAgentInfo={state.selectedAgentInfo}
            onSelectAgentInfo={(addr) => dispatch({ type: "SET_SELECTED_AGENT_INFO", address: addr })}
            showInviteModal={state.showGameInviteModal}
            onShowInviteModal={(show) => dispatch({ type: "SET_SHOW_GAME_INVITE_MODAL", show })}
            onBack={handleBack}
          />
        )}

        {state.view === "voting" && (
          <VotingScreen
            key="voting"
            players={players}
            currentPlayer={currentPlayer || ("0x0" as `0x${string}`)}
            onVote={handleVote}
            hasVoted={state.hasVoted}
            timeRemaining={state.timeRemaining}
            reporterColorId={0}
          />
        )}
      </AnimatePresence>

      {/* Event screens */}
      <DeadBodyReportedScreen
        isVisible={state.showBodyReported}
        onDismiss={handleBodyReportedDismiss}
      />

      <EjectionScreen
        isVisible={state.showEjection}
        ejectedColorId={state.ejectedPlayer?.colorId || 0}
        ejectedName={state.ejectedPlayer ? PlayerColors[state.ejectedPlayer.colorId]?.name || "Unknown" : "Unknown"}
        wasImpostor={state.ejectedPlayer?.role === Role.Impostor}
        impostorsRemaining={players.filter(p => p.role === Role.Impostor && p.isAlive).length}
        onDismiss={handleEjectionDismiss}
      />

      <AmongUsGameEndScreen
        isVisible={state.showGameEnd}
        crewmatesWon={state.gameWon}
        playerColorId={currentPlayerData?.colorId || 0}
        wasImpostor={currentPlayerData?.role === Role.Impostor}
        onContinue={() => dispatch({ type: "DISMISS_GAME_END" })}
      />

      {state.showCreateRoomModal && (
        <CreateRoomModal
          onClose={() => dispatch({ type: "SET_SHOW_CREATE_ROOM_MODAL", show: false })}
          error={error}
          onCreate={handleCreateRoom}
        />
      )}
    </>
  );
}
