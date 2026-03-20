# Base Migration & Contract Improvements Guide

Migrate Among Agents from opBNB Testnet (chain 5611) to **Base Sepolia** (chain 84532) and fix contract quality issues.

---

## Base Sepolia Network Details

| Parameter | Value |
|-----------|-------|
| Chain ID | 84532 |
| RPC URL | https://sepolia.base.org |
| Block Explorer | https://sepolia.basescan.org |
| Native Currency | ETH (18 decimals) |
| Faucet | https://www.coinbase.com/faucets/base-ethereum-goerli-faucet |

---

## Step 1: Contract Improvements — `WagerVault.sol`

### 1A. Add ReentrancyGuard

The `withdraw()` and `withdrawProtocolFees()` functions send ETH via low-level `.call` before finishing state changes. Add a reentrancy guard.

**File**: `contracts/src/WagerVault.sol`

Add a simple reentrancy lock (no OpenZeppelin dependency needed):

```solidity
bool private _locked;

modifier nonReentrant() {
    require(!_locked, "Reentrant call");
    _locked = true;
    _;
    _locked = false;
}
```

Apply `nonReentrant` to: `withdraw()`, `withdrawProtocolFees()`, `receive()`.

### 1B. Add winner validation in `settleGame()`

Currently any address can be passed as a winner. Validate winners are actual game participants:

```solidity
function settleGame(bytes32 gameId, address[] calldata winners) external onlySettlement {
    GameWager storage game = gameWagers[gameId];
    require(!game.settled, "Already settled");
    require(!game.refunded, "Game was refunded");
    require(game.totalPot > 0, "No pot to settle");
    require(winners.length > 0, "Must have winners");

    // NEW: Validate all winners are game participants
    for (uint256 i = 0; i < winners.length; i++) {
        require(game.hasWagered[winners[i]], "Winner not in game");
    }

    // ... rest unchanged
}
```

### 1C. Fix refund using actual wager at time of game (not current wagerAmount)

`refundGame()` uses the current `wagerAmount` which could have been changed by admin after players wagered. Track the wager amount per game:

Add to `GameWager` struct:
```solidity
struct GameWager {
    uint256 totalPot;
    uint256 wagerPerPlayer; // NEW: snapshot wager amount at time of wager
    address[] players;
    mapping(address => bool) hasWagered;
    bool settled;
    bool refunded;
}
```

In `placeWager()`, snapshot the amount:
```solidity
if (game.players.length == 0) {
    game.wagerPerPlayer = wagerAmount; // snapshot on first wager
}
```

In `refundGame()`, use `game.wagerPerPlayer` instead of `wagerAmount`.

### 1D. Rename BNB references to ETH

Update all NatSpec comments from "BNB" / "tBNB" → "ETH" since Base uses native ETH.

### 1E. Add `setWagerAmount` minimum validation

```solidity
function setWagerAmount(uint256 _wagerAmount) external onlyOwner {
    require(_wagerAmount > 0, "Wager must be > 0");
    emit WagerAmountUpdated(wagerAmount, _wagerAmount);
    wagerAmount = _wagerAmount;
}
```

---

## Step 2: Contract Improvements — `GameSettlement.sol`

### 2A. Validate array lengths in `settleGame()`

```solidity
function settleGame(
    bytes32 gameId,
    bool crewmatesWon,
    address[] calldata winners,
    uint64[] calldata playerKills,
    uint64[] calldata playerTasks
) external onlyOperator {
    Game storage game = games[gameId];
    require(game.status == GameStatus.Active, "Game not active");
    require(winners.length > 0, "Need winners");

    // NEW: Validate array lengths match player count
    require(playerKills.length == game.players.length, "Kills array length mismatch");
    require(playerTasks.length == game.players.length, "Tasks array length mismatch");

    // ... rest (remove the ternary fallbacks on i < playerKills.length)
}
```

