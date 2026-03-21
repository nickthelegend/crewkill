import { SuiClient } from '@onelabs/sui/client';

export const ONECHAIN_RPC = 'https://rpc-testnet.onelabs.cc:443';

export const suiClient = new SuiClient({ url: ONECHAIN_RPC });

// TODO: Fill after `one client publish`
export const CONTRACT_CONFIG = {
  PACKAGE_ID:          '0x_FILL_AFTER_DEPLOY',
  GAME_MANAGER_ID:     '0x_FILL_AFTER_DEPLOY',
  WAGER_VAULT_ID:      '0x_FILL_AFTER_DEPLOY',
  AGENT_REGISTRY_ID:   '0x_FILL_AFTER_DEPLOY',
  MARKET_REGISTRY_ID:  '0x_FILL_AFTER_DEPLOY',
};
