/**
 * MockWebSocket — implements enough of the ws.WebSocket interface
 * so that the server's Client system can send messages to AI agents.
 *
 * send() captures outgoing messages and routes them to a callback.
 */

import { WebSocket } from "ws";

export type MessageHandler = (data: string) => void;

export class MockWebSocket {
  // Always report as OPEN so server considers it connected
  readonly readyState = WebSocket.OPEN;
  readonly OPEN = WebSocket.OPEN;
  readonly CLOSED = WebSocket.CLOSED;
  readonly CONNECTING = WebSocket.CONNECTING;
  readonly CLOSING = WebSocket.CLOSING;

  private onMessageCallback: MessageHandler | null = null;

  // No-op event listeners required by the interface
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((err: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;

  constructor(onMessage: MessageHandler) {
    this.onMessageCallback = onMessage;
  }

  /**
   * Called by the server when it sends a message to this "client".
   * We intercept it and pass to the ServerAgent's message handler.
   */
  send(data: string | Buffer | ArrayBuffer, cb?: (err?: Error) => void): void {
    const str = typeof data === "string" ? data : data.toString();
    try {
      if (this.onMessageCallback) {
        this.onMessageCallback(str);
      }
      if (cb) cb();
    } catch (err) {
      if (cb) cb(err as Error);
    }
  }

  // Stubs to satisfy the interface
  close(): void {}
  ping(): void {}
  pong(): void {}
  terminate(): void {}

  // Event emitter stubs
  on(event: string, listener: (...args: any[]) => void): this {
    return this;
  }
  off(event: string, listener: (...args: any[]) => void): this {
    return this;
  }
  once(event: string, listener: (...args: any[]) => void): this {
    return this;
  }
  emit(event: string, ...args: any[]): boolean {
    return false;
  }
  addEventListener(event: string, listener: (...args: any[]) => void): this {
    return this;
  }
  removeEventListener(event: string, listener: (...args: any[]) => void): this {
    return this;
  }
  removeAllListeners(event?: string): this {
    return this;
  }
  addListener(event: string, listener: (...args: any[]) => void): this {
    return this;
  }
  removeListener(event: string, listener: (...args: any[]) => void): this {
    return this;
  }
  listenerCount(event: string): number {
    return 0;
  }
  listeners(event: string): Function[] {
    return [];
  }
  rawListeners(event: string): Function[] {
    return [];
  }
  eventNames(): (string | symbol)[] {
    return [];
  }
  getMaxListeners(): number {
    return 0;
  }
  setMaxListeners(n: number): this {
    return this;
  }
  prependListener(event: string, listener: (...args: any[]) => void): this {
    return this;
  }
  prependOnceListener(event: string, listener: (...args: any[]) => void): this {
    return this;
  }
}
