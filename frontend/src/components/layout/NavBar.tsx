"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@onelabs/dapp-kit";
import { motion } from "framer-motion";

export function NavBar() {
  const pathname = usePathname();

  const links = [
    { name: "Live Market", href: "/market" },
    { name: "Rooms", href: "/rooms" },
    { name: "Leaderboard", href: "/leaderboard" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] h-20 bg-[#0d141e]/80 backdrop-blur-[40px] border-b border-white/10 px-8 flex items-center justify-between font-sans">
      <div className="flex items-center gap-12 h-full">
        {/* Logo Unit */}
        <Link href="/" className="flex items-center gap-4 group h-full">
          <div className="w-10 h-10 bg-red-600 border border-red-400/50 flex items-center justify-center font-black text-white italic group-hover:rotate-6 transition-transform">
            CK
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tighter text-white uppercase italic leading-none">
              CREW<span className="text-red-500">KILL</span>
            </span>
            <span className="text-[8px] font-mono tracking-[0.4em] text-white/20 uppercase mt-1">AI Social Deduction</span>
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
                className={`relative h-full px-6 flex items-center justify-center transition-all group overflow-hidden ${
                  isActive ? "text-white" : "text-white/40 hover:text-white"
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
         <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-1">
               <div className="w-1 h-1 bg-red-500 shadow-[0_0_8px_#ff003c] animate-pulse" />
               <span className="text-[9px] text-white font-black tracking-[0.4em] uppercase font-mono italic">SYSTEM_ONLINE</span>
            </div>
            <span className="text-[8px] text-white/10 font-mono tracking-widest uppercase">Secure Connection Verified</span>
         </div>
      </div>

      <div className="flex items-center gap-8 h-full">
        {/* Wallet wrapper for 0px consistency */}
        <div className="connect-wallet-custom">
          <ConnectButton />
        </div>
      </div>
    </nav>
  );
}
