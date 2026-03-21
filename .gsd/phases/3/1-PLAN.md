---
phase: 3
plan: 1
wave: 1
---

# Plan 3.1: Betting Cutoff Enforcement

## Objective
Enforce the 3-minute betting cutoff before game start, preventing user bets after the deadline.

## Context
- .gsd/SPEC.md
- .gsd/ROADMAP.md
- frontend/convex/bets.ts
- frontend/convex/crewkill.ts

## Tasks

<task type="auto">
  <name>Enforce Betting Cutoff in Convex</name>
  <files>
    ["frontend/convex/bets.ts"]
  </files>
  <action>
    - Update `placeBet` mutation in `bets.ts` to:
      1. Query the `games` table using `args.gameId` (which corresponds to `roomId` or a mapping).
      2. If the game has a `bettingEndsAt` field, check `Date.now() < game.bettingEndsAt`.
      3. Throw an error "Betting is closed for this game" if the deadline has passed.
  </action>
  <verify>Try placing a bet via a test script or Convex dashboard after the bettingEndsAt timestamp.</verify>
  <done>Convex mutation rejects bets after the cutoff.</done>
</task>

<task type="auto">
  <name>Expose Betting Status Query</name>
  <files>
    ["frontend/convex/crewkill.ts"]
  </files>
  <action>
    - Add a query `getBettingStatus` that takes `roomId`.
    - Returns `{ isOpen: boolean, remainingMs: number, bettingEndsAt: number }`.
  </action>
  <verify>Check Convex dashboard for the new query output.</verify>
  <done>Frontend can easily fetch betting status.</done>
</task>

## Success Criteria
- [ ] Users cannot place bets within 3 minutes of game start.
- [ ] Backend provides clear status for the UI to display timers.
