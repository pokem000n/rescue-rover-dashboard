/**
 * UIU Rescue Rover - Backend Server
 * Real-time Telemetry & WebRTC Signaling Server
 * 
 * Handles:
 * 1. REST API (/api/health, /api/status, /api/telemetry)
 * 2. WebSocket Telemetry Pipeline (ESP32 -> Backend -> Dashboard Clients)
 * 3. WebRTC Signaling Relay (Mobile Camera -> Backend -> Dashboard Viewer)
 * 4. Rover Heartbeat & Stale Data Detection
 */

require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = parseInt(process.env.PORT, 10) || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const HEARTBEAT_TIMEOUT = parseInt(process.env.ESP32_HEARTBEAT_TIMEOUT_MS, 10) || 5000;

const app = express();
app.use(cors());
app.use(express.json());

// Telemetry & System State
const roverState = {
  online: false,
  lastSeen: null,
  ip: null,
  latestData: {
    temperature: null,
    humidity: null,
    timestamp: null,
    uptime_s: null
  },
  stats: {
    totalPacketsReceived: 0,
    invalidPackets: 0
  }
};

// Client Connection Trackers
const dashboardClients = new Set();
const cameraBroadcasters = new Set();
let esp32Socket = null;

// REST Endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: Date.now()
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    esp32: {
      online: roverState.online,
      lastSeen: roverState.lastSeen,
      ip: roverState.ip,
      data: roverState.latestData,
      stats: roverState.stats
    },
    clients: {
      dashboards: dashboardClients.size,
      cameraBroadcasters: cameraBroadcasters.size,
      esp32Connected: esp32Socket !== null && esp32Socket.readyState === WebSocket.OPEN
    },
    serverTime: Date.now()
  });
});

app.get('/api/telemetry', (req, res) => {
  res.json({
    esp32Online: roverState.online,
    lastSeen: roverState.lastSeen,
    telemetry: roverState.latestData
  });
});

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server attached to HTTP server
const wss = new WebSocketServer({ server });

/**
 * Broadcasts a JSON message to all connected dashboard clients
 */
