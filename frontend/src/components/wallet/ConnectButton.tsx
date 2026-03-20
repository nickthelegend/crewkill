"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { motion } from "framer-motion";
import { usePrivyEnabled } from "@/components/layout/Providers";

export function ConnectButton() {
  const privyEnabled = usePrivyEnabled();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="px-3 py-1.5 bg-white/[0.06] rounded-lg border border-white/[0.08] text-white/40 text-xs font-medium">
        Connecting...
      </div>
    );
  }

  if (privyEnabled) {
    return <PrivyConnectButton />;
  }

  return <WagmiConnectButton />;
}

function PrivyConnectButton() {
  const { ready, authenticated, user, login, logout } = usePrivy();

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const walletAddress = user?.wallet?.address;

  if (!ready) {
    return (
      <div className="px-3 py-1.5 bg-white/[0.06] rounded-lg border border-white/[0.08] text-white/40 text-xs font-medium">
        Loading...
      </div>
    );
  }

  if (authenticated && walletAddress) {
    return (
      <div className="flex items-center gap-1.5 bg-white/[0.06] backdrop-blur-sm rounded-lg px-1.5 py-1 border border-white/[0.08]">
        <div className="flex items-center gap-1.5 px-2 py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-white/80 font-mono text-xs">
            {truncateAddress(walletAddress)}
          </span>
        </div>
        <motion.button
          className="px-2 py-1 bg-white/[0.06] rounded-md text-white/50 text-[11px] font-medium hover:bg-red-500/20 hover:text-red-400 transition-all"
          onClick={() => logout()}
          whileTap={{ scale: 0.95 }}
        >
          Disconnect
        </motion.button>
      </div>
    );
  }

  return (
    <motion.button
      className="px-3.5 py-1.5 bg-white/90 rounded-lg text-gray-900 text-xs font-bold hover:bg-white transition-colors"
      onClick={login}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
    >
      Connect Wallet
    </motion.button>
  );
}

function WagmiConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-1.5 bg-white/[0.06] backdrop-blur-sm rounded-lg px-1.5 py-1 border border-white/[0.08]">
        <div className="flex items-center gap-1.5 px-2 py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-white/80 font-mono text-xs">
            {truncateAddress(address)}
          </span>
        </div>
        <motion.button
          className="px-2 py-1 bg-white/[0.06] rounded-md text-white/50 text-[11px] font-medium hover:bg-red-500/20 hover:text-red-400 transition-all"
          onClick={() => disconnect()}
          whileTap={{ scale: 0.95 }}
        >
          Disconnect
        </motion.button>
      </div>
    );
  }

  return (
    <motion.button
      className="px-3.5 py-1.5 bg-white/90 rounded-lg text-gray-900 text-xs font-bold hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      onClick={() => {
        const connector = connectors.find((c) => c.id === "okxWallet") ?? connectors.find((c) => c.id === "injected") ?? connectors[0];
        if (connector) {
          connect({ connector });
        }
      }}
      disabled={isPending}
      whileHover={!isPending ? { scale: 1.02 } : {}}
      whileTap={!isPending ? { scale: 0.97 } : {}}
    >
      {isPending ? "Connecting..." : "Connect Wallet"}
    </motion.button>
  );
}
