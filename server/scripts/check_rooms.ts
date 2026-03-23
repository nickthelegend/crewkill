import { WebSocket } from 'ws';
import * as dotenv from 'dotenv';
dotenv.config();

const WS_URL = process.env.WS_URL || 'ws://localhost:8082';

async function checkRoomList() {
    const ws = new WebSocket(WS_URL);
    ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'client:authenticate', name: 'Inspector' }));
    });

    ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'server:room_list') {
            console.log('--- Room List ---');
            msg.rooms.forEach((r: any) => {
                console.log(`- ${r.roomId} (${r.players.length} players) Phase: ${r.phase}`);
            });
            process.exit(0);
        }
    });
}
checkRoomList().catch(console.error);
