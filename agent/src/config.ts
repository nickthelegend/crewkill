export const ONECHAIN_RPC = 'https://rpc-testnet.onelabs.cc:443';

export const CONTRACT_CONFIG = {
  PACKAGE_ID:          process.env.PACKAGE_ID || '0x3aca3f16d20a6d0cfd6400b8f8c4591d2dc136037ab3c94cad32fb32f190f0e5',
  GAME_MANAGER_ID:     process.env.GAME_MANAGER_ID || '0x6d4362d03fd32671283064e03ee3aff686cc2d8a867c61543403e7e5f981a9b3',
  WAGER_VAULT_ID:      process.env.WAGER_VAULT_ID || '0xe76a71028322ed4ae07af6ae99202ffeb0affe5e774b38e6e545fddd5bbc6d4f',
  AGENT_REGISTRY_ID:   process.env.AGENT_REGISTRY_ID || '0x968cd0fdfb9ad5a40c352bebaf860be7a13c4c001b8d8e99c2413a2682aeadcb',
  MARKET_REGISTRY_ID:  process.env.MARKET_REGISTRY_ID || '0x9e6d1b8cc8e900ce301b0a257327b9467be6ff92f779e593e95facde8228f510',
  CLOCK_ID:            '0x6',
  MINT_CAP_ID:         process.env.MINT_CAP_ID || '0x402fd337de071e88bf9cd2407cc015584f352e69bfa57d303f45340e035b31f1',
};

export const GAME_CONFIG = {
  WAGER_AMOUNT_MIST:  1_000_000n, // 0.001 OCT
  TASKS_REQUIRED:     10,
  MAX_PLAYERS:        8,
  MIN_BET_MIST:       100_000n,    // 0.0001 OCT
};
