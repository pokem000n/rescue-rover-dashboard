/**
 * UIU Rescue Rover - Mock Telemetry Simulator for Demo Mode
 * 
 * Generates realistic physics-based random-walk telemetry for:
 * - Temperature (24.0°C - 34.0°C)
 * - Humidity (45.0% - 75.0% RH)
 * Dispatches simulated sensor payloads to dashboard state listeners.
 */

class MockDataSimulator {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.onDataCallback = null;
    this.onStatusCallback = null;
    this.temperature = 26.5;
    this.humidity = 58.0;
    this.uptimeSeconds = 0;
    this.battery = 100;
    this.sonar = 200;
    this.colorShapes = [
      { color: 'Red', shape: 'Circle' },
      { color: 'Blue', shape: 'Square' },
      { color: 'Green', shape: 'Triangle' },
      { color: 'Yellow', shape: 'Rectangle' },
      { color: 'Orange', shape: 'Star' },
    ];
    this.colorShapeIndex = 0;
    this.colorShapeTimer = 0;
    this.isRoverSimulatedOnline = true;
  }

  start(onData, onStatus) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.onDataCallback = onData;
    this.onStatusCallback = onStatus;

    console.log('[DemoMode] Simulation engine active. Generating realistic telemetry...');

    // Emit initial online status
    if (this.onStatusCallback) {
      this.onStatusCallback({
        device: 'esp32',
        status: this.isRoverSimulatedOnline ? 'online' : 'offline',
        ip: '192.168.1.188 (Simulated)',
        isDemo: true
      });
    }

    this.intervalId = setInterval(() => {
      if (!this.isRunning) return;

      this.uptimeSeconds += 2;

      if (!this.isRoverSimulatedOnline) {
        return; // When simulated offline, no new packets arrive
      }

      // Realistic environmental drift:
      // Temp drifts by -0.3 to +0.3
      const tempDelta = (Math.random() - 0.48) * 0.4;
      this.temperature = Math.max(22.0, Math.min(36.0, this.temperature + tempDelta));

      // Humidity often has slight inverse trend with ambient temperature
      const humDelta = -(tempDelta * 0.8) + (Math.random() - 0.5) * 0.6;
      this.humidity = Math.max(40.0, Math.min(80.0, this.humidity + humDelta));

      // Battery drains slowly
      this.battery = Math.max(0, this.battery - 0.05);

      // Sonar wanders around 100mm ±50mm
      this.sonar = Math.max(30, Math.min(300, this.sonar + (Math.random() - 0.5) * 20));

      // Color/shape changes every ~20 ticks (30 seconds)
      this.colorShapeTimer++;
      if (this.colorShapeTimer >= 20) {
        this.colorShapeTimer = 0;
        this.colorShapeIndex = (this.colorShapeIndex + 1) % this.colorShapes.length;
      }

      const payload = {
        type: 'sensor_update',
        temperature: Number(this.temperature.toFixed(1)),
        humidity: Number(this.humidity.toFixed(1)),
        timestamp: Date.now(),
        uptime_s: this.uptimeSeconds,
        isDemo: true,
        battery: Number(this.battery.toFixed(1)),
        sonar: Math.round(this.sonar),
        color: this.colorShapes[this.colorShapeIndex].color,
        shape: this.colorShapes[this.colorShapeIndex].shape,
        motionTracking: Math.random() > 0.5
      };

      if (this.onDataCallback) {
        this.onDataCallback(payload);
      }
    }, 1500);
  }

  toggleSimulatedRoverOnline() {
    this.isRoverSimulatedOnline = !this.isRoverSimulatedOnline;
    if (this.onStatusCallback) {
      this.onStatusCallback({
        device: 'esp32',
        status: this.isRoverSimulatedOnline ? 'online' : 'offline',
        ip: '192.168.1.188 (Simulated)',
        isDemo: true
      });
    }
    return this.isRoverSimulatedOnline;
  }

  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('[DemoMode] Simulation engine stopped.');
  }
}

export const mockSimulator = new MockDataSimulator();
export default mockSimulator;
