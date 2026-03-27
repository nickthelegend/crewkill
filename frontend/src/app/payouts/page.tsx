"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrentAccount } from "@onelabs/dapp-kit";
import { NavBar } from "@/components/layout/NavBar";
import { SpaceBackground } from "@/components/game/SpaceBackground";
import { AmongUsSprite } from "@/components/game/AmongUsSprite";
import { getExplorerTxUrl } from "@/lib/onechain";

interface Payout {
  id: string;
  amount: number;
  reason: string;
  date: number;
  status: "available" | "claimed";
}

export default function PayoutsPage() {
  const account = useCurrentAccount();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [successTx, setSuccessTx] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

  useEffect(() => {
    if (!account?.address) return;

    const fetchPayouts = async () => {
      try {
        const res = await fetch(`${API_URL}/api/payouts/${account.address}`);
        const data = await res.json();
        setPayouts(data);
      } catch (e) {
        console.error("Failed to fetch payouts:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchPayouts();
  }, [account?.address, API_URL]);

  const handleClaim = async (payout: Payout) => {
    if (!account?.address) return;
    setClaimingId(payout.id);
    setSuccessTx(null);

    try {
      const res = await fetch(`${API_URL}/api/payouts/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: account.address, amount: payout.amount }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessTx(data.digest);
        setPayouts((prev) =>
          prev.map((p) => (p.id === payout.id ? { ...p, status: "claimed" } : p))
        );
      } else {
        alert("Claim failed: " + (data.error || "Unknown error"));
      }
    } catch (e) {
      alert("Failed to connect to payout service.");
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <SpaceBackground>
      <div className="min-h-screen pt-24 px-8 pb-12 font-sans overflow-y-auto custom-scrollbar">
        <NavBar />
        
        <div className="max-w-5xl mx-auto mt-12">
          <header className="mb-16">
            <h1 className="text-6xl font-black text-white uppercase tracking-tighter leading-none mb-4">
              Mission <span className="text-red-500">Rewards</span>
            </h1>
            <p className="text-white/40 font-black uppercase tracking-[0.4em] text-xs">
              Collect your CREW tokens from mission bonuses and predictions.
            </p>
          </header>

          {!account ? (
            <div className="bg-white/5 border border-white/10 p-20 text-center backdrop-blur-xl">
              <div className="flex justify-center mb-8 opacity-20">
                <AmongUsSprite colorId={11} size={100} />
              </div>
              <h3 className="text-2xl font-black text-white/40 uppercase tracking-widest">Connect wallet to view rewards</h3>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-32">
               <div className="w-12 h-12 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid gap-6">
              <AnimatePresence mode="popLayout">
                {payouts.map((payout, i) => (
                  <motion.div
                    key={payout.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`relative p-8 border backdrop-blur-md flex items-center justify-between group transition-all ${
                      payout.status === "claimed" 
                        ? "bg-white/[0.02] border-white/5 opacity-60" 
                        : "bg-white/5 border-white/10 hover:border-red-500/50 hover:bg-white/[0.07]"
                    }`}
                  >
                    <div className="flex items-center gap-10">
                      <div className="w-20 h-20 bg-black/40 border border-white/5 flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-red-500/5 group-hover:bg-red-500/10 transition-colors" />
                        <AmongUsSprite colorId={payout.status === "claimed" ? 11 : 0} size={48} />
                      </div>
                      
                      <div>
                        <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-1 font-mono">
                          {new Date(payout.date).toLocaleDateString()} // Reward_{payout.id}
                        </div>
                        <h4 className="text-2xl font-black text-white uppercase tracking-tight mb-1">
                          {payout.reason}
                        </h4>
                        <div className="text-red-500 font-black text-xl font-mono">
                          +{payout.amount} $CREW
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      {payout.status === "available" ? (
                        <button
                          onClick={() => handleClaim(payout)}
                          disabled={!!claimingId}
                          className="px-10 py-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-black uppercase tracking-widest transition-all shadow-[0_0_30px_rgba(255,0,60,0.2)] hover:scale-110 active:scale-95"
                        >
                          {claimingId === payout.id ? "Processing..." : "Claim Reward"}
                        </button>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className="px-6 py-2 bg-white/10 border border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest">
                            Claimed
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Scanning line for unclaimed rewards */}
                    {payout.status === "available" && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 shadow-[0_0_15px_#ff003c]" />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {payouts.length === 0 && (
                <div className="text-center py-32 opacity-20 border border-dashed border-white/10">
                   <p className="text-white text-xs font-black uppercase tracking-[0.5em]">No Pending Rewards Found</p>
                </div>
              )}
            </div>
          )}

          {/* Success Overlay */}
          <AnimatePresence>
            {successTx && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="fixed bottom-12 right-12 z-[200] w-96 bg-emerald-500 text-black p-6 shadow-2xl flex items-center gap-6"
              >
                <div className="w-12 h-12 bg-black flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="font-black uppercase tracking-widest text-xs mb-1">Success! Rewards Sent</div>
                  <a 
                    href={getExplorerTxUrl(successTx)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-mono text-[9px] block truncate hover:underline"
                  >
                    TX_{successTx}
                  </a>
                </div>
                <button 
                  onClick={() => setSuccessTx(null)}
                  className="absolute top-2 right-2 opacity-50 hover:opacity-100"
                >
                  &times;
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 0, 60, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 0, 60, 0.5);
        }
      `}</style>
    </SpaceBackground>
  );
}
