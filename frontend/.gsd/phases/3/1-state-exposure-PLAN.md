---
phase: 3
plan: 1
wave: 1
---

# PLAN: State Exposure for Visual Sync

Expose detailed game state fields from the WebSocket relay to the frontend UI components.

## Goals
- Add `activeSabotage` to `RoomState` and `UseGameServerReturn`.
- Expose granular `GamePhase` (ActionCommit, ActionReveal, etc.) instead of mapping everything to "playing".
- Update `GameView` to pass these new props to `ScrollableMap`.

## Tasks

<task name="update-usegameserver-types">
Update `RoomState` and `UseGameServerReturn` in `useGameServer.ts` to include `activeSabotage`.
</task>

<task name="update-usegameserver-logic">
Update the message handler in `useGameServer.ts` to correctly extract `activeSabotage` and `phase` from `server:game_state` and `server:phase_changed`.
</task>

<task name="update-gameview-props">
Modify `GameView.tsx` to accept the new state fields and pass them down to `ScrollableMap`.
</task>

## Verification
- Check that `ScrollableMapProps` now includes `activeSabotage`.
- Verify that `GameView` compiles with the new props.
