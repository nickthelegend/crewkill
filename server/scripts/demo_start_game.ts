
import axios from 'axios';
import 'dotenv/config';

const OPERATOR_KEY = process.env.OPERATOR_PRIV_KEY || "crewkill-dev-operator-key";
const API_URL = "http://localhost:8080/api";

async function main() {
    console.log("🚀 Starting Demo Flow Test...");

    // 1. Find active rooms
    const roomsResponse = await fetch(`${API_URL}/rooms`);
    const roomsData: any = await roomsResponse.json();
    const rooms = roomsData.rooms;
    
    if (rooms.length === 0) {
        console.log("❌ No active rooms found. Please create one first or wait for sync.");
        return;
    }

    const roomId = rooms[0].roomId;
    console.log(`📍 Found active room: ${roomId}`);
    console.log(`👥 Players in lobby: ${rooms[0].players.length}/${rooms[0].maxPlayers}`);

    // 2. Force start the game
    console.log(`⚡ Force-starting game for room ${roomId}...`);
    try {
        const startResponse = await fetch(`${API_URL}/system/start-game`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${OPERATOR_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ roomId })
        });
        
        const startData: any = await startResponse.json();
        if (startData.success) {
            console.log("✅ Game started successfully!");
            console.log("👀 You can now watch the LIVE view or RECAP as events unfold.");
        } else {
            console.log("⚠️ Start request returned non-success:", startData);
        }
    } catch (error: any) {
        console.error("❌ Failed to start game:", error.message);
    }
}

main().catch(console.error);
