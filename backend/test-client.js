/**
 * Automated Verification Script
 * Simulates an ESP32 sending DHT11 data to the backend via WebSocket
 */

const { WebSocket } = require('ws');

const ws = new WebSocket('ws://localhost:3001');

ws.on('open', () => {
  console.log('Test ESP32 connected to backend WebSocket!');
  
  // 1. Send registration
  ws.send(JSON.stringify({
    type: 'register',
    role: 'esp32',
    device: 'esp32',
    ip: '192.168.1.55'
  }));

  // 2. Send 3 simulated sensor packets
  let count = 0;
  const timer = setInterval(() => {
    count++;
    const payload = {
      type: 'sensor_data',
      device: 'esp32',
      temperature: 28.4 + (count * 0.2),
      humidity: 62.0 - (count * 0.5),
      timestamp: Date.now(),
      uptime_s: count * 2
    };

    console.log(`Sending packet #${count}:`, payload);
    ws.send(JSON.stringify(payload));

    if (count >= 3) {
      clearInterval(timer);
      setTimeout(() => {
        console.log('Verification test completed successfully.');
        ws.close();
        process.exit(0);
      }, 1000);
    }
  }, 1000);
});

ws.on('error', (err) => {
  console.error('Test ESP32 socket error:', err);
  process.exit(1);
});
