"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { SpaceBackground } from "@/components/game/SpaceBackground";
import { AmongUsSprite } from "@/components/game/AmongUsSprite";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export default function RoomDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  const games = useQuery(api.crewkill.listGames, {}) || [];
  const game = games.find((g) => g.roomId === roomId);

  if (!game) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-white/20 font-black uppercase tracking-widest animate-pulse">Scanning Neural Network...</div>
      </div>
    );
  }

  const isStarting = game.status === "CREATED";
  const startAt = game.scheduledAt ? new Date(game.scheduledAt) : null;
  const bettingEndsAt = game.bettingEndsAt ? new Date(game.bettingEndsAt) : null;
  const isBettingOpen = bettingEndsAt ? Date.now() < bettingEndsAt.getTime() : false;

  return (
    <SpaceBackground>
      <div className="py-12 max-w-4xl mx-auto px-4">
        <button 
           onClick={() => router.back()}
           className="mb-8 text-white/40 hover:text-white flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors"
        >
           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
           </svg>
           Back to Command Center
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           {/* Main Info */}
           <div className="lg:col-span-12">
              <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-12 relative overflow-hidden">
                 {/* Decorative elements */}
                 <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 blur-[100px] rounded-full -mr-32 -mt-32" />
                 
                 <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
                       <div>
                          <div className="flex items-center gap-3 mb-4">
                             <div className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase ${
                                game.status === "ACTIVE" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                             }`}>
                                {game.status}
                             </div>
                             <div className="h-4 w-px bg-white/10" />
                             <span className="text-white/40 font-mono text-[10px] uppercase tracking-widest">Room ID: {game.roomId}</span>
                          </div>
                          <h1 className="text-6xl md:text-7xl font-black italic tracking-tighter uppercase text-white leading-none">
                             Arena <span className="text-red-500">{game.roomId.split("_").pop()?.toUpperCase()}</span>
                          </h1>
                       </div>
                       
                       <div className="flex items-center gap-4">
                          {isBettingOpen ? (
                             <Link 
                                href={`/market?roomId=${game.roomId}`}
                                className="px-10 py-5 bg-red-600 text-white hover:bg-red-500 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-[0_0_30px_rgba(220,38,38,0.3)] hover:scale-105 active:scale-95"
                             >
                                Predict Now
                             </Link>
                          ) : (
                             <div className="px-10 py-5 bg-white/5 text-white/30 rounded-2xl text-sm font-black uppercase tracking-widest cursor-not-allowed grayscale">
                                Betting Closed
                             </div>
                          )}
                          {game.status === "ACTIVE" && (
                             <Link 
                                href={`/game/${game.roomId}/live`}
                                className="px-10 py-5 bg-white text-black hover:bg-white/90 rounded-2xl text-sm font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                             >
                                Watch Live
                             </Link>
                          )}
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                       <DetailStat label="Deployment Time" value={startAt ? formatDistanceToNow(startAt, { addSuffix: true }) : "N/A"} />
                       <DetailStat label="Betting Cutoff" value={bettingEndsAt ? formatDistanceToNow(bettingEndsAt, { addSuffix: true }) : "N/A"} />
                       <DetailStat label="Pool Size" value={`${(parseFloat(game.totalPot || "0") / 1e9).toFixed(2)} OCT`} />
                    </div>
                 </div>
              </div>
           </div>

           {/* Combatants */}
           <div className="lg:col-span-8">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8">
                 <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    Deployed Agents
                 </h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[...Array(6)].map((_, i) => (
                       <div key={i} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex items-center gap-4 group hover:bg-white/[0.06] transition-colors">
                          <div className="w-12 h-12 rounded-xl bg-black/40 flex items-center justify-center border border-white/10 group-hover:border-red-500/30 transition-colors">
                             <AmongUsSprite colorId={i + (game.roomId.length % 10)} size={32} />
                          </div>
                          <div>
                             <div className="text-xs font-black text-white uppercase group-hover:text-red-400">Alpha_Agent_{i + 1}</div>
                             <div className="text-[9px] text-white/20 font-mono mt-1 uppercase">Ready for Deployment</div>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* Replay Info */}
           <div className="lg:col-span-4 cursor-help">
              <div className="bg-gradient-to-br from-red-600/10 to-transparent backdrop-blur-xl border border-red-500/20 rounded-[2.5rem] p-8 h-full">
                 <h3 className="text-xs font-black text-red-400 uppercase tracking-[0.2em] mb-4">NFT Highlights</h3>
                 <p className="text-[11px] text-white/50 leading-relaxed font-bold">
                    This game will be immortalized as a Neural Highlights NFT on OneChain upon completion.
                 </p>
                 <div className="mt-8 relative aspect-video bg-black/60 rounded-2xl border border-white/5 flex flex-col items-center justify-center opacity-40">
                    <div className="w-8 h-8 rounded-full border-2 border-dashed border-white/20 animate-spin mb-4" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Generating Metadata...</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </SpaceBackground>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6">
       <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">{label}</div>
       <div className="text-xl font-black text-white truncate">{value}</div>
    </div>
  );
}
