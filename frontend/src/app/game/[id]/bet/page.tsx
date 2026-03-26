"use client";

import { useQuery } from "convex/react";
import { api as convexApi } from "../../../../../convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { SpaceBackground } from "@/components/game/SpaceBackground";
import { PredictionMarket } from "@/components/game/PredictionMarket";
import { TradingTerminal } from "@/components/game/TradingTerminal";
import { useGameServer } from "@/hooks/useGameServer";
import { useEffect, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { GameLogPanel, TaskBar } from "@/components/game";
import { MarketProvider } from "@/components/game/MarketContext";
import { TotalSalesChart } from "@/components/ui/total-sales-chart";
import { TotalSalesChart } from "@/components/ui/total-sales-chart";

export default function GameBettingPage() {
  return (
    <MarketProvider>
       <GameBettingContent />
    </MarketProvider>
  );
}

function GameBettingContent() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  const { 
    isConnected, 
    currentRoom, 
    joinRoom, 
    phase: wsPhase,
    players,
    logs,
    tasksCompleted,
    totalTasks
  } = useGameServer();

  const games = useQuery(convexApi.crewkill.listGames, {}) || [];
  const dbGame = games.find((g) => g.roomId === roomId || g.marketId === roomId);
  const actualRoomId = dbGame?.roomId || roomId;

  useEffect(() => {
    if (isConnected && (!currentRoom || currentRoom.roomId !== actualRoomId)) {
      joinRoom(actualRoomId, true);
    }
  }, [isConnected, actualRoomId, currentRoom, joinRoom]);

  const displayId = useMemo(() => {
    if (!dbGame) return "";
    if (dbGame.marketId) return dbGame.marketId;
    if (dbGame.roomId.startsWith('0x')) return dbGame.roomId;
    let hash = 0;
    for (let i = 0; i < dbGame.roomId.length; i++) {
        hash = ((hash << 5) - hash) + dbGame.roomId.charCodeAt(i);
        hash |= 0;
    }
    return `0x${Math.abs(hash).toString(16).padEnd(64, '0')}`;
  }, [dbGame]);

  if (!dbGame) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-white/20 font-black uppercase tracking-[0.5em] animate-pulse">Establishing Connection to Prediction Market...</div>
      </div>
    );
  }

  const marketPlayers = (currentRoom?.players?.length ? currentRoom.players : (dbGame.players || [])).map((p: any) => ({
    address: p.address,
    name: p.name || `Player ${p.address.slice(-4)}`,
    isAlive: p.isAlive ?? true,
    colorId: p.colorId,
    agentPersona: p.agentPersona
  }));

  const gamePhaseNum = wsPhase || (dbGame.status === "COMPLETED" ? 7 : 0);

  return (
    <SpaceBackground>
      <div className="min-h-screen pt-12 pb-8 px-6 md:px-12 relative z-10 w-full font-sans">
        <div className="max-w-[1800px] mx-auto">
          {/* Dashboard Header */}
          <header className="mb-10">
            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
              <div className="flex items-center gap-4 mb-4 text-[10px] font-black uppercase tracking-[0.4em] text-white/30">
                <Link href="/market" className="hover:text-red-500 transition-colors">Prediction Markets</Link>
                <span>&gt;</span>
                <span className="text-white">MISSION_#{displayId.slice(-8).toUpperCase()}</span>
              </div>
              
              <div className="flex flex-col lg:flex-row justify-between items-end gap-12">
                <div className="flex-1">
                   <h2 className="text-[11px] font-black text-red-500 uppercase tracking-[0.5em] mb-4 flex items-center gap-3 font-space">
                     <span className={`w-2.5 h-2.5 ${dbGame.status === "CREATED" ? "bg-red-600 animate-pulse" : "bg-white/20"} shadow-[0_0_15px_rgba(220,38,38,0.5)]`} />
                     {dbGame.status === "CREATED" ? "LIVE_DEPLOYMENT_ACTIVE" : "MISSION_TERMINATED_PREDICTIONS_CLOSED"}
                   </h2>
                   <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase leading-none font-space max-w-4xl">
                     {dbGame.status === "CREATED" ? (
                       <>WHO IS THE <span className="text-red-500">IMPOSTOR?</span></>
                     ) : (
                       <>GAME OVER / <span className="text-white/40">PREDICTION OVER</span></>
                     )}
                   </h1>
                </div>

                 <div className="hidden lg:flex flex-col gap-6 items-end pb-2">
                    <div className="flex items-center gap-6">
                       <div className="text-right">
                         <div className="text-[9px] text-white/20 uppercase font-black tracking-[0.3em] leading-none mb-2 font-space">HEDGING_STATUS</div>
                         <div className={`text-[11px] font-black tracking-widest font-space uppercase ${
                           dbGame.status === "CREATED" ? "text-emerald-400" : "text-white/20"
                         }`}>
                           {dbGame.status === "CREATED" ? "SECURE_LINK_VERIFIED" : "LINK_TERMINATED"}
                         </div>
                       </div>
                       <div className={`w-12 h-12 border flex items-center justify-center backdrop-blur-md ${
                         dbGame.status === "CREATED" ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/10 bg-white/5"
                       }`}>
                         <div className={`w-2.5 h-2.5 ${
                           dbGame.status === "CREATED" ? "bg-emerald-500 animate-ping" : "bg-white/20"
                         }`} />
                       </div>
                    </div>
                 </div>
              </div>
            </motion.div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
             {/* Left Panel: The Market & Outcomes (8/12) */}
              <div className="lg:col-span-8 space-y-8">
                  <PredictionMarket 
                    gameId={dbGame.roomId}
                    marketObjectId={dbGame.marketId || dbGame.roomId}
                    gamePlayers={marketPlayers}
                    isResolved={dbGame.status === "COMPLETED" || dbGame.status === "ENDED"}
                    actualImpostors={[]} 
                    gamePhase={gamePhaseNum}
                    creationDigest={currentRoom?.creationDigest}
                  />
              </div>

             {/* Right Panel: Trading Terminal & Intel (4/12) */}
              <div className="lg:col-span-4 flex flex-col gap-8 relative">
                <TradingTerminal 
                   gameId={dbGame.roomId}
                   marketObjectId={dbGame.marketId || dbGame.roomId}
                   gamePlayers={marketPlayers}
                   gamePhase={gamePhaseNum}
                />

                <TotalSalesChart />

                <section className="bg-white/[0.03] border border-white/10 backdrop-blur-3xl overflow-hidden p-0 h-fit">
                   <div className="bg-red-600/10 border-b border-white/5 p-4 md:p-6">
                      <h3 className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em] flex items-center gap-3 font-space">
                         <span className="w-1.5 h-1.5 bg-red-500" />
                         Mission Intel
                      </h3>
                   </div>
                   <div className="p-6 space-y-6">
                      <TaskBar completed={tasksCompleted} total={totalTasks} />
                      
                      <div className="space-y-4 pt-4 border-t border-white/5">
                         <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest font-space">
                            <span className="text-white/20">Active Operatives</span>
                            <span className="text-white">{players.filter(p => p.isAlive).length} / {players.length}</span>
                         </div>
                         <div className="h-2 w-full bg-white/5 overflow-hidden">
                            <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${(players.filter(p => p.isAlive).length / Math.max(1, players.length)) * 100}%` }}
                               className="h-full bg-emerald-500 shadow-[0_0_10px_#10b981]"
                            />
                         </div>
                      </div>

                      <div className="bg-black/60 border border-white/5 p-4">
                         <h4 className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em] mb-4 font-space">Comms Feed</h4>
                         <GameLogPanel logs={logs} maxHeight="300px" />
                      </div>
                   </div>
                </section>
                
                {dbGame.status === "CREATED" && (
                  <button 
                      onClick={() => router.push(`/game/${actualRoomId}/live`)}
                      className="w-full h-20 bg-white/5 border border-white/10 hover:border-red-500/40 hover:bg-black group transition-all duration-500 flex items-center justify-between px-10 relative overflow-hidden"
                  >
                      <div className="relative z-10">
                          <span className="block text-[10px] font-black text-white/20 uppercase tracking-[0.4em] group-hover:text-red-500 transition-colors">Switch_Interface</span>
                          <span className="block text-xl font-black text-white uppercase tracking-tighter mt-1 font-space">Live Map Feed</span>
                      </div>
                      <svg className="w-6 h-6 text-white group-hover:translate-x-2 transition-transform relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                      <div className="absolute inset-0 bg-red-600/5 opacity-0 group-hover:opacity-100 transition-opacity translate-x-12 group-hover:translate-x-0 transition-transform duration-700" />
                  </button>
                )}
             </div>
          </div>
        </div>
      </div>
    </SpaceBackground>
  );
}
