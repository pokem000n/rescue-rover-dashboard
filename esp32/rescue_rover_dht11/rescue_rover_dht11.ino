/**
 * ============================================================================
 * UIU RESCUE ROVER - ESP32 SMART AUTO-CONNECT TELEMETRY NODE
 * ============================================================================
 * 
 * Features:
 *   1. WiFiMulti Auto-Connect:
 *      Pre-configure multiple Wi-Fi networks (phone hotspot, home, lab).
 *      ESP32 automatically scans and connects to whichever is available!
 * 
 *   2. UDP Zero-Conf Server Auto-Discovery:
 *      No need to hardcode laptop LAN IP! ESP32 broadcasts a UDP beacon
 *      on port 3002. The backend server responds with its active IP,
 *      and ESP32 establishes WebSocket automatically.
 * 
 * Target Board: ESP32 Dev Module (DOIT ESP32 DEVKIT V1 / NodeMCU-32S)
 * Sensor: DHT11 on GPIO 13 (or GPIO 4)
 * 
 * Required Libraries (Arduino IDE -> Tools -> Manage Libraries):
 *   1. "DHT sensor library" by Adafruit
 *   2. "Adafruit Unified Sensor" by Adafruit
 *   3. "WebSockets" by Markus Sattler
 *   4. "ArduinoJson" by Benoit Blanchon (v6 or v7)
 * ============================================================================
 */

#include <WiFi.h>
#include <WiFiMulti.h>
#include <WiFiUdp.h>
#include <WebSocketsClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ============================================================================
// 1. HARDWARE PIN CONFIGURATION
// ============================================================================
#define DHTPIN 13                                     // Sensor DATA pin (GPIO 13)
#define DHTTYPE DHT11                                 // Sensor model DHT11

// Telemetry dispatch interval
const unsigned long TELEMETRY_INTERVAL_MS = 1500;     // 1.5 seconds

// UDP Auto-Discovery Port (must match backend: 3002)
const uint16_t UDP_DISCOVERY_PORT = 3002;

// ============================================================================
// 2. GLOBAL OBJECTS & STATE
// ============================================================================
WiFiMulti wifiMulti;
WiFiUDP udp;
WebSocketsClient webSocket;
DHT dht(DHTPIN, DHTTYPE);

String serverHost = "";                               // Dynamically discovered via UDP
uint16_t serverPort = 3001;                           // Dynamically discovered via UDP
bool isWsConnected = false;
unsigned long lastTelemetryTime = 0;
unsigned long lastDiscoveryAttempt = 0;

// ============================================================================
// 3. WEBSOCKET EVENT HANDLER
// ============================================================================
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      isWsConnected = false;
      Serial.println("[WS] Disconnected from server. Reconnecting in background...");
      break;

    case WStype_CONNECTED: {
      isWsConnected = true;
      Serial.println("==================================================");
      Serial.printf("[WS] CONNECTED TO MISSION CONTROL: ws://%s:%d/\n", serverHost.c_str(), serverPort);
      Serial.println("==================================================");

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
      Serial.println("[WS] Transmitted registration packet (ESP32: ONLINE).");
      break;
    }

    case WStype_TEXT:
      Serial.printf("[WS] Message from server: %s\n", payload);
      break;

    case WStype_BIN:
      break;

    case WStype_ERROR:
      Serial.println("[WS] Communication error encountered!");
      break;

    case WStype_PING:
      break;

    case WStype_PONG:
      break;
  }
}

// ============================================================================
// 4. UDP ZERO-CONF SERVER AUTO-DISCOVERY
// ============================================================================
bool discoverServer(unsigned long timeoutMs = 4000) {
  Serial.println("\n[Discovery] Scanning local network for Rover Server via UDP port 3002...");
  udp.begin(UDP_DISCOVERY_PORT);

  // Send discovery query broadcast to 255.255.255.255
  IPAddress broadcastIp(255, 255, 255, 255);
  const char* pingMsg = "{\"type\":\"URRT_DISCOVER\"}";
  udp.beginPacket(broadcastIp, UDP_DISCOVERY_PORT);
  udp.write((const uint8_t*)pingMsg, strlen(pingMsg));
  udp.endPacket();

  unsigned long start = millis();
  while (millis() - start < timeoutMs) {
    int packetSize = udp.parsePacket();
    if (packetSize > 0) {
      char buf[256];
      int len = udp.read(buf, sizeof(buf) - 1);
      if (len > 0) {
        buf[len] = '\0';
        StaticJsonDocument<256> doc;
        DeserializationError err = deserializeJson(doc, buf);
        if (!err && doc.containsKey("host")) {
          serverHost = doc["host"].as<String>();
          serverPort = doc["port"] | 3001;
          Serial.printf("[Discovery] SUCCESS! Server Auto-Detected at: ws://%s:%d/\n", serverHost.c_str(), serverPort);
          udp.stop();
          return true;
        }
      }
    }
    delay(50);
  }

  // Fallback: If broadcast was suppressed by router, try Default Gateway IP
  udp.stop();
  serverHost = WiFi.gatewayIP().toString();
  Serial.printf("[Discovery] Notice: Fallback to Gateway IP: ws://%s:%d/\n", serverHost.c_str(), serverPort);
  return false;
}

