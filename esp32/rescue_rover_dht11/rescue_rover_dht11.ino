/**
 * ============================================================================
 * UIU RESCUE ROVER - ESP32 TELEMETRY TRANSMITTER (DHT11 & WEBSOCKET)
 * ============================================================================
 * 
 * Target Board: ESP32 Dev Module (DOIT ESP32 DEVKIT V1 / NodeMCU-32S)
 * 
 * Hardware Wiring:
 *   DHT11 VCC   --> ESP32 3.3V (or 5V for 3-pin modules with built-in pullup)
 *   DHT11 GND   --> ESP32 GND
 *   DHT11 DATA  --> ESP32 GPIO 13 (or GPIO 4)
 * 
 * Required Libraries in Arduino IDE (Tools -> Manage Libraries):
 *   1. "DHT sensor library" by Adafruit
 *   2. "Adafruit Unified Sensor" by Adafruit
 *   3. "WebSockets" by Markus Sattler
 *   4. "ArduinoJson" by Benoit Blanchon (v6 or v7)
 * ============================================================================
 */

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ============================================================================
// NETWORK & SERVER CONFIGURATION
// ============================================================================

// 1. Enter your Mobile Hotspot / Wi-Fi Credentials:
// (Note: Make sure your Hotspot 2.4 GHz band is enabled, as ESP32 requires 2.4 GHz)
const char* WIFI_SSID     = "Galaxy A15 5G 882B";      // Your Wi-Fi / Hotspot SSID
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";     // Enter your Hotspot Password here

// 2. Computer LAN IP Address (running the backend server):
const char* WS_SERVER_HOST = "10.114.198.130";        // Current Laptop IPv4
const uint16_t WS_SERVER_PORT = 3001;                 // Backend Server Port
const char* WS_SERVER_PATH = "/";                     // WebSocket Root Endpoint

// 3. Sensor Pin Configuration:
#define DHTPIN 13                                     // Sensor DATA pin (GPIO 13)
#define DHTTYPE DHT11                                 // Sensor model DHT11

// 4. Telemetry Broadcast Interval (milliseconds)
const unsigned long TELEMETRY_INTERVAL_MS = 1500;     // Sends sensor data every 1.5s

// ============================================================================
// GLOBAL OBJECTS & STATE
// ============================================================================

DHT dht(DHTPIN, DHTTYPE);
WebSocketsClient webSocket;

unsigned long lastTelemetryTime = 0;
unsigned long lastWiFiCheckTime = 0;
const unsigned long WIFI_RECONNECT_INTERVAL_MS = 5000;
bool isWsConnected = false;

// ============================================================================
// WEBSOCKET EVENT HANDLER
// ============================================================================

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      isWsConnected = false;
      Serial.println("[WS] Disconnected from server. Reconnecting in 3s...");
      break;

    case WStype_CONNECTED: {
      isWsConnected = true;
      Serial.printf("[WS] CONNECTED to server ws://%s:%d%s\n", WS_SERVER_HOST, WS_SERVER_PORT, WS_SERVER_PATH);

      // Register device identity with backend
      StaticJsonDocument<256> doc;
      doc["type"] = "register";
      doc["role"] = "esp32";
      doc["device"] = "esp32";
      doc["status"] = "online";
      doc["ip"] = WiFi.localIP().toString();

      String jsonString;
      serializeJson(doc, jsonString);
      webSocket.sendTXT(jsonString);
      Serial.println("[WS] Registered as ESP32 hardware client.");
      break;
    }

    case WStype_TEXT:
      Serial.printf("[WS] Server message: %s\n", payload);
      break;

    case WStype_BIN:
      break;

    case WStype_ERROR:
      Serial.println("[WS] Communication error!");
      break;

    case WStype_PING:
      break;

    case WStype_PONG:
      break;
  }
}

// ============================================================================
// WI-FI CONNECTION LOGIC
// ============================================================================

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.println("\n--------------------------------------------------");
  Serial.printf("[WiFi] Connecting to: %s\n", WIFI_SSID);
  Serial.println("--------------------------------------------------");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected successfully!");
    Serial.print("[WiFi] ESP32 IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.printf("[WiFi] Signal Strength: %d dBm\n", WiFi.RSSI());
  } else {
    Serial.println("\n[WiFi] Connection timeout. Retrying in background...");
  }
}

void checkWiFiReconnect() {
  unsigned long now = millis();
  if (now - lastWiFiCheckTime >= WIFI_RECONNECT_INTERVAL_MS) {
    lastWiFiCheckTime = now;
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[WiFi] Wi-Fi lost! Attempting auto-reconnect...");
      WiFi.disconnect();
      WiFi.reconnect();
    }
  }
}

// ============================================================================
// SENSOR READING & TRANSMISSION
// ============================================================================

void readAndSendTelemetry() {
  unsigned long now = millis();
  if (now - lastTelemetryTime < TELEMETRY_INTERVAL_MS) {
    return;
  }
  lastTelemetryTime = now;

  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();

  // Check if DHT read failed
  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("[DHT11] ERROR: Failed to read from sensor! Check pin wiring & 3.3V.");
    return;
  }

  // Serial Monitor Output
  Serial.printf("[DHT11] Temp: %.1f °C | Humidity: %.1f %% | Uptime: %lu s\n", 
                temperature, humidity, (now / 1000));

  // If WebSocket is connected, send real JSON telemetry
  if (isWsConnected) {
    StaticJsonDocument<256> doc;
    doc["type"] = "sensor_data";
    doc["device"] = "esp32";
    doc["temperature"] = serialized(String(temperature, 1));
    doc["humidity"] = serialized(String(humidity, 1));
    doc["timestamp"] = now;
    doc["uptime_s"] = now / 1000;
    doc["ip"] = WiFi.localIP().toString();

    String payload;
    serializeJson(doc, payload);

    bool ok = webSocket.sendTXT(payload);
    if (ok) {
      Serial.println("[WS] Telemetry payload dispatched -> Dashboard receiving!");
    } else {
      Serial.println("[WS] Dispatch failed.");
    }
  } else {
    Serial.println("[WS] Server offline or disconnected. Waiting for link...");
  }
}

// ============================================================================
// ARDUINO SETUP & LOOP
// ============================================================================

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n==================================================");
  Serial.println("   UIU RESCUE ROVER - DHT11 TELEMETRY NODE        ");
  Serial.println("==================================================");
  Serial.printf("Configured DHT Pin: GPIO %d\n", DHTPIN);
  Serial.printf("Target Server: ws://%s:%d%s\n", WS_SERVER_HOST, WS_SERVER_PORT, WS_SERVER_PATH);
  Serial.println("==================================================\n");

  dht.begin();
  Serial.println("[DHT11] Sensor initialized.");

  connectWiFi();

  // Setup WebSocket Client
  webSocket.begin(WS_SERVER_HOST, WS_SERVER_PORT, WS_SERVER_PATH);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(3000);
  webSocket.enableHeartbeat(15000, 3000, 2);
}

void loop() {
  checkWiFiReconnect();
  webSocket.loop();

  if (WiFi.status() == WL_CONNECTED) {
    readAndSendTelemetry();
  }
}