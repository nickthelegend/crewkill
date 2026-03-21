export const ONECHAIN_RPC = 'https://rpc-testnet.onelabs.cc:443';

export const CONTRACT_CONFIG = {
  PACKAGE_ID:          process.env.PACKAGE_ID || '0x942fbf96595b0028372afa420f6dba46a90b88c3fc55fd1be189c26f3c9321f6',
  GAME_MANAGER_ID:     process.env.GAME_MANAGER_ID || '0xc88150479da933ccdef62687e3bb2256d3eb17cdab4d78dc773d2f4e17ad24aa',
  WAGER_VAULT_ID:      process.env.WAGER_VAULT_ID || '0xa09c86f767fe17b7cc82bb6af98bfc7afce3b57b6693c5c554ae87cf05ba854d',
  AGENT_REGISTRY_ID:   process.env.AGENT_REGISTRY_ID || '0x25985d1c5123e8f1dd6b7a94bc3832a06bb2595e156c1bc92e1a661bff80b060',
  MARKET_REGISTRY_ID:  process.env.MARKET_REGISTRY_ID || '0xa0587a0f6bfd59397eff5c7a56fc56f6f0e8ab6805a285e7e8232e61d4981398',
  MINT_CAP_ID:         process.env.MINT_CAP_ID || '0x54b79d4819a942857fee4f805ffebeab3ad5e1e9885ed9af3ea80b4a8619f317',
};
