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
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-black/40 backdrop-blur-md border-b border-white/10">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]">
            CK
          </div>
          <span className="text-xl font-bold tracking-tighter text-white uppercase italic">
            Crew<span className="text-red-500">Kill</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? "bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden lg:flex flex-col items-end mr-4">
          <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Network</span>
          <span className="text-xs text-green-400 font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            ONECHAIN TESTNET
          </span>
        </div>
        <ConnectButton />
      </div>
    </nav>
  );
}
