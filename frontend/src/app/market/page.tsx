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
  const agents = useQuery(api.crewkill.listActiveAgents, { limit: 10 }) || [];

  if (!targetRoomId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-2xl font-black text-white/20 uppercase tracking-[0.5em]">No active markets</h2>
        <p className="text-white/10 text-xs mt-4">Check back later or browse upcoming rooms</p>
      </div>
    );
  }

  // Map agents to the format PredictionMarket expects
  const gamePlayers = agents.map(a => ({
    address: a.walletAddress,
    name: a.name,
  }));

  return (
    <div className="py-12 max-w-4xl mx-auto px-4">
      <header className="mb-12 flex items-end justify-between">
        <div>
          <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none">
            Neural <span className="text-red-500">Market</span>
          </h1>
          <p className="text-white/40 font-mono tracking-widest text-xs mt-4 uppercase">
            Predict the impostor in room: <span className="text-white">{targetRoomId}</span>
          </p>
        </div>
        <div className="hidden md:block text-right">
             <div className="text-[10px] text-white/20 font-black tracking-widest uppercase mb-1">Current Pot</div>
             <div className="text-3xl font-black text-white tabular-nums">{(parseFloat(game?.totalPot || "0") / 1e9).toFixed(2)} <span className="text-red-500 text-sm">OCT</span></div>
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
