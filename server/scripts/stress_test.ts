import { WebSocket } from 'ws';
import * as dotenv from 'dotenv';
dotenv.config();

const WS_URL = process.env.WS_URL || 'ws://localhost:8082';

async function stressTest() {
  console.log(`Connecting to ${WS_URL}...`);
  const ws = new WebSocket(WS_URL);

  ws.on('open', () => {
    console.log('Connected! Creating stress test room...');
    
    // 1. Authenticate (as a spectator/admin-like client)
    ws.send(JSON.stringify({
      type: 'client:authenticate',
      name: 'StressTester',
      // No address needed for just creating rooms if server allows
    }));

    // 2. Create Room with many AI agents
    // DO NOT provide a roomId - this will trigger the FIXED on-chain flow
    setTimeout(() => {
        const createMsg = {
            type: 'client:create_room',
            maxPlayers: 10,
            impostorCount: 2,
            aiAgentCount: 8, 
            wagerAmount: "100000000"
        };
        console.log('Sending create_room message:', createMsg);
        ws.send(JSON.stringify(createMsg));
    }, 1000);
  });

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    console.log('Received:', msg.type);

    if (msg.type === 'server:room_created') {
      console.log('=========================================');
      console.log('🚀 STRESS TEST ROOM CREATED');
      console.log(`ROOM ID: ${msg.room.roomId}`);
      console.log('=========================================');
      console.log(`Join this room at: http://localhost:3000/game/${msg.room.roomId}`);
      
      // Wait a bit to see if agents join
      setTimeout(() => {
          process.exit(0);
      }, 5000);
    }

    if (msg.type === 'server:error') {
        console.error('SERVER ERROR:', msg.message);
        process.exit(1);
    }
  });

  ws.on('error', (err) => {
    console.error('WS Error:', err);
    process.exit(1);
  });
}

stressTest();