// ============================================================================
// 5. INITIALIZE WEBSOCKET CONNECTION
// ============================================================================
void connectWebSocketServer() {
  if (serverHost.length() == 0) {
    discoverServer();
  }

  if (serverHost.length() > 0) {
    Serial.printf("[WS] Connecting to ws://%s:%d/\n", serverHost.c_str(), serverPort);
    webSocket.begin(serverHost.c_str(), serverPort, "/");
    webSocket.onEvent(webSocketEvent);
    webSocket.setReconnectInterval(3000);
    webSocket.enableHeartbeat(15000, 3000, 2);
  }
}

// ============================================================================
// 6. READ DHT11 SENSOR & DISPATCH TELEMETRY
// ============================================================================
void readAndSendTelemetry() {
  unsigned long now = millis();
  if (now - lastTelemetryTime < TELEMETRY_INTERVAL_MS) {
    return;
  }
  lastTelemetryTime = now;

  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();

  // Validate sensor read
  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("[DHT11] ERROR: Reading failed! Check pin 13 wiring & 3.3V power.");
    return;
  }

  // Serial Monitor Log
  Serial.printf("[DHT11] Temp: %.1f °C | Humidity: %.1f %% | Uptime: %lu s\n", 
                temperature, humidity, (now / 1000));

  // If WebSocket connected, dispatch JSON payload to dashboard
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
    Serial.println("[WS] Waiting for WebSocket server connection...");
    
    // Periodically re-discover if disconnected for over 15s
    if (now - lastDiscoveryAttempt > 15000) {
      lastDiscoveryAttempt = now;
      discoverServer(2000);
      webSocket.disconnect();
      webSocket.begin(serverHost.c_str(), serverPort, "/");
    }
  }
}

// ============================================================================
// 7. SETUP
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n==================================================");
  Serial.println("   UIU RESCUE ROVER - AUTO-CONNECT TELEMETRY NODE ");
  Serial.println("==================================================");
  Serial.printf("Configured DHT Pin: GPIO %d\n", DHTPIN);
  Serial.println("==================================================\n");

  dht.begin();
  Serial.println("[DHT11] Sensor initialized.");

  // --------------------------------------------------------------------------
  // CONFIGURE YOUR MULTI-WIFI NETWORKS HERE:
  // Add as many networks as you want! ESP32 will auto-connect to whichever
  // one is active and in range!
  // --------------------------------------------------------------------------
  // Network 1: Samsung Galaxy A15 Hotspot (Make sure 2.4 GHz is enabled)
  wifiMulti.addAP("Galaxy A15 5G 882B", "YOUR_GALAXY_HOTSPOT_PASSWORD");

  // Network 2: Vivo Y28 Hotspot
  wifiMulti.addAP("vivo Y28", "YOUR_VIVO_HOTSPOT_PASSWORD");

  // Network 3: Dedicated Competition / Laptop Hotspot
  wifiMulti.addAP("RescueRover", "rover1234");

  // Network 4: Home or Lab Wi-Fi (Optional)
  // wifiMulti.addAP("YOUR_HOME_WIFI", "YOUR_HOME_PASSWORD");

  // Connect to the strongest available Wi-Fi
  Serial.println("[WiFi] Scanning & Auto-Connecting to available Wi-Fi...");
  WiFi.mode(WIFI_STA);

  int attempts = 0;
  while (wifiMulti.run() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] CONNECTED SUCCESSFULLY!");
    Serial.print("[WiFi] Connected SSID: ");
    Serial.println(WiFi.SSID());
    Serial.print("[WiFi] ESP32 IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.printf("[WiFi] Signal Strength (RSSI): %d dBm\n", WiFi.RSSI());

    // Auto-discover backend server IP and establish WebSocket
    discoverServer();
    connectWebSocketServer();
  } else {
    Serial.println("\n[WiFi] Connection timeout. Retrying in background loop...");
  }
}

// ============================================================================
// 8. MAIN LOOP
// ============================================================================
void loop() {
  // Maintain background Wi-Fi connection automatically
  if (wifiMulti.run() == WL_CONNECTED) {
    // Process WebSocket event loop
    webSocket.loop();

    // Poll DHT11 sensor and send data
    readAndSendTelemetry();
  } else {
    Serial.println("[WiFi] Lost connection! Auto-reconnecting to best AP...");
    isWsConnected = false;
    delay(1000);
  }
}