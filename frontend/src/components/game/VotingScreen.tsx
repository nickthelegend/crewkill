"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Player, PlayerColors } from "@/types/game";
import { AmongUsSprite } from "./AmongUsSprite";

interface VotingScreenProps {
  players: Player[];
  currentPlayer?: `0x${string}`;
  onVote: (target: `0x${string}` | null) => void;
  hasVoted: boolean;
  votingResults?: Map<`0x${string}`, `0x${string}`[]>; // who voted for whom
  timeRemaining: number;
  reporterColorId?: number;
  isDiscussion?: boolean;
}

export function VotingScreen({
  players,
  currentPlayer,
  onVote,
  hasVoted,
  votingResults,
  timeRemaining,
  reporterColorId,
  isDiscussion = false,
}: VotingScreenProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<`0x${string}` | null>(null);

  const alivePlayers = players.filter((p) => p.isAlive);

  // Arrange players in a circle
  const getPlayerPosition = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    const radius = 200;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  };

  const handleConfirmVote = () => {
    if (!hasVoted) {
      onVote(selectedPlayer);
    }
  };

  // Get vote counts
  const getVoteCount = (address: `0x${string}`) => {
    if (!votingResults) return 0;
    return votingResults.get(address)?.length || 0;
  };

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Dark background */}
      <div className="absolute inset-0 bg-black/90" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.h1
            className="text-4xl font-bold text-white mb-2"
            style={{
              fontFamily: "'Comic Sans MS', cursive",
              textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
            }}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            {isDiscussion ? "DISCUSSION" : "WHO IS THE IMPOSTOR?"}
          </motion.h1>

          {/* Timer */}
          <motion.div
            className="inline-block px-6 py-2 bg-gray-800 rounded-full"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="text-white text-2xl font-mono">{timeRemaining}s</span>
          </motion.div>
        </div>

        {/* Voting circle */}
        <div className="relative w-full aspect-square max-w-2xl mx-auto">
          {/* Center - Skip vote */}
          <motion.button
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center transition-colors ${
              selectedPlayer === null && !hasVoted
                ? "border-yellow-400 bg-gray-700"
                : "border-gray-600 bg-gray-800"
            }`}
            onClick={() => !hasVoted && setSelectedPlayer(null)}
            disabled={hasVoted}
            whileHover={!hasVoted ? { scale: 1.1 } : {}}
            whileTap={!hasVoted ? { scale: 0.95 } : {}}
          >
            <span className="text-white text-lg font-bold">SKIP</span>
            <span className="text-gray-400 text-xs">VOTE</span>
          </motion.button>

          {/* Players arranged in circle */}
          {alivePlayers.map((player, index) => {
            const pos = getPlayerPosition(index, alivePlayers.length);
            const isSelected = selectedPlayer === player.address;
            const isCurrentPlayer = player.address === currentPlayer;
            const voteCount = getVoteCount(player.address);
            const color = PlayerColors[player.colorId];

            return (
              <motion.div
                key={player.address}
                className="absolute"
                style={{
                  left: `calc(50% + ${pos.x}px)`,
                  top: `calc(50% + ${pos.y}px)`,
                  transform: "translate(-50%, -50%)",
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                {/* Vote button */}
                <motion.button
                  className={`relative flex flex-col items-center p-3 rounded-xl transition-all ${
                    isSelected
                      ? "bg-yellow-500/30 ring-4 ring-yellow-400"
                      : "bg-gray-800/50 hover:bg-gray-700/50"
                  } ${hasVoted ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  onClick={() => !hasVoted && !isCurrentPlayer && setSelectedPlayer(player.address)}
                  disabled={hasVoted || isCurrentPlayer}
                  whileHover={!hasVoted && !isCurrentPlayer ? { scale: 1.05 } : {}}
                  whileTap={!hasVoted && !isCurrentPlayer ? { scale: 0.95 } : {}}
                >
                  {/* Character */}
                  <AmongUsSprite
                    colorId={player.colorId}
                    size={60}
                    showShadow={false}
                  />

                  {/* Name */}
                  <span
                    className="text-sm font-bold mt-1"
                    style={{ color: color.light }}
                  >
                    {isCurrentPlayer ? "YOU" : color.name}
                  </span>

                  {/* Vote count badge */}
                  {voteCount > 0 && (
                    <motion.div
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      <span className="text-white text-xs font-bold">{voteCount}</span>
                    </motion.div>
                  )}

                  {/* Voted indicator */}
                  {player.hasVoted && (
                    <motion.div
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2"
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                    >
                      <span className="text-green-400 text-xs">VOTED</span>
                    </motion.div>
                  )}
                </motion.button>
              </motion.div>
            );
          })}
        </div>

        {/* Confirm vote button */}
        {!isDiscussion && (
          <motion.div
            className="text-center mt-8"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <motion.button
              className={`px-12 py-4 text-xl font-bold border-4 transition-colors ${
                hasVoted
                  ? "bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-red-600 border-red-400 text-white hover:bg-red-500"
              }`}
              style={{
                fontFamily: "'Comic Sans MS', cursive",
              }}
              onClick={handleConfirmVote}
              disabled={hasVoted}
              whileHover={!hasVoted ? { scale: 1.05 } : {}}
              whileTap={!hasVoted ? { scale: 0.95 } : {}}
            >
              {hasVoted ? "VOTE SUBMITTED" : "CONFIRM VOTE"}
            </motion.button>
          </motion.div>
        )}

        {/* Chat messages area (simplified) */}
        <motion.div
          className="mt-8 bg-gray-900/80 rounded-lg p-4 max-h-40 overflow-y-auto"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="text-gray-500 text-center">
            AI agents are discussing...
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
