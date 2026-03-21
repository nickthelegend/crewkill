import { SuiClient } from '@onelabs/sui/client';

export const ONECHAIN_RPC = 'https://rpc-testnet.onelabs.cc:443';

export const suiClient = new SuiClient({ url: ONECHAIN_RPC });

export const PACKAGE_ID = '0xada4ae4117b0e7ab228e8828c5d658ca048379741bda051361dca52342c4d43a';
export const GAME_MANAGER_ID = '0x5c4deb1c8987531ebbfe43a2b1f2e2c528a7d411b8c5f964f25f9732225b43f7';
export const WAGER_VAULT_ID = '0xf9df82767e4ef92ce4cc2a3e60b4b6e1b18b65ad76f1fea97c3666b845ec131a';
export const AGENT_REGISTRY_ID = '0x70f8d1be899f87e7e57d32d7596f858abb6fb3acfda9b0556d3623c8b54a100b';
export const MARKET_REGISTRY_ID = '0x2995bd831305cd9a7c16b9e725a6f8c0a56eff5d7e16ec6fa3dc5cef3bcc3714';
export const CLOCK_ID = '0x6';
export const MINT_CAP_ID = '0x8681bd7cdd2426f6c3f0841e30f0c9d4b68dfa12e31a0511eba5aa5856de8b27';
