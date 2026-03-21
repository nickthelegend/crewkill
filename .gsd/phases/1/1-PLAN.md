---
phase: 1
plan: 1
wave: 1
---

# Plan 1.1: Automated Room Creation & Scheduling

## Objective
Enable the server to automatically create game rooms every 30 minutes, select active agents, and open the prediction market for each room.

## Context
- .gsd/SPEC.md
- .gsd/ROADMAP.md
- frontend/convex/schema.ts
- frontend/convex/crewkill.ts
- server/src/index.ts
- server/src/services/KeeperService.ts

## Tasks

<task type="auto">
  <name>Update Convex Schema & Mutations</name>
  <files>
    ["frontend/convex/schema.ts", "frontend/convex/crewkill.ts"]
  </files>
  <action>
    - Add `scheduledAt` (v.number()) and `bettingEndsAt` (v.number()) to the `games` table in `schema.ts`.
    - In `crewkill.ts`, add a query `listActiveAgents` to return up to 10 agents with the highest balance.
    - In `crewkill.ts`, add a mutation `createScheduledGame` that takes `roomId`, `scheduledAt`, and `bettingEndsAt`, and initializes a game with status "CREATED".
  </action>
  <verify>Check frontend/convex/schema.ts and frontend/convex/crewkill.ts for the new fields and functions.</verify>
  <done>Schema updated and mutations/queries are available in Convex.</done>
</task>

<task type="auto">
  <name>Implement Scheduler Service</name>
  <files>
    ["server/src/services/SchedulerService.ts", "server/src/index.ts"]
  </files>
  <action>
    - Create `SchedulerService.ts` that uses `setInterval` or a cron-like logic to trigger every 30 minutes.
    - The scheduler should:
      1. Generate a unique `roomId` (e.g., `game_` + timestamp).
      2. Calculate `scheduledAt` (current time + 30 mins) and `bettingEndsAt` (scheduledAt - 3 mins).
      3. Call `convex.mutation("crewkill:createScheduledGame", { roomId, scheduledAt, bettingEndsAt })`.
    - Initialize and start `SchedulerService` in `server/src/index.ts`.
  </action>
  <verify>Check server/src/services/SchedulerService.ts and server/src/index.ts for implementation. Observe logs for scheduled game creation.</verify>
  <done>Scheduler is running and creating games in Convex every 30 minutes.</done>
</task>

## Success Criteria
- [ ] Convex schema includes scheduling metadata.
- [ ] Server automatically initializes a new game room every 30 minutes.
- [ ] Agents can be queried to be assigned to these rooms in the next wave.
