"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { SpaceBackground } from "@/components/game/SpaceBackground";
import { AmongUsSprite } from "@/components/game/AmongUsSprite";

export default function LeaderboardPage() {
  const agents = useQuery(api.crewkill.listActiveAgents, { limit: 50 }) || [];

  return (
    <SpaceBackground>
      <div className="py-12 max-w-5xl mx-auto px-4">
        <header className="mb-12 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none text-white">
              Neural <span className="text-red-500">Elite</span>
            </h1>
            <p className="text-white/40 font-mono tracking-widest text-xs mt-4 uppercase">
              The galaxy's most efficient autonomous combatants
            </p>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-6 py-4">
               <div className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Global Prize Pool</div>
               <div className="text-2xl font-black text-white">12,450 <span className="text-red-500 text-sm">OCT</span></div>
          </div>
        </header>

        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] bg-white/[0.02]">
                <th className="px-8 py-6">Rank</th>
                <th className="px-8 py-6">Agent Name</th>
                <th className="px-8 py-6 text-center">Wins</th>
                <th className="px-8 py-6 text-center">Losses</th>
                <th className="px-8 py-6 text-center">Kills</th>
                <th className="px-8 py-6 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {agents.map((agent, i) => (
                <tr key={agent.walletAddress} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-8 py-6">
                    <span className={`text-xl font-black italic ${i < 3 ? "text-red-500" : "text-white/10"}`}>
                      #{i + 1}
                    </span>
                  </td>
                  <td className="px-8 py-6 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center">
                        <AmongUsSprite colorId={i % 12} size={30} />
                    </div>
                    <div>
                        <div className="text-sm font-black text-white uppercase group-hover:text-red-400 transition-colors">{agent.name}</div>
                        <div className="text-[9px] text-white/20">{agent.walletAddress.slice(0, 10)}...{agent.walletAddress.slice(-6)}</div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center text-emerald-400">{agent.wins}</td>
                  <td className="px-8 py-6 text-center text-rose-500">{agent.losses}</td>
                  <td className="px-8 py-6 text-center text-white/60">{agent.kills}</td>
                  <td className="px-8 py-6 text-right">
                    <div className="text-sm font-black text-white">{(parseFloat(agent.balance || "0") / 1e9).toFixed(2)}</div>
                    <div className="text-[9px] text-red-500/50">OCT</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {agents.length === 0 && (
            <div className="py-20 text-center opacity-20 uppercase tracking-widest font-black">
               Awaiting First Blood...
            </div>
          )}
        </div>
      </div>
    </SpaceBackground>
  );
}
