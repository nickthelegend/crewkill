---
phase: 6
plan: 1
wave: 1
---

# PLAN: Phase 6 - The $CREW Token & AMM

## Goal
Launch the $CREW native token and an on-chain AMM for OCT / $CREW swaps.

## Wave 1: Smart Contracts (Move)

### 1a. Implementation: `crew_token`
- [ ] Create `contracts/sources/crew_token.move`.
- [ ] Define `CREW` coin struct and witness.
- [ ] Implement `init` to mint 100,000 * 10^9 tokens to the publisher.

### 1b. Implementation: `amm_core`
- [ ] Create `contracts/sources/amm.move`.
- [ ] Define `Pool<X, Y>` with balance fields and total supply tracker.
- [ ] Implement `create_pool` (shared object).
- [ ] Implement `swap` logic (X -> Y and Y -> X) with constant product math.
- [ ] Add `fee` calculation (e.g., 0.3%).

### 1c. Verification
- [ ] Run `one move build` in `contracts/`.
- [ ] (Local) Test minting and transfer.

## Wave 2: Frontend Route & UI Shell

### 2a. Implementation: Layout & Header
- [ ] Add `/swap` to `links` in `src/components/layout/NavBar.tsx`.
- [ ] Create `src/app/swap/page.tsx` with high-fidelity "Jupiter" layout.

### 2b. Implementation: UI Components
- [ ] Build `SwapCard`.
- [ ] Build `TokenSelector` with logos.
- [ ] Integrate `framer-motion` for transitions.

## Wave 3: Swap Logic & Integration

### 3a. Implementation: On-chain Hooks
- [ ] Fetch AMM balances and show "Receive" estimate.
- [ ] Connect "Swap" button to transaction block.

### 3b. Verification
- [ ] Manual test: Swap 10 OCT for ~X $CREW.
- [ ] Check wallet balances post-swap.
