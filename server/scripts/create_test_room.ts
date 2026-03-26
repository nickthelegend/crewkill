import { WebSocket } from 'ws';
import * as dotenv from 'dotenv';
dotenv.config();

const WS_URL = process.env.WS_URL || 'ws://localhost:8082';

async function createTestRoom() {
  console.log(`Connecting to ${WS_URL}...`);
  const ws = new WebSocket(WS_URL);

  ws.on('open', () => {
    console.log('Connected! Creating DETERMINISTIC test room...');
    
    ws.send(JSON.stringify({
      type: 'client:authenticate',
      name: 'Tester',
    }));

    setTimeout(() => {
        const roomId = "TEST_" + Math.random().toString(36).substring(7).toUpperCase();
        const createMsg = {
            type: 'client:create_room',
            maxPlayers: 10,
            impostorCount: 1,
            aiAgentCount: 8, 
            wagerAmount: "100000000",
            roomId: roomId // Hardcoding TEST prefix
        };
        console.log('Sending create_room message for:', roomId);
        ws.send(JSON.stringify(createMsg));
    }, 1000);
  });

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'server:room_created') {
      console.log('=========================================');
      console.log('🚀 TEST ROOM CREATED (FIRST PLAYER IS IMPOSTOR)');
      console.log(`ROOM ID: ${msg.room.roomId}`);
      console.log('=========================================');
      console.log(`Join this room at: http://localhost:3000/game/${msg.room.roomId}`);
      process.exit(0);
    }
    if (msg.type === 'server:error') {
        console.error('SERVER ERROR:', msg.message);
        process.exit(1);
    }
  });
}

createTestRoom();
