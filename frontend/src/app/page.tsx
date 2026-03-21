"use client";

import { useCurrentAccount } from "@onelabs/dapp-kit";
import { HomeInner } from "@/components/home";

export default function Home() {
  const currentAccount = useCurrentAccount();

  return (
    <HomeInner
      authenticated={!!currentAccount}
      ready={true}
      login={() => {}} // ConnectWallet handles login via dapp-kit
      getAccessToken={async () => "bypass"}
      userAddress={currentAccount?.address}
    />
  );
}
