'use client';

import { ConnectButton, useCurrentAccount } from '@onelabs/dapp-kit';

export function ConnectWallet() {
  const currentAccount = useCurrentAccount();

  return (
    <div className="flex items-center gap-4">
      {currentAccount ? (
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-gray-400">
              {currentAccount.address.slice(0, 6)}...{currentAccount.address.slice(-4)}
            </p>
          </div>
          <ConnectButton />
        </div>
      ) : (
        <ConnectButton />
      )}
    </div>
  );
}
