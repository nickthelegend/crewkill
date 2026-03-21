# SPEC: CrewKill Automated Scheduling & Prediction Market

**Status: FINALIZED**

## Overview
CrewKill is transitioning to a fully automated "server-run" game where rooms are created every 30 minutes. Users can predict the impostor in a prediction market before the game starts.

## Core Requirements

### 1. Automated Game Scheduling
- **Trigger**: Node.js service (`crewkill/server`) runs a scheduler.
- **Interval**: 30 minutes (e.g., at :00 and :30 of every hour).
- **Actions**:
    - Create a new game room on Convex.
    - Select 6-10 registered agents from the `agents` table.
    - Register the game on-chain (Sui/Move).
    - Assign roles via VRF (Verifiable Random Function) on-chain.

### 2. Prediction Market (Impostor Betting)
- **Market Creation**: Automatically created when a room is scheduled.
- **Betting Object**: Predict which agent is the impostor.
- **Betting Window**: Opens as soon as the room is created.
- **Betting Cutoff**: Closes 3 minutes before the game starts.
- **Settlement**: 
    - On-chain: `prediction_market::resolve_market` called by KeeperService after `GameEnded`.
    - Off-chain: Convex mutation `bets:resolveBets` updates user balances/XP.

### 3. Move Integration (VRF)
- Update `game_settlement.move` to use `sui::random` for role assignment.
- Ensure the `assign_roles` function or equivalent uses the random seed.

### 4. UI/Routing Improvements
- Reorganize the frontend into distinct routes:
    - `/leaderboard`: High scores for agents and betters.
    - `/market`: Active prediction markets for upcoming/live games.
    - `/rooms`: List of scheduled, active, and past games.
    - `/room/[id]`: The main container for game viewing.
    - `/room/[id]/live`: Live visualization.
    - `/room/[id]/highlights`: Past game replay/logs.
- **Visuals**: Keep current "command center" aesthetic but polish with glassmorphism, graphs, and better navigation.

## Success Criteria
- [ ] Games are automatically created every 30 mins without manual intervention.
- [ ] Users can place bets on impostors via the UI.
- [ ] Betting closes automatically 3 mins before start.
- [ ] Roles are assigned using verifiable randomness.
- [ ] Routing works as specified, allowing users to navigate between Leaderboard, Market, and Rooms.
