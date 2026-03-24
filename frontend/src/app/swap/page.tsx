"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowDown, Settings, RotateCcw, Info, ChevronDown, Repeat } from "lucide-react";
import Image from "next/image";
import { useSwap } from "@/hooks/useSwap";
import { useCurrentAccount } from "@onelabs/dapp-kit";
import { formatUnits, parseUnits } from "ethers"; // for simple bigdecimal format

// OCT (9 decimals), CREW (9 decimals)
const TOKENS = {
  OCT: {
    symbol: "OCT",
    name: "OneChain Token",
    logo: "/logo.png",
    decimals: 9,
  },
  CREW: {
    symbol: "CREW",
    name: "Crew Token",
    logo: "/text-logo.png",
    decimals: 9,
  }
};

export default function SwapPage() {
  const account = useCurrentAccount();
  const { reserves, fetchReserves, calculateAmountOut, swap } = useSwap();
  
  const [fromToken, setFromToken] = useState(TOKENS.OCT);
  const [toToken, setToToken] = useState(TOKENS.CREW);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    fetchReserves();
    const interval = setInterval(fetchReserves, 10000); // 10s refresh
    return () => clearInterval(interval);
  }, []);

  const handleSwapTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount("");
    setToAmount("");
  };

  useEffect(() => {
    if (fromAmount && !isNaN(parseFloat(fromAmount))) {
      const amountIn = parseUnits(fromAmount, 9).toString();
      const amountOut = calculateAmountOut(amountIn, fromToken.symbol === "OCT");
      setToAmount(formatUnits(amountOut, 9));
    } else {
      setToAmount("");
    }
  }, [fromAmount, fromToken, reserves]);

  const executeSwap = async () => {
    if (!fromAmount) return;
    setIsSwapping(true);
    try {
      const amountIn = parseUnits(fromAmount, 9).toString();
      const xToY = fromToken.symbol === "OCT";
      await swap(amountIn, xToY);
      alert("Swap successful!");
      setFromAmount("");
      fetchReserves();
    } catch (err) {
      console.error(err);
      alert("Swap failed. Check console.");
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] w-full flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-red-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-[480px] z-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-black tracking-tight text-white uppercase italic">
            Command <span className="text-red-500">Swap</span>
          </h1>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-white/60 hover:text-white"
            >
              <Settings size={20} />
            </button>
            <button 
              onClick={fetchReserves}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-white/60 hover:text-white"
            >
              <RotateCcw size={20} />
            </button>
          </div>
        </div>

        {/* Swap Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0a0f16]/80 backdrop-blur-2xl border border-white/10 rounded-[32px] p-4 shadow-2xl relative overflow-hidden"
        >
          {/* Sell Section */}
          <div className="bg-white/5 rounded-2xl p-6 mb-1 border border-transparent hover:border-white/5 group">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-white/40 group-hover:text-white/60 transition-colors">Sell</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-white/20 tracking-tighter uppercase font-bold">Reserves:</span>
                <span className="text-xs font-mono text-red-500/80 font-bold italic">
                  {reserves ? (fromToken.symbol === 'OCT' ? formatUnits(reserves.x, 9) : formatUnits(reserves.y, 9)) : '...'}
                </span>
                <button className="text-[10px] font-black italic text-red-500/40 hover:text-red-500 tracking-widest uppercase transition-colors">MAX</button>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input 
                  type="number" 
                  autoFocus
                  placeholder="0.00"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  className="bg-transparent border-none outline-none text-4xl w-full font-black text-white placeholder:text-white/10"
                />
              </div>
              
              <button 
                onClick={handleSwapTokens}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl py-2 px-3 transition-all active:scale-95 group/btn"
              >
                <span className="text-xl font-black italic tracking-tight">{fromToken.symbol}</span>
                <ChevronDown size={18} className="text-white/20 group-hover/btn:text-white transition-colors" />
              </button>
            </div>
          </div>

          {/* Switch Button */}
          <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <motion.button 
              whileHover={{ scale: 1.1, rotate: 180 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleSwapTokens}
              className="bg-[#0a0f16] border-4 border-[#0a0f16] shadow-xl p-2.5 rounded-2xl group transition-all"
            >
              <div className="p-2 rounded-xl bg-white/5 group-hover:bg-red-500 transition-colors">
                <ArrowDown size={20} className="group-hover:text-white text-red-500" />
              </div>
            </motion.button>
          </div>

          {/* Buy Section */}
          <div className="bg-white/5 rounded-2xl p-6 mt-1 border border-transparent hover:border-white/5 group">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-white/40 group-hover:text-white/60 transition-colors">Buy</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-white/20 tracking-tighter uppercase font-bold italic">Low Impact</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input 
                  type="number" 
                  readOnly
                  placeholder="0.00"
                  value={toAmount}
                  className="bg-transparent border-none outline-none text-4xl w-full font-black text-white/40"
                />
              </div>
              
              <button 
                onClick={handleSwapTokens}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl py-2 px-3 transition-all active:scale-95 group/btn"
              >
                <span className="text-xl font-black italic tracking-tight">{toToken.symbol}</span>
                <ChevronDown size={18} className="text-white/20 group-hover/btn:text-white transition-colors" />
              </button>
            </div>
          </div>

          {/* Action Button */}
          <motion.button
          whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(239, 68, 68, 0.4)" }}
            whileTap={{ scale: 0.98 }}
            disabled={!fromAmount || isSwapping || !account}
            onClick={executeSwap}
            className="w-full mt-4 py-6 rounded-[24px] bg-red-600 hover:bg-red-500 text-white font-black italic text-2xl uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(239, 68, 68, 0.2)] disabled:opacity-50 disabled:bg-white/5 transition-all flex items-center justify-center gap-3 group"
          >
            {isSwapping ? (
              <div className="flex items-center gap-2">
                <Repeat className="animate-spin" size={24} />
                <span>Processing...</span>
              </div>
            ) : (
              <>
                <Repeat className="group-hover:rotate-180 transition-transform duration-500" size={24} />
                <span>{account ? 'Execute Swap' : 'Connect Wallet'}</span>
              </>
            )}
          </motion.button>

          {/* Transaction Info */}
          <div className="mt-4 px-2 space-y-3">
             <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest text-white/30">
               <div className="flex items-center gap-1.5">
                 <Info size={12} />
                 <span>Exchange Rate</span>
               </div>
               <span>
                  {reserves 
                  ? `1 ${fromToken.symbol} ≈ ${calculateAmountOut(parseUnits('1', 9).toString(), fromToken.symbol === 'OCT') ? formatUnits(calculateAmountOut(parseUnits('1', 9).toString(), fromToken.symbol === 'OCT'), 9) : '0.00'} ${toToken.symbol}` 
                  : 'Fetching...'}
               </span>
             </div>
             
             <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest text-white/30">
               <div className="flex items-center gap-1.5">
                 <Repeat size={12} />
                 <span>Price Impact</span>
               </div>
               <span className="text-green-500/80 font-bold">&lt;0.01%</span>
             </div>
          </div>
        </motion.div>

        {/* Footer info */}
        <div className="mt-6 text-center">
          <p className="text-[10px] font-mono text-white/10 uppercase tracking-[0.4em] leading-relaxed">
            OneChain Liquidity Powered by CrewKill Engine v2.0 <br />
            Secure P2P Automated Market Maker Module 
          </p>
        </div>
      </div>
    </div>
  );
}
