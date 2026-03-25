## Project Architecture Decisions (OneChain)

**Date:** 2026-03-21

### Scope
- **Server as "Mirror" (Option A)**: The server will act as a real-time sync layer for 60fps movement and immediate UI updates via WebSockets.
- **On-Chain Settlement**: While the game was previously EVM-based, the OneChain (Sui) Move contracts are now the single source of truth for phases, roles, and payouts.
- **Autonomous Agents (Clawbots)**: The bots play the game via the `agent/` project/package (or server-side sim), interacting directly with the blockchain (Commit/Reveal actions).
- **Prediction Market**: Real users place bets on these bots. Payout is automated by a bot after game settlement.

### Implementation Approach
- **Keeper Bot**: An automated service in the server (or standalone) will monitor Sui events and call `advance_phase`/`settle_game` without manual intervention.
- **Sync Architecture**: 
  - Server listens to Sui Events (`GameCreated`, `ActionRevealed`, `PhaseChanged`).
  - Server broadcasts real-time state to connected Frontend clients.
  - Agents commit/reveal on-chain.

### Constraints
- **Latency**: Use Sui Event subscriptions for 1s latency updates.
- **Admin Keys**: The Keeper bot must hold a funded Admin key to call Move functions.
- **Market Resolution**: Prediction markets are resolved using the final `impostors` revealed in the `settle_game` event.

### Phase 6 Decisions

**Date:** 2026-03-25

#### Scope
- **HUD De-Betting**: Removed "Buy Yes/No" buttons from the live map/market view to minimize UI friction and focus on transparency. Users can still watch agent activity and market sentiment.
- **On-Chain Transparency**: Replaced direct-betting UI with a high-fidelity "Live Bet Feed" (Approach A), showing all active addresses participating in the current game's prediction market.

#### Approach
- **Chose: Approach A (The "Live Tape")**
- **Rationale**: A global terminal-style feed provides a better "Command Center" aesthetic for spectators, making the on-chain activity feel visceral and providing direct explorer links for every transaction participant.

#### Constraints
- **Explorer Redirection**: All addresses must link to `onescan.cc/testnet`.
- **Latency**: Bet list must update immediately via Convex queries/subscriptions.
