# URRT-Autonomous-Rover

**UIU Rescue Rover Team (#URRT) — Autonomous Rescue Rover & Real-Time Cockpit**  
Official software stack and ground station platform built strictly in compliance with **URRT Rulebook V1.3** and aligned with the **Table 7 (100 Marks) Evaluation Criteria**.

---

## 📁 Repository Structure

```
URRT-Autonomous-Rover/
│
├── dashboard/
│   ├── frontend/               # Single-screen React + Vite Operator Cockpit (Light/Dark, Zero-Scroll)
│   └── backend/                # Node.js WebSocket & REST Telemetry Server (≤100ms Latency)
│
├── autonomous/
│   ├── navigation.py           # Path planning, obstacle avoidance, 80-120mm stop zone target locking
│   ├── decision.py             # State machine (Teleop ×1 vs Autonomous ×4 multiplier, referee declaration)
│   ├── task_manager.py         # Table 7 sensor crate tasks coordinator with timestamped logging
│   └── safety.py               # E-Stop interlock, watchdog failsafe (500ms), autonomous drive lock
│
├── computer_vision/
│   ├── qr_detection.py         # QR code detection & automatic server IPv4 address extraction
│   ├── color_detection.py      # HSV color segmentation (Red, Green, Blue, Yellow, Orange)
│   ├── shape_detection.py      # Contour approximation & shape classification (Circle, Square, Triangle, etc.)
│   └── motion_tracking.py      # 5.0-second continuous motion tracking algorithm
│
├── sensors/
│   ├── ultrasonic.py           # HC-SR04 sonar driver with median filtering & 80-120mm target zone
│   ├── imu.py                  # MPU-6050 / BNO055 6-DOF IMU driver with tilt/rollover danger alert
│   └── encoder.py              # Dual wheel optical encoder reader & odometry dead-reckoning
│
├── motor_control/
│   └── motor_controller.py     # BTS7960 / L298N differential drive with hardware drive lock
│
├── documentation/
│   ├── circuit_diagram.pdf     # Full electrical power architecture & wiring schematic
│   └── pin_map.pdf             # ESP32 and SBC GPIO pinout specification
│
├── tests/
│   ├── test_navigation.py      # Unit tests for navigation algorithms
│   ├── test_vision.py          # Unit tests for computer vision & QR IPv4 parsing
│   ├── test_sensors.py         # Unit tests for ultrasonic, IMU, and encoder math
│   ├── test_safety.py          # Unit tests for E-Stop and autonomous interlock
│   └── test_motor.py           # Unit tests for motor PWM clamping & drive lock
│
├── README.md                   # System documentation & setup guide
└── requirements.txt            # Python dependencies
```

---

## 🏆 URRT Rulebook Table 7 Compliance (100 Marks Breakdown)

| Item | Table 7 Criterion | Allocated Marks | Implementation & Location |
|:---|:---|:---:|:---|
| **1** | **Control Mode Switch & Drive Lock** | **20 Marks** | `autonomous/decision.py` & `dashboard/frontend/src/components/ControlModePanel.jsx`<br>• Teleop (×1 Multiplier) vs Autonomous (×4 Multiplier)<br>• Referee declaration flag required<br>• Hard drive lock active during autonomous run |
| **2** | **All Sensor Tasks Monitoring** | **15 Marks** | `autonomous/task_manager.py` & `dashboard/frontend/src/components/SensorTasksPanel.jsx`<br>• Sonar proximity locked in **80–120 mm** stop zone<br>• QR code decoded & server IPv4 auto pinged<br>• Colour & shape classification on target cards<br>• 5.0-second continuous motion tracking countdown<br>• Two-way audio acuity 4-digit codeword exchange<br>• **All readings recorded with live timestamps** |
| **3** | **Polling Time Benchmark (≤ 100 ms)** | **10 Marks** | `dashboard/backend/src/server.js` & `dashboard/frontend/src/components/Header.jsx`<br>• Live round-trip latency monitored every 100 ms<br>• Displayed on top HUD badge (`≤100ms • 10/10 PASS`) |
| **4** | **Standard REST API Endpoints** | **10 Marks** | `dashboard/backend/src/server.js`<br>• `/api/drive`, `/api/mode`, `/api/ping`, `/api/estop`, `/api/telemetry` |
| **5** | **WebSocket Telemetry Stream** | **10 Marks** | `dashboard/frontend/src/services/websocket.js`<br>• Live bi-directional packet stream (`RX >`, `TX >`, `SYS >`, `ALERT >`) |
| **6** | **UI/UX Cockpit Design** | **10 Marks** | `dashboard/frontend/src/pages/Dashboard.jsx`<br>• Ultra-clean, single-screen layout (**Zero vertical scroll: `h-screen overflow-hidden`**)<br>• Default Light theme with instant 🌙 Dark mode toggle<br>• Integrated real-time Serial Monitor / Telemetry Bus console |
| **7** | **GitHub Repository Structure** | **10 Marks** | Modular repository cleanly separated into `autonomous`, `computer_vision`, `sensors`, `motor_control`, `dashboard`, `documentation`, and `tests` |
| **8** | **Live Multi-Camera Video Feed** | **10 Marks** | `dashboard/frontend/src/components/CameraFeed.jsx`<br>• Dual video stream (Mast + Crate cameras), snapshot capture & OSD |
| **9** | **Emergency Stop (E-Stop)** | **5 Marks** | `autonomous/safety.py` & `dashboard/frontend/src/components/Header.jsx`<br>• Dedicated Red E-Stop button (Hot-key `E`), instant motor cutoff & alert |
| **TOTAL** | **Full Rulebook Compliance** | **100 Marks** | **100 / 100 Marks Verified** |

---

## ⚡ Quick Start Guide

### 1. Python Autonomous & Vision Stack

Ensure Python 3.10+ is installed.

```bash
# Install dependencies
pip install -r requirements.txt

# Run full test suite
python -m unittest discover tests

# Launch Autonomous Task Manager demo
python -c "from autonomous.decision import MissionStateMachine, ControlMode; fsm = MissionStateMachine(); print(fsm.set_mode(ControlMode.AUTONOMOUS, referee_declared=True))"
```

### 2. Operator Dashboard (Web Cockpit)

```bash
# 1. Start Telemetry Backend (Port 5000 / 3001)
npm run backend:dev

# 2. Start Frontend Cockpit (Port 5173)
npm run frontend:dev
```
Open your browser at `http://localhost:5173` or access the live cloud deployment at:  
👉 **[https://frontend-alif-af28.vercel.app](https://frontend-alif-af28.vercel.app)** (Mirror: `https://urrt-alif-af28.vercel.app`)

---

## 🔌 Hardware Pinout Overview

| Pin | Signal | Subsystem | Purpose |
|:---|:---|:---|:---|
| **GPIO 4** | `ESTOP_INT` | Emergency Stop Switch | Hardware interrupt motor cutoff |
| **GPIO 5** | `SONAR_TRIG` | HC-SR04 Sonar | 10 µs trigger pulse |
| **GPIO 18** | `SONAR_ECHO` | HC-SR04 Sonar | Distance reading (80–120 mm target zone) |
| **GPIO 14** | `LEFT_PWM` | BTS7960 / L298N | Left motor speed PWM |
| **GPIO 27** | `LEFT_DIR` | BTS7960 / L298N | Left motor direction |
| **GPIO 26** | `RIGHT_PWM` | BTS7960 / L298N | Right motor speed PWM |
| **GPIO 25** | `RIGHT_DIR` | BTS7960 / L298N | Right motor direction |
| **GPIO 21** | `I2C_SDA` | MPU-6050 IMU | Roll, pitch & tilt danger sensing |
| **GPIO 22** | `I2C_SCL` | MPU-6050 IMU | 400 kHz I2C clock |
| **GPIO 34** | `ENC_LEFT` | Wheel Encoder L | Odometry distance & velocity |
| **GPIO 35** | `ENC_RIGHT` | Wheel Encoder R | Odometry distance & velocity |
| **GPIO 12** | `LED_AUTO` | Status Indicator | Autonomous Lock LED (×4 multiplier) |
| **GPIO 13** | `LED_TELEOP`| Status Indicator | Teleoperation Active LED (×1 multiplier) |
| **GPIO 2** | `AUDIO_DAC` | PAM8403 Amplifier | Two-way audio codeword verification |

*(Detailed vector schematics available in [`documentation/pin_map.pdf`](documentation/pin_map.pdf) and [`documentation/circuit_diagram.pdf`](documentation/circuit_diagram.pdf))*

---

## 🛡️ Safety & Failsafe Architecture

1. **Watchdog Heartbeat:** If network telemetry is interrupted for more than **500 ms**, the safety controller engages automatic emergency braking.
2. **Drive Interlock:** When **Autonomous Mode (×4)** is activated, manual teleoperation inputs (WASD, D-pad, gamepad) are hardware- and software-locked to guarantee autonomous trial integrity.
3. **Proximity Brake:** If front obstacle clearance falls below **60 mm**, active collision avoidance overrides drive commands to protect rover and crate structures.

---

## 📜 License & Acknowledgments
Developed by the **UIU Rescue Rover Team (#URRT)**, Department of Computer Science & Engineering, United International University.  
Licensed under the **MIT License**.
