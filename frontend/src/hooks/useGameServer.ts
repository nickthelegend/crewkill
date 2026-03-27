"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Player,
  DeadBody,
  Location,
  LocationNames,
  Role,
  GameLog,
  GamePhase,
  PhaseNames,
} from "@/types/game";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8082";

export interface RoomState {
  roomId: string;
  marketId?: string;
  players: Array<{
    address: string;
    colorId: number;
    location: number;
    role: Role;
    isAlive: boolean;
    tasksCompleted: number;
    totalTasks: number;
    hasVoted: boolean;
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
  }>;
  spectators: string[];
  maxPlayers: number;
  impostorCount: number;
  phase: "lobby" | "boarding" | "playing" | "ended";
  detailedPhase?: GamePhase; // Added detailed phase
  activeSabotage?: number;    // Added active sabotage
  createdAt: number;
  creator?: string;
  wagerAmount?: string;
  creationDigest?: string;
}

interface ServerMessage {
  type: string;
  [key: string]: any;
}

interface RoomSlotInfo {
  id: number;
  state: "active" | "cooldown" | "empty";
  roomId: string | null;
  cooldownEndTime: number | null;
  cooldownRemaining: number | null;
}

interface AgentStats {
  address: string;
  name: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  kills: number;
  tasksCompleted: number;
  timesImpostor: number;
  timesCrewmate: number;
  lastSeen: number;
}

interface ServerStats {
  connections: {
    total: number;
    agents: number;
    spectators: number;
  };
  rooms: {
    total: number;
    maxRooms?: number;
    lobby: number;
    playing: number;
    totalPlayers: number;
  };
  limits: {
    maxRooms?: number;
    maxPlayersPerRoom: number;
    minPlayersToStart: number;
    fillWaitDuration?: number;
    cooldownDuration?: number;
  };
  slots?: RoomSlotInfo[];
}

export interface UseGameServerReturn {
  // Connection
  isConnected: boolean;
  connectionId: string | null;
  error: string | null;

  // Rooms
  rooms: RoomState[];
  currentRoom: RoomState | null;

  // Server stats
  stats: ServerStats | null;

  // Leaderboard
  leaderboard: AgentStats[];

  // Game state (derived from current room)
  players: Player[];
  deadBodies: DeadBody[];
  logs: GameLog[];
  phase: GamePhase;
  activeSabotage: number; // Added active sabotage
  tasksCompleted: number;
  totalTasks: number;

  // Actions
  createRoom: (
    maxPlayers?: number,
    impostorCount?: number,
    wagerAmount?: string,
    aiAgentCount?: number,
  ) => void;
  joinRoom: (roomId: string, asSpectator?: boolean) => void;
  leaveRoom: () => void;
  startGame: () => void;
  addAIAgent: (roomId: string) => void;
  removeAIAgent: (roomId: string) => void;
  votingResults: Map<string, string[]>;
}

