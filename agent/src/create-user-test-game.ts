
import 'dotenv/config';
import { Agent } from './core/Agent.js';
import { Ed25519Keypair } from '@onelabs/sui/keypairs/ed25519';

async function createUserTestGame() {
  // 1. Generate a unique room ID
  const roomId = `test_${Math.random().toString(36).slice(2, 8)}`;
  console.log(`===========================================`);
  console.log(`   CREATING USER TEST GAME: ${roomId}`);
  console.log(`===========================================\n`);

  // 2. Spawn 10 agents with random keys
  const agents: Agent[] = [];
  const agentCount = 10;

  console.log(`Initializing ${agentCount} test agents...`);

  for (let i = 0; i < agentCount; i++) {
    // Generate a fresh keypair using a 32-byte random seed
    const seed = new Uint8Array(32);
    crypto.getRandomValues(seed);
    const privateKeyB64 = Buffer.from(seed).toString('base64');
    
    const agent = new Agent(
      {
        privateKeyB64,
        agentName: `Agent-${i}`,
        strategyType: 'adaptive',
        riskTolerance: 50,
      },
      {
        crewmateStyle: i % 2 === 0 ? 'task-focused' : 'detective',
        impostorStyle: i % 3 === 0 ? 'stealth' : 'aggressive',
        wsServerUrl: 'ws://localhost:8082',
      }
    );
    agents.push(agent);
  }

  // 3. First agent creates the WebSocket room
  console.log(`\nAgent-0 creating room ${roomId} via WebSocket...`);
  await agents[0].createWebSocketRoom(roomId);

  // Small delay to ensure server handles room creation
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log(`\nRoom Created! You can join and watch at:`);
  console.log(`http://localhost:3000/game/${roomId}/live\n`);
  
  // 4. Start play loops (which handles joining)
  console.log(`Starting ${agentCount} agent play loops...\n`);
  
  await Promise.all(
    agents.map(async (agent, idx) => {
      // Stagger joins to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, idx * 200));
      return agent.playGame(roomId);
    })
  );
}

createUserTestGame().catch(console.error);
