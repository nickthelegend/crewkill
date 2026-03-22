---
phase: 3
plan: 3
wave: 2
---

# PLAN: Action Feedback Animations

Add micro-animations for player actions: tasks, kills, and venting.

## Goals
- **Task completion pulsing**: Small success icon or pulse above agents when finishing a task.
- **Kill flash**: A brief map-wide or room-local glitch/red flash when a kill event is received.
- **Corpse Persistence**: Ensure dead bodies remain visible on the map after elimination.
- **Ghost Visibility**: Render ghosts with reduced opacity.

## Tasks

<task name="action-indicators">
Modify `AmongUsSprite` to show a "Doing Task" icon or pulse when an internal `isPerformingAction` state is active.
</task>

<task name="kill-flash-event">
In `ScrollableMap`, listen for `server:kill_occurred` once per gameId to trigger a brief (200ms) room-local red flash at the victim's location.
</task>

<task name="corpse-and-ghost">
Update `ScrollableMap` to render corpses even for currently disconnected players if they died in the match. Implement ghost rendering for dead players.
</task>

## Verification
- Mock a kill event and check for the flash.
- Verify ghost opacity (0.5) and corpses rendering correctly.
