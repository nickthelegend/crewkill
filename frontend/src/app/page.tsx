"use client";

import { useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useConnect } from "wagmi";
import { usePrivyEnabled } from "@/components/layout/Providers";
import { HomeInner } from "@/components/home";

export default function Home() {
  const privyEnabled = usePrivyEnabled();

  if (privyEnabled) {
    return <HomeWithAuth />;
  }

  return <HomeWithWagmi />;
}

function HomeWithWagmi() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  const handleLogin = useCallback(() => {
    const connector = connectors.find((c) => c.id === "okxWallet") ?? connectors.find((c) => c.id === "injected") ?? connectors[0];
    if (connector) {
      connect({ connector });
    }
  }, [connectors, connect]);

  return (
    <HomeInner
      authenticated={isConnected}
      ready={true}
      login={handleLogin}
      getAccessToken={async () => "bypass"}
      userAddress={address}
    />
  );
}

function HomeWithAuth() {
  const auth = usePrivy();
  return <HomeInner {...auth} userAddress={auth.user?.wallet?.address} />;
}
