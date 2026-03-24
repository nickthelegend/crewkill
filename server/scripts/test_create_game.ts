import { WebSocket } from 'ws';

const ws = new WebSocket('ws://localhost:8082');
ws.on('open', () => {
    ws.send(JSON.stringify({
        type: 'client:create_room',
        maxPlayers: 10,
        impostorCount: 2,
        aiAgentCount: 5
    }));
});

ws.on('message', (data) => console.log('Received:', data.toString()));
