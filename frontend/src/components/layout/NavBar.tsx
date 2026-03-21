"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@onelabs/dapp-kit";

export function NavBar() {
  const pathname = usePathname();

  const links = [
    { name: "Live Market", href: "/market" },
    { name: "Rooms", href: "/rooms" },
    { name: "Leaderboard", href: "/leaderboard" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-black/30 backdrop-blur-xl border-b border-white/5">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(220,38,38,0.5)] group-hover:scale-110 transition-transform">
            CK
          </div>
          <span className="text-xl font-bold tracking-tighter text-white uppercase italic">
            Crew<span className="text-red-500">Kill</span>
          </span>
        </Link>

        {/* Status Indicator */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/5 text-emerald-400 text-[10px] font-black tracking-[0.2em]">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          ONLINE
        </div>

        <div className="hidden md:flex items-center gap-1 ml-4 overflow-x-auto no-scrollbar">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                    : "text-white/40 hover:text-white hover:bg-white/5"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="hidden xl:block text-center flex-1 mx-4">
         <span className="text-[10px] text-white/20 font-mono tracking-[0.5em] uppercase">Neural Link Secured</span>
      </div>

      <div className="flex items-center gap-4">
        <ConnectButton />
      </div>
    </nav>
  );
}
