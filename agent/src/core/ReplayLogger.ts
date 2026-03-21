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

  async uploadToPinata(): Promise<string | null> {
    try {
      const data = fs.readFileSync(this.logPath, 'utf8');
      
      const pinataApiKey = process.env.PINATA_API_KEY || '';
      const pinataSecretApiKey = process.env.PINATA_API_SECRET || '';

      if (!pinataApiKey || !pinataSecretApiKey) {
        console.warn('Pinata keys not found. Skipping IPFS upload.');
        return null;
      }

      const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': pinataApiKey,
          'pinata_secret_api_key': pinataSecretApiKey,
        },
        body: JSON.stringify({
          pinataMetadata: { name: `replay_${Date.now()}.jsonl` },
          pinataContent: { log: data },
        }),
      });

      const result: any = await response.json();
      console.log('Pinata upload result:', result);
      return result.IpfsHash || null;
    } catch (error) {
      console.error('Pinata upload failed:', error);
      return null;
    }
  }

  getLogContent(): string {
    return fs.readFileSync(this.logPath, 'utf8');
  }
}
