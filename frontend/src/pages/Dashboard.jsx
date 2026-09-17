import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import MetricCard from '../components/MetricCard';
import CameraFeed from '../components/CameraFeed';
import TelemetryChart from '../components/TelemetryChart';
import SystemInfo from '../components/SystemInfo';
import PacketLog from '../components/PacketLog';

import { wsClient } from '../services/websocket';
import { mockSimulator } from '../services/mockData';

const MAX_HISTORY_POINTS = 50;
const MAX_LOG_ENTRIES = 40;

export default function Dashboard({ onNavigateToCamera }) {
  // Telemetry state
  const [temperature, setTemperature] = useState(null);
  const [humidity, setHumidity] = useState(null);
  const [prevTemperature, setPrevTemperature] = useState(null);
  const [prevHumidity, setPrevHumidity] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [uptimeSeconds, setUptimeSeconds] = useState(0);

  // Hardware & Network state
  const [esp32Online, setEsp32Online] = useState(false);
  const [esp32Ip, setEsp32Ip] = useState(null);
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [connectedDashboards, setConnectedDashboards] = useState(1);
  const [packetCount, setPacketCount] = useState(0);

  // Rolling history & logs
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);

  // Demo Simulation Mode state
  const [isDemoMode, setIsDemoMode] = useState(() => {
    return import.meta.env.VITE_DEMO_MODE === 'true';
  });
  const [isSimulatedOnline, setIsSimulatedOnline] = useState(true);

  // Ingests incoming telemetry data point (from real ESP32 or Demo simulator)
  const ingestSensorData = useCallback((data) => {
    const now = Date.now();
    const temp = typeof data.temperature === 'number' ? data.temperature : parseFloat(data.temperature);
    const hum = typeof data.humidity === 'number' ? data.humidity : parseFloat(data.humidity);

    if (isNaN(temp) || isNaN(hum)) return;

    setTemperature((current) => {
      setPrevTemperature(current);
      return temp;
    });

    setHumidity((current) => {
      setPrevHumidity(current);
      return hum;
    });

    setLastUpdated(data.timestamp || now);
    if (data.uptime_s !== null && data.uptime_s !== undefined) {
      setUptimeSeconds(data.uptime_s);
    }
    setEsp32Online(true);
    setPacketCount(c => c + 1);

    // Update rolling history buffer
    setHistory((prev) => {
      const newPoint = {
        timestamp: data.timestamp || now,
        temperature: temp,
        humidity: hum
      };
      const updated = [...prev, newPoint];
      if (updated.length > MAX_HISTORY_POINTS) {
        return updated.slice(updated.length - MAX_HISTORY_POINTS);
      }
      return updated;
    });

    // Update raw JSON packet log
    setLogs((prev) => {
      const logEntry = {
        time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        data
      };
      const updated = [logEntry, ...prev];
      if (updated.length > MAX_LOG_ENTRIES) {
        return updated.slice(0, MAX_LOG_ENTRIES);
      }
      return updated;
    });
  }, []);

  // Set up WebSocket listeners and lifecycle
  useEffect(() => {
    // If in Demo Mode, use simulator instead of WebSocket
    if (isDemoMode) {
      mockSimulator.start(
        (data) => ingestSensorData(data),
        (statusEvent) => {
          setEsp32Online(statusEvent.status === 'online');
          setEsp32Ip(statusEvent.ip);
        }
      );
      setWsStatus('connected');
      return () => {
        mockSimulator.stop();
      };
    }

    // Connect real WebSocket client
    wsClient.connect();

    const unsubStatus = wsClient.onStatusChange((status) => {
      setWsStatus(status);
    });

    const unsubInitial = wsClient.on('initial_state', (payload) => {
      console.log('[Dashboard] Initial state received:', payload);
      if (payload.esp32) {
        setEsp32Online(Boolean(payload.esp32.online));
        if (payload.esp32.ip) setEsp32Ip(payload.esp32.ip);
        if (payload.esp32.data && payload.esp32.data.temperature !== null) {
          ingestSensorData(payload.esp32.data);
        }
      }
      if (payload.connectedDashboards) {
        setConnectedDashboards(payload.connectedDashboards);
      }
    });

    const unsubSensor = wsClient.on('sensor_update', (payload) => {
      ingestSensorData(payload);
    });

    const unsubDeviceStatus = wsClient.on('device_status', (payload) => {
      console.log('[Dashboard] Device status update:', payload);
      if (payload.device === 'esp32') {
        const isOnline = payload.status === 'online';
        setEsp32Online(isOnline);
        if (payload.ip) setEsp32Ip(payload.ip);
      }
    });

    return () => {
      unsubStatus();
      unsubInitial();
      unsubSensor();
      unsubDeviceStatus();
    };
  }, [isDemoMode, ingestSensorData]);

  const handleToggleDemoMode = () => {
    setIsDemoMode(prev => !prev);
  };

  const handleToggleSimulatedRover = () => {
    if (isDemoMode) {
      const next = mockSimulator.toggleSimulatedRoverOnline();
      setIsSimulatedOnline(next);
      setEsp32Online(next);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 flex flex-col">
      {/* Tactical Top Mission Header */}
      <Header 
        esp32Online={esp32Online}
        wsStatus={wsStatus}
        lastUpdated={lastUpdated}
        isDemoMode={isDemoMode}
        onToggleDemoMode={handleToggleDemoMode}
        onToggleSimulatedRover={handleToggleSimulatedRover}
        isSimulatedOnline={isSimulatedOnline}
        onOpenMobileCamera={onNavigateToCamera}
      />

      {/* Main Mission Control Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 space-y-6">
        
        {/* Top Section: Metrics + Live Camera */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Left Column: Environmental Gauges & Waveforms (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-6">
            
            {/* Real-time Metric Cards (Side by side on medium+, stacked on small) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <MetricCard 
                type="temperature"
                value={temperature}
                unit="°C"
                previousValue={prevTemperature}
                history={history}
                isStale={!esp32Online && temperature !== null}
              />

              <MetricCard 
                type="humidity"
                value={humidity}
                unit="%"
                previousValue={prevHumidity}
                history={history}
                isStale={!esp32Online && humidity !== null}
              />
            </div>

            {/* Rolling Telemetry History Waveform */}
            <div className="flex-1 min-h-[320px]">
              <TelemetryChart data={history} />
            </div>

          </div>

          {/* Right Column: Wireless Mobile Camera Feed (5 Cols) */}
          <div className="lg:col-span-5 h-full">
            <CameraFeed isDemoMode={isDemoMode} />
          </div>

        </div>

        {/* Middle Section: System Diagnostics & Health */}
        <SystemInfo 
          esp32Online={esp32Online}
          esp32Ip={esp32Ip}
          wsStatus={wsStatus}
          wsUrl={wsClient.url}
          lastUpdated={lastUpdated}
          packetCount={packetCount}
          uptimeSeconds={uptimeSeconds}
          connectedDashboards={connectedDashboards}
          latestData={{ temperature, humidity }}
        />

        {/* Bottom Section: Live JSON Bus Packet Log */}
        <PacketLog 
          logs={logs}
          onClear={() => setLogs([])}
        />

      </main>

      {/* Footer */}
      <footer className="border-t border-[#162338] py-4 px-6 bg-[#0a0f18]/80 text-center font-mono text-xs text-slate-400 flex items-center justify-center gap-2.5">
        <img src="/urrt-logo.png" alt="URRT Logo" className="w-5 h-5 rounded-full border border-[#00c2cb]/40" />
        <span>UIU RESCUE ROVER TEAM (#URRT) • ROBOCUP RESCUE ROVER MISSION CONTROL</span>
      </footer>
    </div>
  );
}
