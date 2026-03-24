import { SuiClient } from '@onelabs/sui/client';

export const ONECHAIN_RPC = 'https://rpc-testnet.onelabs.cc:443';

export const suiClient = new SuiClient({ url: ONECHAIN_RPC });

export const PACKAGE_ID = '0x4099ecc30a1952995c83b4f185b68093583611e7934946b8bb73657a54e1a640';

// Module specific IDs - usually these are shared objects created during init or manual setup
export const GAME_MANAGER_ID = '0x3b27263b05400d61dcb41a56d19d7954cc1a10fe396e03f51bd0c52d0586e990';
export const WAGER_VAULT_ID = '0x862b3118447979427ec22fd8000abc21d6e9f7e2e53d7ed472b8d63ac7926163';
export const AGENT_REGISTRY_ID = '0xc14e3f34ac679169cfe11e833a07f870e9c1ae0c7d17fe3f1c5e5a4d687ace93';
export const MARKET_REGISTRY_ID = '0x9e6d1b8cc8e900ce301b0a257327b9467be6ff92f779e593e95facde8228f510';
// New AMM and Token IDs
export const CREW_TOKEN_TYPE = `${PACKAGE_ID}::crew_token::CREW_TOKEN`;
export const AMM_POOL_ID = '0x704a1b1d2adb5ea07797195a850fe3dfb4eeaf58f66b8bc0f894b5f819c3395f';
export const OCT_TOKEN_TYPE = '0x2::oct::OCT';

export const ONECHAIN_EXPLORER = 'https://onescan.cc/testnet';

export const getExplorerAccountUrl = (address: string) => `${ONECHAIN_EXPLORER}/account?address=${address}`;
export const getExplorerTxUrl = (digest: string) => `${ONECHAIN_EXPLORER}/transactionBlocksDetail?digest=${digest}`;
export const getExplorerObjectUrl = (objectId: string) => `${ONECHAIN_EXPLORER}/object?id=${objectId}`;
