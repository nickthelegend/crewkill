"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export interface PredictWinnerProps {
  onPredict: (team: "crewmates" | "impostors") => void;
  disabled?: boolean;
}

export function PredictWinner({ onPredict, disabled }: PredictWinnerProps) {
  const [selected, setSelected] = useState<"crewmates" | "impostors" | null>(null);

  const handleSelect = (team: "crewmates" | "impostors") => {
    setSelected(team);
    onPredict(team);
  };

  return (
    <div className="p-4 bg-gradient-to-r from-purple-500/[0.08] to-blue-500/[0.06] border border-purple-500/20 rounded-xl">
      <div className="text-xs text-purple-400/60 uppercase tracking-widest mb-2 text-center">
        Predict the Winner
      </div>
      <div className="text-[10px] text-white/40 mb-3 text-center">
        Make your prediction before the game starts
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Crewmates */}
        <motion.button
          onClick={() => !disabled && handleSelect("crewmates")}
          disabled={disabled}
          className={`p-3 rounded-lg border-2 transition-all ${
            selected === "crewmates"
              ? "border-cyan-500 bg-cyan-500/20"
              : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          whileHover={!disabled ? { scale: 1.02 } : {}}
          whileTap={!disabled ? { scale: 0.98 } : {}}
        >
          <div className="text-2xl mb-1">👷</div>
          <div className="text-xs font-bold text-white/90">Crewmates</div>
          {selected === "crewmates" && (
            <div className="mt-1 text-[9px] text-cyan-400 font-bold">✓ SELECTED</div>
          )}
        </motion.button>

        {/* Impostors */}
        <motion.button
          onClick={() => !disabled && handleSelect("impostors")}
          disabled={disabled}
          className={`p-3 rounded-lg border-2 transition-all ${
            selected === "impostors"
              ? "border-red-500 bg-red-500/20"
              : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          whileHover={!disabled ? { scale: 1.02 } : {}}
          whileTap={!disabled ? { scale: 0.98 } : {}}
        >
          <div className="text-2xl mb-1">🔪</div>
          <div className="text-xs font-bold text-white/90">Impostors</div>
          {selected === "impostors" && (
            <div className="mt-1 text-[9px] text-red-400 font-bold">✓ SELECTED</div>
          )}
        </motion.button>
      </div>

      {selected && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-center text-[10px] text-white/50"
        >
          {disabled
            ? `🔒 Prediction locked: ${selected === "crewmates" ? "👷 Crewmates" : "🔪 Impostors"}`
            : `Prediction locked in: ${selected === "crewmates" ? "👷 Crewmates" : "🔪 Impostors"}`
          }
        </motion.div>
      )}
    </div>
  );
}
