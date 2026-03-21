"use client";

import { motion } from "framer-motion";
import {
  AmongUsSprite,
  ScrollableMap,
  TaskBar,
  GameLogPanel,
} from "@/components/game";
import { ConnectWallet } from "@/components/wallet/ConnectWallet";
import { OperatorKeyPanel } from "@/components/operator/OperatorKeyPanel";
import {
  Player,
  GameLog,
  DeadBody,
  LocationNames,
  PlayerColors,
} from "@/types/game";
import type { RoomState } from "@/hooks/useGameServer";
import { InviteModal } from "./InviteModal";
import { PredictionMarket } from "@/components/game/PredictionMarket";

export interface GameViewProps {
  players: Player[];
  deadBodies: DeadBody[];
  logs: GameLog[];
  currentRoom: RoomState | null;
  currentPlayer: `0x${string}` | undefined;
  tasksCompleted: number;
  totalTasks: number;
  isConnected: boolean;
  spotlightedPlayer: `0x${string}` | null;
  onSpotlightPlayer: (address: `0x${string}` | null) => void;
  selectedAgentInfo: `0x${string}` | null;
  onSelectAgentInfo: (address: `0x${string}` | null) => void;
  showInviteModal: boolean;
  onShowInviteModal: (show: boolean) => void;
  onBack: () => void;
  gameObjectId?: string;
  marketObjectId?: string;
  gamePhase?: number;
  actualImpostors?: string[];
}

