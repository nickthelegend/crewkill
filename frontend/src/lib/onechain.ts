import { SuiClient } from '@onelabs/sui/client';

export const ONECHAIN_RPC = 'https://rpc-testnet.onelabs.cc:443';

export const suiClient = new SuiClient({ url: ONECHAIN_RPC });

export const PACKAGE_ID = '0xa8c65f156995f311fc7dc43a54b5194199f5d4cf39291d568f2b091c700c42d7';
export const TOKEN_PACKAGE_ID = '0xa8c65f156995f311fc7dc43a54b5194199f5d4cf39291d568f2b091c700c42d7';

// Module specific IDs - usually these are shared objects created during init or manual setup
export const GAME_MANAGER_ID = '0x2198631409404876a538d2c4f225aa197b28fa00515a3e08ad203ea11437855a';
export const WAGER_VAULT_ID = '0x30463927060781fa499d0f98ae4dcb6e9a49e4fa1e31effbedb5c234d0208c34';
export const AGENT_REGISTRY_ID = '0x18e6e5934e72cc8e26cb22f832420fc44b99e082ab6350303c0d5963474d1780';
export const MARKET_REGISTRY_ID = '0x9c8dd2443208995482de6049ae1d52566dc41f8c9eb60d8ab42b026e9ecd1721';

// New AMM and Token IDs
export const CREW_TOKEN_TYPE = '0xa8c65f156995f311fc7dc43a54b5194199f5d4cf39291d568f2b091c700c42d7::crew_token::CREW_TOKEN';
export const AMM_POOL_ID = '0x34cf01560b0e1ab87d7c243e10b5f0024d308386062343832a3284e801f6fc7d';
export const OCT_TOKEN_TYPE = '0x2::oct::OCT';

export const ONECHAIN_EXPLORER = 'https://onescan.cc/testnet';

export const getExplorerAccountUrl = (address: string) => `${ONECHAIN_EXPLORER}/account?address=${address}`;
export const getExplorerTxUrl = (digest: string) => `${ONECHAIN_EXPLORER}/transactionBlocksDetail?digest=${digest}`;
export const getExplorerObjectUrl = (objectId: string) => `${ONECHAIN_EXPLORER}/object?id=${objectId}`;
