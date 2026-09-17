# UIU Rescue Rover - Real-Time Monitoring Dashboard

A mission control dashboard and telemetry pipeline developed for the **UIU Rescue Rover Team** (RoboCup Junior Rescue Rover).

This platform delivers real-time environmental telemetry (temperature and relative humidity) from an **ESP32 + DHT11** sensor node and live wireless video from a **smartphone camera** over a local Wi-Fi link.

```
       [ DHT11 Sensor ]
              │ (GPIO 4)
              ▼
         [ ESP32 Node ]
              │
              │ Wi-Fi / WebSocket (ws://<PC_IP>:3001/ws)
              ▼
     [ Node.js Backend ] ◄─── WebRTC Signaling ───► [ Mobile Phone Camera ]
              │                                      (Live rear video feed)
              │ Broadcasts JSON Telemetry
              ▼
  [ React + Vite Mission HUD ]
    • Real-time Temp & Humidity Gauges
    • 50-Sample Rolling Waveforms (Recharts)
    • Live WebRTC Video Stream + QR Pairing
    • System Diagnostics & JSON Telemetry Bus
    • One-Click Simulation / Demo Mode
```

---

## Table of Contents
1. [Required Hardware](#1-required-hardware)
2. [Hardware Wiring Diagram](#2-hardware-wiring-diagram)
3. [Software Prerequisites](#3-software-prerequisites)
4. [Project Structure](#4-project-structure)
5. [Configuration Guide](#5-configuration-guide)
6. [Step-by-Step Running Guide](#6-step-by-step-running-guide)
7. [Wireless Mobile Camera Setup](#7-wireless-mobile-camera-setup)
8. [Demo / Simulation Mode](#8-demo--simulation-mode)
9. [Troubleshooting Guide](#9-troubleshooting-guide)
10. [Architecture & Telemetry Flow](#10-architecture--telemetry-flow)
11. [Vercel & Cloud Deployment](#11-vercel--cloud-deployment)

---

## 1. Required Hardware

| Item | Specification | Purpose |
|:---|:---|:---|
| **Microcontroller** | ESP32 Dev Module / NodeMCU-32S | Wi-Fi telemetry transmitter |
| **Sensor** | DHT11 (3-pin module or 4-pin bare) | Measures ambient temperature & humidity |
| **Jumper Wires** | Female-to-Female or Female-to-Male | Connecting DHT11 to ESP32 |
| **USB Cable** | Micro-USB (Data-capable) | Flashing & powering the ESP32 |
| **Computer/Laptop** | Windows / Linux / macOS | Running Backend & Frontend Dashboard |
| **Mobile Phone** | Android or iPhone (Chrome / Safari) | Wireless Rover Inspection Camera |
| **Wi-Fi Router / Hotspot**| 2.4 GHz Wi-Fi Network | Shared LAN for ESP32, PC, and Smartphone |

---

## 2. Hardware Wiring Diagram

```
       +---------------------------------------------+
       |             ESP32 DEVELOPMENT BOARD         |
       |                                             |
       |  [3.3V] ─────────────────────┐              |
       |  [GND]  ──────────────┐      │              |
       |  [GPIO 4] ──────┐     │      │              |
       +-----------------│─────│──────│--------------+
                         │     │      │
                         │     │      │
                      ┌──▼─────▼──────▼──┐
                      │ DATA  GND    VCC │
                      │  [S]  [-]    [+] │
                      │                  │
                      │   DHT11 SENSOR   │
                      └──────────────────┘
```

### Wiring Table
- **DHT11 VCC (`+`)** $\rightarrow$ **ESP32 3.3V** (or 5V if using a 5V tolerant 3-pin module)
- **DHT11 GND (`-`)** $\rightarrow$ **ESP32 GND**
- **DHT11 DATA (`S` / Out)** $\rightarrow$ **ESP32 GPIO 4**

> [!NOTE]
> **GPIO 4** is used by default because it is safe and has no bootstrap or flash memory conflicts.
> If using a bare 4-pin DHT11 (without a module PCB), place a **10kΩ pull-up resistor** between VCC and DATA.

---

## 3. Software Prerequisites

### A. Node.js Environment
- Download and install **Node.js (v18, v20, or v22+)** from [nodejs.org](https://nodejs.org/).
- Verify in your terminal:
  ```powershell
  node -v
  npm -v
  ```

### B. Arduino IDE & ESP32 Board Package
1. Download **Arduino IDE 2.x** from [arduino.cc](https://www.arduino.cc/en/software).
2. Open Arduino IDE and go to **File > Preferences**.
3. In **Additional Boards Manager URLs**, paste:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Go to **Tools > Board > Boards Manager...**, search for `esp32` by **Espressif Systems**, and click **Install**.

### C. Required Arduino Libraries
Go to **Tools > Manage Libraries...** (or `Ctrl+Shift+I`) and install:
1. `DHT sensor library` by **Adafruit** *(click "Install All" to also install Adafruit Unified Sensor)*
2. `WebSockets` by **Markus Sattler** *(provides WebSocketsClient.h)*
3. `ArduinoJson` by **Benoit Blanchon** *(v6.x or v7.x)*

---

## 4. Project Structure

```
rescue-rover-dashboard/
│
├── backend/
│   ├── src/
│   │   └── server.js               # Express API + WebSocket Telemetry & WebRTC Signaling
│   ├── .env                        # Backend port and timeout configuration
│   ├── .env.example
│   └── package.json                # Dependencies: express, ws, cors, dotenv
│
├── frontend/
│   ├── public/
│   │   └── favicon.svg             # Tactical radar rover icon
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx          # Mission title, status badges, demo toggles
│   │   │   ├── MetricCard.jsx      # Gauges for Temperature and Humidity
│   │   │   ├── CameraFeed.jsx      # WebRTC live video viewer & QR pairing modal
│   │   │   ├── TelemetryChart.jsx  # Recharts 50-sample rolling waveform graph
│   │   │   ├── SystemInfo.jsx      # Diagnostic cards (node IP, packet count, Hz)
│   │   │   └── PacketLog.jsx       # Real-time JSON telemetry terminal
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx       # Mission Control dashboard page
│   │   │   └── MobileCamera.jsx    # Smartphone camera broadcaster page
│   │   ├── services/
│   │   │   ├── websocket.js        # Auto-reconnecting WebSocket client
│   │   │   ├── webrtc.js           # WebRTC peer connection manager
│   │   │   └── mockData.js         # Realistic physics-based telemetry simulator
│   │   ├── App.jsx                 # Route switcher
│   │   ├── index.css               # Tailwind styles & robotics HUD aesthetics
│   │   └── main.jsx                # React DOM entry point
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js              # Network host enabled for LAN streaming
│   └── package.json
│
├── esp32/
│   ├── rescue_rover_dht11/
│   │   └── rescue_rover_dht11.ino  # Complete Arduino C++ firmware
│   └── README.md                   # Detailed ESP32 flashing instructions
│
├── package.json                    # Monorepo runner scripts
├── .gitignore
└── README.md                       # Master documentation
```

---

## 5. Configuration Guide

### Finding Your Computer's LAN IP Address
The ESP32 and smartphone must connect to your computer's local Wi-Fi IP address.
1. Open PowerShell / Command Prompt on Windows:
   ```powershell
   ipconfig
   ```
2. Look for **IPv4 Address** under `Wireless LAN adapter Wi-Fi` (e.g. `192.168.1.105` or `192.168.0.45`).

### Files to Configure:
1. **ESP32 Firmware**: [`esp32/rescue_rover_dht11/rescue_rover_dht11.ino`](esp32/rescue_rover_dht11/rescue_rover_dht11.ino#L34-L44)
   ```cpp
   const char* WIFI_SSID     = "YOUR_WIFI_SSID";      // Your 2.4GHz Wi-Fi SSID
   const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";  // Your Wi-Fi password
   const char* WS_SERVER_HOST = "192.168.1.105";      // Computer's LAN IP
   const uint16_t WS_SERVER_PORT = 3001;              // Backend port
   const uint8_t DHT_PIN = 4;                         // Connected GPIO pin
   ```

2. **Frontend Config**: [`frontend/.env`](frontend/.env)
   ```env
   # When testing locally on the same PC:
   VITE_WS_URL=ws://localhost:3001
   VITE_API_URL=http://localhost:3001
   VITE_DEMO_MODE=false

   # When accessing the dashboard from another tablet/laptop on the LAN:
   # VITE_WS_URL=ws://192.168.1.105:3001
   ```

---

## 6. Step-by-Step Running Guide

### Step 1: Launch Backend (Terminal 1)
```powershell
cd backend
npm install
npm start
```
*You should see:*
```
====================================================
  UIU RESCUE ROVER - TELEMETRY & SIGNALING SERVER  
====================================================
HTTP Server running at http://0.0.0.0:3001
WebSocket Endpoint available at ws://0.0.0.0:3001
Health Check: http://localhost:3001/api/health
====================================================
```

### Step 2: Launch Frontend (Terminal 2)
```powershell
cd frontend
npm install
npm run dev
```
*You should see:*
```
  VITE v6.4.3  ready in 400 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.105:5173/
```
Open **`http://localhost:5173`** in your browser.

### Step 3: Flash ESP32 Firmware
1. Open [`esp32/rescue_rover_dht11/rescue_rover_dht11.ino`](esp32/rescue_rover_dht11/rescue_rover_dht11.ino) in Arduino IDE.
2. Verify Wi-Fi credentials and computer IP address.
3. Select board: **Tools > Board > ESP32 Arduino > ESP32 Dev Module**.
4. Select port: **Tools > Port > COMx**.
5. Click **Upload** (`Ctrl+U`).
6. Open **Tools > Serial Monitor** at **115200 baud** to see real-time debug messages.

---

## 7. Wireless Mobile Camera Setup

The system uses a **real WebRTC peer connection** with WebSocket signaling to turn any mobile phone into the rover's wireless camera:

1. On the dashboard, click **"PAIR PHONE"** in the camera card.
2. A modal pops up with a **QR Code** containing the URL: `http://<YOUR_LAN_IP>:5173/camera`.
3. Open your smartphone's camera or QR scanner and tap the link.
4. On your phone:
   - Tap **"START BROADCASTING"**.
   - If prompted, grant camera permissions.
   - You will see the live rear camera view on your phone with the red **"ON AIR"** badge.
5. The live wireless video stream instantly appears on the mission control dashboard with latency under 50ms!
6. Click the **Fullscreen** button on the dashboard for full-screen inspection.

---

## 8. Demo / Simulation Mode

If physical hardware is not yet wired, you can run the entire system in **DEMO MODE**:

### Method 1: UI Instant Toggle (No reload needed)
- In the top header bar, click **"ENABLE DEMO"**.
- The dashboard immediately activates an internal physics-based telemetry simulator generating realistic temperature and humidity variations every 1.5 seconds.
- Click **"SIM DROP"** to simulate an ESP32 disconnection and observe the **OFFLINE** alert and stale data indicators.
- Click **"SIM RECONNECT"** to resume streaming.

### Method 2: Environment Variable
In `frontend/.env`:
```env
VITE_DEMO_MODE=true
```
Then restart the frontend (`npm run dev`).

---

## 9. Troubleshooting Guide

| Issue | Root Cause | Solution |
|:---|:---|:---|
| **ESP32: `[WiFi] Connecting...` loop** | Incorrect SSID or 5GHz network | Ensure Wi-Fi credentials are exact. ESP32 only supports 2.4GHz Wi-Fi. Try a mobile phone hotspot. |
| **ESP32: `[WS] Disconnected`** | Wrong IP or port blocked | Confirm computer IP with `ipconfig`. Do not use `localhost`. Ensure backend is running. |
| **Windows Firewall blocks connection** | Windows Defender blocking port 3001 | In Windows Defender Firewall, allow Node.js or allow inbound TCP traffic on port `3001` and `5173`. |
| **DHT11 reads `NaN` / Invalid** | Sensor wiring or bad jumper wire | Verify VCC is connected to 3.3V and DATA to GPIO 4. Check that jumper wires make snug contact. |
| **Mobile camera won't open** | Insecure HTTP context on some browsers | Ensure phone and computer are on the same Wi-Fi. Access via LAN IP. Modern browsers allow WebRTC on LAN IPs. |
| **Port 3001 or 5173 already in use** | A previous instance is still running | In PowerShell, run `Get-Process node \| Stop-Process -Force` to release the ports. |

---

## 10. Architecture & Telemetry Flow

```
1. Sensor Acquisition:
   DHT11 Sensor ──[1-Wire Protocol]──> ESP32 GPIO 4 (Poll every 1500ms)

2. Payload Formatting:
   ESP32 packages reading as JSON:
   {
     "type": "sensor_data",
     "device": "esp32",
     "temperature": 27.5,
     "humidity": 65.0,
     "timestamp": 123456,
     "uptime_s": 42
   }

3. Transmission:
   ESP32 transmits payload over persistent WebSocket to ws://<PC_IP>:3001/ws

4. Ingestion & Validation:
   Backend server validates numeric boundaries (-40°C to 85°C, 0% to 100% RH),
   resets the rover heartbeat timeout timer, and updates last-seen metadata.

5. Broadcast:
   Backend server broadcasts "sensor_update" message to all connected dashboards.

6. Visualization:
   React dashboard updates temperature gauge, humidity gauge, appends sample
   to the 50-point rolling history waveform, and logs the raw frame.

7. Camera Link:
   Mobile phone connects to http://<PC_IP>:5173/camera, captures getUserMedia,
   exchanges SDP offer/answer over WebSocket, and establishes a direct P2P
   WebRTC media stream with the dashboard video player.
```

---

## 11. Vercel & Cloud Deployment

See the complete guide in [`DEPLOYMENT.md`](./DEPLOYMENT.md).

- **Frontend on Vercel**: Ready for 1-click deployment with included `vercel.json` SPA rewrite rules.
  ```powershell
  cd frontend
  npx.cmd vercel
  ```
- **Backend on Render / Railway**: Free persistent Node.js service (`render.yaml` provided) to host the stateful WebSocket & WebRTC signaling server.
- **Standalone Demo Mode on Vercel**: Set `VITE_DEMO_MODE=true` in Vercel environment variables to demonstrate the entire dashboard without needing any backend or hardware!

