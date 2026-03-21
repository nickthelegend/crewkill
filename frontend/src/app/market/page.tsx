"use client"
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useSearchParams } from "next/navigation";
import { PredictionMarket } from "@/components/game/PredictionMarket";
import { SpaceBackground } from "@/components/game/SpaceBackground";
import { Suspense } from "react";
import { MARKET_REGISTRY_ID } from "@/lib/onechain";
import { motion } from "framer-motion";

function MarketContent() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get("roomId");

  const games = useQuery(api.crewkill.listGames, {}) || [];
  const targetRoomId = roomId || games.find(g => g.status === "CREATED")?.roomId;
  const game = useQuery(api.crewkill.getGameByRoomId, targetRoomId ? { roomId: targetRoomId } : "skip");

  if (!targetRoomId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <motion.div 
          className="w-32 h-32 rounded-none border border-white/10 flex items-center justify-center mb-12 relative group"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div className="absolute inset-0 bg-red-500/5 animate-pulse" />
          <svg className="w-12 h-12 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 5.882V19.297A7.477 7.477 0 005.188 17.07Q2.594 17.07 1 18.06V5.79q1.594-.99 4.188-.99a7.405 7.405 0 015.812 2.082zM13 5.882V19.297a7.477 7.477 0 015.812-2.227q2.594 0 4.188.99V5.79q-1.594-.99-4.188-.99a7.405 7.405 0 00-5.812 2.082z" />
          </svg>
        </motion.div>
        <h2 className="text-5xl md:text-6xl font-black text-white italic tracking-tighter uppercase leading-none mb-6">SIGNAL <span className="text-red-500">SILENCE</span></h2>
        <p className="text-white/20 font-mono tracking-[0.4em] text-[10px] max-w-sm uppercase leading-relaxed">System scan complete • No active prediction markets detected in local sector frequencies.</p>
      </div>
    );
  }

  const gamePlayers = (game?.players || []).map(p => ({
    address: p.address,
    name: p.name,
  }));

  return (
    <div className="py-20 md:py-32 max-w-7xl mx-auto px-6">
      <header className="mb-20">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="h-0.5 w-12 bg-red-500" />
            <p className="text-white/40 font-mono tracking-[0.3em] text-[10px] uppercase">
              SECTOR: {targetRoomId?.slice(-12).toUpperCase() || "LINK_PENDING"}
            </p>
          </div>
          <h1 className="text-7xl md:text-8xl font-black italic tracking-tighter uppercase leading-none text-white">
            NEURAL <span className="text-red-500">MARKET</span>
          </h1>
          <p className="text-white/20 font-mono tracking-[0.4em] text-[10px] mt-8 uppercase whitespace-nowrap overflow-hidden">
            High-stakes autonomous prediction floor • ANALYZING AGENT FREQUENCIES • 
          </p>
        </motion.div>
      </header>

      <div className="flex justify-center">
        <PredictionMarket 
          gameId={game?._id || ""}
          marketObjectId={MARKET_REGISTRY_ID}
          gamePlayers={gamePlayers}
          isResolved={game?.status === "DONE" || game?.status === "ENDED"}
          actualImpostors={[]} 
          gamePhase={game?.status === "CREATED" ? 0 : 2}
        />
      </div>
    </div>
  );
}

export default function MarketPage() {
  return (
    <SpaceBackground>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center font-mono text-[10px] tracking-[0.5em] text-white/20 uppercase animate-pulse">Syncing Neural link...</div>
        </div>
      }>
         <MarketContent />
      </Suspense>
    </SpaceBackground>
  );
}
