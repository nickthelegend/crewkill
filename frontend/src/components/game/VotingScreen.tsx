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
  chatMessages?: import("@/types/game").GameLog[];
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
  chatMessages = [],
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
  const getVoteCount = (address: `0x${string}` | null) => {
    if (!votingResults) return 0;
    const key = (address || "skip").toLowerCase() as `0x${string}`;
    return votingResults.get(key)?.length || 0;
  };

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Semi-transparent blur background */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
      
      {/* Content Container (The Modal Box) */}
      <motion.div 
        className="relative z-10 w-full max-w-5xl bg-gray-900/90 border border-white/10 rounded-[2.5rem] shadow-[0_0_100px_rgba(34,211,238,0.2)] overflow-hidden flex flex-col max-h-[90vh]"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        {/* Dynamic Header Decoration */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${isDiscussion ? 'from-cyan-500 via-blue-500 to-cyan-500' : 'from-red-500 via-yellow-500 to-red-500'}`} />
        
        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
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

                  {/* Vote indicators */}
                  <div className="absolute -bottom-2 -right-2 flex -space-x-1">
                    {votingResults && votingResults.get(player.address.toLowerCase() as `0x${string}`)?.map((voter, idx) => {
                      const voterPlayer = players.find(p => p.address.toLowerCase() === voter.toLowerCase());
                      if (!voterPlayer) return null;
                      return (
                        <motion.div
                          key={idx}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-4 h-4 rounded-full border border-black shadow-sm"
                          style={{ backgroundColor: PlayerColors[voterPlayer.colorId].hex }}
                        />
                      );
                    })}
                  </div>

                  {voteCount > 0 && (
                    <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border border-white">
                      {voteCount}
                    </div>
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

        {/* Chat messages area */}
        <motion.div
          className="mt-8 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 p-4 h-48 flex flex-col"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 px-1">
            Discussion Log
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {chatMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-white/20 text-xs font-medium italic">
                Waiting for discussion to begin...
              </div>
            ) : (
              chatMessages.map((msg, i) => {
                const sender = players.find(p => p.address === msg.address);
                const color = sender ? PlayerColors[sender.colorId] : { name: "System", light: "#fff" };
                return (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-sm"
                  >
                    <span className="font-black mr-2 uppercase text-[10px]" style={{ color: color.light }}>
                      {color.name}:
                    </span>
                    <span className="text-white/80">{msg.message}</span>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  </motion.div>
  );
}
