export const ONECHAIN_RPC = 'https://rpc-testnet.onelabs.cc:443';

export const CONTRACT_CONFIG = {
  PACKAGE_ID:          process.env.PACKAGE_ID || '0x10961bfbec509dfc9fcf0bd8b60524c4df7726f53d46a694badaac24a4170d13',
  GAME_MANAGER_ID:     process.env.GAME_MANAGER_ID || '0xa88b39d297cafa2b347bf4c5b71dd5b8b0751a1e8b4fc6fe0aa6be42519d9d6b',
  WAGER_VAULT_ID:      process.env.WAGER_VAULT_ID || '0x04215756fa43aab514f0d32ce1efc278af389614e56a4ab55a9d5562c8194863',
  AGENT_REGISTRY_ID:   process.env.AGENT_REGISTRY_ID || '0x4864f93d3c3adf25eb91caca86addc8b11fe72f927393884d46c364c34e8e0b1',
  MARKET_REGISTRY_ID:  process.env.MARKET_REGISTRY_ID || '0xddd4cfea1f4f1ca989f614d675151afa584e316db115fac7526f8652e123a4ca',
  MINT_CAP_ID:         process.env.MINT_CAP_ID || '0x0bf456bacda5cf596fef78187d5451d2bb595dc5ab5a5aff2d9cb229b8e5ccc0',
};
