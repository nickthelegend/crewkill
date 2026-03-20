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
  // Generate a fake address for the AI agent
  const hex = uuidv4().replace(/-/g, "").slice(0, 40);
  return `0xAI${hex.slice(0, 38)}`;
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
  spawnAgentsForRoom(roomId: string, count: number): ServerAgent[] {
    const agents: ServerAgent[] = [];

    for (let i = 0; i < count; i++) {
      const agent = this.createAgent();
      agent.setRoom(roomId);

      // Track by room
      let roomList = this.roomAgents.get(roomId);
      if (!roomList) {
        roomList = [];
        this.roomAgents.set(roomId, roomList);
      }
      roomList.push(agent);

      agents.push(agent);
      logger.info(`Spawned AI agent "${agent.name}" (${agent.address}) for room ${roomId}`);
    }

    return agents;
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

  private createAgent(): ServerAgent {
    const name = pickAgentName();
    const address = generateAgentAddress();

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
