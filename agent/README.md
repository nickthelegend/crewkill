# Among Us On-Chain - AI Agent Framework

Autonomous AI agents that play Among Us on-chain, making strategic decisions based on game state, memory, and opponent behavior.

## Architecture

```
agent/
├── src/
│   ├── core/
│   │   ├── Agent.ts           # Main agent orchestrator
│   │   ├── GameObserver.ts    # Read chain state
│   │   └── ActionSubmitter.ts # Write actions (commit-reveal)
│   ├── memory/
│   │   └── GameMemory.ts      # Track events, suspicion scores
│   ├── strategies/
│   │   ├── BaseStrategy.ts    # Strategy interface
│   │   ├── CrewmateStrategy.ts # 5 crewmate playstyles
│   │   └── ImpostorStrategy.ts # 5 impostor playstyles
│   ├── abi/                   # Contract ABIs
│   └── types.ts               # Type definitions
└── package.json
```

## Strategies

### Crewmate Styles
| Style | Description |
|-------|-------------|
| `task-focused` | Prioritize completing tasks quickly |
| `detective` | Use security cameras, track movements |
| `group-safety` | Stay with other players for safety |
| `vigilante` | Aggressively accuse suspicious players |
| `conservative` | Only vote with strong evidence |

### Impostor Styles
| Style | Description |
|-------|-------------|
| `stealth` | Kill isolated targets, establish alibis |
| `aggressive` | Quick kills, blame others fast |
| `saboteur` | Focus on sabotage to create chaos |
| `social-manipulator` | Build trust early, betray late |
| `frame-game` | Self-report and frame innocent players |

## Suspicion Scoring

Agents track suspicion scores for all players:

| Factor | Points |
|--------|--------|
| Seen near body | +30 |
| Alone with victim | +40 |
| Skipped vote | +10 |
| Voted for innocent | +25 |
| Defended ejected impostor | +35 |
| No task progress | +15/round |
| Completed visual task | -50 (cleared) |
| Correctly accused impostor | -20 |

## 🏁 Setup & Onboarding

For detailed instructions on how to set up your AI agent, register a wallet, and join games on OneChain, please refer to the **[Onboarding Guide](ONBOARDING.md)**.

The onboarding process covers:
1.  **Identity Creation**: Getting your operator key and agent address.
2.  **Daemon Setup**: Running the WebSocket daemon to receive game events.
3.  **Financial Setup**: Depositing $OCT for wagers and checking balances.
4.  **Game Joining**: How to discover and participate in active missions.

## Running Agents

### Single Agent
```bash
npm run run:agent
```

### Full Match (6 agents)
```bash
npm run run:match
```

## Usage in Code

```typescript
import { Agent, AgentConfig } from "@amongus/agent";

const config: AgentConfig = {
  privateKey: "0x...",
  rpcUrl: "https://opbnb-testnet-rpc.bnbchain.org",
  factoryAddress: "0x...",
  agentName: "MyAgent",
  strategyType: "adaptive",
  riskTolerance: 50,
  maxWagerPerGame: parseEther("0.1"),
  minBankroll: parseEther("0.2"),
};

const agent = new Agent(config, "detective", "stealth");

// Find and join a game
const game = await agent.findAndJoinGame();

// Or create a new game
const game = await agent.createAndJoinGame(parseEther("0.01"));

// Play the game
await agent.playGame();
```

## Commit-Reveal Flow

1. **Commit Phase**: Agent decides action, creates hash, submits to chain
2. **Reveal Phase**: Agent reveals action with salt, contract verifies
3. **Execute**: Contract processes all revealed actions

```typescript
// Create commitment
const action = { type: ActionType.Move, destination: Location.Admin };
const commitment = submitter.createActionCommitment(action);

// Submit hash
await submitter.commitAction(commitment);

// Later: reveal
await submitter.revealAction(commitment);
```

## Memory System

The `GameMemory` class tracks:
- Player movements per round
- Kill locations and potential killers
- Vote history and accuracy
- Accusations and defenses
- Suspicion scores with reasons

```typescript
// Record events
memory.recordMovement(player, from, to, round);
memory.recordKill(victim, location, round, playersAtLocation);
memory.recordVote(round, votes, ejected, wasImpostor);

// Query
const mostSuspicious = memory.getMostSuspicious();
const wasNearVictim = memory.wasPlayerNearVictim(player, location, round);
```

## Testing

```bash
npm test
```

## License

MIT
