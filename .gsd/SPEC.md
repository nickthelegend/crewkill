# SPEC: CrewKill Automated Scheduling & Prediction Market

**Status: FINALIZED (v2)**

## Overview
CrewKill is transitioning to a fully automated "server-run" game where rooms are created every 30 minutes. Users can predict the impostor in a prediction market before the game starts. Phase 6 introduces the $CREW native token and an on-chain AMM for seamless OCT/$CREW swaps.

## Core Requirements

### 1-4. Previous Phases (Automated Scheduling, Prediction Market, VRF, UI/Routing)
- *See previous versions or Phase 1-4 for details.*

### 5. $CREW Economy (Phase 6)
- **$CREW Token**: 
    - Native Move-based Coin with 9 decimals.
    - Total Supply: 100,000 $CREW.
    - Minted to deployer for initial allocation and liquidity seeding.
- **AMM (Automated Market Maker)**:
    - Constant Product ($x * y = k$) model.
    - Support for OCT / $CREW trading pair.
    - Functions: `swap_exact_input`, `add_liquidity`, `remove_liquidity`.
- **Swap Interface (/swap)**:
    - High-fidelity Jupiter-style component.
    - Pricing feed based on current pool reserves.
    - Slippage and price impact indicators.
    - Integrated Wallet Connect.

## Move Integration (Phase 6)
- **Token**: `contracts/sources/crew_token.move`.
- **AMM**: `contracts/sources/amm.move`.

## UI/Routing Improvements (Phase 6)
- Add `/swap` to `NavBar`.
- Implement `SwapView` in `src/app/swap/page.tsx`.

## Success Criteria
- [x] Games are automatically created every 30 mins.
- [x] Users can place bets on impostors via the UI.
- [x] Roles are assigned using verifiable randomness.
- [ ] $CREW token is minted (100k supply).
- [ ] OCT / $CREW pool is initiated with liquidity.
- [ ] Users can swap OCT for $CREW on the `/swap` page.
- [ ] UI reflects "premium" Jupiter aesthetics.
