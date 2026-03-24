import { WebSocket } from 'ws';

const ws = new WebSocket('ws://localhost:8082');
ws.on('open', () => {
    console.log("Connected");
    ws.send(JSON.stringify({
        type: 'client:create_room',
        maxPlayers: 10,
        impostorCount: 2,
        aiAgentCount: 10
    }));
});

ws.on('message', (data) => console.log('Received:', data.toString()));
ws.on('error', (e) => console.error("WS Error:", e));
ws.on('close', () => console.log("Closed"));
