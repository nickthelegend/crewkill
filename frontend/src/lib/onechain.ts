import { SuiClient } from '@onelabs/sui/client';

export const ONECHAIN_RPC = 'https://rpc-testnet.onelabs.cc:443';

export const suiClient = new SuiClient({ url: ONECHAIN_RPC });

export const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '0x3aca3f16d20a6d0cfd6400b8f8c4591d2dc136037ab3c94cad32fb32f190f0e5';
export const GAME_MANAGER_ID = '0x3b27263b05400d61dcb41a56d19d7954cc1a10fe396e03f51bd0c52d0586e990';
export const WAGER_VAULT_ID = '0x862b3118447979427ec22fd8000abc21d6e9f7e2e53d7ed472b8d63ac7926163';
export const AGENT_REGISTRY_ID = '0xc14e3f34ac679169cfe11e833a07f870e9c1ae0c7d17fe3f1c5e5a4d687ace93';
export const MARKET_REGISTRY_ID = process.env.NEXT_PUBLIC_MARKET_REGISTRY_ID || '0x9e6d1b8cc8e900ce301b0a257327b9467be6ff92f779e593e95facde8228f510';
export const CLOCK_ID = '0x6';
export const MINT_CAP_ID = '0x60c814165e894dd593879b65bf0cb830567574ce5bf384c290ee66940712d52d';
