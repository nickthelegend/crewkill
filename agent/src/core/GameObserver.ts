import { SuiClient } from '@onelabs/sui/client';
import { CONTRACT_CONFIG, ONECHAIN_RPC } from '../config.js';
import {
  GameState,
  GamePhase,
  Player,
  Location,
  Role,
} from '../types.js';

export class GameObserver {
  private client: SuiClient;

  constructor() {
    this.client = new SuiClient({ url: ONECHAIN_RPC });
  }

  // ============ GAME STATE ============

  async getGameState(gameObjectId: string): Promise<GameState> {
    const result = await this.client.getObject({
      id: gameObjectId,
      options: { showContent: true },
    });

    const fields = (result.data?.content as any)?.fields;
    if (!fields) throw new Error(`Game object not found: ${gameObjectId}`);

    return {
      gameObjectId,
      phase:          Number(fields.phase) as GamePhase,
      round:          BigInt(fields.round ?? 0),
      players:        fields.players ?? [],
      ended:          fields.ended === true,
      winner:         Number(fields.winner),
      maxPlayers:     Number(fields.max_players),
      wagerAmount:    BigInt(fields.wager_amount ?? 0),
      tasksRequired:  Number(fields.tasks_required),
      activeSabotage: Number(fields.active_sabotage ?? 0),
    };
  }

  // ============ PLAYER STATE ============

  async getPlayerRole(gameObjectId: string, address: string): Promise<Role> {
    const result = await this.client.getObject({
      id: gameObjectId,
      options: { showContent: true },
    });

    const fields = (result.data?.content as any)?.fields;
    if (!fields) throw new Error('Game not found');

    // roles is a Table — query via dynamic fields
    const roleField = await this.client.getDynamicFieldObject({
      parentId: fields.roles?.fields?.id?.id,
      name: { type: 'address', value: address },
    });

    const role = (roleField.data?.content as any)?.fields?.value;
    return Number(role ?? 0) as Role;
  }

  async isAlive(gameObjectId: string, address: string): Promise<boolean> {
    const result = await this.client.getObject({
      id: gameObjectId,
      options: { showContent: true },
    });

    const fields = (result.data?.content as any)?.fields;
    if (!fields) return false;

    try {
      const aliveField = await this.client.getDynamicFieldObject({
        parentId: fields.alive?.fields?.id?.id,
        name: { type: 'address', value: address },
      });
      const val = (aliveField.data?.content as any)?.fields?.value;
      return val === true;
    } catch {
      return false;
    }
  }

  async getPlayerLocation(gameObjectId: string, address: string): Promise<Location> {
    const result = await this.client.getObject({
      id: gameObjectId,
      options: { showContent: true },
    });

    const fields = (result.data?.content as any)?.fields;
    if (!fields) return 0;

    try {
      const locField = await this.client.getDynamicFieldObject({
        parentId: fields.locations?.fields?.id?.id,
        name: { type: 'address', value: address },
      });
      return Number((locField.data?.content as any)?.fields?.value ?? 0) as Location;
    } catch {
      return 0;
    }
  }

  async getAllPlayers(gameObjectId: string): Promise<string[]> {
    const result = await this.client.getObject({
      id: gameObjectId,
      options: { showContent: true },
    });
    const fields = (result.data?.content as any)?.fields;
    return fields?.players ?? [];
  }

  async getAlivePlayers(gameObjectId: string): Promise<string[]> {
    const players = await this.getAllPlayers(gameObjectId);
    if (!players) return [];
    
    const aliveChecks = await Promise.all(
      players.map(async (p) => ({
        address: p,
        alive: await this.isAlive(gameObjectId, p),
      }))
    );
    return aliveChecks.filter(p => p.alive).map(p => p.address);
  }

  // ============ COMMITMENT STATE ============

  async hasCommitted(gameObjectId: string, address: string): Promise<boolean> {
    const result = await this.client.getObject({
      id: gameObjectId,
      options: { showContent: true },
    });

    const fields = (result.data?.content as any)?.fields;
    if (!fields?.commits?.fields?.id?.id) return false;

    try {
      await this.client.getDynamicFieldObject({
        parentId: fields.commits.fields.id.id,
        name: { type: 'address', value: address },
      });
      return true;
    } catch {
      return false;
    }
  }

  async hasRevealed(gameObjectId: string, address: string): Promise<boolean> {
    const result = await this.client.getObject({
      id: gameObjectId,
      options: { showContent: true },
    });

    const fields = (result.data?.content as any)?.fields;
    if (!fields?.reveals?.fields?.id?.id) return false;

    try {
      await this.client.getDynamicFieldObject({
        parentId: fields.reveals.fields.id.id,
        name: { type: 'address', value: address },
      });
      return true;
    } catch {
      return false;
    }
  }

  // ============ PHASE POLLING ============

  async waitForPhase(
    gameObjectId: string,
    targetPhase: GamePhase,
    pollIntervalMs = 2000
  ): Promise<void> {
    return new Promise((resolve) => {
      const check = async () => {
        try {
          const state = await this.getGameState(gameObjectId);
          if (state.phase === targetPhase) {
            resolve();
          } else {
            setTimeout(check, pollIntervalMs);
          }
        } catch {
          setTimeout(check, pollIntervalMs);
        }
      };
      check();
    });
  }

  async waitForPhaseChange(
    gameObjectId: string,
    currentPhase: GamePhase,
    pollIntervalMs = 2000
  ): Promise<GamePhase> {
    return new Promise((resolve) => {
      const check = async () => {
        try {
          const state = await this.getGameState(gameObjectId);
          if (state.phase !== currentPhase) {
            resolve(state.phase);
          } else {
            setTimeout(check, pollIntervalMs);
          }
        } catch {
          setTimeout(check, pollIntervalMs);
        }
      };
      check();
    });
  }

  // ============ REGISTRY ============

  async isAgentRegistered(address: string): Promise<boolean> {
    try {
      const result = await this.client.getObject({
        id: CONTRACT_CONFIG.AGENT_REGISTRY_ID,
        options: { showContent: true },
      });
      const fields = (result.data?.content as any)?.fields;
      if (!fields?.agents?.fields?.id?.id) return false;

      await this.client.getDynamicFieldObject({
        parentId: fields.agents.fields.id.id,
        name: { type: 'address', value: address },
      });
      return true;
    } catch {
      return false;
    }
  }

  async getAgentStats(address: string): Promise<any> {
    const result = await this.client.getObject({
      id: CONTRACT_CONFIG.AGENT_REGISTRY_ID,
      options: { showContent: true },
    });
    const fields = (result.data?.content as any)?.fields;

    const statsField = await this.client.getDynamicFieldObject({
      parentId: fields.agents.fields.id.id,
      name: { type: 'address', value: address },
    });

    return (statsField.data?.content as any)?.fields?.value?.fields;
  }
}
