"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AmongUsSprite } from "../game/AmongUsSprite";
import { getExplorerTxUrl, getExplorerObjectUrl } from "@/lib/onechain";

interface AutomationSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  creationDigest?: string;
  onEnter: () => void;
}

export function AutomationSuccessModal({
  isOpen,
  onClose,
  roomId,
  creationDigest,
  onEnter,
}: AutomationSuccessModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-xl bg-[#0d141e] border-2 border-cyan-400/30 overflow-hidden shadow-[0_0_100px_rgba(34,211,238,0.2)]"
          >
            {/* Top scanning line decoration */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-400 animate-pulse" />
            
            <div className="p-8 md:p-12 text-center">
              <div className="flex justify-center mb-8">
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="relative"
                >
                  <div className="absolute inset-0 bg-cyan-400/20 blur-2xl rounded-full" />
                  <AmongUsSprite colorId={4} size={100} />
                </motion.div>
              </div>

              <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">
                Mission <span className="text-cyan-400">Initialized</span>
              </h2>
              
              <p className="text-cyan-400/60 font-black uppercase tracking-[0.2em] text-xs mb-8">
                Yay! The game has been created and agents are joining the lobby.
              </p>

              <div className="space-y-4 mb-10">
                <div className="bg-white/5 border border-white/10 p-4 text-left group hover:border-cyan-400/50 transition-colors">
                  <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Contract Address</div>
                  <div className="flex items-center justify-between gap-4">
                    <code className="text-cyan-300 font-mono text-xs truncate">
                      {roomId}
                    </code>
                    <a 
                      href={getExplorerObjectUrl(roomId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-[10px] font-black text-cyan-400 hover:text-white uppercase tracking-widest bg-cyan-400/10 px-3 py-1.5 transition-colors border border-cyan-400/20"
                    >
                      View explorer
                    </a>
                  </div>
                </div>

                {creationDigest && (
                  <div className="bg-white/5 border border-white/10 p-4 text-left group hover:border-cyan-400/50 transition-colors">
                    <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Creation Transaction</div>
                    <div className="flex items-center justify-between gap-4">
                      <code className="text-white/60 font-mono text-[10px] truncate">
                        {creationDigest}
                      </code>
                      <a 
                        href={getExplorerTxUrl(creationDigest)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest transition-colors"
                      >
                        Details &gt;
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-4">
                <button
                  onClick={onEnter}
                  className="w-full py-6 bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-[0.3em] text-lg transition-all shadow-[0_0_40px_rgba(34,211,238,0.3)] hover:scale-[1.02] active:scale-98"
                >
                  Enter Mission Control
                </button>
                
                <button
                  onClick={onClose}
                  className="text-[10px] font-black text-white/20 hover:text-white/40 uppercase tracking-[0.4em] transition-colors py-2"
                >
                  Dismiss
                </button>
              </div>
            </div>

            {/* Tactical grid background overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(34,211,238,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.2)_1px,transparent_1px)] bg-[length:20px_20px]" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
