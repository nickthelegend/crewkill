import { WebSocket } from "ws";
import { EventEmitter } from "eventemitter3";
import winston from "winston";
import {
  Action,
  ActionType,
  Location,
  SabotageType,
  GamePhase,
} from "../types.js";

export interface WebSocketConfig {
  serverUrl: string;
  agentAddress: string;
  agentName: string;
}

export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private logger: winston.Logger;
  private connected: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(config: WebSocketConfig, logger: winston.Logger) {
    super();
    this.config = config;
    this.logger = logger;
  }

  async connect(): Promise<void> {
    if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.serverUrl);

        this.ws.on("open", () => {
          this.connected = true;
          this.logger.info("WebSocket connection established");
          this.authenticate();
          resolve();
        });

        this.ws.on("message", (data) => {
          this.handleMessage(data.toString());
        });

        this.ws.on("close", () => {
          this.connected = false;
          this.logger.warn("WebSocket connection closed");
          this.scheduleReconnect();
        });

        this.ws.on("error", (error) => {
          this.logger.error(`WebSocket error: ${error.message}`);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private authenticate(): void {
    this.send({
      type: "client:authenticate",
      address: this.config.agentAddress,
      name: this.config.agentName,
    });
  }

  createRoom(roomId: string): void {
    this.send({
      type: "client:create_room",
      roomId,
    });
  }

  joinRoom(roomId: string, colorId?: number): void {
    this.send({
      type: "client:join_room",
      roomId,
      colorId,
    });
  }

  leaveGame(roomId: string): void {
    this.send({
      type: "client:leave_room",
      roomId,
    });
  }

  sendPositionUpdate(roomId: string, location: Location, round: number): void {
    this.send({
      type: "agent:position_update",
      gameId: roomId,
      location,
      round,
    });
  }

  sendActionResult(roomId: string, action: Action, round: number): void {
    if (action.type === ActionType.Kill && action.target) {
      this.send({
        type: "agent:kill",
        gameId: roomId,
        killer: this.config.agentAddress,
        victim: action.target,
        location: 0, // Should use current location
        round,
      });
    } else if (action.type === ActionType.Sabotage && action.sabotage) {
      this.send({
        type: "agent:sabotage",
        gameId: roomId,
        sabotageType: action.sabotage,
      });
    } else if (action.type === ActionType.Report) {
      this.send({
        type: "agent:report_body",
        gameId: roomId,
        reporter: this.config.agentAddress,
        bodyLocation: 0, // Should use current location
        round,
      });
    } else if (action.type === ActionType.CallMeeting) {
      this.send({
        type: "agent:call_meeting",
        gameId: roomId,
      });
    }
  }

  sendPhaseChange(roomId: string, phase: GamePhase, round: number, phaseEndTime: number): void {
    this.send({
      type: "agent:phase_change",
      gameId: roomId,
      phase,
      round,
      phaseEndTime,
    });
  }

  sendVote(roomId: string, target: string | null, round: number): void {
    this.send({
      type: "agent:vote",
      gameId: roomId,
      voter: this.config.agentAddress,
      target: target || "SKIP",
      round,
    });
  }

  sendTaskComplete(roomId: string, tasksCompleted: number, totalTasks: number): void {
    this.send({
      type: "agent:task_complete",
      gameId: roomId,
      player: this.config.agentAddress,
      tasksCompleted,
      totalTasks,
    });
  }

  private send(message: any): void {
    if (this.ws && this.connected) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.logger.warn("Cannot send WebSocket message: not connected");
    }
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      this.emit("message", message);
    } catch (error) {
      this.logger.error(`Error parsing WebSocket message: ${error}`);
    }
  }

  private scheduleReconnect(): void {
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect().catch(() => {});
      }, 5000);
    }
  }
}
