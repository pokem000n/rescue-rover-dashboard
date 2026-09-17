/*
 * ============================================================================
 * UIU RESCUE ROVER - ESP32 & DHT11 TELEMETRY FIRMWARE
 * RoboCup Junior Rescue Rover Project
 * ============================================================================
 * 
 * Hardware:
 *   - ESP32 NodeMCU / ESP-WROOM-32 DevKit
 *   - DHT11 Temperature & Humidity Sensor
 * 
 * Circuit Wiring:
 *   DHT11 VCC   --> ESP32 3.3V (or 5V for 3-pin modules with built-in pullup)
 *   DHT11 GND   --> ESP32 GND
 *   DHT11 DATA  --> ESP32 GPIO 4 (Safe GPIO, no bootstrap conflicts)
 *   (If using bare 4-pin DHT11, place a 10k resistor between VCC and DATA)
 * 
 * Required Arduino IDE Libraries:
 *   1. "DHT sensor library" by Adafruit (v1.4.x)
 *   2. "Adafruit Unified Sensor" by Adafruit
 *   3. "WebSockets" by Markus Sattler (v2.4.x)
 *   4. "ArduinoJson" by Benoit Blanchon (v6.x or v7.x)
 * 
 * ============================================================================
 */

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ============================================================================
// CONFIGURATION CONSTANTS (MODIFY FOR YOUR NETWORK)
// ============================================================================

// 1. Wi-Fi Credentials
const char* WIFI_SSID     = "YOUR_WIFI_SSID";         // Replace with your Wi-Fi SSID
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";     // Replace with your Wi-Fi Password

// 2. WebSocket Server Connection Details (Your Computer's LAN IP)
// DO NOT use "localhost" or "127.0.0.1" - use your computer's local IP address (e.g., 192.168.1.105)
const char* WS_SERVER_HOST = "192.168.1.100";         // Computer LAN IP running backend
const uint16_t WS_SERVER_PORT = 3001;                 // Backend port (default: 3001)
const char* WS_SERVER_PATH = "/ws";                   // WebSocket endpoint path

// 3. Sensor Pin & Type Configuration
const uint8_t DHT_PIN = 4;                            // Safe ESP32 GPIO pin for DHT11
#define DHT_TYPE DHT11                                // DHT11 sensor model

// 4. Telemetry Interval (milliseconds)
const unsigned long TELEMETRY_INTERVAL_MS = 1500;     // 1.5 seconds between readings

// ============================================================================
// GLOBAL OBJECTS & STATE
// ============================================================================

DHT dht(DHT_PIN, DHT_TYPE);
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
      Serial.println("[WS] Disconnected from server!");
      break;

    case WStype_CONNECTED: {
      isWsConnected = true;
      Serial.printf("[WS] Connected to ws://%s:%d%s\n", WS_SERVER_HOST, WS_SERVER_PORT, WS_SERVER_PATH);

      // Send initial registration packet to backend
      StaticJsonDocument<256> doc;
      doc["type"] = "register";
      doc["role"] = "esp32";
      doc["device"] = "esp32";
      doc["status"] = "online";
      doc["ip"] = WiFi.localIP().toString();

      String jsonString;
      serializeJson(doc, jsonString);
      webSocket.sendTXT(jsonString);
      Serial.println("[WS] Registration packet transmitted.");
      break;
    }

    case WStype_TEXT:
      Serial.printf("[WS] Message from server: %s\n", payload);
      break;

    case WStype_BIN:
      Serial.printf("[WS] Binary data received (len: %u)\n", length);
      break;

    case WStype_ERROR:
      Serial.println("[WS] Communication error occurred!");
      break;

    case WStype_PING:
      break;

    case WStype_PONG:
      break;
  }
}

// ============================================================================
// WI-FI CONNECTION & RECONNECT LOGIC
// ============================================================================

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("\n[WiFi] Connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected successfully!");
    Serial.print("[WiFi] ESP32 IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("[WiFi] RSSI Signal Strength: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("\n[WiFi] Connection timeout. Will retry automatically in background...");
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

  // Read temperature as Celsius
  float temperature = dht.readTemperature();
  // Read relative humidity (%)
  float humidity = dht.readHumidity();

  // Validate sensor readings
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("[DHT11] ERROR: Failed to read from sensor! Check wiring & 3.3V power.");
    return;
  }

  // Print to Serial Monitor
  Serial.printf("[DHT11] Temperature: %.1f °C | Humidity: %.1f %% | Uptime: %lu s\n", 
                temperature, humidity, (now / 1000));

  // If WebSocket is connected, serialize and send JSON
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

    bool success = webSocket.sendTXT(payload);
    if (success) {
      Serial.println("[WS] Telemetry payload dispatched.");
    } else {
      Serial.println("[WS] Failed to dispatch packet.");
    }
  } else {
    Serial.println("[WS] Notice: WebSocket disconnected. Waiting for connection...");
  }
}

// ============================================================================
// ARDUINO SETUP & MAIN LOOP
// ============================================================================

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n==================================================");
  Serial.println("   UIU RESCUE ROVER - DHT11 TELEMETRY NODE        ");
  Serial.println("==================================================");
  Serial.printf("Configured DHT11 GPIO Pin: %d\n", DHT_PIN);
  Serial.printf("Configured Backend Server: ws://%s:%d%s\n", WS_SERVER_HOST, WS_SERVER_PORT, WS_SERVER_PATH);
  Serial.println("==================================================\n");

  // Initialize DHT sensor
  dht.begin();
  Serial.println("[DHT11] Sensor initialized.");

  // Connect to local Wi-Fi network
  connectWiFi();

  // Setup WebSocket Client
  webSocket.begin(WS_SERVER_HOST, WS_SERVER_PORT, WS_SERVER_PATH);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(3000);  // Automatically attempt reconnect every 3s if server goes down
  webSocket.enableHeartbeat(15000, 3000, 2);
}

void loop() {
  // Maintain background Wi-Fi connection
  checkWiFiReconnect();

  // Process WebSocket client event loop
  webSocket.loop();

  // Poll sensor and send telemetry if Wi-Fi is ready
  if (WiFi.status() == WL_CONNECTED) {
    readAndSendTelemetry();
  }
}
