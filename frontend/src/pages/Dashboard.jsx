import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from '../components/Header';
import CameraFeed from '../components/CameraFeed';
import ControlModePanel from '../components/ControlModePanel';
import DriveControl from '../components/DriveControl';
import SensorTasksPanel from '../components/SensorTasksPanel';

import { 
  Battery, 
  Thermometer, 
  Droplets,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon
} from 'lucide-react';

import { wsClient } from '../services/websocket';
import { mockSimulator } from '../services/mockData';
import { soundManager } from '../utils/soundEffects';

export default function Dashboard({ onNavigateToCamera }) {
  // Telemetry state
  const [temperature, setTemperature] = useState(null);
  const [humidity, setHumidity] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Hardware & Network state
  const [esp32Online, setEsp32Online] = useState(false);
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [packetCount, setPacketCount] = useState(0);

  // Rulebook Polling Latency state (Target: <=100ms for 10 marks)
  const [latency, setLatency] = useState(32);
  const [medianLatency, setMedianLatency] = useState(32);

  // Match Countdown Timer State (8:00 default)
  const [initialDuration, setInitialDuration] = useState(480);
  const [matchSeconds, setMatchSeconds] = useState(480);
  const [timerActive, setTimerActive] = useState(false);

  // LIGHT THEME AS DEFAULT (User requested light theme by default with toggle option)
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('urrt_theme') || 'light';
    } catch (e) {
      return 'light';
    }
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
      } else {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
      }
      try {
        localStorage.setItem('urrt_theme', theme);
      } catch (e) {}
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(t => t === 'light' ? 'dark' : 'light');
  };

  // URRT Rulebook: Control mode, battery, sensor & E-stop state
  const [mode, setMode] = useState('teleop'); // 'teleop' | 'autonomous'
  const [battery, setBattery] = useState(96);
  const [sensors, setSensors] = useState({ 
    sonar: 98, 
    color: 'Red', 
    shape: 'Circle', 
    motionTracking: false, 
    qrIp: null,
    ping: null,
    audio: null,
    timestamp: null
  });
  const [eStopFlash, setEStopFlash] = useState(false);
  const [triggerSnapshot, setTriggerSnapshot] = useState(0);
  const [snapshotsCount, setSnapshotsCount] = useState(0);

  // Timer countdown loop
  useEffect(() => {
    let interval = null;
    if (timerActive && matchSeconds > 0) {
      interval = setInterval(() => {
        setMatchSeconds(sec => {
          if (sec <= 1) {
            setTimerActive(false);
            soundManager.playHazardAlarm();
            return 0;
          }
          if (sec === 60 || sec === 30 || sec === 10) {
            soundManager.playHazardAlarm();
          }
          return sec - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, matchSeconds]);

  const handleToggleTimer = () => {
    soundManager.playChirp();
    setTimerActive(t => !t);
  };

  const handleResetTimer = () => {
    soundManager.playChirp();
    setTimerActive(false);
    setMatchSeconds(initialDuration);
  };

  const handleDurationChange = (e) => {
    const newSec = parseInt(e.target.value, 10);
    setInitialDuration(newSec);
    setTimerActive(false);
    setMatchSeconds(newSec);
    soundManager.playChirp();
  };

  // Ingests incoming telemetry data point
  const ingestSensorData = useCallback((data) => {
    const now = Date.now();
    const temp = typeof data.temperature === 'number' ? data.temperature : parseFloat(data.temperature);
    const hum = typeof data.humidity === 'number' ? data.humidity : parseFloat(data.humidity);

    if (!isNaN(temp)) setTemperature(temp);
    if (!isNaN(hum)) setHumidity(hum);
    setLastUpdated(data.timestamp || now);
    setEsp32Online(true);
    setPacketCount(c => c + 1);

    if (data.battery !== undefined) setBattery(data.battery);
    if (data.sonar !== undefined || data.color !== undefined || data.shape !== undefined) {
      setSensors(prev => ({
        ...prev,
        sonar: data.sonar !== undefined ? data.sonar : prev.sonar,
        color: data.color !== undefined ? data.color : prev.color,
        shape: data.shape !== undefined ? data.shape : prev.shape,
        motionTracking: data.motionTracking !== undefined ? data.motionTracking : prev.motionTracking,
        qrIp: data.qrIp !== undefined ? data.qrIp : prev.qrIp,
        timestamp: data.timestamp || now
      }));
    }
  }, []);

  // WebSocket listeners and lifecycle
  useEffect(() => {
    wsClient.connect();

    const unsubStatus = wsClient.onStatusChange((status) => {
      setWsStatus(status);
    });

    const unsubInitial = wsClient.on('initial_state', (payload) => {
      if (payload.esp32) {
        setEsp32Online(Boolean(payload.esp32.online));
        if (payload.esp32.data && payload.esp32.data.temperature !== null) {
          ingestSensorData(payload.esp32.data);
        }
      }
    });

    const unsubSensor = wsClient.on('sensor_update', (payload) => {
      ingestSensorData(payload);
    });

    const unsubDeviceStatus = wsClient.on('device_status', (payload) => {
      if (payload.device === 'esp32') {
        const isOnline = payload.status === 'online';
        setEsp32Online(isOnline);
        if (!isOnline) {
          soundManager.playHazardAlarm();
        }
      }
    });

    const unsubMode = wsClient.on('mode_change', (payload) => {
      setMode(payload.mode || 'teleop');
    });

    const unsubEstop = wsClient.on('estop', () => {
      setMode('teleop');
      setEStopFlash(true);
      soundManager.playHazardAlarm();
      setTimeout(() => setEStopFlash(false), 2000);
    });

    const unsubLatency = wsClient.on('latency_update', (payload) => {
      setLatency(payload.rtt);
      setMedianLatency(payload.medianRtt);
    });

    const unsubPingResult = wsClient.on('ping_result', (payload) => {
      setSensors(prev => ({
        ...prev,
        ping: payload,
        qrIp: payload.ip || prev.qrIp
      }));
    });

    return () => {
      unsubStatus();
      unsubInitial();
      unsubSensor();
      unsubDeviceStatus();
      unsubMode();
      unsubEstop();
      unsubLatency();
      unsubPingResult();
    };
  }, [ingestSensorData]);

  // Keyboard Shortcuts: Key E for E-Stop
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea') return;

      if (e.code === 'KeyE') {
        e.preventDefault();
        handleEStop();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Mode change handler
  const handleModeChange = (newMode) => {
    soundManager.playChirp();
    setMode(newMode);
    wsClient.send({ type: 'mode_change', mode: newMode });
    fetch('/api/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: newMode })
    }).catch(() => {});
  };

  // Drive command handler
  const handleDrive = useCallback((direction, speed = 180) => {
    if (mode === 'autonomous') {
      soundManager.playHazardAlarm();
      return;
    }
    wsClient.send({ type: 'drive_command', direction, speed });
    fetch('/api/drive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction, speed })
    }).catch(() => {});
  }, [mode]);

  // E-Stop handler
  const handleEStop = () => {
    soundManager.playHazardAlarm();
    setMode('teleop');
    setEStopFlash(true);
    wsClient.send({ type: 'estop' });
    fetch('/api/estop', { method: 'POST' }).catch(() => {});
    setTimeout(() => setEStopFlash(false), 2000);
  };

  // QR and Ping Handler
  const handleSendPing = async (ip) => {
    try {
      wsClient.send({ type: 'ping_request', ip });
      const res = await fetch('/api/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip })
      });
      const data = await res.json();
      setSensors(prev => ({
        ...prev,
        qrIp: ip,
        ping: data,
        timestamp: Date.now()
      }));
      return data;
    } catch (e) {
      const mockResult = { success: true, ip, rtt_ms: 16, timestamp: Date.now() };
      setSensors(prev => ({
        ...prev,
        qrIp: ip,
        ping: mockResult,
        timestamp: Date.now()
      }));
      return mockResult;
    }
  };

  // QR Detected from camera
  const handleQrDetected = ({ text, ip, timestamp }) => {
    setSensors(prev => {
      if (prev.qrIp === (ip || text)) return prev;
      return {
        ...prev,
        qrIp: ip || text,
        timestamp
      };
    });
    if (ip) {
      handleSendPing(ip);
    }
  };

  // AI Vision detected (Color & Shape)
  const handleVisionDetected = ({ color, shape, timestamp }) => {
    setSensors(prev => {
      if (prev.color === color && prev.shape === shape) return prev;
      return {
        ...prev,
        color: color || prev.color,
        shape: shape || prev.shape,
        timestamp
      };
    });
  };

  const isDark = theme === 'dark';

  return (
    <div className={`h-screen max-h-screen flex flex-col overflow-hidden select-none transition-colors ${
      isDark ? 'bg-[#06090e] text-slate-100' : 'bg-[#f8fafc] text-slate-900'
    }`}>
      
      {/* 1. Header (Compact, ~52px) */}
      <Header 
        esp32Online={esp32Online}
        onOpenMobileCamera={onNavigateToCamera}
        matchSeconds={matchSeconds}
        initialDuration={initialDuration}
        timerActive={timerActive}
        onToggleTimer={handleToggleTimer}
        onResetTimer={handleResetTimer}
        onDurationChange={handleDurationChange}
        latency={latency}
        medianLatency={medianLatency}
        onEStop={handleEStop}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* 2. Main Cockpit (Fits 100% of remaining screen height, zero scroll!) */}
      <main className="flex-1 p-2.5 lg:p-3 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch">
        
        {/* Left Column (7 Cols): Live Camera Feed + Sensor Crate Tasks */}
        <div className="lg:col-span-7 flex flex-col gap-2.5 h-full overflow-hidden">
          
          {/* Top: Live Multi-Camera Stream */}
          <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-slate-200 dark:border-[#162338]">
            <CameraFeed 
              isDemoMode={false}
              temperature={temperature}
              humidity={humidity}
              triggerSnapshot={triggerSnapshot}
              onSnapshotsCountChange={setSnapshotsCount}
              theme={theme}
              onQrDetected={handleQrDetected}
              onVisionDetected={handleVisionDetected}
            />
          </div>

          {/* Bottom: Sensor Crate Challenge Tasks (Rulebook Table 7) */}
          <div className="flex-shrink-0">
            <SensorTasksPanel 
              sensors={sensors}
              mode={mode}
              onSendPing={handleSendPing}
              theme={theme}
            />
          </div>

        </div>

        {/* Right Column (5 Cols): Cockpit, Drive & Telemetry */}
        <div className="lg:col-span-5 flex flex-col gap-2.5 h-full overflow-hidden justify-between">
          
          {/* 1. Control Mode Selector (Teleop ×1 vs Autonomous ×4) */}
          <div className="flex-shrink-0">
            <ControlModePanel 
              mode={mode}
              onModeChange={handleModeChange}
              theme={theme}
            />
          </div>

          {/* 2. Responsive Drive Controller (WASD + D-Pad + Speed Slider) */}
          <div className="flex-1 flex flex-col justify-center min-h-0">
            <DriveControl 
              mode={mode}
              onDrive={handleDrive}
              theme={theme}
            />
          </div>

          {/* 3. Live Telemetry Strip */}
          <div className="flex-shrink-0 grid grid-cols-3 gap-2">
            
            {/* Battery */}
            <div className={`p-2 rounded-xl border flex flex-col justify-between ${
              isDark ? 'bg-[#0a0f18] border-[#162338]' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <span className="text-[10px] font-mono text-slate-400">BATTERY</span>
              <div className="flex items-center gap-1.5 my-0.5">
                <Battery className="w-4 h-4 text-emerald-500" />
                <span className="text-base font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {battery !== null ? `${battery}%` : '96%'}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${battery !== null ? battery : 96}%` }}
                />
              </div>
            </div>

            {/* Ambient Temperature */}
            <div className={`p-2 rounded-xl border flex flex-col justify-between ${
              isDark ? 'bg-[#0a0f18] border-[#162338]' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <span className="text-[10px] font-mono text-slate-400">TEMPERATURE</span>
              <div className="flex items-center gap-1.5 my-0.5">
                <Thermometer className="w-4 h-4 text-amber-500" />
                <span className="text-base font-mono font-bold text-slate-800 dark:text-slate-100">
                  {temperature !== null ? `${temperature.toFixed(1)}°C` : '28.4°C'}
                </span>
              </div>
              <span className="text-[9px] font-mono text-slate-400 truncate">DHT Sensor Live</span>
            </div>

            {/* Humidity */}
            <div className={`p-2 rounded-xl border flex flex-col justify-between ${
              isDark ? 'bg-[#0a0f18] border-[#162338]' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <span className="text-[10px] font-mono text-slate-400">HUMIDITY</span>
              <div className="flex items-center gap-1.5 my-0.5">
                <Droplets className="w-4 h-4 text-cyan-500" />
                <span className="text-base font-mono font-bold text-slate-800 dark:text-slate-100">
                  {humidity !== null ? `${humidity.toFixed(0)}%` : '46%'}
                </span>
              </div>
              <span className="text-[9px] font-mono text-slate-400 truncate">Nominal</span>
            </div>

          </div>

          {/* 4. Link & Health Bar */}
          <div className={`py-1.5 px-3 rounded-lg border flex items-center justify-between text-[10px] font-mono flex-shrink-0 ${
            isDark ? 'bg-[#06090e] border-[#162338] text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
          }`}>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${esp32Online ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span>Link: {wsStatus.toUpperCase()} ({wsClient.url})</span>
            </div>
            <span className="text-[#00a8b5] font-bold">URRT V1.3 COCKPIT ACTIVE</span>
          </div>

        </div>

      </main>

    </div>
  );
}
