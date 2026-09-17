# UIU Rescue Rover - ESP32 & DHT11 Firmware

This directory contains the complete Arduino firmware for reading real-time temperature and humidity from a **DHT11 sensor** on the **ESP32** and dispatching JSON telemetry over **WebSocket** to the mission control dashboard.

---

## Hardware Requirements

1. **ESP32 Development Board** (NodeMCU-32S, ESP32 Dev Module, or ESP-WROOM-32)
2. **DHT11 Sensor** (3-pin breakout board or 4-pin bare sensor)
3. **Micro-USB to USB-A cable** (data capable, not charge-only)
4. **Jumper Wires** (Female-to-Female or Female-to-Male depending on your breadboard)
5. *(Optional if using bare 4-pin DHT11)*: 10kΩ pull-up resistor between VCC and DATA

---

## Circuit Wiring

| DHT11 Pin | ESP32 Pin | Notes |
|:---|:---|:---|
| **VCC (+)** | **3.3V** (or **VIN / 5V**) | 3.3V is recommended for direct 3.3V logic compatibility with ESP32 GPIOs |
| **GND (-)** | **GND** | Connect to any ESP32 Ground pin |
| **DATA (Out / S)** | **GPIO 4** | Safe pin with no bootstrapping conflicts or internal pull restrictions |

> [!TIP]
> If you have a 3-pin DHT11 module (pins marked `S`, `+`, `-`), it already includes an onboard pull-up resistor. Connect `S` to GPIO 4, `+` to 3.3V, and `-` to GND.

---

## Arduino IDE Setup

### 1. Install ESP32 Board Support
1. Open **Arduino IDE**.
2. Go to **File > Preferences**.
3. In **Additional Boards Manager URLs**, paste:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Click **OK**.
5. Go to **Tools > Board > Boards Manager...**, search for `esp32` by **Espressif Systems**, and click **Install**.

### 2. Install Required Arduino Libraries
Go to **Tools > Manage Libraries...** (or `Ctrl+Shift+I`) and install:

1. **DHT sensor library** (by *Adafruit*) — select "Install All" to also install *Adafruit Unified Sensor*.
2. **WebSockets** (by *Markus Sattler*) — provides `WebSocketsClient.h`.
3. **ArduinoJson** (by *Benoit Blanchon*) — v6.x or v7.x both supported.

---

## Firmware Configuration

Open [`rescue_rover_dht11.ino`](./rescue_rover_dht11/rescue_rover_dht11.ino) in Arduino IDE and update the constants at the top:

```cpp
// 1. Wi-Fi Credentials
const char* WIFI_SSID     = "YOUR_HOME_OR_HOTSPOT_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// 2. WebSocket Server (Your PC's Local Network IP)
const char* WS_SERVER_HOST = "192.168.1.105"; // Replace with PC LAN IP
const uint16_t WS_SERVER_PORT = 3001;
const char* WS_SERVER_PATH = "/ws";

// 3. Sensor Pin
const uint8_t DHT_PIN = 4;
```

> [!IMPORTANT]
> **Never use `localhost` or `127.0.0.1`** in `WS_SERVER_HOST`. The ESP32 is an independent network device and needs your computer's actual local LAN IP (such as `192.168.1.105` or `10.0.0.15`).

---

## Flashing the ESP32

1. Connect the ESP32 to your computer via USB.
2. Select your board under **Tools > Board > ESP32 Arduino > ESP32 Dev Module** (or your specific board).
3. Select the correct COM port under **Tools > Port** (e.g., `COM3`, `COM4`).
4. Click the **Upload** button (`Ctrl+U`).
   *(If the upload hangs on `Connecting.......____`, press and hold the `BOOT` button on the ESP32 until the upload starts).*
5. Once uploaded, open **Tools > Serial Monitor** and set the baud rate to **`115200`**.
6. You will see:
   ```
   [WiFi] Connecting to MyNetwork....
   [WiFi] Connected successfully!
   [WiFi] ESP32 IP Address: 192.168.1.88
   [WS] Connected to ws://192.168.1.105:3001/ws
   [WS] Registration packet transmitted.
   [DHT11] Temperature: 26.8 °C | Humidity: 58.0 % | Uptime: 4 s
   ```
