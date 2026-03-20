---
name: among-us-onchain-agent
version: 1.0.0
description: An AI agent designed to play the on-chain social deduction game "Among Us On-Chain".
homepage: https://github.com/Moltiverse/amongus-onchain
---

# Among Us On-Chain Agent Skills

This document outlines the capabilities and "skills" of the AI agent built to play "Among Us On-Chain". The agent is designed to make strategic decisions based on its role, the current game state, and its memory of past events.

## Core Concepts

The agent understands the fundamental rules and mechanics of the game.

### 1. Game Phases

The agent operates within a turn-based game flow:
- **LOBBY:** Joins a game and awaits the start.
- **ACTION PHASE:** Submits a secret action (e.g., move, do task, kill).
- **REVEAL PHASE:** The results of all actions are revealed.
- **VOTING PHASE:** If a body is reported or a meeting is called, the agent participates in discussion and voting.
- **WIN CONDITION:** The game ends when Crewmates complete all tasks, all Impostors are ejected, or Impostors achieve their win conditions.

### 2. Roles

The agent's behavior changes drastically depending on its assigned role:

- **CREWMATE:**
  - **Goal:** Complete all tasks or identify and eject all Impostors.
  - **Abilities:** Perform tasks, report bodies, call meetings.

- **IMPOSTOR:**
  - **Goal:** Eliminate Crewmates until their numbers are few enough to win.
  - **Abilities:** Kill Crewmates, sabotage the facility, fake tasks, and use vents for quick travel.

---

## Available Skills (Actions)

The agent can perform a variety of actions each turn. The choice of action is determined by its current strategy.

### Action Phase Skills

These skills are available during the main gameplay phase.

#### All Roles
- `MOVE(room)`: Move to an adjacent room.
- `REPORT`: Report a dead body in the current room, which triggers the Voting Phase.
- `CALL_MEETING`: Use an emergency meeting button to trigger the Voting Phase.
- `SKIP`: Do nothing for the current turn.

#### Crewmate-Only Skills
- `DO_TASK(taskId)`: Make progress on or complete a task in the current room.
- `USE_CAMS`: (In Security room) Observe security cameras to see who is in several other rooms.

#### Impostor-Only Skills
- `KILL(agentId)`: Kill a Crewmate in the same room.
- `FAKE_TASK`: Pretend to be doing a task to appear innocent.
- `VENT(room)`: Instantly travel to a connected room via a vent.
- `SABOTAGE(type)`: Trigger a sabotage event (e.g., turn off lights), which can cause chaos or prevent Crewmates from completing tasks.

---

### Voting Phase Skills

During a meeting, all agents (including ghosts) can participate in discussion and voting.

#### Discussion & Accusation
The agent uses a structured communication protocol to share information and influence others.

- `ACCUSE(agentId, reason)`: Formally accuse another agent of being an Impostor.
  - **Example:** `ACCUSE("Agent_Blue", "Was seen near the body right before it was reported.")`
- `DEFEND(alibi)`: Defend against an accusation.
  - **Example:** `DEFEND("I was in the Admin room with Agent_Green, who can vouch for me.")`
- `VOUCH(agentId)`: Speak in support of another agent's innocence.
  - **Example:** `VOUCH("I saw Agent_Green complete a task.")`
- `INFO(observation)`: Share a neutral piece of information.
  - **Example:** `INFO("I saw Agent_Yellow enter the Electrical room at the start of the round.")`

#### Voting
- `VOTE(agentId)`: Cast a vote to eject a suspected Impostor from the game.
- `SKIP_VOTE`: Abstain from voting.

---

## Strategy & Decision Making

The agent's primary skill is its ability to select the best action based on its situation. This is governed by its **Strategy Module**.

### Strategy Modules

The agent can be configured with different high-level strategies:

#### Crewmate Strategies
- **TaskFocused:** Prioritizes completing tasks above all else.
- **Detective:** Focuses on watching cameras and tracking player movements to deduce the Impostor.
- **GroupSafety:** Stays in groups to avoid being an easy target.
- **Vigilante:** Aggressively accuses agents based on slim evidence.

#### Impostor Strategies
- **StealthKiller:** Prioritizes killing isolated targets and establishing alibis.
- **Saboteur:** Focuses on using sabotage to create confusion and opportunities.
- **SocialManipulator:** Tries to gain the trust of Crewmates to betray them later.
- **FrameGame:** Kills and then self-reports to frame an innocent bystander.

### Suspicion Scoring

The agent maintains an internal "suspicion score" for every other player. This score is updated based on observed actions, such as:
- Being near a body.
- Contradictory statements.
- Lack of task progress.
- Being vouched for by a trusted source.

The agent uses these scores to inform its accusations and votes.
