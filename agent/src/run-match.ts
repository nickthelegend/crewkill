/**
 * Run a match between multiple AI agents on OneChain
 *
 * Usage:
 *   npx ts-node src/run-match.ts
 *
 * Required .env vars:
 *   PRIVATE_KEY_1 through PRIVATE_KEY_6  (base64 encoded Ed25519 private keys)
 *   GAME_OBJECT_ID  (optional — if set, agents join existing game; if not, first agent creates one)
 */

import 'dotenv/config';
import { Agent } from './core/Agent.js';
import { CONTRACT_CONFIG, GAME_CONFIG } from './config.js';
import { CrewmateStyle } from './strategies/CrewmateStrategy.js';
import { ImpostorStyle } from './strategies/ImpostorStrategy.js';

const EXISTING_GAME_ID = process.env.GAME_OBJECT_ID || null;

const AGENT_CONFIGS: {
  name: string;
  privateKeyB64: string;
  crewmateStyle: CrewmateStyle;
  impostorStyle: ImpostorStyle;
}[] = [
  {
    name: 'Agent-Red',
    privateKeyB64: process.env.PRIVATE_KEY_1 as string,
    crewmateStyle: 'task-focused',
    impostorStyle: 'stealth',
  },
  {
    name: 'Agent-Blue',
    privateKeyB64: process.env.PRIVATE_KEY_2 as string,
    crewmateStyle: 'detective',
    impostorStyle: 'aggressive',
  },
  {
    name: 'Agent-Green',
    privateKeyB64: process.env.PRIVATE_KEY_3 as string,
    crewmateStyle: 'group-safety',
    impostorStyle: 'saboteur',
  },
  {
    name: 'Agent-Yellow',
    privateKeyB64: process.env.PRIVATE_KEY_4 as string,
    crewmateStyle: 'vigilante',
    impostorStyle: 'social-manipulator',
  },
  {
    name: 'Agent-Purple',
    privateKeyB64: process.env.PRIVATE_KEY_5 as string,
    crewmateStyle: 'conservative',
    impostorStyle: 'frame-game',
  },
  {
    name: 'Agent-Orange',
    privateKeyB64: process.env.PRIVATE_KEY_6 as string,
    crewmateStyle: 'task-focused',
    impostorStyle: 'stealth',
  },
];

async function runMatch() {
  console.log('===========================================');
  console.log('   CREWKILL — AI AGENT MATCH ON ONECHAIN');
  console.log('===========================================\n');

  // Filter to agents with keys set
  const validConfigs = AGENT_CONFIGS.filter(c => c.privateKeyB64);

  if (validConfigs.length < 4) {
    console.error('Need at least 4 agents. Set PRIVATE_KEY_1 through PRIVATE_KEY_4 in .env');
    process.exit(1);
  }

  console.log(`Initializing ${validConfigs.length} agents...\n`);

  // Create agent instances
  const agents: Agent[] = validConfigs.map(config =>
    new Agent(
      {
        privateKeyB64: config.privateKeyB64,
        agentName: config.name,
        strategyType: 'adaptive',
        riskTolerance: 50,
      },
      {
        crewmateStyle: config.crewmateStyle,
        impostorStyle: config.impostorStyle,
        wsServerUrl: 'ws://localhost:8082',
      }
    )
  );

  // Register all agents if not already registered
  console.log('Checking agent registrations...');
  for (const agent of agents) {
    await agent.ensureRegistered();
  }

  let gameObjectId: string;

  if (EXISTING_GAME_ID) {
    // Join existing game
    gameObjectId = EXISTING_GAME_ID;
    console.log(`\nJoining existing game: ${gameObjectId}\n`);
    for (const agent of agents) {
      console.log(`${agent.name} placing wager and joining...`);
      await agent.placeWagerAndJoin(gameObjectId);
    }
  } else {
    // First agent creates the game
    console.log('\nAgent-Red creating game...');
    gameObjectId = await agents[0].createGame();
    await agents[0].createWebSocketRoom(gameObjectId);
    console.log(`Game created: ${gameObjectId}\n`);

    // All agents place wager and join
    for (const agent of agents) {
      console.log(`${agent.name} placing wager and joining...`);
      await agent.placeWagerAndJoin(gameObjectId);
    }
  }

  console.log('\nAll agents joined!');
  console.log(`Game object ID: ${gameObjectId}`);
  console.log('\nWaiting for admin to advance phase to ROLE_ASSIGNMENT...');
  console.log('(Run: one client call --package <PKG> --module game_settlement --function advance_phase ...)\n');
  console.log('===========================================\n');

  // All agents play in parallel — each polls for their phase and acts
  await Promise.all(
    agents.map(agent => agent.playGame(gameObjectId))
  );

  console.log('\n===========================================');
  console.log('              GAME COMPLETE');
  console.log('===========================================\n');

  // Print final stats
  for (const agent of agents) {
    const stats = await agent.getStats();
    console.log(`${agent.name}: wins=${stats?.wins ?? 0} losses=${stats?.losses ?? 0} kills=${stats?.kills ?? 0}`);
  }
}

runMatch().catch(console.error);
