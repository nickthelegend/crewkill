import { SuiClient } from '@onelabs/sui/client';

export const ONECHAIN_RPC = 'https://rpc-testnet.onelabs.cc:443';

export const suiClient = new SuiClient({ url: ONECHAIN_RPC });

export const PACKAGE_ID = '0x3aca3f16d20a6d0cfd6400b8f8c4591d2dc136037ab3c94cad32fb32f190f0e5';
export const TOKEN_PACKAGE_ID = '0x4099ecc30a1952995c83b4f185b68093583611e7934946b8bb73657a54e1a640';

// Module specific IDs - usually these are shared objects created during init or manual setup
export const GAME_MANAGER_ID = '0x6d4362d03fd32671283064e03ee3aff686cc2d8a867c61543403e7e5f981a9b3';
export const WAGER_VAULT_ID = '0xe76a71028322ed4ae07af6ae99202ffeb0affe5e774b38e6e545fddd5bbc6d4f';
export const AGENT_REGISTRY_ID = '0x968cd0fdfb9ad5a40c352bebaf860be7a13c4c001b8d8e99c2413a2682aeadcb';
export const MARKET_REGISTRY_ID = '0x9e6d1b8cc8e900ce301b0a257327b9467be6ff92f779e593e95facde8228f510';
// New AMM and Token IDs
export const CREW_TOKEN_TYPE = '0x2::oct::OCT';
export const AMM_POOL_ID = '0x8f148e48af23623e380b8072580e110709ca1380db4bb182fa4c44664c77b677';
export const OCT_TOKEN_TYPE = '0x2::oct::OCT';

export const ONECHAIN_EXPLORER = 'https://onescan.cc/testnet';

export const getExplorerAccountUrl = (address: string) => `${ONECHAIN_EXPLORER}/account?address=${address}`;
export const getExplorerTxUrl = (digest: string) => `${ONECHAIN_EXPLORER}/transactionBlocksDetail?digest=${digest}`;
export const getExplorerObjectUrl = (objectId: string) => `${ONECHAIN_EXPLORER}/object?id=${objectId}`;
