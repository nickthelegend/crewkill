---
phase: 5
plan: 1
wave: 1
---

# Plan 5.1: Branding & Layout Clean-up

## Objective
Finalize the visuals for `/rooms`, `/market`, and `/game/[id]/bet` by reducing excessive horizontal padding, adjusting header layout, and ensuring font consistency across the `/swap` module.

## Context
- `frontend/src/components/layout/NavBar.tsx` (Logo/Header alignment)
- `frontend/src/app/rooms/page.tsx` (Rooms padding & layout)
- `frontend/src/app/market/page.tsx` (Market padding & layout)
- `frontend/src/app/game/[id]/bet/page.tsx` (Bet view layout)
- `frontend/src/components/game/MainMenu.tsx` (Home page imposter positioning)
- `frontend/src/app/swap/page.tsx` (Italic font removal)

## Tasks

<task type="auto">
  <name>Header Branding Refinement</name>
  <files>
    /Users/jaibajrang/Desktop/Projects/onechain/crewkill/frontend/src/components/layout/NavBar.tsx,
    /Users/jaibajrang/Desktop/Projects/onechain/crewkill/frontend/src/components/game/MainMenu.tsx
  </files>
  <action>
    - Ensure the Logo and Text Logo gap in the NavBar is minimal.
    - Add `pt-2.5` to the Text Logo container in `NavBar.tsx` for vertical alignment.
    - Reduce the gap between Imposter characters and the logo in `MainMenu.tsx` (Home page).
    - Update "Prediction Market" button href to `/market` instead of `/bet`.
  </action>
  <verify>Visual check on header and home page.</verify>
  <done>Logo gap is tight, Text logo is aligned, and links are correct.</done>
</task>

<task type="auto">
  <name>Rooms & Market Layout Refactor</name>
  <files>
    /Users/jaibajrang/Desktop/Projects/onechain/crewkill/frontend/src/app/rooms/page.tsx,
    /Users/jaibajrang/Desktop/Projects/onechain/crewkill/frontend/src/app/market/page.tsx
  </files>
  <action>
    - Reduce horizontal padding in both pages (e.g. `px-4` or less instead of `px-6`).
    - Add "Started At" and "Ended At" labels to the room cards in `rooms/page.tsx`.
    - Increase card gap in `market/page.tsx` (`gap-6` or `gap-8`) while reducing internal card padding.
  </action>
  <verify>Check rooms and market layouts on mobile/desktop.</verify>
  <done>Horizontal padding is reduced and timestamps are visible.</done>
</task>

<task type="auto">
  <name>Betting View & Swap Polish</name>
  <files>
    /Users/jaibajrang/Desktop/Projects/onechain/crewkill/frontend/src/app/game/[id]/bet/page.tsx,
    /Users/jaibajrang/Desktop/Projects/onechain/crewkill/frontend/src/app/swap/page.tsx
  </files>
  <action>
    - Remove the `gap-1` from the grid in `bet/page.tsx` and use cleaner borders (`border-white/10`).
    - Audit all text elements in `swap/page.tsx` to remove any remaining `italic` font styles.
  </action>
  <verify>Check betting view panels and swap page fonts.</verify>
  <done>Betting view panels are seamless, and swap page has zero italics.</done>
</task>

## Success Criteria
- [ ] Header logo is aligned (`pt-2.5`) and tight.
- [ ] Rooms and Market views feel compact with reduced padding.
- [ ] All requested dates/times (Started/Ended At) are functional in Rooms.
- [ ] Prediction Market button correctly routes to `/market`.
- [ ] No italic fonts on the Swap page.
