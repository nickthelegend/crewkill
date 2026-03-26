/**
 * ServerAgentManager — manages spawning, tracking, and cleanup of AI agents.
 */

import { v4 as uuidv4 } from "uuid";
import { ServerAgent } from "./ServerAgent.js";
import { pickAgentName, releaseAgentName } from "./AgentNames.js";
import type { ServerAgentConfig, CrewmateStyle, ImpostorStyle } from "./types.js";
import { createLogger } from "../logger.js";

const logger = createLogger("agent-manager");

const CREWMATE_STYLES: CrewmateStyle[] = [
  "task-focused", "detective", "group-safety", "vigilante", "conservative",
];

const IMPOSTOR_STYLES: ImpostorStyle[] = [
  "stealth", "aggressive", "saboteur", "social-manipulator", "frame-game",
];

function randomStyle<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateAgentAddress(): string {
  // Generate a valid Sui address for the AI agent (64 hex characters)
  // We use 'aa1' (Agent AI) prefix to identify them while maintaining hex validity
  const hex = uuidv4().replace(/-/g, ""); // 32 chars
  const hex2 = uuidv4().replace(/-/g, ""); // 32 chars
  return `0xaa1${(hex + hex2).slice(0, 61)}`;
}

export class ServerAgentManager {
  // roomId -> array of agents
  private roomAgents: Map<string, ServerAgent[]> = new Map();
  // address -> agent (for quick lookup)
  private agentsByAddress: Map<string, ServerAgent> = new Map();

  /**
   * Spawn N AI agents for a room.
   * Returns the created agents so the caller can register them as clients.
   */
  spawnAgentsForRoom(roomId: string, count: number, existingPlayers?: { address: string, name: string }[]): ServerAgent[] {
    const agents: ServerAgent[] = [];
    
    if (existingPlayers && existingPlayers.length > 0) {
      // Re-spawn existing agents with their saved addresses
      for (const p of existingPlayers) {
        if (!p.address.startsWith("0xaa")) continue; // Only re-spawn AI agents
        const agent = this.createAgent(p.address, p.name);
        agent.setRoom(roomId);
        this.trackAgent(roomId, agent);
        agents.push(agent);
        logger.info(`Re-spawned AI agent "${agent.name}" (${agent.address}) for room ${roomId}`);
      }
    } else {
      // Spawn fresh agents
      for (let i = 0; i < count; i++) {
        const agent = this.createAgent();
        agent.setRoom(roomId);
        this.trackAgent(roomId, agent);
        agents.push(agent);
        logger.info(`Spawned AI agent "${agent.name}" (${agent.address}) for room ${roomId}`);
      }
    }

    return agents;
  }

  private trackAgent(roomId: string, agent: ServerAgent) {
    let roomList = this.roomAgents.get(roomId);
    if (!roomList) {
      roomList = [];
      this.roomAgents.set(roomId, roomList);
    }
    roomList.push(agent);
    this.agentsByAddress.set(agent.address, agent);
  }

  /**
   * Add a single AI agent to a room (for lobby add button).
   */
  addAgent(roomId: string): ServerAgent {
    const agent = this.createAgent();
    agent.setRoom(roomId);

    let roomList = this.roomAgents.get(roomId);
    if (!roomList) {
      roomList = [];
      this.roomAgents.set(roomId, roomList);
    }
    roomList.push(agent);

    logger.info(`Added AI agent "${agent.name}" (${agent.address}) to room ${roomId}`);
    return agent;
  }

  /**
   * Remove one AI agent from a room (for lobby remove button).
   * Returns the removed agent or null.
   */
  removeAgent(roomId: string): ServerAgent | null {
    const roomList = this.roomAgents.get(roomId);
    if (!roomList || roomList.length === 0) return null;

    const agent = roomList.pop()!;
    this.agentsByAddress.delete(agent.address);
    releaseAgentName(agent.name);
    agent.destroy();

    if (roomList.length === 0) {
      this.roomAgents.delete(roomId);
    }

    logger.info(`Removed AI agent "${agent.name}" from room ${roomId}`);
    return agent;
  }

  /**
   * Remove all AI agents from a room (game ended, room deleted).
   */
  removeAgentsFromRoom(roomId: string): ServerAgent[] {
    const roomList = this.roomAgents.get(roomId);
    if (!roomList) return [];

    const removed = [...roomList];
    for (const agent of removed) {
      this.agentsByAddress.delete(agent.address);
      releaseAgentName(agent.name);
      agent.destroy();
    }

    this.roomAgents.delete(roomId);
    logger.info(`Removed all ${removed.length} AI agents from room ${roomId}`);
    return removed;
  }

  /**
   * Get all AI agents in a room.
   */
  getAgentsInRoom(roomId: string): ServerAgent[] {
    return this.roomAgents.get(roomId) || [];
  }

  /**
   * Get an AI agent by its address.
   */
  getAgentByAddress(address: string): ServerAgent | undefined {
    return this.agentsByAddress.get(address);
  }

  /**
   * Check if an address belongs to an AI agent.
   */
  isAIAgent(address: string): boolean {
    return this.agentsByAddress.has(address);
  }

  /**
   * Get count of AI agents across all rooms.
   */
  getTotalAgentCount(): number {
    let total = 0;
    for (const agents of this.roomAgents.values()) {
      total += agents.length;
    }
    return total;
  }

  // ============ INTERNAL ============

  private createAgent(existingAddress?: string, existingName?: string): ServerAgent {
    const name = existingName || pickAgentName();
    const address = existingAddress || generateAgentAddress();

    const config: ServerAgentConfig = {
      name,
      address,
      personality: "cautious",
      crewmateStyle: randomStyle(CREWMATE_STYLES),
      impostorStyle: randomStyle(IMPOSTOR_STYLES),
    };

    const agent = new ServerAgent(config);
    this.agentsByAddress.set(address, agent);
    return agent;
  }
}
