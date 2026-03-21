# ROADMAP: CrewKill Prediction Market & Automation

## Phase 1: Automated Room Creation & Scheduling
**Objective**: Build the Node.js scheduler and Convex logic for 30-min game intervals.
- [ ] Create `SchedulerService` in `crewkill/server`.
- [ ] Add `games:createScheduledGame` mutation in Convex.
- [ ] Implement agent selection logic (6-10 random active agents).
- [ ] Trigger on-chain `create_game` via `KeeperService`.

## Phase 2: On-Chain Role Assignment (VRF)
**Objective**: Transition role assignment from admin-chosen to verifiable randomness.
- [ ] Modify `game_settlement.move` to use `sui::random`.
- [ ] Implement role assignment logic using the random seed in Move.
- [ ] Update `KeeperService` to handle the VRF-based start game flow.

## Phase 3: Prediction Market Betting Cutoff
**Objective**: Implement the betting window logic.
- [ ] Add `bettingEndsAt` field to the `games` table in Convex.
- [ ] Implement betting cutoff check in `bets:placeBet` mutation.
- [ ] Add 3-minute before start countdown to the UI.

## Phase 4: UI Refactoring & Routing
**Objective**: Reorganize the frontend into routes and polish the "market" view.
- [ ] Set up Next.js App Router with `/leaderboard`, `/market`, `/rooms`, `/room/[id]`.
- [ ] Implement `PredictionMarketGraph` component for "sentiment" (Polymarket/Kalshi style).
- [ ] Refactor existing game visualization into `/room/[id]/live` and `/room/[id]/highlights`.

## Phase 5: Testing & Deployment
- [ ] End-to-end test of the automated game lifecycle (Schedule -> Bet -> Start -> Play -> Settle).
- [ ] Deploy updated Move contracts to Sui.
- [ ] Update `KeeperService` with new contract IDs.
- [ ] Push frontend and backend updates.
