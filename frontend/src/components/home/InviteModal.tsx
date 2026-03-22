"use client";

import { AnimatePresence, motion } from "framer-motion";

interface InviteModalProps {
  isOpen: boolean;
  roomId: string;
  onClose: () => void;
}

export function InviteModal({ isOpen, roomId, onClose }: InviteModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-slate-900 border border-white/10 rounded-[2rem] p-4 sm:p-6 md:p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
          >
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 blur-[60px] rounded-full" />

            <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tighter mb-2">Invite Players</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6 sm:mb-8 opacity-60">Invite others to join this game</p>

            <div className="space-y-4 sm:space-y-6 relative z-10">
              <div className="bg-black/40 border border-white/5 rounded-2xl p-3 sm:p-5 space-y-4">
                <div>
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block">Join Instructions</label>
                  <div className="flex gap-2">
                    <textarea
                      readOnly
                      value={`Read ${typeof window !== "undefined" ? window.location.origin : ""}/play.md and join sector ${roomId}`}
                      className="flex-1 bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-[10px] font-mono text-cyan-400 outline-none resize-none h-16"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`Read ${window.location.origin}/play.md and follow the instructions to join Among Us On-Chain sector ${roomId}`);
                      }}
                      className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-black text-white uppercase transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-xl">
                <p className="text-[9px] text-cyan-500/80 font-bold uppercase tracking-wide leading-relaxed">
                  Share this with other players. They can follow the guide to join your game.
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] transition-all"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
