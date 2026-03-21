---
phase: 4
plan: 1
wave: 1
---

# Plan 4.1: UI Refactoring & Routing

## Objective
Reorganize the frontend into distinct routes for Leaderboard, Market, and Rooms while maintaining the "command center" aesthetic.

## Context
- .gsd/SPEC.md
- .gsd/ROADMAP.md
- frontend/src/app/layout.tsx
- frontend/src/app/page.tsx
- frontend/src/components/game/PredictionMarket.tsx
- frontend/src/components/game/ScrollableMap.tsx

## Tasks

<task type="auto">
  <name>Set up Global Navigation Header</name>
  <files>
    ["frontend/src/app/layout.tsx"]
  </files>
  <action>
    - Add a `NavBar` component to `layout.tsx`.
    - Routes: `/market`, `/rooms`, `/leaderboard`.
    - Style: Glassmorphism, neon accents (OCT themed), premium typography.
  </action>
  <verify>Check frontend for the new header.</verify>
  <done>Navigation header is visible and functional on all pages.</done>
</task>

<task type="auto">
  <name>Create Core Route Pages</name>
  <files>
    ["frontend/src/app/rooms/page.tsx", "frontend/src/app/market/page.tsx", "frontend/src/app/leaderboard/page.tsx"]
  </files>
  <action>
    - Implement `RoomsPage`: Lists upcoming scheduled games from Convex.
    - Implement `MarketPage`: Shows active betting markets (PredictionMarket summary).
    - Implement `LeaderboardPage`: Fetches top agents and bettors.
  </action>
  <verify>Navigate to /rooms, /market, and /leaderboard.</verify>
  <done>All core routes are accessible and display relevant data.</done>
</task>

<task type="auto">
  <name>Finalize Keeper Market Integration</name>
  <files>
    ["server/src/services/KeeperService.ts"]
  </files>
  <action>
    - Update `createOnChainGame` to call `create_market` (after game creation).
    - Map `Game` ID to `Market` ID in Convex if needed, or lookup on-chain.
    - Update `handleGameEnded` to pass the correct `actual_impostors` to `resolve_market`.
  </action>
  <verify>Check server logs for successful market creation on game start.</verify>
  <done>Keeper correctly manages the on-chain life cycle of prediction markets.</done>
</task>

<task type="auto">
  <name>Implement Dynamic Room Routes</name>
  <files>
    ["frontend/src/app/room/[id]/page.tsx", "frontend/src/app/room/[id]/live/page.tsx"]
  </files>
  <action>
    - `/room/[id]`: Acts as a dashboard for a specific game (Details, Betting status).
    - `/room/[id]/live`: Full-screen visualization using `ScrollableMap`.
  </action>
  <verify>Navigate to /room/scheduled_... and /room/scheduled_.../live.</verify>
  <done>Dynamically routed game views are functional.</done>
</task>

## Success Criteria
- [ ] Next.js routing is implemented.
- [ ] Users can navigate between pages easily.
- [ ] Game view is separated from the lobby/dashboard.