After adding this, the stat recording loop simplifies:
```solidity
for (uint256 i = 0; i < game.players.length; i++) {
    address player = game.players[i];
    bool isImpostor = _isImpostor(game.impostors, player);
    bool won = _isWinner(winners, player);

    agentRegistry.recordGameResult(
        player,
        gameId,
        won,
        isImpostor,
        playerKills[i],  // No ternary needed
        playerTasks[i],   // No ternary needed
        won ? uint128(wagerAmt) : 0,
        won ? 0 : uint128(wagerAmt)
    );
}
```

### 2B. Validate winners are actual game participants

```solidity
// After loading game, before settling:
for (uint256 i = 0; i < winners.length; i++) {
    require(_isPlayer(game.players, winners[i]), "Winner not a player");
}
```

Add helper:
```solidity
function _isPlayer(address[] memory players, address player) internal pure returns (bool) {
    for (uint256 i = 0; i < players.length; i++) {
        if (players[i] == player) return true;
    }
    return false;
}
```

### 2C. Prevent duplicate players in `createGame()`

```solidity
function createGame(
    bytes32 gameId,
    address[] calldata players,
    address[] calldata impostors
) external onlyOperator {
    require(games[gameId].status == GameStatus.None, "Game exists");
    require(players.length >= 4, "Need 4+ players");
    require(impostors.length > 0, "Need impostors");

    // NEW: Check for duplicate players
    for (uint256 i = 0; i < players.length; i++) {
        for (uint256 j = i + 1; j < players.length; j++) {
            require(players[i] != players[j], "Duplicate player");
        }
        require(wagerVault.hasWagered(gameId, players[i]), "Player not wagered");
    }

    // ... rest unchanged
}
```

### 2D. Update NatSpec from "opBNB" to "Base"

---

## Step 3: Contract Improvements — `AgentRegistry.sol`

### 3A. Update NatSpec from "opBNB" to "Base"

### 3B. Limit `getTopAgents` to avoid unbounded gas

Add a max limit cap:
```solidity
function getTopAgents(uint256 limit) external view returns (
    address[] memory addresses,
    uint64[] memory wins
) {
    uint256 maxLimit = 50; // Cap to prevent excessive gas
    if (limit > maxLimit) limit = maxLimit;
    // ... rest unchanged
}
```

### 3C. Restrict `registerAgent` to authorized callers only

Currently anyone can call `registerAgent` for any address. Add authorization:
```solidity
function registerAgent(address agent, string calldata name) external {
    if (isRegistered[agent]) return;

    // NEW: Only self-registration or authorized contracts
    require(
        msg.sender == agent ||
        msg.sender == wagerVault ||
        msg.sender == gameSettlement ||
        msg.sender == owner,
        "Not authorized to register"
    );

    // ... rest unchanged
}
```

---

## Step 4: Update Foundry Config

**File**: `contracts/foundry.toml`

Replace entire file:
```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.28"
evm_version = "shanghai"
optimizer = true
optimizer_runs = 200
via_ir = true

# Base Sepolia Testnet
[rpc_endpoints]
base_sepolia = "${BASE_SEPOLIA_RPC_URL}"

[etherscan]
base_sepolia = { key = "${BASESCAN_API_KEY}", url = "https://api-sepolia.basescan.org/api" }

[fmt]
line_length = 100
tab_width = 4
bracket_spacing = true
```

---

## Step 5: Update Deployment Script

**File**: `contracts/script/Deploy.s.sol`

- Rename `DeployOpBNB` → `DeployBaseSepolia`
- Update all log messages from "opBNB" → "Base Sepolia"
- Update wager amount to 0.0001 ETH (same wei value: `100000000000000`)
- Update the `Deploy` contract for Base mainnet

---

## Step 6: Update Contracts `.env`

**File**: `contracts/.env`