function broadcastToDashboards(message) {
  const payload = JSON.stringify(message);
  for (const client of dashboardClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

/**
 * Broadcasts message to all camera viewers (dashboards)
 */
function broadcastCameraSignaling(message, senderSocket) {
  const payload = JSON.stringify(message);
  for (const client of dashboardClients) {
    if (client !== senderSocket && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

/**
 * Sends message to active camera broadcaster(s)
 */
function sendToCameraBroadcasters(message) {
  const payload = JSON.stringify(message);
  for (const broadcaster of cameraBroadcasters) {
    if (broadcaster.readyState === WebSocket.OPEN) {
      broadcaster.send(payload);
    }
  }
}

/**
 * Validates incoming sensor payload
 */
function isValidSensorData(data) {
  if (!data || typeof data !== 'object') return false;
  const temp = parseFloat(data.temperature);
  const hum = parseFloat(data.humidity);
  if (isNaN(temp) || isNaN(hum)) return false;
  // Reasonable earthly physical bounds check (-40C to 85C, 0% to 100% RH)
  if (temp < -40 || temp > 85) return false;
  if (hum < 0 || hum > 100) return false;
  return true;
}

// WebSocket Connection Management
wss.on('connection', (ws, req) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  let clientRole = 'unknown';

  console.log(`[WS] New connection established from ${clientIp}`);

  // Default assignment: Assume dashboard unless registered otherwise
  // This allows instant telemetry listening without explicit handshake
  dashboardClients.add(ws);
  clientRole = 'dashboard';

  // Send current state to newly connected client immediately
  ws.send(JSON.stringify({
    type: 'initial_state',
    esp32: {
      online: roverState.online,
      lastSeen: roverState.lastSeen,
      data: roverState.latestData,
      ip: roverState.ip
    },
    cameraActive: cameraBroadcasters.size > 0,
    connectedDashboards: dashboardClients.size,
    serverTime: Date.now()
  }));

  ws.on('message', (message) => {
    let parsed;
    try {
      parsed = JSON.parse(message.toString());
    } catch (err) {
      console.warn(`[WS] Invalid JSON received from ${clientIp}:`, message.toString());
      roverState.stats.invalidPackets++;
      return;
    }

    // Role Registration / Handshake
    if (parsed.type === 'register') {
      if (parsed.role === 'camera_broadcaster') {
        dashboardClients.delete(ws);
        cameraBroadcasters.add(ws);
        clientRole = 'camera_broadcaster';
        console.log(`[Camera] Phone camera broadcaster registered from ${clientIp}`);
        broadcastToDashboards({
          type: 'camera_status',
          active: true,
          message: 'Mobile camera broadcaster online'
        });
        return;
      } else if (parsed.role === 'esp32') {
        dashboardClients.delete(ws);
        esp32Socket = ws;
        clientRole = 'esp32';
        roverState.online = true;
        roverState.ip = parsed.ip || clientIp;
        roverState.lastSeen = Date.now();
        console.log(`[ESP32] Hardware client registered from ${clientIp} (device IP: ${roverState.ip})`);
        broadcastToDashboards({
          type: 'device_status',
          device: 'esp32',
          status: 'online',
          ip: roverState.ip,
          timestamp: Date.now()
        });
        return;
      }
    }

    // Telemetry from ESP32
    if (parsed.type === 'sensor_data' || (parsed.temperature !== undefined && parsed.humidity !== undefined)) {
      // If not yet marked as ESP32 socket, mark it now
      if (clientRole !== 'esp32') {
        dashboardClients.delete(ws);
        esp32Socket = ws;
        clientRole = 'esp32';
        roverState.ip = parsed.ip || clientIp;
      }

      if (!isValidSensorData(parsed)) {
        roverState.stats.invalidPackets++;
        console.warn(`[ESP32] Rejected invalid sensor reading:`, parsed);
        return;
      }

      const temp = parseFloat(parsed.temperature);
      const hum = parseFloat(parsed.humidity);
      const timestamp = parsed.timestamp || Date.now();
      const uptime = parsed.uptime_s || null;

      roverState.online = true;
      roverState.lastSeen = Date.now();
      roverState.latestData = {
        temperature: Number(temp.toFixed(1)),
        humidity: Number(hum.toFixed(1)),
        timestamp,
        uptime_s: uptime
      };
      roverState.stats.totalPacketsReceived++;

      console.log(`[Telemetry] Temp: ${temp.toFixed(1)}°C | Humidity: ${hum.toFixed(1)}% | Packets: ${roverState.stats.totalPacketsReceived}`);

      // Broadcast update to all dashboard instances
      broadcastToDashboards({
        type: 'sensor_update',
        temperature: Number(temp.toFixed(1)),
        humidity: Number(hum.toFixed(1)),
        timestamp,
        uptime_s: uptime,
        serverTime: Date.now()
      });
      return;
    }

    // Explicit ESP32 device status event
    if (parsed.type === 'device_status') {
      if (parsed.device === 'esp32') {
        clientRole = 'esp32';
        esp32Socket = ws;
        roverState.online = parsed.status === 'online';
        roverState.lastSeen = Date.now();
        roverState.ip = parsed.ip || clientIp;
        broadcastToDashboards({
          type: 'device_status',
          device: 'esp32',
          status: parsed.status,
          ip: roverState.ip,
          timestamp: Date.now()
        });
      }
      return;
    }

    // WebRTC Signaling: Mobile Camera Broadcaster -> Dashboard Viewer
    if (parsed.type === 'webrtc_offer') {
      console.log(`[WebRTC] Relay OFFER from phone to dashboards`);
      broadcastCameraSignaling({
        type: 'webrtc_offer',
        sdp: parsed.sdp
      }, ws);
      return;
    }

    // WebRTC Signaling: Dashboard Viewer -> Mobile Camera Broadcaster
    if (parsed.type === 'webrtc_answer') {
      console.log(`[WebRTC] Relay ANSWER from dashboard to phone`);
      sendToCameraBroadcasters({
        type: 'webrtc_answer',
        sdp: parsed.sdp
      });
      return;
    }

    // WebRTC Signaling: ICE Candidates bidirectional relay
    if (parsed.type === 'webrtc_candidate') {
      if (clientRole === 'camera_broadcaster') {
        broadcastCameraSignaling({
          type: 'webrtc_candidate',
          candidate: parsed.candidate
        }, ws);
      } else {
        sendToCameraBroadcasters({
          type: 'webrtc_candidate',
          candidate: parsed.candidate
        });
      }
      return;
    }

    // Camera Stream Status
    if (parsed.type === 'camera_stream_started') {
      console.log(`[Camera] Video stream active`);
      broadcastToDashboards({
        type: 'camera_status',
        active: true
      });
      return;
    }

    if (parsed.type === 'camera_stream_stopped') {
      console.log(`[Camera] Video stream stopped`);
      broadcastToDashboards({
        type: 'camera_status',
        active: false
      });
      return;
    }
  });

  ws.on('close', () => {
    console.log(`[WS] Connection closed: ${clientRole} (${clientIp})`);

    if (clientRole === 'dashboard') {
      dashboardClients.delete(ws);
    } else if (clientRole === 'camera_broadcaster') {
      cameraBroadcasters.delete(ws);
      if (cameraBroadcasters.size === 0) {
        broadcastToDashboards({
          type: 'camera_status',
          active: false,
          message: 'Mobile camera disconnected'
        });
      }
    } else if (clientRole === 'esp32' || ws === esp32Socket) {
      esp32Socket = null;
      roverState.online = false;
      console.log(`[ESP32] Hardware disconnected! Notifying dashboards...`);
      broadcastToDashboards({
        type: 'device_status',
        device: 'esp32',
        status: 'offline',
        reason: 'connection_closed',
        timestamp: Date.now()
      });
    }
  });

  ws.on('error', (err) => {
    console.error(`[WS] Socket error on ${clientRole} (${clientIp}):`, err.message);
  });
});

// Periodic Heartbeat / Stale Telemetry Checker
setInterval(() => {
  if (roverState.online && roverState.lastSeen) {
    const elapsed = Date.now() - roverState.lastSeen;
    if (elapsed > HEARTBEAT_TIMEOUT) {
      console.warn(`[ESP32] No heartbeat for ${elapsed}ms. Marking ESP32 as OFFLINE.`);
      roverState.online = false;
      broadcastToDashboards({
        type: 'device_status',
        device: 'esp32',
        status: 'offline',
        reason: 'heartbeat_timeout',
        lastSeen: roverState.lastSeen,
        timestamp: Date.now()
      });
    }
  }
}, 1000);

// Start Server
server.listen(PORT, HOST, () => {
  console.log('====================================================');
  console.log('  UIU RESCUE ROVER - TELEMETRY & SIGNALING SERVER  ');
  console.log('====================================================');
  console.log(`HTTP Server running at http://${HOST}:${PORT}`);
  console.log(`WebSocket Endpoint available at ws://${HOST}:${PORT}`);
  console.log(`Health Check: http://localhost:${PORT}/api/health`);
  console.log(`System Status: http://localhost:${PORT}/api/status`);
  console.log('====================================================\n');
});
