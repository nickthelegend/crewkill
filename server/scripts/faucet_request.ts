import { getFaucetHost, requestSuiFromFaucetV1 } from '@onelabs/sui/faucet';

async function main() {
  const address = '0xf097e2907931ef20ab18efda4d476c8da5513cbd035556517afb0f83fa345209';
  const faucetHost = 'https://faucet-testnet.onelabs.cc'; // Standard for OneLabs testnet
  
  console.log(`Requesting tokens from faucet for: ${address}`);
  console.log(`Using faucet: ${faucetHost}`);
  
  try {
    const response = await requestSuiFromFaucetV1({
      host: faucetHost,
      recipient: address,
    });
    console.log('Faucet Response:', JSON.stringify(response, null, 2));
    if (response.transferredGasObjects.length > 0) {
        console.log('SUCCESS: Tokens transferred.');
    } else if (response.error) {
        console.log('ERROR:', response.error);
    }
  } catch (err) {
    console.error('FAILED:', err);
  }
}

main();
