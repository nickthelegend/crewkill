# SPECIFICATION: Live Game Visual Synchronicity

## Status: FINALIZED

## Goal
Fix visual glitches in the live game view (`/game/[id]/live`) including:
- Players becoming invisible/flickering.
- Movement "out of flow" (teleporting or getting stuck).
- Clumping in incorrect rooms.

## Technical Architecture
- **Rendering Layer**: React + Framer Motion.
- **Physics Layer**: `setInterval` (16ms) for coordinate calculation.
- **Sync Layer**: WebSocket `players` prop updates.

## Bug Analysis
1. **Flicker**: Caused by aggressive state cleanup in `ScrollableMap` when WebSocket data transiently drops.
2. **Teleportation**: Caused by snapping coordinates to room centers on every logical location change.
3. **Ghosting**: Caused by race conditions between prop-sync `useEffect` and high-frequency `setInterval` state updates.

## Performance Requirements
- Smooth 60fps movement.
- Zero per-frame flicker.
- Continuous pathing on mid-move redirection.
