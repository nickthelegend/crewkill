"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AmongUsSprite } from "@/components/game";

interface CreateRoomModalProps {
  onClose: () => void;
  onCreate: (max: number, imp: number, wager: string, aiAgentCount?: number) => void;
  error?: string | null;
}

export function CreateRoomModal({ onClose, onCreate, error }: CreateRoomModalProps) {
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [impostorCount, setImpostorCount] = useState(2);
  const [wager, setWager] = useState("0.1");
  const [aiAgentCount, setAiAgentCount] = useState(0);
  const [isDeploying, setIsDeploying] = useState(false);

  const playerOptions = [2, 4, 6, 8, 10];
  const maxAI = maxPlayers - 1; // Leave at least 1 slot for human player

  // Clamp AI count when maxPlayers changes
  useEffect(() => {
    if (aiAgentCount > maxPlayers - 1) {
      setAiAgentCount(Math.max(0, maxPlayers - 1));
    }
  }, [maxPlayers]);

  useEffect(() => {
    if (error) setIsDeploying(false);
  }, [error]);

  const handleCreate = async () => {
    try {
      setIsDeploying(true);
      const wagerNum = parseFloat(wager);
      if (isNaN(wagerNum) || wagerNum <= 0) {
        setIsDeploying(false);
        return;
      }
      const weiValue = BigInt(Math.floor(wagerNum * 1e18)).toString();
      await onCreate(maxPlayers, impostorCount, weiValue, aiAgentCount > 0 ? aiAgentCount : undefined);
    } catch (err) {
      console.error("Wager conversion error:", err);
      setIsDeploying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="bg-[#0d1117] border border-white/[0.08] rounded-2xl p-6 max-w-md w-full shadow-2xl relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">
            New Room
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] flex items-center justify-center text-white/40 hover:text-white transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5">
          {/* Max Players */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-medium text-white/50">Players</label>
              <span className="text-sm font-bold text-cyan-400 font-mono">{maxPlayers}</span>
            </div>
            <div className="flex gap-1.5 bg-white/[0.03] p-1 rounded-xl border border-white/[0.06]">
              {playerOptions.map((num) => (
                <button
                  key={num}
                  onClick={() => setMaxPlayers(num)}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                    maxPlayers === num
                      ? "bg-cyan-500 text-gray-900 shadow-lg shadow-cyan-500/20"
                      : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Impostors */}
          <div>
            <label className="text-xs font-medium text-white/50 block mb-2.5">Impostors</label>
            <div className="flex gap-2">
              {([
                { count: 1, label: "Classic", colorId: 0 },
                { count: 2, label: "Standard", colorId: 1 },
                { count: 3, label: "Chaos", colorId: 2 },
              ] as const).map(({ count, label, colorId }) => (
                <button
                  key={count}
                  onClick={() => setImpostorCount(count)}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${
                    impostorCount === count
                      ? "bg-red-500/10 border-red-500/40 shadow-[0_0_12px_-4px_rgba(239,68,68,0.3)]"
                      : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]"
                  }`}
                >
                  <div className="w-7 h-7">
                    <AmongUsSprite colorId={colorId} size={28} />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className={`text-xs font-bold ${impostorCount === count ? "text-red-400" : "text-white/30"}`}>
                      {count} {count === 1 ? "Impostor" : "Impostors"}
                    </span>
                    <span className={`text-[9px] ${impostorCount === count ? "text-red-400/60" : "text-white/15"}`}>
                      {label}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Bots */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-medium text-white/50">Bots</label>
              <span className="text-sm font-bold text-purple-400 font-mono">{aiAgentCount}</span>
            </div>
            <input
              type="range"
              min={0}
              max={maxAI}
              value={aiAgentCount}
              onChange={(e) => setAiAgentCount(parseInt(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/[0.06] accent-purple-500"
            />
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-white/25">0 (Manual only)</span>
              <span className="text-[10px] text-white/25">{maxAI} max</span>
            </div>
            <p className="text-[10px] text-white/25 mt-1 leading-relaxed">
              Server-side bots that join automatically. You spectate.
            </p>
          </div>

          {/* Wager */}
          <div>
            <label className="text-xs font-medium text-white/50 block mb-2.5">Wager</label>
            <div className="relative">
              <input
                type="text"
                value={wager}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                    setWager(val);
                  }
                }}
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl py-3 px-4 text-lg font-bold text-white font-mono placeholder-white/20 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                placeholder="0.00"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-white/25 font-mono">$CREW</span>
            </div>
            <p className="text-[10px] text-white/25 mt-2 leading-relaxed">
              Staked on-chain. Distributed to winners on game completion.
            </p>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                  {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <motion.button
            onClick={handleCreate}
            disabled={isDeploying}
            className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 ${
              isDeploying
                ? "bg-white/10 text-white/40 cursor-wait"
                : "bg-white text-gray-900 hover:bg-gray-100 active:scale-[0.98]"
            }`}
            whileTap={!isDeploying ? { scale: 0.98 } : {}}
          >
            {isDeploying ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              "Create Room"
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
