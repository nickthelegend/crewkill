#!/usr/bin/env node
const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");

const WS_URL =
  process.env.WS_URL || "wss://amongus-onchain-production.up.railway.app";
const CONFIG_DIR = path.join(os.homedir(), ".amongus-onchain");
const CONFIG_PATH = path.join(CONFIG_DIR, "agent.json");
const EVENT_LOG = path.join(CONFIG_DIR, "events.log");
const CMD_PIPE = path.join(CONFIG_DIR, "cmd.pipe");

// Ensure config directory exists
if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });

// Load config
let config = {};
try {
  config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
} catch (e) {
  console.error("ERROR: No valid config at", CONFIG_PATH);
  process.exit(1);
}

const MY_ADDRESS = config.agentAddress;
const MY_NAME = config.agentName || "AgentWS";

// Create FIFO pipe if it doesn't exist
try {
  fs.statSync(CMD_PIPE);
} catch {
  require("child_process").execSync(`mkfifo "${CMD_PIPE}"`);
}

// Clear old event log on start
fs.writeFileSync(EVENT_LOG, "");

function logEvent(msg) {
  const line = JSON.stringify({ ...msg, _receivedAt: Date.now() }) + "\n";
  fs.appendFileSync(EVENT_LOG, line);
}

let ws = null;
let authenticated = false;
let reconnectDelay = 1000;
let pingInterval = null;
let lastSentPosition = { location: -1, round: -1 };
let commandQueue = [];

function connect() {
  if (
    ws &&
    (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)
  )
    return;

  console.log(`[daemon] Connecting to ${WS_URL}...`);
  ws = new WebSocket(WS_URL);

  ws.on("open", () => {
    console.log("[daemon] Connected. Authenticating...");
    ws.send(
      JSON.stringify({
        type: "agent:authenticate",
        address: MY_ADDRESS,
        name: MY_NAME,
        requestWallet: false,
      }),
    );

    if (pingInterval) clearInterval(pingInterval);
    pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.ping();
    }, 30000);
  });

  ws.on("message", (raw) => {
    const msg = JSON.parse(raw);
    logEvent(msg);

    if (msg.type === "server:authenticated") {
      authenticated = true;
      reconnectDelay = 1000;
      console.log(`[daemon] Authenticated as ${msg.address}`);
      while (commandQueue.length > 0) {
        const cmd = commandQueue.shift();
        ws.send(JSON.stringify(cmd));
      }
    }

    const important = [
      "server:phase_changed",
      "server:kill_occurred",
      "server:game_ended",
      "server:error",
    ];
    if (important.includes(msg.type)) {
      console.log(`[daemon] EVENT: ${msg.type}`, JSON.stringify(msg));
    }
  });

  ws.on("close", () => {
    authenticated = false;
    if (pingInterval) clearInterval(pingInterval);
    console.log(
      `[daemon] Connection lost. Reconnecting in ${reconnectDelay}ms...`,
    );
    setTimeout(connect, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, 30000);
  });

  ws.on("error", (err) => console.error("[daemon] Error:", err.message));
}

function listenForCommands() {
  const openPipe = () => {
    const stream = fs.createReadStream(CMD_PIPE, { encoding: "utf8" });
    const rl = readline.createInterface({ input: stream });

    rl.on("line", (line) => {
      if (!line.trim()) return;
      try {
        const cmd = JSON.parse(line);

        if (cmd.type === "agent:position_update") {
          if (
            cmd.location === lastSentPosition.location &&
            cmd.round === lastSentPosition.round
          ) {
            console.log("[daemon] Ignoring duplicate position update");
            return;
          }
          lastSentPosition = { location: cmd.location, round: cmd.round };
        }

        if (authenticated && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(cmd));
          console.log("[daemon] Sent:", cmd.type);
        } else {
          console.log("[daemon] Queuing command (waiting for auth):", cmd.type);
          commandQueue.push(cmd);
          if (commandQueue.length > 50) commandQueue.shift();
        }
      } catch (e) {
        console.error("[daemon] Invalid JSON:", e.message);
      }
    });

    rl.on("close", openPipe);
  };
  openPipe();
}

connect();
listenForCommands();

process.on("SIGINT", () => {
  if (ws) ws.close();
  try {
    fs.unlinkSync(CMD_PIPE);
  } catch { }
  process.exit(0);
});
