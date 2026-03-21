import fs from 'fs';
import path from 'path';

/**
 * ReplayLogger — collects game events into JSONL format for Walrus/NFT storage.
 */
export class ReplayLogger {
  private logPath: string;

  constructor(gameId: string) {
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);
    this.logPath = path.join(logsDir, `replay_${gameId}.jsonl`);
  }

  log(event: any) {
    const logEntry = JSON.stringify({
      ...event,
      timestamp: Date.now(),
    });
    fs.appendFileSync(this.logPath, logEntry + '\n');
  }

  async uploadToWalrus(): Promise<string | null> {
    try {
      const data = fs.readFileSync(this.logPath);
      // Walrus Devnet Publisher
      const response = await fetch('https://publisher-devnet.walrus.site/v1/store?epochs=5', {
        method: 'PUT',
        body: data,
      });

      const result = await response.json();
      console.log('Walrus upload result:', result);
      
      // Blob ID is usually in result.newElement.blobId or result.alreadyCertified.blobId
      return result.newElement?.blobId || result.alreadyCertified?.blobId || null;
    } catch (error) {
      console.error('Walrus upload failed:', error);
      return null;
    }
  }

  getLogContent(): string {
    return fs.readFileSync(this.logPath, 'utf8');
  }
}
