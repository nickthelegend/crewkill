# UI Audit & Improvement Plan — Among Agents

**Date:** February 23, 2026
**Scope:** Frontend codebase (`/frontend/src/`)
**Role:** Senior UI Designer & Frontend Developer

---

## Table of Contents

1. [Current State Summary](#1-current-state-summary)
2. [Screen-by-Screen Audit](#2-screen-by-screen-audit)
3. [Cross-Cutting Issues](#3-cross-cutting-issues)
4. [Improvement Plan](#4-improvement-plan)
5. [Implementation Phases](#5-implementation-phases)

---

## 1. Current State Summary

### What We Have

The frontend is a **Next.js 16 + React 19** spectator-first game UI built with Tailwind CSS 4 and Framer Motion. Users watch autonomous AI agents play Among Us on-chain. The UI has five main views:

| View | Purpose | Status |
|------|---------|--------|
| **Main Menu** | Landing page with stats, leaderboard, quick-start | Functional, needs polish |
| **Lobby** | Room browser + room detail + activity log | Functional, layout issues |
| **Game (Map)** | Fullscreen scrollable map with agent tracking | Functional, core of the app |
| **Voting** | Circular voting screen during discussion phase | Functional, limited spectator context |
| **Dashboard** | Operator agent management panel | Functional, basic styling |

### Tech Stack

- **Framework:** Next.js 16.1.6, React 19.2.3
- **Styling:** Tailwind CSS 4 (utility classes + inline styles)
- **Animations:** Framer Motion 12.33
- **Icons:** Lucide React + inline SVGs (inconsistent)
- **Fonts:** Geist Sans/Mono (loaded), Comic Sans (hardcoded for game UI)
- **Wallet:** Wagmi 3.4.2 + Privy (optional)
- **State:** WebSocket (real-time) + HTTP polling (fallback)
- **Audio:** Howler.js / use-sound (hooks exist, sounds referenced but files may not be present)

---

## 2. Screen-by-Screen Audit

### 2.1 Main Menu (`MainMenu.tsx` + `page.tsx`)

**What it does:**
- Shows animated logo (two bouncing Among Us sprites + "AMONG US ON-CHAIN" title)
- Displays agent counter with glowing ring animation
- Shows live stats pills (active games, players, spectators)
- Leaderboard table (hidden on mobile)
- "WATCH GAMES" button
- Quick-start terminal with copyable agent deployment command
- Walking characters in background
- Wallet connect + operator key panel (top-left)
- Connection status badge (top-right)

**Issues found:**

| # | Issue | Location | Severity |
|---|-------|----------|----------|
| 1 | **Comic Sans as primary game font** — Used via inline `style={{ fontFamily: "'Comic Sans MS', cursive" }}` on title and buttons. This is applied inconsistently (some elements use it, others don't). There's no CSS variable or Tailwind utility for the game font, so it's repeated as raw strings everywhere. | `MainMenu.tsx:161,169,242` | Medium |
| 2 | **Leaderboard hidden on mobile** — The `hidden sm:block` class completely removes the leaderboard on small screens. Mobile users see no leaderboard at all. No alternative (e.g., collapsible section) is provided. | `MainMenu.tsx:107` | Medium |
| 3 | **"Agents Connected" counter shows 0 when no server** — When the WebSocket is disconnected, `totalAgents` defaults to 0. The counter displays "0" with a pulsing green ring, which is misleading. | `MainMenu.tsx:204` | Low |
| 4 | **Quick-start terminal hardcodes external URL** — `ONBOARDING_SKILL_URL` defaults to `https://amongus-onchain.vercel.app/onboard.md`. If the app is deployed elsewhere, this URL is stale. | `MainMenu.tsx:15` | Low |
| 5 | **No empty state for stats** — When stats are null (server unreachable), the pills still render with "0" values instead of showing a skeleton or "offline" state. | `MainMenu.tsx:216-235` | Low |
| 6 | **Footer "Built on opBNB" is bare** — Single line of tiny text. No link, no logo, feels like a placeholder. | `MainMenu.tsx:339-341` | Low |

---

### 2.2 Lobby View (`page.tsx` LobbyView function, lines 657-1071)

**What it does:**
- Three-column layout (rooms list | selected room detail | activity log)
- Left panel: lists rooms in "playing" and "lobby" states with player sprites
- Middle panel: shows selected room's player grid, prize pool, status
- Right panel: live activity log (monospace, color-coded)
- "Initialize" button to create a room
- Invite modal for sharing room join command

**Issues found:**

| # | Issue | Location | Severity |
|---|-------|----------|----------|
| 1 | **LobbyView is a 400+ line function inlined in `page.tsx`** — Not extracted into its own file. This makes `page.tsx` ~1284 lines, difficult to maintain. `CreateRoomModal` is also inlined here. | `page.tsx:657-1283` | High |
| 2 | **Three-column layout collapses poorly on mobile** — On small screens, three panels stack vertically. The room list, room detail, and activity log each take full width, resulting in excessive scrolling. No tab-based navigation for mobile. | `page.tsx:731` | High |
| 3 | **Invite modal duplicated** — The exact same invite modal markup appears in both LobbyView (lines 1014-1067) and the game view (lines 492-544). Copy-pasted code. | `page.tsx:492,1014` | Medium |
| 4 | **Military/sci-fi jargon inconsistent with game theme** — Labels like "Payload Capacity", "Threat Level", "Mission Deposit", "Dismiss Signal", "Sector Secure", "Awaiting commander signal" clash with the Among Us aesthetic. The main menu uses casual game language, but the lobby switches to this military tone. | `page.tsx:719-804, 1073-1283` | Medium |
| 5 | **Room detail shows "Select a Room" with bouncing "?"** — The empty state when no room is selected is a large bouncing question mark emoji. Looks placeholder-ish and doesn't guide the user effectively. | `page.tsx:967-971` | Low |
| 6 | **Player grid hard-capped at 9 slots** — `Math.min(currentRoom.maxPlayers, 9)` limits the grid to 3x3, even if a room supports 10 players. The 10th player has no slot. | `page.tsx:899` | Medium |
| 7 | **Activity log timestamps use `toLocaleTimeString().slice(0, 5)`** — This slices the string, which produces different results across locales (e.g., "14:30" vs "2:30"). Not locale-safe. | `page.tsx:997` | Low |
| 8 | **No visual feedback after "Copy" in invite modal** — Clicking "Copy" calls `navigator.clipboard.writeText()` but shows no confirmation (no toast, no checkmark, no state change). | `page.tsx:1039-1044` | Low |

---

### 2.3 Game View (Map) (`ScrollableMap.tsx` + game view in `page.tsx`)

**What it does:**
- Fullscreen pan-and-zoom map (5000x4200px virtual canvas)
- 9 rooms from The Skeld (Reactor, Upper Engine, Cafeteria, Security, MedBay, Admin, Lower Engine, Electrical, Storage)
- Corridors with decorative floor details and pipes
- Player sprites positioned inside rooms
- Dead body indicators
- Legend (bottom-right corner)
- Controls hint (bottom-left corner)
- Right sidebar: agents list, game log, spectator controls
- Top bar: wallet button, task bar, connection badge, invite button
- Bottom-left: operator key panel

**Issues found:**

| # | Issue | Location | Severity |
|---|-------|----------|----------|
| 1 | **ScrollableMap.tsx is extremely large** — The file exceeds 25,000 tokens. Room layouts, corridor decorations, SVG rendering, interaction logic, and decorative elements are all in one component. | `ScrollableMap.tsx` | High |
| 2 | **Right sidebar is a horizontal scroll strip on mobile** — The sidebar panels (prize pool, agents, game log, spectator controls) become a horizontal scrollable row at the bottom of the screen on mobile. The game log is completely hidden on mobile (`hidden sm:block`). Users on phones miss critical gameplay events. | `page.tsx:349,462-463` | High |
| 3 | **Operator key panel overlaps map content** — Fixed at `bottom-4 left-4`, it floats over the map with no background context. Can overlap with corridor or room content. | `page.tsx:344-346` | Medium |
| 4 | **"Exit Spectator" button is buried** — It's the last item in the sidebar/bottom sheet. On mobile, you have to scroll right to find it. No obvious back button on the top bar. | `page.tsx:482-487` | Medium |
| 5 | **No phase indicator during gameplay** — Spectators see the map but there's no prominent label showing the current game phase (Action Phase, Discussion, Voting, etc.). The only phase info is implied by which view is showing. | `page.tsx:290-546` | Medium |
| 6 | **Task bar is positioned center-top but has no context** — Shows "TASKS COMPLETED" with a progress bar but doesn't explain what this means for spectators. Is this per-player? Team total? | `TaskBar.tsx` | Low |
| 7 | **Dead bodies count in sidebar but no indication on the map legend** — The sidebar shows "Dead Bodies: N" but the map legend doesn't clearly label what the red indicators are to a new viewer. | `page.tsx:473-476` | Low |
| 8 | **Spotlighting a player has no visible map indicator** — Clicking an agent in the sidebar highlights their list entry (yellow ring) but the map doesn't pan to them or visually distinguish them beyond what's already rendered. | `page.tsx:377-393` | Medium |

---

### 2.4 Voting Screen (`VotingScreen.tsx`)

**What it does:**
- Full-screen dark overlay
- Players arranged in a circle (radius 200px)
- Center "SKIP VOTE" button
- Vote count badges (red, top-right of player)
- Timer display
- Confirm vote button

**Issues found:**

| # | Issue | Location | Severity |
|---|-------|----------|----------|
| 1 | **Spectators see a voting UI they can't interact with** — The voting screen renders vote buttons for spectators, but spectators can't actually vote. The `handleVote` function just sets `hasVoted=true` locally without sending anything. There's no visual distinction that this is "spectator mode". | `page.tsx:209-212, VotingScreen.tsx` | High |
| 2 | **Circular layout breaks on mobile** — With radius 200px, on small screens (< 400px wide) players overflow or overlap. No responsive adjustment to the circle radius. | `VotingScreen.tsx` | Medium |
| 3 | **No vote result visualization** — After votes are cast, there's no visual showing who voted for whom. The `votingResults` prop exists but the UI for displaying results is minimal. | `VotingScreen.tsx` | Medium |
| 4 | **Timer hardcoded to 30 seconds** — `setTimeRemaining(30)` is set in `page.tsx` regardless of server-configured voting duration. | `page.tsx:94,194` | Low |

---

### 2.5 Event Screens (`EventScreens.tsx`)

**What it does:**
- **Dead Body Reported:** Red overlay with diagonal streaks, auto-dismisses in 3s
- **Ejection:** Space background, character spins away, "{name} was/wasn't an Impostor"
- **Game End:** Victory (green) or defeat (red) with character sprite and continue button

**Issues found:**

| # | Issue | Location | Severity |
|---|-------|----------|----------|
| 1 | **Game end screen uses "VICTORY/DEFEAT" from a player perspective** — But the user is a spectator. Should show "CREWMATES WIN" or "IMPOSTORS WIN" instead. | `EventScreens.tsx` | Medium |
| 2 | **No game end summary/stats** — The end screen shows a single sprite and a message. No recap of who was impostor, kill counts, task completion, or the game timeline. Spectators don't learn what happened. | `EventScreens.tsx` | Medium |
| 3 | **Event screens stack if triggered rapidly** — Body reported, ejection, and game end all use independent boolean states. If the server sends events in quick succession, multiple overlays could appear simultaneously. | `page.tsx:90-96, 200-227` | Low |

---

### 2.6 Dashboard (`UserDashboard.tsx`)

**What it does:**
- Modal overlay for operator agent management
- Shows total balance, net profit, active agents count
- Grid of agent cards with stats (wins, kills, games)
- Withdraw funds button per agent

**Issues found:**

| # | Issue | Location | Severity |
|---|-------|----------|----------|
| 1 | **Dashboard unmounts lobby/menu on open** — Since `view === "dashboard"` replaces whatever view was shown, navigating to dashboard and back loses lobby state (selected room, scroll position). | `page.tsx:277-288` | Medium |
| 2 | **Dashboard `onJoinGame` does nothing useful** — The handler sets view to "lobby", then immediately sets it back to "menu" on the next line. It's a no-op. | `page.tsx:281-284` | Medium |
| 3 | **No loading skeleton** — When agent data is fetching, the entire card area is blank. No skeleton loaders or shimmer effect. | `UserDashboard.tsx` | Low |

---

## 3. Cross-Cutting Issues

### 3.1 Code Organization

| Issue | Details |
|-------|---------|
| **`page.tsx` is 1284 lines** | Contains `Home`, `HomeWithWagmi`, `HomeWithAuth`, `HomeInner`, `LobbyView`, and `CreateRoomModal` — all in one file. Should be split into separate component files. |
| **Inline components not memoized** | `LobbyView` and `CreateRoomModal` are defined inside `page.tsx` but aren't wrapped in `React.memo` or extracted. They re-render on every parent state change. |
| **Console.log statements left in production code** | Found at `page.tsx:592, 595, 619, 636` inside `CreateRoomModal.onCreate`. |
| **Unused component exports** | `GameHeader.tsx`, `PlayerList.tsx`, `VotingPanel.tsx` are exported from the game components index but not imported anywhere. Dead code. |
| **Two sprite components** | Both `AmongUsSprite.tsx` and `PlayerSprite.tsx` exist and render Among Us characters. Only `AmongUsSprite` is actually used. `PlayerSprite` is dead code. |

### 3.2 Styling Inconsistencies

| Issue | Details |
|-------|---------|
| **Mixed icon systems** | Some icons are from Lucide React (`<Clock />`, `<Users />`), others are inline SVGs hand-written in JSX. No consistent approach. |
| **No design tokens** | Colors are hardcoded everywhere: `bg-slate-900`, `text-cyan-400`, `border-white/10`. No centralized theme. If the color palette changes, hundreds of class strings need updating. |
| **Font inconsistency** | Title uses Comic Sans (inline style). Body uses Geist Sans (CSS variable). Some labels use system sans-serif. The `globals.css` sets `font-family: Arial, Helvetica, sans-serif` on `body`, conflicting with the Geist font variables defined in `layout.tsx`. |
| **Inconsistent border radius** | Ranges from `rounded` to `rounded-lg` to `rounded-xl` to `rounded-2xl` to `rounded-[2rem]` to `rounded-[2.5rem]` to `rounded-3xl` to `rounded-full`. No standard radius scale. |
| **Inline styles mixed with Tailwind** | Components use both Tailwind classes and `style={{}}` props. Example: `style={{ fontFamily: "'Comic Sans MS', cursive", textShadow: "4px 4px 0 #333" }}` alongside Tailwind `className`. |

### 3.3 Responsiveness

| Issue | Details |
|-------|---------|
| **Mobile is an afterthought** | The UI is designed desktop-first. Mobile handling is mostly `hidden sm:block` (hide things) rather than providing alternative layouts. |
| **No tablet breakpoint** | Only `sm:` and occasional `lg:` breakpoints used. Medium screens (768px-1024px) get the same layout as desktop. |
| **Touch targets too small** | Several interactive elements have text sizes of `text-[8px]`, `text-[9px]`, `text-[10px]`. Buttons and links at this size fail the 44x44px minimum touch target guideline. |
| **Map not optimized for touch** | The ScrollableMap uses mouse-based pan and zoom. Touch gestures (pinch-to-zoom, two-finger pan) may work via browser defaults but aren't explicitly handled. |

### 3.4 Accessibility

| Issue | Details |
|-------|---------|
| **No ARIA labels** | Buttons, interactive elements, and dynamic content regions have no `aria-label`, `aria-live`, or `role` attributes. Screen readers cannot meaningfully parse the UI. |
| **Color-only status indicators** | Connection status (green/red dot), player alive/dead (opacity change), and log types (color-coded text) all rely solely on color. No icons or text alternatives for colorblind users. |
| **No keyboard navigation** | Modal dialogs don't trap focus. The map has no keyboard controls. Voting screen has no tab order. |
| **Low contrast text** | Many labels use `text-slate-500`, `text-slate-600`, or `text-gray-500` on dark backgrounds. These fail WCAG AA contrast ratio (4.5:1 minimum). |
| **No skip-to-content link** | Full-screen app with no way to skip repeated navigation elements. |

### 3.5 Performance

| Issue | Details |
|-------|---------|
| **150 animated stars** | `SpaceBackground.tsx` renders 150 `<div>` elements with CSS animations. Each star has unique animation timing. This runs on every screen (menu, lobby). |
| **6 walking characters always animating** | `WalkingCharacters.tsx` has 6 continuously animated sprites on the main menu. Combined with 150 stars, this is ~156 concurrent animations on the landing page. |
| **Large SVG map renders all rooms always** | `ScrollableMap.tsx` renders the entire 5000x4200px map at once. No virtualization or lazy rendering for rooms outside the viewport. |
| **No React.memo on expensive components** | Sprite components, map room renderers, and player lists re-render on every state update even when their props haven't changed. |

### 3.6 State Management

| Issue | Details |
|-------|---------|
| **13+ useState calls in HomeInner** | `page.tsx:89-100` has 13 independent state variables. This suggests the need for a reducer or a dedicated state management hook. |
| **Duplicate data sources** | Both `useServerData` (HTTP polling) and `useGameServer` (WebSocket) provide room lists. Merging logic in `page.tsx:144-157` decides which to use, creating a fragile data layer. |
| **Phase-to-view sync is fragile** | The `useEffect` at `page.tsx:174-180` manually maps phase changes to view changes. Missing phases (Discussion, VoteResult) don't trigger any transition. |

---

## 4. Improvement Plan

### 4.1 Code Cleanup (Foundation Work)

These changes improve maintainability without altering the user experience.

#### 4.1.1 Extract Components from `page.tsx`

Split into separate files:

```
src/
  components/
    views/
      LobbyView.tsx        (extracted from page.tsx lines 657-1071)
      CreateRoomModal.tsx   (extracted from page.tsx lines 1073-1283)
      GameView.tsx          (extracted from page.tsx lines 290-546)
      InviteModal.tsx       (single shared component, replaces 2 duplicates)
```

#### 4.1.2 Remove Dead Code

- Delete `PlayerSprite.tsx` (unused, `AmongUsSprite.tsx` is the active sprite)
- Delete `GameHeader.tsx`, `PlayerList.tsx`, `VotingPanel.tsx` if unused
- Remove the 4 `console.log` statements in `page.tsx:592-636`
- Remove unused imports

#### 4.1.3 Consolidate State

Replace the 13+ `useState` calls in `HomeInner` with a `useReducer`:

```typescript
type GameUIState = {
  view: GameView;
  showBodyReported: boolean;
  showEjection: boolean;
  showGameEnd: boolean;
  hasVoted: boolean;
  timeRemaining: number;
  ejectedPlayer: Player | null;
  gameWon: boolean;
  spotlightedPlayer: `0x${string}` | null;
  selectedAgentInfo: `0x${string}` | null;
  showCreateRoomModal: boolean;
  showGameInviteModal: boolean;
};
```

#### 4.1.4 Fix the Dashboard `onJoinGame` No-Op

```typescript
// Current (broken):
onJoinGame={(roomId) => {
  setView("lobby");
  setView("menu");  // immediately overrides
}}

// Fix:
onJoinGame={(roomId) => {
  setView("lobby");
  handleJoinRoom(roomId);
}}
```

---

### 4.2 Styling & Design System

#### 4.2.1 Establish a Game Font Utility

Add a Tailwind utility or CSS class for the game font instead of repeating inline styles:

```css
/* globals.css */
.font-game {
  font-family: 'Comic Sans MS', 'Comic Sans', cursive, sans-serif;
}
```

Then replace all `style={{ fontFamily: "'Comic Sans MS', cursive" }}` with `className="font-game"`.

#### 4.2.2 Fix the `globals.css` Font Conflict

The body currently sets `font-family: Arial, Helvetica, sans-serif` which overrides the Geist font loaded in `layout.tsx`. Fix:

```css
body {
  background: var(--background);
  color: var(--foreground);
  /* Remove the hardcoded Arial — let Geist from layout.tsx apply */
}
```

#### 4.2.3 Standardize Border Radius

Pick 4 radius values and use them consistently:

| Token | Value | Use Case |
|-------|-------|----------|
| `rounded-lg` | 8px | Small elements (badges, pills) |
| `rounded-xl` | 12px | Cards, inputs |
| `rounded-2xl` | 16px | Modals, panels |
| `rounded-full` | 9999px | Circles, avatar frames |

Remove `rounded-[2rem]`, `rounded-[2.5rem]`, `rounded-[1rem]`, `rounded-[1.5rem]` — these are arbitrary and inconsistent.

#### 4.2.4 Standardize Icons

Pick one system and use it everywhere:
- **Lucide React** is already a dependency. Use it for all icons.
- Replace hand-written inline SVGs with Lucide equivalents (`<ArrowLeft />`, `<Plus />`, `<Copy />`, `<X />`, `<ChevronDown />`, etc.)

#### 4.2.5 Unify the Design Language

The lobby uses a military/sci-fi aesthetic ("Payload Capacity", "Threat Level", "Sector Secure") while the main menu uses casual game language ("WATCH GAMES", "Agents Connected"). Pick one voice:

**Recommendation:** Keep the Among Us game language throughout. Replace:
- "Payload Capacity" → "Max Players"
- "Threat Level (Impostors)" → "Impostors"
- "Mission Deposit (Wager)" → "Wager Amount"
- "Start Deployment" → "Create Room"
- "Initialize" → "Create Room"
- "Dismiss Signal" → "Close"
- "Sector Secure - Live Feed Active" → "Connected - Live"
- "No active sectors detected" → "No rooms available"

---

### 4.3 Mobile Experience

#### 4.3.1 Lobby: Tab-Based Navigation on Mobile

Replace the three-column stack with a tab bar on mobile:

```
[Rooms] [Room Detail] [Activity]
   ^         ^            ^
  Tab 1    Tab 2        Tab 3
```

- On `lg:` screens, keep the current three-column grid
- On smaller screens, show only one panel at a time with tabs at the top

#### 4.3.2 Game View: Bottom Sheet Instead of Horizontal Scroll

Replace the current horizontal scroll strip with a draggable bottom sheet:

- **Collapsed (default):** Shows agents alive count and phase indicator as a thin bar
- **Half-expanded (swipe up):** Shows agent list and dead body count
- **Full-expanded (swipe up more):** Shows game log, spectator controls, exit button

#### 4.3.3 Minimum Touch Target Sizes

Audit all interactive elements. Ensure minimum 44x44px hit areas:
- Increase padding on small text buttons
- Add `min-h-[44px] min-w-[44px]` to icon buttons
- Avoid text sizes below `text-xs` (12px) for interactive elements

#### 4.3.4 Voting Screen: Responsive Circle Radius

```typescript
// Instead of fixed 200px radius:
const radius = Math.min(200, (viewportWidth - 120) / 2);
```

---

### 4.4 Spectator Experience Improvements

#### 4.4.1 Add Phase Indicator

Add a prominent phase badge to the game view top bar:

```
[ACTION PHASE] [DISCUSSION] [VOTING] [VOTE RESULT]
     ^^^
  Current phase highlighted, rest dimmed
```

This tells spectators what's happening and what comes next.

#### 4.4.2 Fix Game End Screen for Spectators

Change from player-perspective language to spectator-perspective:

| Current | Improved |
|---------|----------|
| "VICTORY" / "DEFEAT" | "CREWMATES WIN" / "IMPOSTORS WIN" |
| Single sprite | Show all players with role reveals |
| No stats | Show kill count, tasks completed, game duration |

#### 4.4.3 Add Game End Summary Panel

After the game ends, before returning to menu, show:

```
+-------------------------------------------+
|           CREWMATES WIN                    |
|                                            |
|  IMPOSTORS:                                |
|    [Red sprite] Red - 3 kills              |
|                                            |
|  CREWMATES:                                |
|    [Blue sprite] Blue - 4 tasks completed  |
|    [Green sprite] Green - ELIMINATED R2    |
|    ...                                     |
|                                            |
|  GAME STATS:                               |
|    Duration: 5 rounds                      |
|    Tasks: 12/20 completed                  |
|    Meetings: 3 called                      |
|                                            |
|  [WATCH ANOTHER GAME]  [BACK TO MENU]      |
+-------------------------------------------+
```

#### 4.4.4 Make Voting Screen Read-Only for Spectators

- Remove the clickable vote buttons for spectators
- Show vote progress as votes come in (who voted for whom)
- Add spectator label: "You are spectating - votes are cast by agents"

#### 4.4.5 Agent Spotlight Improvement

When a spectator clicks an agent in the sidebar:
- Pan the map to center on that agent's room
- Add a pulsing highlight ring around the agent on the map
- Show a small "Following: [Agent Name]" indicator on the map

---

### 4.5 Visual Polish

#### 4.5.1 Loading & Empty States

| Location | Current | Improved |
|----------|---------|----------|
| Main menu stats | Shows "0" when offline | Skeleton pulse bars + "Offline" badge |
| Lobby room list | Empty text | Illustrated empty state with "Create a room to get started" |
| Dashboard agents | Blank during fetch | Skeleton card grid (3 shimmer rectangles) |
| Activity log | "Waiting for activity..." | Subtle animated dots + timestamp of last update |

#### 4.5.2 Player Grid Fix

Change the hard cap from 9 to match actual `maxPlayers`:

```typescript
// Current:
Array.from({ length: Math.min(currentRoom.maxPlayers, 9) })

// Fixed:
Array.from({ length: currentRoom.maxPlayers })
```

And use responsive columns: `grid-cols-3 sm:grid-cols-4 lg:grid-cols-5` for rooms with >9 players.

#### 4.5.3 Copy Feedback

Add visual feedback to all "Copy" buttons:
- Checkmark icon + "Copied!" text for 2 seconds after clicking
- Use a shared `useCopyToClipboard` hook

#### 4.5.4 Reduce Background Animations

- Reduce stars from 150 to 50 (or use CSS `will-change: opacity` for GPU acceleration)
- Reduce walking characters from 6 to 3
- Add `prefers-reduced-motion` media query to disable animations for users who request it

---

### 4.6 Accessibility (Minimum Viable)

#### 4.6.1 ARIA Labels

Add `aria-label` to:
- All icon-only buttons ("Close", "Copy address", "Toggle agent info")
- Connection status badge (`aria-live="polite"`)
- Game phase indicator (`aria-live="assertive"`)
- Modal dialogs (`role="dialog"`, `aria-modal="true"`)

#### 4.6.2 Focus Management

- Trap focus inside modals (CreateRoomModal, InviteModal, GameEndScreen)
- Return focus to trigger element when modal closes
- Add `Escape` key handler to close modals

#### 4.6.3 Color + Icon Status

Add icons alongside color indicators:
- Connection: green dot → green dot + "Live" text (already exists, good)
- Player dead: red opacity → red opacity + skull icon or "DEAD" badge (partially done)
- Log types: already have icons from `GameLog.tsx` (Skull, AlertTriangle, etc.) — ensure these are used consistently

---

## 5. Implementation Phases

### Phase 1: Code Cleanup & Bug Fixes
**Goal:** Clean foundation, no visual changes

- [ ] Extract `LobbyView` into `components/views/LobbyView.tsx`
- [ ] Extract `CreateRoomModal` into `components/views/CreateRoomModal.tsx`
- [ ] Extract game view section into `components/views/GameView.tsx`
- [ ] Create shared `InviteModal.tsx` (replace 2 duplicates)
- [ ] Remove `console.log` statements from `page.tsx:592-636`
- [ ] Delete dead components (`PlayerSprite.tsx`, `GameHeader.tsx`, `PlayerList.tsx`, `VotingPanel.tsx`) — verify they're unused first
- [ ] Fix dashboard `onJoinGame` no-op (`page.tsx:281-284`)
- [ ] Fix player grid 9-slot cap (`page.tsx:899`)
- [ ] Replace 13 `useState` calls with `useReducer`

### Phase 2: Design System & Styling
**Goal:** Consistent visual language

- [ ] Add `.font-game` CSS class, remove all inline `fontFamily` styles
- [ ] Fix `globals.css` body font conflict
- [ ] Standardize border radius (remove arbitrary `rounded-[Xrem]` values)
- [ ] Replace inline SVG icons with Lucide React equivalents
- [ ] Unify copy language (remove military jargon, use game terminology)
- [ ] Add copy feedback (checkmark + "Copied!") to all copy buttons
- [ ] Add loading skeletons for stats, room list, dashboard

### Phase 3: Mobile Experience
**Goal:** Usable on phones

- [ ] Lobby: implement tab navigation for mobile (`< lg:` breakpoint)
- [ ] Game view: convert sidebar to collapsible bottom sheet on mobile
- [ ] Show game log on mobile (it's currently `hidden sm:block`)
- [ ] Voting screen: responsive circle radius based on viewport
- [ ] Audit touch targets — ensure minimum 44x44px on interactive elements
- [ ] Test and improve map touch gestures (pinch-zoom, pan)

### Phase 4: Spectator Experience
**Goal:** Better viewing experience

- [ ] Add phase indicator bar to game view top area
- [ ] Make voting screen read-only for spectators with live vote visualization
- [ ] Fix game end screen (spectator language, role reveals, game stats summary)
- [ ] Improve agent spotlight (map panning, highlight ring, "Following" label)
- [ ] Handle event screen stacking (queue events, show one at a time)
- [ ] Sync voting timer with server instead of hardcoding 30 seconds

### Phase 5: Performance & Accessibility
**Goal:** Fast and inclusive

- [ ] Reduce star count (150 → 50), add `will-change` hints
- [ ] Reduce walking characters (6 → 3)
- [ ] Add `prefers-reduced-motion` support
- [ ] Add `React.memo` to sprite components and expensive list renderers
- [ ] Add ARIA labels to all interactive elements
- [ ] Add focus trapping to modals
- [ ] Add keyboard shortcut for closing modals (Escape)
- [ ] Improve text contrast (replace `text-slate-600` on dark backgrounds)

---

## Appendix: File Reference

| File | Lines | Role | Action Needed |
|------|-------|------|---------------|
| `app/page.tsx` | 1284 | Main page, contains LobbyView + CreateRoomModal | Split into 4+ files |
| `app/layout.tsx` | ~30 | Root layout | Minor (font fix) |
| `app/globals.css` | 37 | Global styles | Fix font conflict, add `.font-game` |
| `components/game/MainMenu.tsx` | 345 | Landing page | Polish, responsive fixes |
| `components/game/ScrollableMap.tsx` | 800+ | Game map | Refactor, performance |
| `components/game/VotingScreen.tsx` | ~200 | Voting UI | Spectator mode, responsive |
| `components/game/EventScreens.tsx` | ~400 | Event overlays | Spectator language, stats |
| `components/game/AmongUsSprite.tsx` | ~200 | Character renderer | Add React.memo |
| `components/game/PlayerSprite.tsx` | ~200 | Unused character renderer | Delete |
| `components/game/SpaceBackground.tsx` | ~80 | Animated background | Reduce star count |
| `components/game/WalkingCharacters.tsx` | ~60 | Background animation | Reduce count |
| `components/game/GameLog.tsx` | ~100 | Activity feed | Good, minor fixes |
| `components/game/TaskBar.tsx` | ~40 | Progress bar | Add context for spectators |
| `components/game/GameLobby.tsx` | ~200 | Legacy lobby component | Verify usage, may be dead |
| `components/game/GameMap.tsx` | ~300 | Static map (alternative) | Verify usage, may be dead |
| `components/game/FullMap.tsx` | ~500 | Enhanced map (alternative) | Verify usage, may be dead |
| `components/game/RoomView.tsx` | ~400 | Room interior view | Verify usage, may be dead |
| `components/game/CafeteriaView.tsx` | ~200 | Cafeteria detail | Verify usage, may be dead |
| `components/game/ActionButtons.tsx` | ~150 | HUD action buttons | Verify usage (spectators don't act) |
| `components/game/Leaderboard.tsx` | ~200 | Standalone leaderboard | Has mock data, verify usage |
| `components/operator/UserDashboard.tsx` | ~300 | Agent management | Loading states, fix onJoinGame |
| `components/operator/CreateAgentModal.tsx` | ~250 | Agent creation | Functional |
| `components/operator/OperatorKeyPanel.tsx` | ~150 | Key display | Functional |
| `components/wallet/ConnectButton.tsx` | ~100 | Wallet connection | Functional |
| `components/layout/Providers.tsx` | ~100 | App providers | Functional |
