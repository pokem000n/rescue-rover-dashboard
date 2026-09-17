# UIU Rescue Rover - Deployment Guide (Vercel + Cloud WebSocket)

This guide explains how to deploy the **Rescue Rover Mission Dashboard** to **Vercel** and connect it to a persistent cloud WebSocket backend.

---

## Architecture Overview

| Component | Recommended Host | Why? |
|:---|:---|:---|
| **Frontend Dashboard** | **Vercel** | Lightning-fast static CDN, automatic SSL (`https://`), perfect for React + Vite. |
| **Backend (WebSockets & Signaling)** | **Render** or **Railway** | **Crucial:** Vercel functions are *serverless* (stateless short-lived requests) and **do not support persistent stateful WebSockets**. The backend requires a long-lived Node.js process. |
| **ESP32 Node** | Physical Hardware | Connects to your backend's public `wss://` address over Wi-Fi. |

> [!TIP]
> **Standalone Demo on Vercel**: If you deploy only the frontend to Vercel with `VITE_DEMO_MODE=true`, it runs **100% client-side** without needing any backend server at all!

---

## Part 1: Deploying the Frontend to Vercel

### Method A: Via GitHub & Vercel Web Dashboard (Recommended)

1. **Push your code to GitHub**:
   ```bash
   cd C:\Users\HP\.gemini\antigravity\scratch\rescue-rover-dashboard
   git init
   git add .
   git commit -m "UIU Rescue Rover Dashboard"
   git branch -M main
   # Add your remote repo and push:
   git remote add origin https://github.com/<YOUR_USERNAME>/rescue-rover-dashboard.git
   git push -u origin main
   ```

2. **Import to Vercel**:
   - Go to [vercel.com](https://vercel.com/) and sign in.
   - Click **"Add New..." > "Project"**.
   - Select your GitHub repository.
   - **Framework Preset**: Vite
   - **Root Directory**: Click *Edit* and select **`frontend`** (or leave root if using the configured `vercel.json`).
   - **Environment Variables**:
     - `VITE_DEMO_MODE`: `false` (or `true` if you want it to demo automatically)
     - `VITE_WS_URL`: `wss://your-backend.onrender.com` (leave blank until backend is deployed)
     - `VITE_API_URL`: `https://your-backend.onrender.com`
   - Click **"Deploy"**.

### Method B: Via Vercel CLI (Instant Terminal Deploy)

From your computer:
```powershell
cd C:\Users\HP\.gemini\antigravity\scratch\rescue-rover-dashboard\frontend
npx.cmd vercel
```
Follow the interactive prompts:
- *Set up and deploy?* **Y**
- *Which scope?* Select your account
- *Link to existing project?* **N**
- *Project name?* `uiu-rescue-rover`
- *In which directory is your code located?* `./`
- Vercel will automatically build and give you a live production URL!

---

## Part 2: Deploying the WebSocket Backend (Free on Render)

Because the ESP32 and WebRTC signaling require a **persistent TCP WebSocket connection**, deploy the backend to Render (free tier):

1. Go to [render.com](https://render.com/) and sign in.
2. Click **"New +" > "Web Service"**.
3. Connect your GitHub repository.
4. Fill in the settings:
   - **Name**: `rescue-rover-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. Under **Environment Variables**, add:
   - `PORT`: `10000`
   - `ESP32_HEARTBEAT_TIMEOUT_MS`: `5000`
6. Click **"Deploy Web Service"**.

Once deployed, Render gives you a public HTTPS address like:
`https://rescue-rover-backend.onrender.com`

Your WebSocket address is the same with `wss://`:
`wss://rescue-rover-backend.onrender.com`

---

## Part 3: Connecting Everything

### 1. Update Frontend on Vercel
In your Vercel Project Dashboard under **Settings > Environment Variables**, add:
- `VITE_WS_URL` = `wss://rescue-rover-backend.onrender.com`
- `VITE_API_URL` = `https://rescue-rover-backend.onrender.com`
- `VITE_DEMO_MODE` = `false`

Redeploy the project in Vercel to apply changes.

### 2. Update ESP32 Firmware for Cloud Access
When deploying to a public server with SSL (`wss://`), update `rescue_rover_dht11.ino`:
```cpp
// Connect to cloud server
const char* WS_SERVER_HOST = "rescue-rover-backend.onrender.com";
const uint16_t WS_SERVER_PORT = 443;
const char* WS_SERVER_PATH = "/ws";
```
In `setup()` inside `rescue_rover_dht11.ino`, change `webSocket.begin(...)` to SSL:
```cpp
webSocket.beginSSL(WS_SERVER_HOST, WS_SERVER_PORT, WS_SERVER_PATH);
```
*(Render provides automated SSL on port 443).*