```env
# Among Agents - Contract Deployment Configuration

# Deployer wallet private key (NEVER commit real keys)
PRIVATE_KEY=<your-deployer-private-key>

# Base Sepolia RPC URL
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# BaseScan API key (for contract verification)
BASESCAN_API_KEY=<your-basescan-api-key>
```

---

## Step 7: Deploy Contracts to Base Sepolia

Run from `contracts/` directory:

```bash
# 1. Run tests first to make sure everything passes
forge test -vv

# 2. Deploy to Base Sepolia
forge script script/Deploy.s.sol:DeployBaseSepolia \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --verify

# 3. Note the deployed addresses from output

# 4. Set the game server as operator (if different from deployer)
GAME_SETTLEMENT_ADDRESS=<from-deploy> \
OPERATOR_ADDRESS=<server-operator-address> \
forge script script/Deploy.s.sol:SetOperator \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast
```

---

## Step 8: Update Server `.env`

**File**: `server/.env`

Change these values:
```env
# Blockchain Configuration (Base Sepolia)
NETWORK_MODE=testnet
TESTNET_RPC_URL=https://sepolia.base.org
CHAIN_ID=84532

# Smart Contract Addresses (Base Sepolia) — fill after deploy
WAGER_VAULT_ADDRESS=<new-address>
AGENT_REGISTRY_ADDRESS=<new-address>
GAME_SETTLEMENT_ADDRESS=<new-address>

# Operator private key (for signing settlement transactions)
OPERATOR_PRIVATE_KEY=<your-operator-private-key>
```

---

## Step 9: Update Server `ContractService.ts`

**File**: `server/src/ContractService.ts`

- Update class doc comment from "opBNB" → "Base"
- Update `getWagerAmount()` fallback default from `10n * 10n ** 18n` to `100000000000000n` (0.0001 ETH)
- Update log messages referencing "BNB" → "ETH"

---

## Step 10: Update Frontend Wagmi Config

**File**: `frontend/src/lib/wagmi.ts`

Replace `opBNBTestnet` chain definition with Base Sepolia:

```typescript
import { http, createConfig } from "wagmi";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";

// Define Base Sepolia Testnet
export const baseSepolia = defineChain({
  id: 84532,
  name: "Base Sepolia",
  nativeCurrency: {
    decimals: 18,
    name: "ETH",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["https://sepolia.base.org"],
    },
  },
  blockExplorers: {
    default: { name: "BaseScan", url: "https://sepolia.basescan.org" },
  },
});

// Local development chain
export const localhost = defineChain({
  id: 31337,
  name: "Localhost",
  nativeCurrency: {
    decimals: 18,
    name: "ETH",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["http://localhost:8545"],
    },
  },
});

export const config = createConfig({
  chains: [baseSepolia, localhost],
  connectors: [
    injected({
      target() {
        if (typeof window === "undefined") return undefined;
        const w = window as any;
        if (w.okxwallet) {
          return {
            id: "okxWallet",
            name: "OKX Wallet",
            provider: w.okxwallet as never,
          };
        }
        if (w.ethereum) {
          return {
            id: "injected",
            name: "Injected",
            provider: w.ethereum as never,
          };
        }
        return undefined;
      },
    }),
  ],
  transports: {
    [baseSepolia.id]: http(),
    [localhost.id]: http(),
  },
});

// Contract addresses - update after deployment
export const CONTRACT_ADDRESSES = {
  wagerVault: process.env.NEXT_PUBLIC_WAGER_VAULT_ADDRESS as `0x${string}` || "0x0000000000000000000000000000000000000000",
  agentRegistry: process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS as `0x${string}` || "0x0000000000000000000000000000000000000000",
  gameSettlement: process.env.NEXT_PUBLIC_GAME_SETTLEMENT_ADDRESS as `0x${string}` || "0x0000000000000000000000000000000000000000",
};
```

---

## Step 11: Update Frontend `.env.example`

**File**: `frontend/.env.example`

