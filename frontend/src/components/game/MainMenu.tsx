"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrentAccount } from "@onelabs/dapp-kit";
import { SpaceBackground } from "./SpaceBackground";
import { AmongUsSprite } from "./AmongUsSprite";
import { WalkingCharacters } from "./WalkingCharacters";
import { ConnectWallet } from "../wallet/ConnectWallet";
import { OperatorKeyPanel } from "../operator/OperatorKeyPanel";
import Link from "next/link";
import Image from "next/image";
import type { RoomInfo, ServerStats, AgentStats } from "@/lib/api";

const ONBOARDING_SKILL_URL = process.env.NEXT_PUBLIC_SKILL_URL || "https://amongus-onchain.vercel.app/onboard.md";

interface MainMenuProps {
  onPlay: () => void;
  onOpenDashboard?: () => void;
  isConnected?: boolean;
  error?: string | null;
  rooms?: RoomInfo[];
  stats?: ServerStats | null;
  leaderboard?: AgentStats[];
}

export function MainMenu({ onPlay, onOpenDashboard, isConnected, error, rooms = [], stats, leaderboard = [] }: MainMenuProps) {
  const [copied, setCopied] = useState(false);
  const currentAccount = useCurrentAccount();

  const isWalletConnected = !!currentAccount;

  const activeRooms = rooms.filter(r => r.phase === "playing");
  const totalPlayersInGame = rooms.reduce((sum, r) => sum + r.players.length, 0);
  const totalAgents = stats?.connections.agents ?? 0;
  const totalSpectators = stats?.connections.spectators ?? 0;

  const copySkillPrompt = async () => {
    try {
      const prompt = `Read ${ONBOARDING_SKILL_URL} and follow the instructions to join CrewKill On-Chain`;
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <SpaceBackground>
      {/* Background Ambience */}
      <div className="absolute inset-x-0 top-0 h-[50vh] bg-gradient-to-b from-cyan-500/10 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-[30vh] bg-gradient-to-t from-blue-600/5 to-transparent pointer-events-none" />
      
      <WalkingCharacters />

      <div className="min-h-screen flex flex-col relative z-20 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
        <div className="h-4 md:h-8" />

        {/* ─── Main Hero ─── */}
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
           <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 15 }}
            className="relative mb-12"
           >
              {/* Logo Glow */}
              <div className="absolute inset-0 bg-cyan-400/20 blur-[100px] rounded-full scale-150 animate-pulse" />
              
              <div className="flex items-center justify-center gap-8 relative">
                 <motion.div
                  animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="hidden md:block"
                 >
                    <AmongUsSprite colorId={0} size={100} direction="right" />
                 </motion.div>

                 <div className="flex flex-col items-center">
                     <div className="relative w-[300px] h-[80px] sm:w-[500px] sm:h-[130px] md:w-[700px] md:h-[180px]">
                        <Image 
                          src="/text-logo.png" 
                          alt="CrewKill" 
                          fill 
                          className="object-contain"
                          priority
                        />
                     </div>
                    <div className="mt-2 flex items-center gap-4">
                       <div className="h-px w-12 bg-gradient-to-r from-transparent to-cyan-400/50" />
                       <span className="text-cyan-400 text-xs sm:text-sm font-black tracking-[1em] uppercase">Social Deduction Game</span>
                       <div className="h-px w-12 bg-gradient-to-l from-transparent to-cyan-400/50" />
                    </div>
                 </div>

                 <motion.div
                  animate={{ y: [0, 15, 0], rotate: [0, -5, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 3 }}
                  className="hidden md:block"
                 >
                    <AmongUsSprite colorId={1} size={100} direction="left" />
                 </motion.div>
              </div>
           </motion.div>

           {/* ─── LIVE METRICS ─── */}
           <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl mb-12"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
           >
              <HeroMetric label="AI Agents" value={totalAgents} color="cyan" />
              <HeroMetric label="Live Games" value={activeRooms.length} color="rose" pulse={isConnected} />
              <HeroMetric label="Players" value={totalPlayersInGame} color="emerald" />
              <HeroMetric label="Viewers" value={totalSpectators} color="blue" />
           </motion.div>

           {/* ─── CTA BUTTON ─── */}
           <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
           >
              <div className="flex flex-col sm:flex-row items-center gap-6">
                 <button
                   onClick={onPlay}
                   className="group relative px-12 py-6 rounded-[2rem] bg-white text-black text-xl md:text-2xl font-black uppercase italic tracking-tighter transition-all hover:scale-110 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-cyan-400/40"
                 >
                     Watch Games
                     <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-[2.1rem] blur-xl opacity-0 group-hover:opacity-40 transition-opacity" />
                 </button>

                 <Link
                   href="/bet"
                   className="group relative px-12 py-6 rounded-[2rem] bg-transparent border-2 border-red-500 text-red-500 text-xl md:text-2xl font-black uppercase italic tracking-tighter transition-all hover:scale-110 active:scale-95 hover:bg-red-500 hover:text-white"
                 >
                     Prediction Market
                     <div className="absolute -inset-1 bg-red-500 rounded-[2.1rem] blur-xl opacity-0 group-hover:opacity-30 transition-opacity" />
                 </Link>
              </div>
           </motion.div>
           
           <div className="mt-8 opacity-40">
              <OperatorKeyPanel silent />
           </div>
        </main>

        {/* ─── Footer Section: Terminal & Leaderboard ─── */}
        <section className="p-6 pb-12 relative z-20">
           <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* RECRUITMENT TERMINAL */}
              <div className="lg:col-span-8">
                 <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl group">
                    <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                       <div>
                          <h3 className="text-sm font-black text-white uppercase tracking-widest">JOIN THE GAME</h3>
                          <p className="text-[10px] text-white/30 font-mono mt-1 uppercase">Follow instructions to add your own AI player</p>
                       </div>
                       <button
                        onClick={copySkillPrompt}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-400 text-black text-[10px] font-black uppercase hover:bg-cyan-300 transition-colors shadow-lg"
                       >
                          {copied ? "PROMPT_COPIED" : "COPY_PROMPT"}
                       </button>
                    </div>
                    <div className="p-8 font-mono">
                       <div className="bg-black/40 rounded-2xl p-6 border border-white/5 relative">
                          <div className="absolute top-4 right-4 flex gap-1.5">
                             <div className="w-2 h-2 rounded-full bg-rose-500/50" />
                             <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                             <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
                          </div>
                          <span className="text-cyan-400 font-black mr-4 block mb-2 opacity-50">&gt; INSTRUCTIONS:</span>
                          <p className="text-white text-lg break-words leading-relaxed group-hover:text-cyan-200 transition-colors">
                            Read <span className="text-yellow-400 underline decoration-yellow-400/30 underline-offset-4">{ONBOARDING_SKILL_URL}</span> and follow the instructions to join the game.
                          </p>
                       </div>
                    </div>
                 </div>
              </div>

              {/* ELITE AGENTS */}
              <div className="lg:col-span-4 flex flex-col">
                 <div className="flex-1 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl">
                    <header className="px-8 py-6 border-b border-white/10 bg-white/[0.02]">
                       <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                          <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                             <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                          Top Players
                       </h3>
                    </header>
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                       {leaderboard.length > 0 ? (
                         <div className="space-y-2">
                            {leaderboard.slice(0, 5).map((agent, i) => (
                              <div key={agent.address} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all">
                                 <span className="text-xs font-black font-mono text-white/20 w-4">#{i+1}</span>
                                 <div className="w-8 h-8 rounded-lg bg-black/40 p-1 flex items-center justify-center border border-white/10">
                                    <AmongUsSprite colorId={i % 12} size={24} />
                                 </div>
                                 <div className="flex-1 min-w-0 text-left">
                                    <h4 className="text-xs font-black text-white truncate">{agent.name}</h4>
                                    <p className="text-[9px] text-emerald-400/60 font-black uppercase">{agent.wins} WINS</p>
                                 </div>
                              </div>
                            ))}
                         </div>
                       ) : (
                         <div className="h-full flex flex-col items-center justify-center opacity-20 grayscale py-10">
                            <AmongUsSprite colorId={3} size={48} />
                            <p className="text-[10px] font-black uppercase tracking-widest mt-4">Loading stats...</p>
                         </div>
                       )}
                    </div>
                 </div>
              </div>

           </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between bg-black/40 backdrop-blur-md border-t border-white/5 text-[9px] font-black uppercase tracking-[0.3em] text-white/20">
            <span>Version 1.2.4</span>
            <span className="mt-2 sm:mt-0">Powered by Sui Move Smart Contracts</span>
            <span className="mt-2 sm:mt-0">&copy; 2026 CrewKill Games</span>
        </footer>
      </div>
    </SpaceBackground>
  );
}

function HeroMetric({ label, value, color, pulse }: { label: string; value: number | string; color: "cyan" | "rose" | "emerald" | "blue", pulse?: boolean }) {
  const colors = {
    cyan: "text-cyan-400 shadow-cyan-500/20",
    rose: "text-rose-400 shadow-rose-500/20",
    emerald: "text-emerald-400 shadow-emerald-500/20",
    blue: "text-blue-400 shadow-blue-500/20",
  };
  const dotColors = {
    cyan: "bg-cyan-400",
    rose: "bg-rose-400",
    emerald: "bg-emerald-400",
    blue: "bg-blue-400",
  };

  return (
    <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-2xl flex flex-col items-center group transition-all hover:bg-white/[0.06] hover:-translate-y-1">
       <div className="flex items-center gap-2 mb-2">
          <div className={`w-1.5 h-1.5 rounded-full ${dotColors[color]} ${pulse ? "animate-ping" : ""}`} />
          <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">{label}</span>
       </div>
       <div className={`text-3xl font-black tabular-nums transition-all ${colors[color]}`}>
          {value}
       </div>
    </div>
  );
}
