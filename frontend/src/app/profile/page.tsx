'use client';

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentAccount } from "@onelabs/dapp-kit";
import { useState } from "react";

export default function ProfilePage() {
  const account = useCurrentAccount();
  const address = account?.address || "";
  
  const profile = useQuery(api.users.getProfile, { address });
  const bets = useQuery(api.bets.getBetsByUser, { address });
  const replays = useQuery(api.replays.listReplays, { limit: 10 });

  if (!address) return <div style={{ padding: '80px', textAlign: 'center' }}>Connect your wallet or better profile.</div>;

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '40px 20px',
      fontFamily: 'Inter, sans-serif',
      color: 'var(--color-text-primary)'
    }}>
      {/* Header / Bento Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
        {/* Profile Card */}
        <div style={{
          gridColumn: '1 / 3',
          background: 'var(--color-background-secondary)',
          border: '1px solid var(--color-border-tertiary)',
          borderRadius: 'var(--border-radius-lg)',
          padding: '30px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px'
          }}>
            👤
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px' }}>{address.slice(0, 10)}...{address.slice(-6)}</h1>
            <p style={{ color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>CrewKill Level: <strong>{Math.floor((profile?.xp || 0) / 500) + 1} ({profile?.xp || 0} XP)</strong></p>
          </div>
        </div>

        {/* Level & Stats grid card */}
        <div style={{
          background: 'var(--color-background-secondary)',
          border: '1px solid var(--color-border-tertiary)',
          borderRadius: 'var(--border-radius-lg)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Predictions Won</div>
          <div style={{ fontSize: '42px', fontWeight: 600 }}>{profile?.wins || 0}</div>
          <div style={{ height: '4px', background: 'var(--color-border-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${(profile?.wins || 0) * 10}%`, height: '100%', background: '#10b981' }} />
          </div>
        </div>
      </div>

      {/* Transaction History & Replays */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* Predictions List */}
        <div>
          <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>Betting History</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {bets?.map(bet => (
              <div key={bet._id} style={{
                background: 'var(--color-background-secondary)',
                padding: '16px',
                borderRadius: 'var(--border-radius-md)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: '1px solid var(--color-border-tertiary)'
              }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{bet.amountMist / 1_000_000_000} OCT on Agent</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Game: {bet.gameId.slice(0, 8)}...</div>
                </div>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: bet.status === 'won' ? '#10b981' : bet.status === 'lost' ? '#ef4444' : '#6366f1',
                  textTransform: 'uppercase'
                }}>
                  {bet.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Replay NFTs / Vault */}
        <div>
          <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>Replay NFTs (IPFS)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {replays?.map(replay => (
              <div key={replay._id} style={{
                background: 'var(--color-background-secondary)',
                border: '1px solid var(--color-border-tertiary)',
                borderRadius: 'var(--border-radius-md)',
                overflow: 'hidden'
              }}>
                <div style={{ height: '100px', background: '#333' }} /> {/* Cover */}
                <div style={{ padding: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>#{replay.gameId.slice(0, 6)}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{replay.rounds} Rounds</div>
                  <button style={{
                    marginTop: '10px',
                    width: '100%',
                    padding: '6px',
                    fontSize: '11px',
                    borderRadius: '4px',
                    border: '1px solid var(--color-border-secondary)',
                    background: 'transparent',
                    color: '#fff',
                    cursor: 'pointer'
                  }}>View Replay</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
