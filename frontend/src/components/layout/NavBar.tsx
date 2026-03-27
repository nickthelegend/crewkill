"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton, useCurrentAccount } from "@onelabs/dapp-kit";
import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import { suiClient, CREW_TOKEN_TYPE } from "@/lib/onechain";
import { AmongUsSprite } from "../game/AmongUsSprite";

export function NavBar() {
  const pathname = usePathname();
  const account = useCurrentAccount();
  const [crewBalance, setCrewBalance] = useState<string>("0.00");

  useEffect(() => {
    if (!account?.address) return;

    const fetchBalance = async () => {
      try {
        const coins = await suiClient.getCoins({
          owner: account.address,
          coinType: CREW_TOKEN_TYPE,
        });
        const total = coins.data.reduce((acc, coin) => acc + BigInt(coin.balance), BigInt(0));
        setCrewBalance((Number(total) / 1e9).toFixed(2));
      } catch (e) {
        console.error("Failed to fetch balance:", e);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [account?.address]);

  const links = [
    { name: "Live Market", href: "/market" },
    { name: "Rooms", href: "/rooms" },
    { name: "Swap", href: "/swap" },
    { name: "Leaderboard", href: "/leaderboard" },
    { name: "Payouts", href: "/payouts" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] h-20 bg-[#0d141e]/80 backdrop-blur-[40px] border-b border-white/10 px-8 flex items-center justify-between font-sans">
      <div className="flex items-center gap-10 h-full">
        {/* Logo Unit */}
        <Link href="/" className="flex items-center gap-1 group h-full transition-all">

          <div className="flex flex-col ">
            <div className="relative h-16 w-72">
              <Image
                src="/text-logo.png"
                alt="CrewKill"
                fill
                className="object-contain object-left scale-110 origin-left"
              />
            </div>
          </div>
        </Link>

        {/* Navigation Grid */}
        <div className="hidden md:flex items-center h-full">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative h-full px-6 flex items-center justify-center transition-all group overflow-hidden ${isActive ? "text-white" : "text-white/40 hover:text-white"
                  }`}
              >
                <span className="text-[10px] font-black uppercase tracking-[0.3em] z-10 font-mono">
                  {link.name}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="navbar-active"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_10px_#ff003c]"
                  />
                )}
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            );
          })}
        </div>
      </div>

      <div className="hidden xl:flex items-center gap-4 border-l border-r border-white/5 px-12 h-full">

      </div>

      <div className="flex items-center gap-8 h-full">
        {/* Crew Balance and Imposter */}
        {account && (
          <div className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors group cursor-default">
            <div className="flex flex-col items-end">
              <span className="text-[8px] text-white/30 font-black uppercase tracking-widest font-mono group-hover:text-red-500 transition-colors">Crew Asset</span>
              <span className="text-sm font-black text-white font-mono">{crewBalance} <span className="text-[10px] text-red-500">$CREW</span></span>
            </div>
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 bg-red-500/20 blur-md rounded-full animate-pulse group-hover:bg-red-500/40 transition-colors" />
              <div className="-mt-1">
                <AmongUsSprite colorId={0} size={32} isMoving={true} />
              </div>
            </div>
          </div>
        )}

        {/* Wallet wrapper for 0px consistency */}
        <div className="connect-wallet-custom">
          <ConnectButton />
        </div>
      </div>
    </nav>
  );
}