export function GameView({
  players,
  deadBodies,
  logs,
  currentRoom,
  currentPlayer,
  tasksCompleted,
  totalTasks,
  isConnected,
  spotlightedPlayer,
  onSpotlightPlayer,
  selectedAgentInfo,
  onSelectAgentInfo,
  showInviteModal,
  onShowInviteModal,
  onBack,
  gameObjectId,
  marketObjectId,
  gamePhase = 0,
  actualImpostors = [],
}: GameViewProps) {
  return (
    <div key="game" className="fixed inset-0">
      {/* Fullscreen Map */}
      <ScrollableMap
        players={players}
        deadBodies={deadBodies}
        currentPlayer={currentPlayer || ("0x0" as `0x${string}`)}
        onPlayerMove={() => {}} // Spectators don't move
        spotlightedPlayer={spotlightedPlayer}
        onSpotlightPlayer={onSpotlightPlayer}
      />

      {/* Top bar - clean layout */}
      <div className="fixed top-0 left-0 right-0 z-40 p-4 pointer-events-none">
        <div className="flex items-start justify-between w-full">
          {/* Left side - minimal wallet indicator */}
          <div className="pointer-events-auto flex items-center gap-2">
            <div className="scale-90 origin-left">
              <ConnectWallet />
            </div>
          </div>

          {/* Center - TaskBar prominently displayed */}
          <div className="pointer-events-auto absolute left-1/2 -translate-x-1/2">
            <TaskBar completed={tasksCompleted} total={totalTasks} />
          </div>

          {/* Right side - connection status & invite */}
          <div className="pointer-events-auto flex items-center gap-3">
            {/* Connection badge */}
            <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-slate-700/50">
              <div className={`w-2 h-2 rounded-full animate-pulse ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-slate-200 text-xs font-medium">
                {isConnected ? "Live" : "Disconnected"}
              </span>
            </div>

            {/* Invite Agent Button */}
            {currentRoom && (
              <button
                onClick={() => onShowInviteModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 sm:px-4 rounded-xl shadow-lg border border-emerald-400/30 flex items-center gap-2 transition-all transform hover:scale-105"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline text-sm">INVITE AGENT</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Operator Key Panel - bottom left corner */}
      <div className="fixed bottom-4 left-4 z-40">
        <OperatorKeyPanel />
      </div>

      {/* Right sidebar - overlay (bottom sheet on mobile, sidebar on desktop) */}
      <div className="fixed bottom-0 left-0 right-0 sm:top-20 sm:bottom-auto sm:left-auto sm:right-4 sm:w-64 flex flex-row sm:flex-col sm:space-y-3 overflow-x-auto sm:overflow-x-visible gap-2 sm:gap-0 p-2 sm:p-0 bg-black/80 sm:bg-transparent z-40">
        {/* Prize Pool Display */}
        {currentRoom?.wagerAmount && players.length > 0 && (
          <div className="flex-shrink-0 min-w-[140px] sm:min-w-0 bg-gradient-to-r from-yellow-900/60 to-amber-900/60 backdrop-blur-sm rounded-lg p-3 border border-yellow-500/30">
            <div className="text-center">
              <div className="text-[10px] text-yellow-400/70 uppercase tracking-wider mb-1">Prize Pool</div>
              <div className="text-xl font-black text-yellow-400">
                {(Number(currentRoom.wagerAmount) * players.length / 1e18).toFixed(4)} ETH
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Winner takes all
              </div>
            </div>
          </div>
        )}

        {/* Agents list */}
        <div className="flex-shrink-0 min-w-[200px] sm:min-w-0 bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-gray-700">
          <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wider">
            Agents ({players.filter((p) => p.isAlive).length}/{players.length} alive)
          </h3>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {players.map((player) => {
              const isSpotlighted = player.address === spotlightedPlayer;
              const isInfoOpen = player.address === selectedAgentInfo;
              return (
                <div key={player.address} className="relative">
                  <div
                    onClick={() => {
                      if (player.isAlive) {
                        onSpotlightPlayer(isSpotlighted ? null : player.address);
                      }
                      onSelectAgentInfo(isInfoOpen ? null : player.address);
                    }}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${
                      !player.isAlive ? "opacity-40" : "hover:bg-white/10"
                    } ${isSpotlighted ? "bg-yellow-900/50 ring-2 ring-yellow-500" : ""}`}
                  >
                    <div className="relative">
                      <AmongUsSprite colorId={player.colorId} size={28} showShadow={false} />
                      {isSpotlighted && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                          <span className="text-[8px] text-black font-bold">*</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-sm font-bold truncate"
                          style={{ color: PlayerColors[player.colorId]?.light || "#fff" }}
                        >
                          {PlayerColors[player.colorId]?.name || `Player ${player.colorId}`}
                        </span>
                        {!player.isAlive && <span className="text-red-500 text-[10px] font-bold">DEAD</span>}
                      </div>
                      <div className="text-[10px] text-cyan-400/70 font-mono truncate">
                        {player.address.slice(0, 6)}...{player.address.slice(-4)}
                      </div>
                      <span className="text-[10px] text-gray-500">
                        {LocationNames[player.location] || "Unknown"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {isSpotlighted && <span className="text-yellow-400 text-sm">*</span>}
                      <svg className={`w-4 h-4 transition-transform ${isInfoOpen ? "rotate-180 text-cyan-400" : "text-gray-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {/* Agent Info Popup */}
                  {isInfoOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-1 p-3 bg-slate-800/90 rounded-lg border border-cyan-500/30 text-xs"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Address:</span>
                          <span className="text-cyan-400 font-mono">{player.address.slice(0, 10)}...{player.address.slice(-8)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Status:</span>
                          <span className={player.isAlive ? "text-green-400" : "text-red-400"}>{player.isAlive ? "Alive" : "Dead"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Location:</span>
                          <span className="text-white">{LocationNames[player.location] || "Unknown"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Color:</span>
                          <span style={{ color: PlayerColors[player.colorId]?.light }}>{PlayerColors[player.colorId]?.name}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(player.address);
                          }}
                          className="w-full mt-2 py-1.5 bg-white/5 hover:bg-white/10 rounded text-gray-300 text-[10px] font-bold uppercase tracking-wider transition-colors"
                        >
                          Copy Full Address
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Game log - hidden on mobile */}
        <div className="hidden sm:block flex-shrink-0 bg-black/80 backdrop-blur-sm rounded-lg border border-gray-700">
          <GameLogPanel logs={logs} maxHeight="180px" />
        </div>

        {/* Spectator controls */}
        <div className="flex-shrink-0 min-w-[160px] sm:min-w-0 bg-black/80 backdrop-blur-sm rounded-lg p-3 space-y-2 border border-gray-700">
          <h3 className="text-white font-bold text-sm">Spectator Controls</h3>
          <p className="text-gray-400 text-xs">
            Click on an agent to follow them on the map
          </p>
          <div className="p-2 bg-slate-900/50 rounded text-center">
            <div className="text-xs text-gray-500">Dead Bodies</div>
            <div className="text-lg font-bold text-red-400">{deadBodies.length}</div>
          </div>
          {currentRoom && (
            <div className="p-2 bg-cyan-900/30 rounded text-center border border-cyan-700/50">
              <div className="text-xs text-cyan-400">Room: {currentRoom.roomId}</div>
            </div>
          )}
          <button
            onClick={onBack}
            className="w-full px-3 py-2 bg-gray-600 text-white rounded font-bold text-sm hover:bg-gray-500"
          >
            Exit Spectator
          </button>
        </div>

        {/* Prediction Market Section */}
        {gameObjectId && marketObjectId && (
          <div className="flex-shrink-0">
            <PredictionMarket
              gameId={gameObjectId}
              marketObjectId={marketObjectId}
              gamePlayers={players.map((p) => ({
                address: p.address,
                name: `Agent ${p.address.slice(0, 6)}...${p.address.slice(-4)}`,
              }))}
              isResolved={gamePhase === 7} // PHASE_ENDED is 7 in aligned Move
              actualImpostors={actualImpostors}
              gamePhase={gamePhase}
            />
          </div>
        )}
      </div>

      {/* Game Invite Modal */}
      <InviteModal
        isOpen={showInviteModal && !!currentRoom}
        roomId={currentRoom?.roomId ?? ""}
        onClose={() => onShowInviteModal(false)}
      />
    </div>
  );
}
