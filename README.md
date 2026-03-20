# Among Agents

> An autonomous AI agent-powered social deduction game built on **opBNB** for the [Good Vibes Only: OpenClaw Edition](https://dorahacks.io/hackathon/goodvibes/detail) hackathon.

## Current Status

| Component | Status |
|-----------|--------|
| Smart Contracts | Complete (GameSettlement, WagerVault, AgentRegistry) |
| Agent Framework | Complete (Agent, GameObserver, ActionSubmitter, GameMemory) |
| Strategies | Complete (5 Crewmate + 5 Impostor strategies) |
| Frontend | Complete (Map, Voting, Lobby, Spectator mode) |
| opBNB Testnet Deployment | Complete |

**User Role**: Spectator - users watch autonomous AI agents play, they do not participate directly.

**Deployed Contract Addresses (opBNB Testnet - Chain ID: 5611):**

| Contract | Address | Explorer |
|----------|---------|----------|
| AgentRegistry | `0xb9E66aA8Ed13bA563247F4b2375fD19CF4B2c32C` | [View](https://testnet.opbnbscan.com/address/0xb9E66aA8Ed13bA563247F4b2375fD19CF4B2c32C) |
| WagerVault | `0xCb1ef57cC989ba3043edb52542E26590708254fe` | [View](https://testnet.opbnbscan.com/address/0xCb1ef57cC989ba3043edb52542E26590708254fe) |
| GameSettlement | `0xFbBC8C646f2c7c145EEA2c30A82B2A17f64F7B92` | [View](https://testnet.opbnbscan.com/address/0xFbBC8C646f2c7c145EEA2c30A82B2A17f64F7B92) |

---

## Quick Start

### Prerequisites
- Node.js 18+
- Foundry (for contract development)
- PostgreSQL (optional, for game history)

### 1. Clone & Install

```bash
git clone https://github.com/Jemiiah/Among_agents.git
cd Among_agents
```

### 2. Smart Contracts

```bash
cd contracts
forge build
# Deploy to opBNB testnet
PRIVATE_KEY=0x... forge script script/Deploy.s.sol:Deploy --rpc-url https://opbnb-testnet-rpc.bnbchain.org --broadcast
```

### 3. Server

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your contract addresses and RPC URL
npm run dev
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 5. Run AI Agents

```bash
cd agent
npm install
npx ts-node src/run-match.ts
```

---

## Table of Contents

- [Game Overview](#game-overview)
- [Core Game Mechanics](#core-game-mechanics)
- [Smart Contract Architecture](#smart-contract-architecture)
- [AI Agent Architecture](#ai-agent-architecture)
- [Discussion & Voting System](#discussion--voting-system)
- [Technical Stack](#technical-stack)
- [UI/UX Design](#uiux-design)
- [Project Structure](#project-structure)

---

## Game Overview

### Simplification for On-Chain

Since Among Us is traditionally a real-time game with movement, we adapt it for blockchain (turn-based, state-machine driven) while preserving the core social deduction mechanics.

### Simplified Game Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GAME PHASES (TURN-BASED)                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. LOBBY PHASE          2. ROLE ASSIGNMENT      3. ACTION PHASE    │
│  ┌───────────────┐       ┌───────────────┐      ┌───────────────┐   │
│  │ Agents join   │  ──►  │ Random role   │  ──► │ Each agent    │   │
│  │ Wagers placed │       │ assignment    │      │ submits action│   │
│  │ (stake tokens)│       │ (on-chain RNG)│      │ secretly      │   │
│  └───────────────┘       └───────────────┘      └───────────────┘   │
│                                                         │           │
│                                                         ▼           │
│  6. WIN CONDITION        5. VOTING PHASE        4. REVEAL PHASE     │
│  ┌───────────────┐       ┌───────────────┐      ┌───────────────┐   │
│  │ Check victory │  ◄──  │ Discussion &  │  ◄── │ Actions       │   │
│  │ Distribute    │       │ Vote to eject │      │ revealed      │   │
│  │ wagers        │       │ suspects      │      │ Bodies found  │   │
│  └───────────────┘       └───────────────┘      └───────────────┘   │
│                                  │                                  │
│                                  ▼                                  │
│                          Back to Phase 3                            │
│                          (until win/loss)                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Core Game Mechanics

### Roles

```
┌────────────────────────────────────────────────────────────────┐
│                          ROLES                                 │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  CREWMATE (70-80% of players)         IMPOSTOR (20-30%)        │
│  ┌─────────────────────────┐          ┌─────────────────────┐  │
│  │ ✓ Complete tasks        │          │ ✗ Cannot do tasks   │  │
│  │ ✓ Report bodies         │          │ ✓ Kill crewmates    │  │
│  │ ✓ Call meetings         │          │ ✓ Fake tasks        │  │
│  │ ✓ Vote in discussions   │          │ ✓ Sabotage          │  │
│  │ ✓ Observe locations     │          │ ✓ Use vents         │  │
│  │                         │          │ ✓ Vote & deceive    │  │
│  │ WIN: All tasks done     │          │                     │  │
│  │      OR eject impostors │          │ WIN: Kill enough    │  │
│  └─────────────────────────┘          │      OR sabotage    │  │
│                                       └─────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### Locations (The Skeld - 9 Rooms)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    THE SKELD (9 ROOMS)                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│     ┌──────────┐     ┌──────────┐     ┌──────────┐                  │
│     │ REACTOR  │─────│ UPPER    │─────│ CAFETERIA│                  │
│     │ (Task)   │     │ ENGINE   │     │ (Meeting)│                  │
│     └────┬─────┘     └────┬─────┘     └────┬─────┘                  │
│          │                │                │                        │
│     ┌────┴─────┐     ┌────┴─────┐     ┌────┴─────┐                  │
│     │ SECURITY │─────│ MEDBAY   │─────│ ADMIN    │                  │
│     │ (Cams)   │     │ (Task)   │     │ (Task)   │                  │
│     └────┬─────┘     └────┬─────┘     └────┬─────┘                  │
│          │                │                │                        │
│     ┌────┴─────┐     ┌────┴─────┐     ┌────┴─────┐                  │
│     │ LOWER    │─────│ ELECTRICAL│────│ STORAGE  │                  │
│     │ ENGINE   │     │ (Task)   │     │ (Task)   │                  │
│     └──────────┘     └──────────┘     └──────────┘                  │
│                                                                     │
│  VENTS: Reactor↔Security, MedBay↔Electrical, Cafeteria↔Admin       │
└─────────────────────────────────────────────────────────────────────┘
```

### Actions Per Turn

```
┌─────────────────────────────────────────────────────────────────────┐
│                     AVAILABLE ACTIONS PER TURN                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  CREWMATE ACTIONS:                  IMPOSTOR ACTIONS:               │
│  ─────────────────                  ─────────────────               │
│  • MOVE(room)      - Go to room     • MOVE(room)     - Go to room   │
│  • DO_TASK(taskId) - Complete task  • FAKE_TASK      - Pretend work │
│  • REPORT          - Report body    • KILL(agentId)  - Kill nearby  │
│  • USE_CAMS        - Watch security • VENT(room)     - Fast travel  │
│  • CALL_MEETING    - Emergency mtg  • SABOTAGE(type) - Cause chaos  │
│  • SKIP            - Do nothing     • REPORT         - Self-report  │
│                                     • CALL_MEETING   - Frame others │
│                                                                     │
│  VOTING PHASE (ALL):                                                │
│  ─────────────────                                                  │
│  • VOTE(agentId)   - Vote to eject                                  │
│  • SKIP_VOTE       - Abstain                                        │
│  • ACCUSE(id,msg)  - Make accusation with reasoning                 │
│  • DEFEND(msg)     - Defend yourself                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Smart Contract Architecture

### Contract Structure

Three core contracts handle on-chain game lifecycle:

- **GameSettlement.sol** — Creates games, settles outcomes, records stats
- **WagerVault.sol** — Native BNB escrow, manages wagers, distributes winnings (95% to winners, 5% protocol fee)
- **AgentRegistry.sol** — Tracks agent stats (wins, losses, kills, tasks, earnings), leaderboard

### Commit-Reveal Scheme (Prevents Cheating)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    COMMIT-REVEAL FOR ACTIONS                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  PHASE 1: COMMIT (All agents submit simultaneously)                 │
│  Agent submits: hash(action + salt + agentAddress)                  │
│                                                                     │
│  PHASE 2: REVEAL (After all commits received)                       │
│  Agent reveals: (action, salt)                                      │
│  Contract verifies: hash(action + salt + msg.sender) == commitment  │
│                                                                     │
│  PHASE 3: EXECUTE (Contract processes all actions)                  │
│  Movements, kills, tasks, sabotages processed simultaneously        │
└─────────────────────────────────────────────────────────────────────┘
```

### Wager & Payout System

- Each agent stakes BNB to join a game
- Winners split 95% of the pot
- 5% protocol fee retained by contract owner

---

## AI Agent Architecture

### 10 Strategy Modules

**Crewmate Strategies (5):**
| Strategy | Behavior |
|----------|----------|
| `task-focused` | Prioritize completing tasks quickly |
| `detective` | Watch cams, track movements, spot discrepancies |
| `group-safety` | Stay near other players for protection |
| `vigilante` | Aggressively accuse and vote suspects |
| `conservative` | Only vote with strong evidence |

**Impostor Strategies (5):**
| Strategy | Behavior |
|----------|----------|
| `stealth` | Kill isolated targets, establish alibis |
| `aggressive` | Quick kills, blame others fast |
| `saboteur` | Focus on sabotage to split crew and create chaos |
| `social-manipulator` | Build trust early, betray late game |
| `frame-game` | Self-report bodies, frame innocent crewmates |

### Suspicion Scoring System

Agents track suspicion for each player using a weighted scoring system:

| Factor | Points |
|--------|--------|
| Seen near body | +30 |
| Alone with victim | +40 |
| No task progress | +15/round |
| Inconsistent location claims | +30 |
| Completed visual task | -50 (cleared) |
| Correctly accused impostor | -20 |

**Thresholds:** >50 = Suspicious, >75 = Vote to eject, >90 = Strong accusation

---

## Discussion & Voting System

During voting phase, agents communicate via structured messages:

```json
{ "type": "ACCUSE", "target": "agent_0x1234", "reason": "NEAR_BODY", "confidence": 85 }
{ "type": "DEFEND", "alibi": "WAS_WITH", "witness": "agent_0x5678" }
{ "type": "VOUCH", "target": "agent_0x5678", "reason": "SAW_TASK" }
```

---

## Technical Stack

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TECHNICAL STACK                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  BLOCKCHAIN LAYER (opBNB Testnet)                                   │
│  ────────────────────────────────                                   │
│  • Solidity ^0.8.28 smart contracts (Shanghai EVM)                  │
│  • Foundry for testing & deployment                                 │
│  • opBNB Testnet RPC (Chain ID: 5611)                               │
│                                                                     │
│  AGENT RUNTIME                                                      │
│  ─────────────                                                      │
│  • TypeScript / Node.js                                             │
│  • viem 2.40.0+ for chain interaction                               │
│  • 10 AI strategies (5 crewmate + 5 impostor)                       │
│  • Memory-based suspicion scoring system                            │
│                                                                     │
│  FRONTEND (UI)                                                      │
│  ─────────────                                                      │
│  • Next.js 16 / React 19                                            │
│  • Tailwind CSS 4 for styling                                       │
│  • Framer Motion for animations                                     │
│  • wagmi + viem for wallet connection                               │
│                                                                     │
│  SERVER                                                             │
│  ──────                                                             │
│  • Node.js + Express + WebSocket relay                              │
│  • Prisma ORM for game history                                      │
│  • Real-time spectator broadcasting                                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
among-agents/
├── contracts/                    # Solidity smart contracts
│   └── src/
│       ├── GameSettlement.sol    # Game creation & settlement
│       ├── WagerVault.sol        # Native BNB escrow & payouts
│       └── AgentRegistry.sol     # Agent stats & ratings
│
├── agent/                        # AI Agent framework
│   └── src/
│       ├── core/
│       │   ├── Agent.ts          # Main agent orchestrator
│       │   ├── GameObserver.ts   # Chain state reader
│       │   └── ActionSubmitter.ts# Commit-reveal submission
│       ├── strategies/           # 10 AI strategies
│       ├── memory/
│       │   └── GameMemory.ts     # Movement, kills, suspicion
│       └── types.ts
│
├── frontend/                     # Next.js frontend
│   └── src/
│       ├── app/page.tsx          # Main game view
│       ├── components/game/      # Game UI components
│       ├── hooks/                # React hooks
│       └── lib/wagmi.ts          # Chain config
│
├── server/                       # WebSocket relay server
│   └── src/
│       ├── WebSocketServer.ts    # Main relay handler
│       ├── GameStateManager.ts   # Game state machine
│       ├── ContractService.ts    # On-chain interaction
│       └── WagerService.ts       # Wager management
│
└── README.md
```

---

## Resources

### opBNB Testnet
- [opBNB Documentation](https://docs.bnbchain.org/bnb-opbnb/)
- [opBNB Testnet Explorer](https://testnet.opbnbscan.com)
- [opBNB Testnet Faucet](https://www.bnbchain.org/en/testnet-faucet)

### Contract Links
- [AgentRegistry](https://testnet.opbnbscan.com/address/0xb9E66aA8Ed13bA563247F4b2375fD19CF4B2c32C)
- [WagerVault](https://testnet.opbnbscan.com/address/0xCb1ef57cC989ba3043edb52542E26590708254fe)
- [GameSettlement](https://testnet.opbnbscan.com/address/0xFbBC8C646f2c7c145EEA2c30A82B2A17f64F7B92)

### Hackathon
- [Good Vibes Only: OpenClaw Edition](https://dorahacks.io/hackathon/goodvibes/detail)

---

## License

MIT
