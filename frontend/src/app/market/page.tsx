"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useSearchParams } from "next/navigation";
import { PredictionMarket } from "@/components/game/PredictionMarket";
import { SpaceBackground } from "@/components/game/SpaceBackground";
import { Suspense } from "react";
import { PACKAGE_ID, MARKET_REGISTRY_ID } from "@/lib/onechain";

function MarketContent() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get("roomId");

  // If no roomId, we look for the latest "CREATED" game
  const games = useQuery(api.crewkill.listGames, {}) || [];
  const targetRoomId = roomId || games.find(g => g.status === "CREATED")?.roomId;

  const game = useQuery(api.crewkill.getGameByRoomId, targetRoomId ? { roomId: targetRoomId } : "skip");

  if (!targetRoomId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-10 overflow-hidden relative group">
          <div className="absolute inset-0 bg-red-500/10 animate-pulse" />
          <svg className="w-10 h-10 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none mb-4">No active <span className="text-red-500">markets</span> found</h2>
        <p className="text-white/20 font-mono tracking-widest text-[10px] max-w-xs uppercase leading-relaxed">System scan complete • No high-stakes signatures detected in the current sector</p>
      </div>
    );
  }

  // Map agents to the format PredictionMarket expects
  const gamePlayers = (game?.players || []).map(p => ({
    address: p.address,
    name: p.name,
  }));

  return (
    <div className="py-12 max-w-4xl mx-auto px-4">
      <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-10">
        <div>
          <h1 className="text-6xl font-black italic tracking-tighter uppercase leading-none mb-4">
            Neural <span className="text-red-500">Market</span>
          </h1>
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
             <p className="text-white/40 font-mono tracking-[0.2em] text-[10px] uppercase">
               Mission Protocol: <span className="text-white">{targetRoomId}</span>
             </p>
          </div>
        </div>
        <div className="bg-white/5 backdrop-blur-3xl px-8 py-5 rounded-[2rem] border border-white/10 text-right">
             <div className="text-[9px] text-white/20 font-black tracking-[0.3em] uppercase mb-1 whitespace-nowrap">Global Contention Pool</div>
             <div className="text-4xl font-black text-white italic tracking-tighter tabular-nums leading-none">{(parseFloat(game?.totalPot || "0") / 1e9).toFixed(2)} <span className="text-red-500 text-sm not-italic ml-1">OCT</span></div>
        </div>
      </header>

      <div className="flex justify-center">
        <PredictionMarket 
          gameId={game?._id || ""}
          marketObjectId={MARKET_REGISTRY_ID} // Using Registry as placeholder or lookup
          gamePlayers={gamePlayers}
          isResolved={game?.status === "DONE"}
          actualImpostors={[]} // Will be filled from replay/convex after end
          gamePhase={game?.status === "CREATED" ? 0 : 2}
        />
      </div>
    </div>
  );
}

export default function MarketPage() {
  return (
    <SpaceBackground>
      <Suspense fallback={<div className="text-center py-20">Loading Neural link...</div>}>
         <MarketContent />
      </Suspense>
    </SpaceBackground>
  );
}