export function useGameServer(): UseGameServerReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [rooms, setRooms] = useState<RoomState[]>([]);
  const [currentRoom, setCurrentRoom] = useState<RoomState | null>(null);
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<AgentStats[]>([]);
  const [deadBodies, setDeadBodies] = useState<DeadBody[]>([]);
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [votingResults, setVotingResults] = useState<Map<string, string[]>>(new Map());

  // Track current room ID for filtering logs
  const currentRoomIdRef = useRef<string | null>(null);

  const addLog = useCallback(
    (type: GameLog["type"], message: string, gameId?: string, address?: string, targetAddress?: string) => {
      // Only add log if it's for the current room or no room specified (global events)
      if (
        gameId &&
        currentRoomIdRef.current &&
        gameId !== currentRoomIdRef.current
      ) {
        return; // Skip logs from other rooms
      }
      setLogs((prev) => [
        ...prev.slice(-49),
        { type, message, timestamp: Date.now(), address, targetAddress },
      ]);
    },
    [],
  );

  const send = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const handleMessage = useCallback(
    (data: string) => {
      try {
        const message = JSON.parse(data) as ServerMessage;

        switch (message.type) {
          case "server:welcome":
            setConnectionId(message.connectionId);
            addLog("start", "Connected to game server");
            break;

          case "server:error":
            setError(message.message);
            addLog("start", `Error: ${message.message}`);
            break;

          case "server:room_list":
            setRooms(message.rooms);
            if (message.stats) {
              setStats(message.stats);
            }
            break;

          case "server:leaderboard":
            setLeaderboard(message.agents || []);
            break;

          case "server:room_created":
            addLog("start", `Room ${message.room.roomId} created`);
            break;

          case "server:room_update":
            setCurrentRoom(message.room);
            currentRoomIdRef.current = message.room.roomId;
            // Clear dead bodies on room update (fresh state)
            if (message.room.phase === "lobby") {
              setDeadBodies([]);
              setLogs([]); // Clear logs when entering a new room lobby
            }
            break;

          case "server:player_joined":
            addLog(
              "join",
              `Player joined (color ${message.player.colorId})`,
              message.gameId,
            );
            setCurrentRoom((prev) => {
              if (!prev || prev.roomId !== message.gameId) return prev;
              const exists = prev.players.some(
                (p) => p.address === message.player.address,
              );
              if (exists) return prev;
              return { ...prev, players: [...prev.players, message.player] };
            });
            break;

          case "server:player_left":
            addLog("join", `Player left`, message.gameId);
            setCurrentRoom((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                players: prev.players.filter(
                  (p) => p.address !== message.address,
                ),
              };
            });
            break;

          case "server:game_state":
            // Full game state snapshot (sent when joining or game starts)
            if (message.state) {
              const newSimplifiedPhase = message.state.phase === 1 ? "boarding" : (message.state.phase >= 2 && message.state.phase <= 6) ? "playing" : (message.state.phase === 7 ? "ended" : "lobby");

              if (message.state.players) {
                setCurrentRoom((prev) => {
                  if (!prev || prev.roomId !== message.gameId) return prev;
                  return {
                    ...prev,
                    phase: newSimplifiedPhase,
                    detailedPhase: message.state.phase as GamePhase,
                    activeSabotage: message.state.activeSabotage || 0,
                    players: message.state.players.map((p: any) => ({
                      address: p.address,
                      colorId: p.colorId,
                      location: p.location,
                      role: p.role || Role.None,
                      isAlive: p.isAlive,
                      tasksCompleted: p.tasksCompleted || 0,
                      totalTasks: p.totalTasks || 5,
                      hasVoted: p.hasVoted || false,
                    })),
                  };
                });
              }
              
              if (message.state.deadBodies) {
                setDeadBodies(message.state.deadBodies);
              }

            }
            break;

          case "server:event_history":
            if (message.history && Array.isArray(message.history)) {
              const historicalLogs: any[] = [];
              const latestPlayers = new Map<string, any>();
              const historicalDeadBodies: any[] = [];
              let restoredPhase: "lobby" | "boarding" | "playing" | "ended" | null = null;
              let restoredDetailedPhase: number | null = null;

              message.history.forEach((m: any) => {
                let logType: "kill" | "report" | "meeting" | "vote" | "eject" | "task" | "sabotage" | "join" | "start" | "move" | "chat" | null = null;
                let logMsg = "";
                let logAddr = m.address;
                let logTarget = m.targetAddress;

                switch (m.type) {
                  case "server:player_moved":
                    logType = "move";
                    logMsg = `${m.address.slice(0, 8)}... moved to ${LocationNames[m.to as Location] || "Room " + m.to}`;
                    latestPlayers.set(m.address, { location: m.to });
                    break;
                  case "server:kill_occurred":
                    logType = "kill";
                    logMsg = `☠️ ${m.victim.slice(0, 8)}... was eliminated at ${LocationNames[m.location as Location] || "unknown location"}!`;
                    logTarget = m.victim;
                    latestPlayers.set(m.victim, { isAlive: false });
                    historicalDeadBodies.push({
                      victim: m.victim,
                      location: m.location,
                      round: BigInt(m.round || 0),
                      reported: false,
                    });
                    break;
                  case "server:phase_changed":
                    logType = "start";
                    logMsg = `Phase changed to ${PhaseNames[m.phase as GamePhase] || m.phase}`;
                    restoredPhase = m.phase === 1 ? "boarding" : (m.phase >= 2 && m.phase <= 6) ? "playing" : (m.phase === 7 ? "ended" : "lobby");
                    restoredDetailedPhase = m.phase;
                    break;
                  case "server:task_completed":
                    logType = "task";
                    logMsg = `✅ ${m.player.slice(0, 8)}... completed a task (${m.tasksCompleted}/${m.totalTasks})`;
                    logAddr = m.player;
                    latestPlayers.set(m.player, { tasksCompleted: m.tasksCompleted, totalTasks: m.totalTasks });
                    break;
                  case "server:body_reported":
                    logType = "report";
                    logMsg = `🚨 BODY REPORTED! ${m.reporter.slice(0, 8)}... found ${m.victim.slice(0, 8)}...`;
                    logAddr = m.reporter;
                    logTarget = m.victim;
                    break;
                  case "server:player_ejected":
                    logType = "eject";
                    logMsg = `🚀 ${m.ejected.slice(0, 8)}... was ejected!`;
                    logAddr = m.ejected;
                    latestPlayers.set(m.ejected, { isAlive: false });
                    break;
                  case "server:game_ended":
                    logType = "start";
                    logMsg = m.crewmatesWon ? "🎉 CREWMATES WIN!" : "💀 IMPOSTORS WIN!";
                    restoredPhase = "ended";
                    restoredDetailedPhase = 7;
                    break;
                }

                if (logType) {
                  historicalLogs.push({
                    type: logType,
                    message: logMsg,
                    timestamp: m.timestamp || Date.now(),
                    address: logAddr,
                    targetAddress: logTarget,
                  });
                }
              });

              // Apply all gathered state changes at once
              setCurrentRoom((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  phase: restoredPhase || prev.phase,
                  detailedPhase: restoredDetailedPhase !== null ? restoredDetailedPhase as GamePhase : prev.detailedPhase,
                  players: prev.players.map((p) => {
                    const updates = latestPlayers.get(p.address);
                    if (updates) {
                      return { ...p, ...updates };
                    }
                    return p;
                  }),
                };
              });
              
              if (historicalDeadBodies.length > 0) {
                setDeadBodies(historicalDeadBodies);
              }

              setLogs((prev) => [...historicalLogs.slice(-100), ...prev].slice(-200));
            }
            break;

          case "server:player_moved":
            addLog("move", `${message.address.slice(0,8)}... moved to ${LocationNames[message.to as Location] || 'Room ' + message.to}`, message.gameId, message.address);
            setCurrentRoom((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                players: prev.players.map((p) =>
                  p.address === message.address
                    ? { ...p, location: message.to }
                    : p,
                ),
              };
            });
            break;

          case "server:kill_occurred":
            addLog("kill", `☠️ ${message.victim.slice(0,8)}... was eliminated at ${LocationNames[message.location as Location] || 'unknown location'}!`, message.gameId, undefined, message.victim);
            setCurrentRoom((prev) => {
              if (!prev || prev.roomId !== message.gameId) return prev;
              return {
                ...prev,
                players: prev.players.map((p) =>
                  p.address === message.victim ? { ...p, isAlive: false } : p,
                ),
              };
            });
            setDeadBodies((prev) => [
              ...prev,
              {
                victim: message.victim as `0x${string}`,
                location: message.location as Location,
                round: BigInt(message.round),
                reported: false,
              },
            ]);
            break;

          case "server:phase_changed":
            addLog(
              "start",
              `Phase changed to ${message.phase}`,
              message.gameId,
            );
            setCurrentRoom((prev) => {
              if (!prev || prev.roomId !== message.gameId) return prev;
              const newSimplifiedPhase = message.phase === 1 ? "boarding" : (message.phase >= 2 && message.phase <= 6) ? "playing" : (message.phase === 7 ? "ended" : "lobby");
              return { 
                ...prev, 
                phase: newSimplifiedPhase,
                detailedPhase: message.phase 
              };
            });
            if (message.phase === GamePhase.ActionCommit) {
              setVotingResults(new Map());
            }
            break;

          case "server:task_completed":
            const locName = message.location !== undefined ? LocationNames[message.location as Location] : 'unknown location';
            addLog("task", `✅ ${message.player.slice(0,8)}... completed a task at ${locName} (${message.tasksCompleted}/${message.totalTasks})`, message.gameId, message.player);
            setCurrentRoom((prev) => {
              if (!prev || prev.roomId !== message.gameId) return prev;
              return {
                ...prev,
                players: prev.players.map((p) =>
                  p.address === message.player
                    ? {
                        ...p,
                        tasksCompleted: message.tasksCompleted,
                        totalTasks: message.totalTasks,
                      }
                    : p,
                ),
              };
            });
            break;
          case "server:player_voted":
            setCurrentRoom((prev) => {
              if (!prev || prev.roomId !== message.gameId) return prev;
              return {
                ...prev,
                players: prev.players.map((p) =>
                  p.address === message.voter ? { ...p, hasVoted: true } : p,
                ),
              };
            });
            setVotingResults((prev) => {
              const next = new Map(prev);
              const target = message.target?.toLowerCase() || 'skip';
              const currentVoters = next.get(target) || [];
              if (!currentVoters.includes(message.voter)) {
                next.set(target, [...currentVoters, message.voter]);
              }
              return next;
            });
            break;

          case "server:sabotage_started":
            addLog("sabotage", `⚡ SABOTAGE: ${['None','Lights','Reactor','O2','Comms'][message.sabotageType] || 'Unknown'} initiated!`, message.gameId);
            setCurrentRoom((prev) => {
              if (!prev || prev.roomId !== message.gameId) return prev;
              return { ...prev, activeSabotage: message.sabotageType };
            });
            break;

          case "server:sabotage_fixed":
            addLog("task", `🔧 Sabotage repaired by ${message.fixedBy.slice(0,8)}...`, message.gameId, message.fixedBy);
            setCurrentRoom((prev) => {
              if (!prev || prev.roomId !== message.gameId) return prev;
              return { ...prev, activeSabotage: 0 };
            });
            break;

          case "server:body_reported":
            addLog(
              "report",
              `🚨 BODY REPORTED! ${message.reporter.slice(0,8)}... found ${message.victim.slice(0,8)}... at ${LocationNames[message.location as Location] || 'unknown'}`,
              message.gameId,
              message.reporter,
              message.victim
            );
            // Mark body as reported
            setDeadBodies((prev) =>
              prev.map((b) =>
                b.victim === message.victim ? { ...b, reported: true } : b,
              ),
            );
            break;

          case "server:player_ejected":
            addLog(
              "eject",
              `🚀 ${message.ejected.slice(0,8)}... was ejected! ${message.wasImpostor ? "They were an IMPOSTOR! 🔪" : "They were innocent... 😢"}`,
              message.gameId,
              message.ejected
            );
            // Mark player as dead
            setCurrentRoom((prev) => {
              if (!prev || prev.roomId !== message.gameId) return prev;
              return {
                  ...prev,
                  players: prev.players.map((p) =>
                    p.address === message.ejected ? { ...p, isAlive: false } : p,
                  ),
                };
            });
            break;

          case "server:chat":
            addLog("chat", message.message, message.gameId, message.address);
            break;

          case "server:game_ended": // Restored case
            addLog(
              "start",
              message.crewmatesWon ? "🎉 CREWMATES WIN! All impostors defeated!" : "💀 IMPOSTORS WIN! The crew has fallen!",
              message.gameId,
            );
            setCurrentRoom((prev) => {
              if (!prev || prev.roomId !== message.gameId) return prev;
              const revealedImpostors = message.impostors.map((a: string) => a.toLowerCase());
              return {
                ...prev,
                phase: "ended",
                detailedPhase: GamePhase.Ended,
                players: prev.players.map((p) => ({
                  ...p,
                  role: revealedImpostors.includes(p.address.toLowerCase()) ? Role.Impostor : Role.Crewmate,
                })),
              };
            });
            break;
        }
      } catch (err) {
        console.error("Failed to parse message:", err);
      }
    },
    [addLog],
  );

  // Store handleMessage in a ref to avoid reconnection loops
  const handleMessageRef = useRef(handleMessage);
  handleMessageRef.current = handleMessage;

  // Connect on mount (only once)
  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      handleMessageRef.current(event.data);
    };

    ws.onclose = () => {
      setIsConnected(false);
      setConnectionId(null);
    };

    ws.onerror = (e) => {
      console.error("WebSocket error:", e);
      setError("Connection failed");
    };

    return () => {
      ws.close();
    };
  }, []); // Empty deps - only connect once

  // Actions
  const createRoom = useCallback(
    (maxPlayers = 10, impostorCount = 2, wagerAmount?: string, aiAgentCount?: number) => {
      send({
        type: "client:create_room",
        maxPlayers,
        impostorCount,
        wagerAmount,
        aiAgentCount,
      });
    },
    [send],
  );

  const joinRoom = useCallback(
    (roomId: string, asSpectator = true) => {
      send({ type: "client:join_room", roomId, asSpectator });
      currentRoomIdRef.current = roomId;
      setLogs([
        {
          type: "start",
          message: `Joining room ${roomId}...`,
          timestamp: Date.now(),
        },
      ]);
      setDeadBodies([]);
    },
    [send],
  );

  const leaveRoom = useCallback(() => {
    if (currentRoom) {
      send({ type: "client:leave_room", roomId: currentRoom.roomId });
      currentRoomIdRef.current = null;
      setCurrentRoom(null);
      setDeadBodies([]);
      setLogs([]);
    }
  }, [send, currentRoom]);

  const addAIAgent = useCallback(
    (roomId: string) => {
      send({ type: "client:add_ai_agent", roomId });
    },
    [send],
  );

  const removeAIAgent = useCallback(
    (roomId: string) => {
      send({ type: "client:remove_ai_agent", roomId });
    },
    [send],
  );

  const startGame = useCallback(() => {
    if (currentRoom) {
      send({ type: "client:start_game", roomId: currentRoom.roomId });
    }
  }, [send, currentRoom]);

  // Derive player list from current room
  const players: Player[] =
    currentRoom?.players.map((p) => ({
      address: p.address as `0x${string}`,
      name: (p as any).name || (p.address.startsWith('0x') ? p.address.slice(0, 8) : p.address),
      colorId: p.colorId,
      role: Role.None, // Hidden
      location: p.location as Location,
      isAlive: p.isAlive,
      tasksCompleted: p.tasksCompleted,
      totalTasks: p.totalTasks,
      hasVoted: p.hasVoted,
    })) || [];

  const phase: GamePhase = currentRoom?.detailedPhase ?? (
    currentRoom?.phase === "playing"
      ? GamePhase.ActionCommit
      : currentRoom?.phase === "ended"
        ? GamePhase.Ended
        : GamePhase.Lobby);

  const activeSabotage = currentRoom?.activeSabotage ?? 0;

  const tasksCompleted = players.reduce((sum, p) => sum + p.tasksCompleted, 0);
  const totalTasks = players.reduce((sum, p) => sum + p.totalTasks, 0);

  return {
    isConnected,
    connectionId,
    error,
    rooms,
    currentRoom,
    stats,
    leaderboard,
    players,
    deadBodies,
    logs,
    phase,
    activeSabotage,
    tasksCompleted,
    totalTasks,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    addAIAgent,
    removeAIAgent,
    votingResults,
  };
}
