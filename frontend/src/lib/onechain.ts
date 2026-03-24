import { SuiClient } from '@onelabs/sui/client';

export const ONECHAIN_RPC = 'https://rpc-testnet.onelabs.cc:443';

export const suiClient = new SuiClient({ url: ONECHAIN_RPC });

export const PACKAGE_ID = '0x10961bfbec509dfc9fcf0bd8b60524c4df7726f53d46a694badaac24a4170d13';

// Module specific IDs - usually these are shared objects created during init or manual setup
export const GAME_MANAGER_ID = '0xa88b39d297cafa2b347bf4c5b71dd5b8b0751a1e8b4fc6fe0aa6be42519d9d6b';
export const WAGER_VAULT_ID = '0x04215756fa43aab514f0d32ce1efc278af389614e56a4ab55a9d5562c8194863';
export const AGENT_REGISTRY_ID = '0x4864f93d3c3adf25eb91caca86addc8b11fe72f927393884d46c364c34e8e0b1';
export const MARKET_REGISTRY_ID = '0xddd4cfea1f4f1ca989f614d675151afa584e316db115fac7526f8652e123a4ca';
// New AMM and Token IDs
export const CREW_TOKEN_TYPE = `${PACKAGE_ID}::crew_token::CREW_TOKEN`;
export const AMM_POOL_ID = '0x704a1b1d2adb5ea07797195a850fe3dfb4eeaf58f66b8bc0f894b5f819c3395f';
export const OCT_TOKEN_TYPE = '0x2::oct::OCT';

export const ONECHAIN_EXPLORER = 'https://onescan.cc/testnet';

export const getExplorerAccountUrl = (address: string) => `${ONECHAIN_EXPLORER}/account?address=${address}`;
export const getExplorerTxUrl = (digest: string) => `${ONECHAIN_EXPLORER}/transactionBlocksDetail?digest=${digest}`;
export const getExplorerObjectUrl = (objectId: string) => `${ONECHAIN_EXPLORER}/object?id=${objectId}`;
