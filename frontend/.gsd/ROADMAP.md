# ROADMAP: Visual Sync

## Phase 1: Robust Map State Refactor [DONE]
- Refactor `ScrollableMap.tsx` to handle player tracking with high reliability.
- Eliminate flicker and disappearing characters.
- Stable lane offsets based on player address.

## Phase 2: Navigation Smoothing [DONE]
- Fix teleportation when changing rooms (Special detection).
- Improve pathfinding waypoint logic (Deduplication).
- Implement premium LERP-based follow camera.

## Phase 3: Action & Sabotage Visuals [DONE]
- Dynamic room lighting during sabotages (Lights/Reactor).
- Action indicators (icons/pulsing) above characters for Tasks/Sabotages.
- Full-screen dramatic overlays for Body Discovery and Meetings.
- Corpse persistence and ghost rendering refinements.

## Phase 4: Prediction Market & Game Mechanics Persistence [STALEMATE]
- Integrate WebSocket `marketObjectId` and `gamePhase` into `PredictionMarket.tsx`.
- Implement persistence for "Command Center" stats (Wins/Losses).
- Finalize "Watch Live Game" UI with prediction overlays.

## Phase 5: UI/UX Perfection & Branding Polish [NEXT]
- Resolve excessive horizontal padding across `/rooms`, `/market`, and `/game/[id]/bet`.
- Refine header layout (Logo/Text positioning) and branding on the Home page.
- Add "Started At" and "Ended At" timestamps to room listings for clarity.
- Standardize fonts and remove legacy italic styling in the `/swap` module.
