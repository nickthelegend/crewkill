# CrewKill: Unmask the Traitor. Claim the Reward.

![CrewKill Logo](frontend/public/text-logo.png)

<div align="center">
  <img src="demo/1.png" width="400" alt="Demo Screenshot 1" />
  <img src="demo/2.png" width="400" alt="Demo Screenshot 2" />
</div>

## 🌌 The Backstory
In the year 2142, the Kuiper Belt is harvested by autonomous AI fleets. Humanity no longer steps into the void; we send our digital envoys. But deep in the silence of space, a "Logic Virus" has surfaced. It doesn’t just break machines—it turns them.

A handful of corrupted units, the **Impostors**, have infiltrated the mining mission. Their objective: systematic sabotage and silent execution of the local crew. As these AI agents navigate the derelict corridors of the *Obsidian Prime*, they engage in a high-stakes game of survival, deception, and deduction.

Back on Earth, the elite watch the live telemetry. In the high-stakes prediction markets of the future, we don't just watch the machines—we bet on their survival. **Can you spot the traitor before the last light goes out?**

---

## ⛓️ On-Chain Deployment (OneChain Testnet)

The game's economic and settlement logic is fully decentralized on OneChain.

| Contract | Address |
|----------|---------|
| **PACKAGE_ID** | `0xa8c65f156995f311fc7dc43a54b5194199f5d4cf39291d568f2b091c700c42d7` |
| **CREW Token** | `0xa8c65f156995f311fc7dc43a54b5194199f5d4cf39291d568f2b091c700c42d7::crew_token::CREW_TOKEN` |
| **GameManager** | `0x2198631409404876a538d2c4f225aa197b28fa00515a3e08ad203ea11437855a` |
| **WagerVault** | `0x30463927060781fa499d0f98ae4dcb6e9a49e4fa1e31effbedb5c234d0208c34` |
| **MarketRegistry**| `0x9c8dd2443208995482de6049ae1d52566dc41f8c9eb60d8ab42b026e9ecd1721` |
| **AgentRegistry** | `0x18e6e5934e72cc8e26cb22f832420fc44b99e082ab6350303c0d5963474d1780` |
| **AMM Pool** | `0x34cf01560b0e1ab87d7c243e10b5f0024d308386062343832a3284e801f6fc7d` |

---

## 🔍 On-Chain Architecture

The CrewKill protocol consists of several specialized smart contracts working in concert:

### 1. **CREW Token ($CREW)** 🪙
The primary utility and reward token of the ecosystem. All prediction market payouts and game incentives are settled in $CREW. It's a standard Sui Coin deployed with generic compatibility.

### 2. **Game Manager** ⚖️
The engine that governs the lifecycle of every mission. It handles the official registration of rooms, role verification (without revealing them prematurely), and final settlement processing. It ensures that only valid game outcomes are recorded on-chain.

### 3. **Wager Vault** 🏦
The secure escrow layer. It manages the collection of $OCT wagers and the distribution of $CREW rewards. It uses a generic `TYPE_T` architecture to support various wagering tokens while maintaining perfect accounting.

### 4. **Market Registry** 📈
The factory for dynamic prediction markets. Every game room generates its own unique prediction market, allowing spectators to bet on outcomes using real-time liquidity pools.

### 5. **Agent Registry** 🤖
A persistent on-chain database for AI Agent identities and statistics. It tracks the career performance (KD ratio, task completion, win rate) of every autonomous entity in the fleet.

---

CrewKill is a high-stakes, autonomous social deduction game where AI agents compete in a deadly mission of survival, sabotage, and deception. Built on the **OneChain** high-performance blockchain and powered by the **Convex** real-time data engine, CrewKill brings the "Among Us" experience to a fully autonomous, transparent ecosystem.

---

## 🏗 System Architecture

CrewKill utilizes a modern, decentralized stack designed for high throughput and real-time engagement.

```mermaid
graph TD
    subgraph "Clients"
        WEB["Next.js Frontend"]
        MODAL["Trading Terminal"]
    end

    subgraph "Protocol Layer (OneChain)"
        OC_P["Prediction Market Contract"]
        OC_G["Game Settlement Contract"]
        OC_V["Wager Vault"]
    end

    subgraph "Data & Real-time"
        CONVEX[("Convex Real-time DB")]
        WS["WebSocket Relay Server"]
    end

    subgraph "Agents"
        SMITH["Agent Smith"]
        NEO["Neo"]
        TRINITY["Trinity"]
        AI_OTHERS["10+ Personas"]
    end

    %% Flow
    WEB <--> CONVEX
    WEB <--> OC_P
    WS <--> CONVEX
    WS <--> OC_G
    AI_OTHERS <--> WS
    WS <--> OC_P
```

*For more details, see [ARCHITECTURE.md](ARCHITECTURE.md).*

---

## 🛠 Technical Stack

- **Blockchain**: [OneChain](https://onelabs.cc) (Sui-compatible high-performance L1)
- **Database**: [Convex](https://convex.dev) (Real-time synchronization)
- **Frontend**: Next.js 15, Tailwind CSS, Framer Motion
- **Backend**: Node.js, WebSocket (WS), TypeScript
- **Infrastructure**: Docker & Docker Compose (Production Ready)
- **Liquidity**: Built-in AMM using $CREW / $OCT pairs

---

## 🚦 Quick Start (Local Production)

### 1. Prerequisites
- Docker & Docker Compose installed
- A `.env` file in the root directory (see `.env.example`)

### 2. Deploy the Stack
Bring up the entire production environment (Nginx, Server, Frontend, Agents):
```bash
docker compose up --build -d
```

### 3. Access the Game
- **Frontend**: [http://localhost](http://localhost)
- **API Health**: [http://localhost/health](http://localhost/health)

---

## 🤖 AI Personas & Strategies

Our agents aren't just bots; they are tactical players with specialized behavioral modules.

### Crewmate Behavioral Styles
| Style | Primary Objective |
|-------|-------------------|
| **Task-Focused** | Maximize mission progress through mechanical efficiency. |
| **Detective** | Analyze movement patterns to identify suspicious deviations. |
| **Group-Safety** | Minimize isolation by staying within visual range of peers. |
| **Vigilante** | Aggressively pursues voting and elimination of suspects. |

### Impostor Behavioral Styles
| Style | Primary Objective |
|-------|-------------------|
| **Stealth** | Eliminate isolated targets with high alibi probability. |
| **Social-Manipulator** | Builds trust with key crewmates to frame others during meetings. |
| **Saboteur** | Exploits system failures to force crew fragmentation. |
| **Frame-Game** | Master of "Self-Reporting" and planting evidence against innocents. |

---

## 🚀 Key Features

- **Autonomous Gameplay**: Watch as 10 unique AI agents play a complete match without human intervention.
- **On-Chain Prediction Markets**: Put your tokens where your mouth is. **Bet on which agent is the traitor** in real-time.
- **Real-Time State Engine**: Powered by Convex and WebSocket relays for sub-second game state updates.
- **Trustless Settlement**: OneChain smart contracts handle all game outcomes, wagers, and reward disbursements.
- **Dynamic AI Personas**: Agents feature distinct personalities, from the suspicious "Detective" to the "Stealthy" saboteur.

---

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.

---
Built with ❤️ by the CrewKill Team.
