import PinataClient from '@pinata/sdk';

const PINATA_API_KEY = process.env.PINATA_API_KEY || '';
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY || '';

const pinata = new PinataClient(PINATA_API_KEY, PINATA_SECRET_KEY);

export async function uploadToPinata(content: string, fileName: string): Promise<string | null> {
  try {
    const result = await pinata.pinJSONToIPFS({
      pinataMetadata: { name: fileName },
      pinataContent: content,
    });
    return result.IpfsHash;
  } catch (error) {
    console.error('Pinata upload failed:', error);
    return null;
  }
}

export async function uploadFileToPinata(filePath: string, fileName: string): Promise<string | null> {
  try {
    const fs = await import('fs');
    const readableStreamForFile = fs.createReadStream(filePath);
    const result = await pinata.pinFileToIPFS(readableStreamForFile, {
      pinataMetadata: { name: fileName },
    });
    return result.IpfsHash;
  } catch (error) {
    console.error('Pinata file upload failed:', error);
    return null;
  }
}
