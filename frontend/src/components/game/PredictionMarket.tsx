'use client';

import { useState, useEffect } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@onelabs/dapp-kit';
import { Transaction } from '@onelabs/sui/transactions';
import { suiClient, PACKAGE_ID, MARKET_REGISTRY_ID } from '@/lib/onechain';

interface Player {
  address: string;
  name: string; // agent display name e.g. "Agent 0x857..."
}

interface SuspectPool {
  address: string;
  totalBet: number; // in MIST
  percentage: number;
}

interface UserBet {
  suspect: string;
  amount: number;
  correct: boolean;
  claimed: boolean;
}

interface PredictionMarketProps {
  gameId: string;           // the Game shared object ID
  marketObjectId: string;   // the PredictionMarket shared object ID
  gamePlayers: Player[];
  isResolved: boolean;
  actualImpostors: string[];
  gamePhase: number;        // 0=LOBBY, 1=ROLE_ASSIGN, 2+=betting closed
}

export function PredictionMarket({
  gameId,
  marketObjectId,
  gamePlayers,
  isResolved,
  actualImpostors,
  gamePhase,
}: PredictionMarketProps) {
  const account = useCurrentAccount();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();

  const [suspectPools, setSuspectPools] = useState<SuspectPool[]>([]);
  const [userBet, setUserBet] = useState<UserBet | null>(null);
  const [selectedSuspect, setSelectedSuspect] = useState<string>('');
  const [betAmount, setBetAmount] = useState<string>('0.1'); // OCT
  const [totalPot, setTotalPot] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [txMsg, setTxMsg] = useState('');

  // Fetch market state from chain
  useEffect(() => {
    if (!marketObjectId || marketObjectId === '0x_FILL_AFTER_DEPLOY') return;
    fetchMarketState();
    const interval = setInterval(fetchMarketState, 5000);
    return () => clearInterval(interval);
  }, [marketObjectId, account?.address]);

  async function fetchMarketState() {
    try {
      const result = await suiClient.getObject({
        id: marketObjectId,
        options: { showContent: true },
      });

      const fields = (result.data?.content as any)?.fields;
      if (!fields) return;

      setIsOpen(fields.open === true);
      const pot = parseInt(fields.total_pot?.fields?.value || '0');
      setTotalPot(pot);

      // Build suspect pool display
      const pools: SuspectPool[] = gamePlayers.map((p) => {
        const poolEntry = fields.suspect_pools?.fields?.contents?.find(
          (c: any) => c.fields?.key === p.address
        );
        const amount = parseInt(poolEntry?.fields?.value || '0');
        return {
          address: p.address,
          totalBet: amount,
          percentage: pot > 0 ? Math.round((amount / pot) * 100) : 0,
        };
      });
      setSuspectPools(pools);

      // Check if user has a bet
      if (account?.address) {
        const betEntry = fields.bets?.fields?.contents?.find(
          (c: any) => c.fields?.key === account.address
        );
        if (betEntry) {
          const bet = betEntry.fields?.value?.fields;
          const claimedEntry = fields.claimed?.fields?.contents?.find(
            (c: any) => c.fields?.key === account.address
          );
          setUserBet({
            suspect: bet?.suspect,
            amount: parseInt(bet?.amount || '0'),
            correct: bet?.correct === true,
            claimed: !!claimedEntry,
          });
        }
      }
    } catch (e) {
      console.error('Failed to fetch market state:', e);
    }
  }

  async function handlePlaceBet() {
    if (!account || !selectedSuspect || !betAmount) return;

    const betMist = BigInt(Math.round(parseFloat(betAmount) * 1_000_000_000));
    if (betMist < 10_000_000n) {
      setTxMsg('Minimum bet is 0.01 OCT');
      setTxStatus('error');
      return;
    }

    setLoading(true);
    setTxStatus('idle');

    try {
      const tx = new Transaction();
      const [betCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(betMist)]);
      tx.moveCall({
        target: `${PACKAGE_ID}::prediction_market::place_bet`,
        arguments: [
          tx.object(marketObjectId),
          tx.pure.address(selectedSuspect),
          betCoin,
        ],
      });

      signAndExecute(
        { transaction: tx, options: { showEffects: true } },
        {
          onSuccess: (result) => {
            setTxStatus('success');
            setTxMsg(`Bet placed! Digest: ${result.digest.slice(0, 16)}...`);
            setLoading(false);
            fetchMarketState();
          },
          onError: (err) => {
            setTxStatus('error');
            setTxMsg(err.message || 'Transaction failed');
            setLoading(false);
          },
        }
      );
    } catch (e: any) {
      setTxStatus('error');
      setTxMsg(e.message || 'Error building transaction');
      setLoading(false);
    }
  }

  async function handleClaimWinnings() {
    if (!account || !userBet?.correct || userBet.claimed) return;

    setLoading(true);
    setTxStatus('idle');

    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::prediction_market::claim_winnings`,
        arguments: [
          tx.object(marketObjectId),
          tx.object(MARKET_REGISTRY_ID),
        ],
      });

      signAndExecute(
        { transaction: tx, options: { showEffects: true } },
        {
          onSuccess: (result) => {
            setTxStatus('success');
            setTxMsg(`Claimed! Digest: ${result.digest.slice(0, 16)}...`);
            setLoading(false);
            fetchMarketState();
          },
          onError: (err) => {
            setTxStatus('error');
            setTxMsg(err.message || 'Claim failed');
            setLoading(false);
          },
        }
      );
    } catch (e: any) {
      setTxStatus('error');
      setTxMsg(e.message || 'Error building transaction');
      setLoading(false);
    }
  }

  const bettingOpen = isOpen && gamePhase < 2 && !userBet;
  const canClaim = isResolved && userBet?.correct && !userBet.claimed;

  return (
    <div style={{
      background: 'var(--color-background-secondary)',
      border: '1px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-lg)',
      padding: '20px',
      maxWidth: '480px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 500 }}>
          Who is the impostor?
        </h3>
        <span style={{
          fontSize: '11px',
          padding: '3px 8px',
          borderRadius: '12px',
          background: isResolved
            ? 'var(--color-background-success)'
            : isOpen
            ? 'var(--color-background-info)'
            : 'var(--color-background-warning)',
          color: isResolved
            ? 'var(--color-text-success)'
            : isOpen
            ? 'var(--color-text-info)'
            : 'var(--color-text-warning)',
        }}>
          {isResolved ? 'Resolved' : isOpen ? 'Betting open' : 'Closed'}
        </span>
      </div>

      {/* Total pot */}
      <div style={{
        textAlign: 'center',
        marginBottom: '20px',
        padding: '12px',
        background: 'var(--color-background-tertiary)',
        borderRadius: 'var(--border-radius-md)',
      }}>
        <div style={{ fontSize: '22px', fontWeight: 500 }}>
          {(totalPot / 1_000_000_000).toFixed(3)} OCT
        </div>
        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
          total prediction pool
        </div>
      </div>

      {/* Suspect list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
        {gamePlayers.map((player) => {
          const pool = suspectPools.find(p => p.address === player.address);
          const isActualImpostor = isResolved && actualImpostors.includes(player.address);
          const isUserPick = userBet?.suspect === player.address;

          return (
            <div
              key={player.address}
              onClick={() => bettingOpen && setSelectedSuspect(player.address)}
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--border-radius-md)',
                border: `1px solid ${
                  selectedSuspect === player.address
                    ? 'var(--color-border-info)'
                    : isActualImpostor
                    ? 'var(--color-border-danger)'
                    : 'var(--color-border-tertiary)'
                }`,
                background: isActualImpostor
                  ? 'var(--color-background-danger)'
                  : selectedSuspect === player.address
                  ? 'var(--color-background-info)'
                  : 'var(--color-background-primary)',
                cursor: bettingOpen ? 'pointer' : 'default',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>
                    {player.name}
                  </span>
                  {isUserPick && (
                    <span style={{
                      marginLeft: '8px',
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '8px',
                      background: 'var(--color-background-info)',
                      color: 'var(--color-text-info)',
                    }}>your pick</span>
                  )}
                  {isActualImpostor && (
                    <span style={{
                      marginLeft: '8px',
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '8px',
                      background: 'var(--color-background-danger)',
                      color: 'var(--color-text-danger)',
                    }}>impostor</span>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>
                    {pool?.percentage ?? 0}%
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>
                    {((pool?.totalBet ?? 0) / 1_000_000_000).toFixed(2)} OCT
                  </div>
                </div>
              </div>

              {/* Pool bar */}
              <div style={{
                marginTop: '6px',
                height: '3px',
                background: 'var(--color-border-tertiary)',
                borderRadius: '2px',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${pool?.percentage ?? 0}%`,
                  background: isActualImpostor
                    ? 'var(--color-text-danger)'
                    : 'var(--color-text-info)',
                  borderRadius: '2px',
                  transition: 'width 0.4s ease',
                }}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bet input — only shown if betting open and user hasn't bet */}
      {bettingOpen && account && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <div style={{ flex: 1 }}>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={betAmount}
              onChange={e => setBetAmount(e.target.value)}
              placeholder="OCT amount"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--color-border-secondary)',
                background: 'var(--color-background-primary)',
                color: 'var(--color-text-primary)',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            onClick={handlePlaceBet}
            disabled={!selectedSuspect || loading || isPending}
            style={{
              padding: '8px 20px',
              borderRadius: 'var(--border-radius-md)',
              border: 'none',
              background: selectedSuspect ? 'var(--color-text-info)' : 'var(--color-border-tertiary)',
              color: '#fff',
              fontWeight: 500,
              fontSize: '14px',
              cursor: selectedSuspect ? 'pointer' : 'not-allowed',
              transition: 'opacity 0.15s',
              opacity: loading || isPending ? 0.6 : 1,
            }}
          >
            {loading || isPending ? 'Placing...' : 'Bet'}
          </button>
        </div>
      )}

      {/* Not connected */}
      {bettingOpen && !account && (
        <div style={{
          textAlign: 'center',
          padding: '12px',
          fontSize: '13px',
          color: 'var(--color-text-secondary)',
          background: 'var(--color-background-tertiary)',
          borderRadius: 'var(--border-radius-md)',
          marginBottom: '12px',
        }}>
          Connect wallet to place a bet
        </div>
      )}

      {/* User existing bet display */}
      {userBet && !canClaim && (
        <div style={{
          padding: '12px',
          borderRadius: 'var(--border-radius-md)',
          background: 'var(--color-background-tertiary)',
          fontSize: '13px',
          marginBottom: '12px',
        }}>
          Your bet: <strong>{(userBet.amount / 1_000_000_000).toFixed(3)} OCT</strong> on{' '}
          <strong>{gamePlayers.find(p => p.address === userBet.suspect)?.name ?? userBet.suspect.slice(0, 8) + '...'}</strong>
          {isResolved && (
            <span style={{
              marginLeft: '8px',
              color: userBet.correct ? 'var(--color-text-success)' : 'var(--color-text-danger)',
              fontWeight: 500,
            }}>
              {userBet.correct ? 'correct!' : 'wrong'}
            </span>
          )}
        </div>
      )}

      {/* Claim winnings button */}
      {canClaim && (
        <button
          onClick={handleClaimWinnings}
          disabled={loading || isPending}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: 'var(--border-radius-md)',
            border: 'none',
            background: 'var(--color-text-success)',
            color: '#fff',
            fontWeight: 500,
            fontSize: '14px',
            cursor: 'pointer',
            marginBottom: '12px',
            opacity: loading || isPending ? 0.6 : 1,
          }}
        >
          {loading || isPending ? 'Claiming...' : 'Claim winnings'}
        </button>
      )}

      {/* Tx status */}
      {txStatus !== 'idle' && (
        <div style={{
          padding: '10px 12px',
          borderRadius: 'var(--border-radius-md)',
          fontSize: '12px',
          background: txStatus === 'success'
            ? 'var(--color-background-success)'
            : 'var(--color-background-danger)',
          color: txStatus === 'success'
            ? 'var(--color-text-success)'
            : 'var(--color-text-danger)',
        }}>
          {txMsg}
        </div>
      )}
    </div>
  );
}
