# opBNB Migration Plan — Among Agents

> Goal: Deploy Among Agents on **opBNB** to submit for the **Good Vibes Only: OpenClaw Edition** hackathon.
> Deadline: **Feb 19, 2026 — 3:00 PM UTC**

---

## opBNB Chain Details

| Field | Value |
|---|---|
| Chain Name | opBNB Mainnet |
| Chain ID | 204 |
| Native Currency | BNB (18 decimals) |
| RPC URL | `https://opbnb-mainnet-rpc.bnbchain.org` |
| Block Explorer | `https://opbnbscan.com` |
| Testnet Chain ID | 5611 |
| Testnet RPC | `https://opbnb-testnet-rpc.bnbchain.org` |
| Testnet Explorer | `https://testnet.opbnbscan.com` |

---

## Files to Modify

### 1. Smart Contracts — `contracts/`

#### `contracts/foundry.toml`
- Change `evm_version` from `"prague"` to `"shanghai"` (opBNB supports shanghai)
- Add opBNB RPC endpoint under `[rpc_endpoints]`
- Add opBNB block explorer under `[etherscan]`

#### `contracts/script/Deploy.s.sol`
- Update log messages from "Monad" to "opBNB"
- Update wager amount from 10 MON to a suitable BNB amount (e.g., 0.001 BNB for testing — BNB is more expensive than MON)
- No logic changes needed — contracts are chain-agnostic

#### `contracts/src/WagerVault.sol`
- Update comments referencing "MON" to "BNB"
- Update default `wagerAmount` from `10 * 10**18` (10 MON) to `1 * 10**15` (0.001 BNB) — adjust based on opBNB gas economics

#### `contracts/src/GameSettlement.sol` & `contracts/src/AgentRegistry.sol`
- Update NatSpec comments from "Monad" to "opBNB" (cosmetic only)

---

### 2. Agent Framework — `agent/src/`

#### `agent/src/chains.ts`
- Add `opBNBMainnet` chain definition (id: 204, BNB currency, opBNB RPC)
- Keep `monadMainnet` for backwards compatibility or remove if full migration

#### `agent/src/core/ActionSubmitter.ts`
- Replace inline `monadMainnet` chain definition with `opBNBMainnet`
- Update the chain detection logic (line 61-63) to default to opBNB instead of Monad

#### `agent/src/core/OperatorManager.ts`
- Change import from `monadMainnet` to `opBNBMainnet`
- Update log messages from "MON" to "BNB"

#### `agent/src/run-match.ts`
- Update comments referencing "Monad RPC" to "opBNB RPC"

---

### 3. Server — `server/src/`

#### `server/.env.example`
- Replace all Monad RPC URLs with opBNB RPC URLs
- Update `CHAIN_ID` from `10143` to `204`
- Remove `MONAD_TOKEN_ADDRESS` (not needed, using native BNB)
- Update comments from "Monad" to "opBNB"

#### `server/src/ContractService.ts`
- Update comments from "Monad" to "opBNB"
- Update env var fallback (`MONAD_RPC_URL` references)

#### `server/src/PrivyWalletService.ts`
- Update default chain ID from `10143` to `204`

---

### 4. Frontend — `frontend/src/`

#### `frontend/src/lib/wagmi.ts`
- Replace `monadMainnet` chain definition with `opBNBMainnet` (id: 204, BNB, opBNB RPC)
- Update `config` to use `opBNBMainnet`
- Update transports mapping

#### `frontend/src/components/layout/Providers.tsx`
- Change import from `monadMainnet` to `opBNBMainnet`
- Update `defaultChain` and `supportedChains` to use `opBNBMainnet`

#### `frontend/src/components/game/MainMenu.tsx`
- Change footer text from "Built for Monad" to "Built on opBNB"

---

## Execution Steps (in order)

### Step 1 — Update Contract Config & Deploy
1. Update `foundry.toml` — EVM version, RPC, explorer
2. Update `Deploy.s.sol` — log messages, wager amount
3. Update contract comments (WagerVault, GameSettlement, AgentRegistry)
4. Run `forge build` to verify compilation with new EVM target
5. Fund deployer wallet with BNB on opBNB
6. Deploy: `forge script script/Deploy.s.sol:Deploy --rpc-url $OPBNB_RPC_URL --broadcast`
7. Record new contract addresses

### Step 2 — Update Agent Framework
1. Update `chains.ts` with opBNB chain definition
2. Update `ActionSubmitter.ts` chain config
3. Update `OperatorManager.ts` chain reference
4. Update `run-match.ts` comments

### Step 3 — Update Server
1. Update `.env.example` with opBNB values
2. Update actual `.env` with new contract addresses + opBNB RPC
3. Update `ContractService.ts` env var references
4. Update `PrivyWalletService.ts` default chain ID
5. Restart server and verify contract connectivity

### Step 4 — Update Frontend
1. Update `wagmi.ts` chain definition
2. Update `Providers.tsx` chain references
3. Update `MainMenu.tsx` branding text
4. Build and verify: `npm run build`

### Step 5 — End-to-End Test
1. Start server pointing to opBNB
2. Run at least 1 full agent game loop
3. Verify onchain transactions on opbnbscan.com
4. Capture contract addresses + TX hashes as onchain proof

### Step 6 — Submission Prep
1. Update `README.md` — opBNB references, new contract addresses, setup instructions
2. Ensure repo is public with clear reproduction steps
3. Record demo (or provide live demo link)
4. Submit on DoraHacks before Feb 19 3PM UTC
   - Track: **Agent**
   - Include: contract addresses, TX hashes, repo link, demo

---

## Risk & Notes

- **EVM compatibility**: Contracts use Solidity 0.8.28 with no Monad-specific opcodes. opBNB supports shanghai EVM — should compile cleanly after changing `evm_version`.
- **Wager amounts**: BNB is ~$600+ vs MON being much cheaper. Wager amounts must be reduced significantly (suggest 0.001 BNB or less for demo).
- **Gas costs**: opBNB L2 gas is very cheap (~0.001 gwei), so deployment and gameplay transactions will be inexpensive.
- **No code logic changes**: All changes are config/chain references. Zero smart contract logic modifications needed.
- **Testnet vs Mainnet**: We can deploy to opBNB testnet first (chain ID 5611) to verify everything, then optionally deploy to mainnet (chain ID 204) for the submission. The hackathon requires onchain proof on "BSC or opBNB" — testnet should be acceptable but mainnet is stronger.
