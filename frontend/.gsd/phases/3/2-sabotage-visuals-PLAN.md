---
phase: 3
plan: 2
wave: 2
---

# PLAN: Sabotage Visuals

Implement environmental visual effects that respond to sabotage state.

## Goals
- **Lights Sabotage Overlay**: Add a dim/dark overlay over the map when lights are sabotaged.
- **Emergency Pulsing**: Overlay a red/cyan pulsing glow when critical sabotages (Reactor/O2) are active.
- **Sound/Vibration**: (Visual-only) Shake the screen or add a glitch effect for Comms sabotage.

## Tasks

<task name="lighting-overlay">
Implement a `SabotageOverlay` component in `ScrollableMap.tsx` that renders a full-map absolute overlay with radial gradients when lights are out.
</task>

<task name="critical-alarm-effect">
Add a `motion.div` in `ScrollableMap` that pulses a red tint when `activeSabotage === Reactor` or `O2`.
</task>

<task name="comms-glitch-effect">
Add a CSS glitch effect or jitter to the `GameMap` when `activeSabotage === Comms`.
</task>

## Verification
- Mock `activeSabotage` in the state and check for the dark overlay.
- Check for red pulse during reactor mock.
