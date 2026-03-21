# OneChain Migration & Completion Plan

## Objective
Convert the CrewKill project from a legacy EVM-based mock system to a fully decentralized, autonomous AI agent game on **OneChain (Sui)**.

## Architecture: Server-as-Mirror (Option A)
The server acts as a low-latency mirror for the on-chain state, providing 60fps movement and real-time chat while syncing critical game logic (phases, roles, payouts) with the Sui Move contracts.

---

## 1. Missing Features & Gaps (OneChain Reality)

| ID | Feature | Status | Priority |
| :--- | :--- | :--- | :--- |
| **G1** | **OneChain Server Sync** | Legacy (EVM) | **CRITICAL** |
| **G2** | **Automated Phase Keeper** | Missing | **CRITICAL** |
| **G3** | **On-Chain Agent Actions** | Done (Autonomous) | Complete |
| **G4** | **Prediction Market UI** | Partial | Medium |
| **G5** | **Automated Betting Payout** | Missing | High |
| **G6** | **Real-time Map/Sprite Sync** | Legacy | High |

---

## 2. Implementation Phases

### Phase 1: Server Infrastructure (OneChain Refactor)
- [ ] **ContractService.ts**: Replace `ethers.js` with `SuiClient`.
- [ ] **SuiEventWatcher**: Implement a background listener for Move events (`GameCreated`, `ActionRevealed`, `PhaseChanged`).
- [ ] **State Mirror**: Update `GameStateManager` to reflect the on-chain table data (alive status, locations).

### Phase 2: Automation (The Keeper Bot)
- [ ] **Keeper.ts**: A service that monitors the `Game` object:
    - Auto-calls `advance_phase` for Lobby -> Starting (when full).
    - Auto-calls `advance_phase` for Reveal -> Discussion (when all revealed).
    - Auto-calls `settle_game` when win conditions are met.
- [ ] **Payout Bot**: Link `settle_game` event to `MarketRegistry.resolve_market`.

### Phase 3: Frontend "Real-time" Integration
- [ ] **Socket Sync**: Connect the Sprite/Map components to the Server's real-time mirror.
- [ ] **Prediction Market UI**: 
    - Display current betting pools.
    - Fetch user's betting history from `MarketRegistry`.
    - Auto-refresh after resolution.

---

## 3. Project Completion Breakdown

| Component | Status | % Done |
| :--- | :--- | :--- |
| **Move Contracts** | Deployed | 90% |
| **Autonomous Agents** | Built | 100% |
| **Frontend UI** | Partially Updated | 40% |
| **Backend Sync** | Legacy | 10% |
| **Automation Bot** | Not Started | 0% |

**Overall Project Completion: 48%**

---

## 4. Key Decisions
1. **Source of Truth**: The Move Contract is the final adjudicator. The Server is for specialized UI delivery.
2. **Payout Logic**: Controlled by a Server-side bot that executes on-chain transactions using the admin key.
3. **Clawbots**: The 6 autonomous agents (`PRIVATE_KEY_1-6`) are the primary players. Users only spectate and bet.
