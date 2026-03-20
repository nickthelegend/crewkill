import { http, createConfig } from "wagmi";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";

// Define Base Sepolia Testnet
export const baseSepolia = defineChain({
  id: 84532,
  name: "Base Sepolia",
  nativeCurrency: {
    decimals: 18,
    name: "ETH",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["https://sepolia.base.org"],
    },
  },
  blockExplorers: {
    default: { name: "BaseScan", url: "https://sepolia.basescan.org" },
  },
});

// Local development chain
export const localhost = defineChain({
  id: 31337,
  name: "Localhost",
  nativeCurrency: {
    decimals: 18,
    name: "ETH",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["http://localhost:8545"],
    },
  },
});

export const config = createConfig({
  chains: [baseSepolia, localhost],
  connectors: [
    injected({
      target() {
        if (typeof window === "undefined") return undefined;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const w = window as any;
        if (w.okxwallet) {
          return {
            id: "okxWallet",
            name: "OKX Wallet",
            provider: w.okxwallet as never,
          };
        }
        if (w.ethereum) {
          return {
            id: "injected",
            name: "Injected",
            provider: w.ethereum as never,
          };
        }
        return undefined;
      },
    }),
  ],
  transports: {
    [baseSepolia.id]: http(),
    [localhost.id]: http(),
  },
});

// Contract addresses - update after deployment
export const CONTRACT_ADDRESSES = {
  wagerVault:
    (process.env.NEXT_PUBLIC_WAGER_VAULT_ADDRESS as `0x${string}`) ||
    "0x0000000000000000000000000000000000000000",
  agentRegistry:
    (process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS as `0x${string}`) ||
    "0x0000000000000000000000000000000000000000",
  gameSettlement:
    (process.env.NEXT_PUBLIC_GAME_SETTLEMENT_ADDRESS as `0x${string}`) ||
    "0x0000000000000000000000000000000000000000",
};