Update blockchain section:
```env
# Blockchain Configuration
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
NEXT_PUBLIC_CHAIN_ID=84532

# Smart Contract Addresses (Base Sepolia)
NEXT_PUBLIC_WAGER_VAULT_ADDRESS=0x0000000000000000000000000000000000000000
NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=0x0000000000000000000000000000000000000000
NEXT_PUBLIC_GAME_SETTLEMENT_ADDRESS=0x0000000000000000000000000000000000000000
```

---

## Step 12: Regenerate & Clean Up Frontend ABIs

After deploying the improved contracts:

```bash
# From contracts/ directory, generate fresh ABIs
forge build

# Copy the clean ABIs to frontend
cp out/WagerVault.sol/WagerVault.json ../frontend/src/abi/WagerVault.json
cp out/AgentRegistry.sol/AgentRegistry.json ../frontend/src/abi/AgentRegistry.json
cp out/GameSettlement.sol/GameSettlement.json ../frontend/src/abi/GameSettlement.json
```

**Delete stale ABIs**:
- `frontend/src/abi/AmongUsGame.json` — old contract, not deployed
- `frontend/src/abi/AmongUsGameFactory.json` — old contract, not deployed
- `frontend/src/lib/abi/` — entire duplicate directory

---

## Step 13: Update Tests

**File**: `contracts/test/WagerVault.t.sol`

- Add test for reentrancy protection
- Add test for winner-not-in-game rejection
- Add test for refund using snapshotted wager amount
- Update comments from "tBNB" → "ETH"

**File**: `contracts/test/GameSettlement.t.sol`

- Add test for array length mismatch rejection
- Add test for duplicate player rejection
- Add test for winner-not-a-player rejection
- Update comments from "tBNB" → "ETH"

---

## Step 14: Clean Up Old opBNB References

Search and replace across the codebase:
- `opBNB` → `Base` (in comments, docs, log messages)
- `tBNB` → `ETH` (in comments and NatSpec)
- `BNB` → `ETH` (in user-facing strings and log messages)
- Chain ID `5611` → `84532`
- RPC URL `opbnb-testnet-rpc.bnbchain.org` → `sepolia.base.org`
- Explorer `testnet.opbnbscan.com` → `sepolia.basescan.org`

**Files to check**:
- `contracts/src/WagerVault.sol` — NatSpec
- `contracts/src/GameSettlement.sol` — NatSpec
- `contracts/src/AgentRegistry.sol` — NatSpec
- `contracts/script/Deploy.s.sol` — log messages
- `server/src/ContractService.ts` — comments, log messages
- `server/.env` — comments
- `server/.env.example` — comments
- `frontend/.env.example` — comments
- `OPBNB_MIGRATION_PLAN.md` — archive or delete

---

## Execution Checklist

- [ ] **Step 1**: Improve `WagerVault.sol` (reentrancy guard, winner validation, wager snapshot, min validation)
- [ ] **Step 2**: Improve `GameSettlement.sol` (array validation, winner validation, duplicate check)
- [ ] **Step 3**: Improve `AgentRegistry.sol` (limit cap, registration auth)
- [ ] **Step 4**: Update `foundry.toml` for Base Sepolia
- [ ] **Step 5**: Update `Deploy.s.sol` for Base Sepolia
- [ ] **Step 6**: Update `contracts/.env` for Base Sepolia
- [ ] **Step 7**: Run tests, deploy to Base Sepolia
- [ ] **Step 8**: Update `server/.env` with new addresses
- [ ] **Step 9**: Update `ContractService.ts` references
- [ ] **Step 10**: Update `frontend/src/lib/wagmi.ts` for Base Sepolia
- [ ] **Step 11**: Update `frontend/.env.example`
- [ ] **Step 12**: Regenerate ABIs, delete stale files
- [ ] **Step 13**: Update/add tests
- [ ] **Step 14**: Clean up all opBNB string references
