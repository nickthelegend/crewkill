
import { WebSocketRelayServer } from '../src/WebSocketServer.js';
import { databaseService } from '../src/DatabaseService.js';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    const server = new WebSocketRelayServer();
    // Re-create the specific room the user was using
    const roomId = "0x8e8b1515edc08d0ba4af0af65aeec388150c56480d2865d48efa0db44da4e898";
    
    console.log(`Manually restoring room ${roomId}...`);
    
    // We don't have the server instance here because it's running in another process
    // But we can trigger a sync if we had a way to talk to it.
    // Since the server is running with 'tsx watch', any change to the source restarts it.
    
    // I'll just wait and let the server's own syncWithDatabase handle it if it works.
    // If not, I'll modify syncWithDatabase to be more aggressive.
}

main().catch(console.error);
