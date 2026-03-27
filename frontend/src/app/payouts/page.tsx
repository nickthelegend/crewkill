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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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
        setShowSuccessModal(true);
        setPayouts((prev) =>
          prev.map((p) => (p.id === payout.id ? { ...p, status: "claimed" } : p))
        );
      } else {
        setErrorMsg(data.error || "Unknown error");
      }
    } catch (e) {
      setErrorMsg("Failed to connect to payout service.");
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

          {/* Success Modal */}
          <AnimatePresence>
            {showSuccessModal && (
              <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowSuccessModal(false)}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />
                
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  className="relative w-full max-w-lg bg-[#050510] border border-emerald-500/30 p-12 overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.1)]"
                >
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
                  
                  <div className="flex flex-col items-center text-center">
                    <div className="w-24 h-24 bg-emerald-500/10 border border-emerald-500 rounded-full flex items-center justify-center mb-8 relative">
                      <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
                      <svg className="w-12 h-12 text-emerald-500 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>

                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">
                      Claim <span className="text-emerald-500">Confirmed</span>
                    </h2>
                    
                    <p className="text-white/40 font-mono text-sm mb-10 leading-relaxed max-w-xs mx-auto">
                      Your rewards have been processed successfully. Your balance will update in a few moments.
                    </p>

                    <div className="w-full bg-white/5 border border-white/10 p-6 mb-10 text-left">
                      <div className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 font-mono">
                        Transaction Proof
                      </div>
                      <a 
                        href={getExplorerTxUrl(successTx || "")} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-emerald-400 block truncate hover:underline hover:text-emerald-300 transition-colors"
                      >
                        {successTx}
                      </a>
                    </div>

                    <div className="flex flex-col w-full gap-4">
                      <a 
                        href={getExplorerTxUrl(successTx || "")} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest transition-all text-sm flex items-center justify-center gap-3"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View On Explorer
                      </a>
                      
                      <button 
                        onClick={() => setShowSuccessModal(false)}
                        className="w-full py-4 border border-white/10 hover:bg-white/5 text-white/60 font-black uppercase tracking-widest transition-all text-sm"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Error Modal */}
          <AnimatePresence>
            {errorMsg && (
              <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setErrorMsg(null)}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />
                
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  className="relative w-full max-w-md bg-[#050510] border border-red-500/30 p-10 overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.1)]"
                >
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent" />
                  
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-red-500/10 border border-red-500/50 rounded-full flex items-center justify-center mb-6">
                      <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>

                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">
                       Claim <span className="text-red-500">Failed</span>
                    </h2>
                    
                    <p className="text-white/50 font-mono text-xs mb-8 p-4 bg-red-500/5 border border-red-500/10 w-full">
                      {errorMsg}
                    </p>

                    <button 
                      onClick={() => setErrorMsg(null)}
                      className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest transition-all text-sm"
                    >
                      Understood
                    </button>
                  </div>
                </motion.div>
              </div>
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
