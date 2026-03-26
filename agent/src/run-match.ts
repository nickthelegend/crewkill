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
import { WebSocket } from 'ws';
(global as any).WebSocket = WebSocket;
import { Agent } from './core/Agent.js';
import { CONTRACT_CONFIG, GAME_CONFIG } from './config.js';
import { CrewmateStyle } from './strategies/CrewmateStrategy.js';
import { ImpostorStyle } from './strategies/ImpostorStrategy.js';

const DISABLE_WAGERS = process.env.DISABLE_WAGERS === 'true';
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
        wsServerUrl: process.env.WS_SERVER_URL || 'ws://localhost:8082',
      }
    )
  );

  // Register all agents if not already registered (skip if wagers disabled since no gas)
  if (!DISABLE_WAGERS) {
    console.log('Checking agent registrations...');
    for (const agent of agents) {
      await agent.ensureRegistered();
    }
  } else {
    console.log('Wagers disabled in agent: skipping on-chain registration checks');
  }

  let gameObjectId: string;

  if (EXISTING_GAME_ID) {
    // Join existing game
    gameObjectId = EXISTING_GAME_ID;
    console.log(`\nJoining existing game: ${gameObjectId}\n`);
    for (const agent of agents) {
      if (!DISABLE_WAGERS) {
        console.log(`${agent.name} placing wager and joining...`);
        await agent.placeWagerAndJoin(gameObjectId);
      } else {
        console.log(`${agent.name} joining via WebSocket only...`);
      }
    }
  } else {
    // First agent creates the game
    if (!DISABLE_WAGERS) {
        console.log('\nAgent-Red creating game on-chain...');
        gameObjectId = await agents[0].createGame();
        await agents[0].createWebSocketRoom(gameObjectId);
        console.log(`Game created on-chain: ${gameObjectId}\n`);
    } else {
        // Find a scheduled room if one exists
        try {
            const response = await fetch(`${process.env.SERVER_API_URL || 'http://localhost:8080'}/api/rooms`);
            const data = await response.json() as any;
            console.log("DEBUG: Rooms from API:", data.rooms);
            const rooms = data.rooms || [];
            const scheduledRoom = (rooms as any[]).find((r: any) => r.roomId.startsWith('scheduled_'));
            
            if (scheduledRoom) {
                gameObjectId = scheduledRoom.roomId;
                console.log(`\nFound scheduled room! Joining: ${gameObjectId}\n`);
            } else {
                // Use a persistent random ID for this session match
                gameObjectId = `OFFLINE-${Math.random().toString(36).slice(2, 8)}`;
                console.log(`\nStarting local/off-chain match with ID: ${gameObjectId}\n`);
                await agents[0].createWebSocketRoom(gameObjectId);
            }
        } catch (e) {
            gameObjectId = `OFFLINE-${Math.random().toString(36).slice(2, 8)}`;
            console.log(`\nFallback: Starting local/off-chain match with ID: ${gameObjectId}\n`);
            await agents[0].createWebSocketRoom(gameObjectId);
        }
    }

    // All agents join
    for (const agent of agents) {
      if (!DISABLE_WAGERS) {
          console.log(`${agent.name} placing wager and joining...`);
          await agent.placeWagerAndJoin(gameObjectId);
      } else {
          console.log(`${agent.name} joining lobby...`);
      }
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
