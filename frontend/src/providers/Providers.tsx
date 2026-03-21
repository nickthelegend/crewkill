'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SuiClientProvider, WalletProvider } from '@onelabs/dapp-kit';
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ONECHAIN_RPC } from '@/lib/onechain';
import '@onelabs/dapp-kit/dist/index.css';

const queryClient = new QueryClient();
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const networks = {
  testnet: { url: ONECHAIN_RPC },
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork="testnet">
        <ConvexProvider client={convex}>
          <WalletProvider autoConnect>
            {children}
          </WalletProvider>
        </ConvexProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
