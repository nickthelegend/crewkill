# ROADMAP: CrewKill Prediction Market & Automation

## Phase 1: Automated Room Creation & Scheduling
**Status**: ✅ Complete
**Objective**: Build the Node.js scheduler and Convex logic for 30-min game intervals.
- [x] Create `SchedulerService` in `crewkill/server`.
- [x] Add `games:createScheduledGame` mutation in Convex.
- [x] Implement agent selection logic (6-10 random active agents).
- [x] Trigger on-chain `create_game` via `KeeperService`.

## Phase 2: On-Chain Role Assignment (VRF)
**Status**: ✅ Complete
**Objective**: Transition role assignment from admin-chosen to verifiable randomness.
- [x] Modify `game_settlement.move` to use `sui::random`.
- [x] Implement role assignment logic using the random seed in Move.
- [x] Update `KeeperService` to handle the VRF-based start game flow.

## Phase 3: Prediction Market Betting Cutoff
**Status**: ✅ Complete
**Objective**: Implement the betting window logic.
- [x] Add `bettingEndsAt` field to the `games` table in Convex.
- [x] Implement betting cutoff check in `bets:placeBet` mutation.
- [x] Add 3-minute before start countdown to the UI.

## Phase 4: UI Refactoring & Routing
**Status**: ✅ Complete
**Objective**: Reorganize the frontend into routes and polish the "market" view.
- [x] Set up Next.js App Router with `/leaderboard`, `/market`, `/rooms`, `/room/[id]`.
- [x] Implement `PredictionMarketGraph` component for "sentiment" (Polymarket/Kalshi style).
- [x] Refactor existing game visualization into `/room/[id]/live` and `/room/[id]/highlights`.

## Phase 5: Testing & Deployment
**Status**: ✅ Complete
- [x] End-to-end test of the automated game lifecycle (Schedule -> Bet -> Start -> Play -> Settle).
- [x] Deploy updated Move contracts to Sui.
- [x] Update `KeeperService` with new contract IDs.
- [x] Push frontend and backend updates.

## Phase 6: The $CREW Economy & Swap Interface
**Status**: ✅ Complete
**Objective**: Launch $CREW token and implement an on-chain AMM with a premium swap UI.
- [x] Implement `$CREW` token (Move) with 100,000 supply.
- [x] Implement `AMM` contract (Move) for `$CREW` / `OCT` swaps.
- [x] Add `/swap` route to the frontend.
- [x] Implement a premium Swap UI (Jupiter-style) as per the provided image.
- [x] Integrate the Swap interface with the Move AMM contract.
- [x] Update Header navigation to include the `/swap` link.
- [x] Seed initial liquidity (50,000 CREW / 0.5 OCT).
