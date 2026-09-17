import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from '../components/Header';
import MetricCard from '../components/MetricCard';
import CameraFeed from '../components/CameraFeed';
import TelemetryChart from '../components/TelemetryChart';
import ThreatMatrix from '../components/ThreatMatrix';
import MissionLog from '../components/MissionLog';
import SystemInfo from '../components/SystemInfo';
import PacketLog from '../components/PacketLog';

// Modals
import ThresholdSettingsModal from '../components/ThresholdSettingsModal';
import HotkeysModal from '../components/HotkeysModal';
import MissionDebriefModal from '../components/MissionDebriefModal';

import { wsClient } from '../services/websocket';
import { mockSimulator } from '../services/mockData';
import { soundManager } from '../utils/soundEffects';
import { loadThresholds, saveThresholds } from '../utils/thresholdSettings';

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

  // Configurable Alert Thresholds
  const [thresholds, setThresholds] = useState(() => loadThresholds());

  // Mission Incidents Logbook State
  const [incidents, setIncidents] = useState(() => {
    try {
      const saved = sessionStorage.getItem('urrt_mission_incidents');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Snapshots count & trigger
  const [snapshotsCount, setSnapshotsCount] = useState(0);
  const [triggerSnapshot, setTriggerSnapshot] = useState(0);

  // Modals visibility state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHotkeysModal, setShowHotkeysModal] = useState(false);
  const [showDebriefModal, setShowDebriefModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Match Countdown Timer State
  const [initialDuration, setInitialDuration] = useState(480); // 8:00 default
  const [matchSeconds, setMatchSeconds] = useState(480);
  const [timerActive, setTimerActive] = useState(false);

  // High-Visibility Light / Tactical Dark Mode
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('urrt_theme') || 'dark';
    } catch (e) {
      return 'dark';
    }
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (theme === 'light') {
        document.body.classList.add('light-theme');
      } else {
        document.body.classList.remove('light-theme');
      }
      try {
        localStorage.setItem('urrt_theme', theme);
      } catch (e) {}
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
  };

  // Demo Simulation Mode state
  const [isDemoMode, setIsDemoMode] = useState(() => {
    return import.meta.env.VITE_DEMO_MODE === 'true';
  });
  const [isSimulatedOnline, setIsSimulatedOnline] = useState(true);

  const lastAlarmTimeRef = useRef(0);

  // Timer countdown loop
  useEffect(() => {
    let interval = null;
    if (timerActive && matchSeconds > 0) {
      interval = setInterval(() => {
        setMatchSeconds(sec => {
          if (sec <= 1) {
            setTimerActive(false);
            soundManager.playHazardAlarm();
            // Automatically open post-match debrief report when match time expires!
            setTimeout(() => setShowDebriefModal(true), 1200);
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

  // Save incidents to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('urrt_mission_incidents', JSON.stringify(incidents));
    } catch (e) {}
  }, [incidents]);

  const handleAddIncident = (incidentData) => {
    const newRecord = {
      id: Date.now(),
      time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      ...incidentData
    };
    setIncidents(prev => [newRecord, ...prev]);
  };

  const handleDeleteIncident = (id) => {
    soundManager.playChirp();
    setIncidents(prev => prev.filter(i => i.id !== id));
  };

  const handleClearIncidents = () => {
    soundManager.playChirp();
    setIncidents([]);
    try { sessionStorage.removeItem('urrt_mission_incidents'); } catch (e) {}
  };

  const handleSaveThresholds = (newThresh) => {
    setThresholds(newThresh);
    saveThresholds(newThresh);
  };

  // Fullscreen HUD toggle
  const toggleFullscreen = () => {
    soundManager.playChirp();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => console.warn('Fullscreen error:', err));
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => console.warn(err));
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Ingests incoming telemetry data point (from real ESP32 or Demo simulator)
  const ingestSensorData = useCallback((data) => {
    const now = Date.now();
    const temp = typeof data.temperature === 'number' ? data.temperature : parseFloat(data.temperature);
    const hum = typeof data.humidity === 'number' ? data.humidity : parseFloat(data.humidity);

    if (isNaN(temp) || isNaN(hum)) return;

    // Trigger hazard siren if custom thresholds breached (throttled to once per 10s)
    const dangerT = thresholds.tempDanger || 40;
    const dangerH = thresholds.humidityDanger || 80;
    if ((temp >= dangerT || hum >= dangerH) && (now - lastAlarmTimeRef.current > 10000)) {
      lastAlarmTimeRef.current = now;
      soundManager.playHazardAlarm();
    }

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
  }, [thresholds]);

  // Set up WebSocket listeners and lifecycle
  useEffect(() => {
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

    wsClient.connect();

    const unsubStatus = wsClient.onStatusChange((status) => {
      setWsStatus(status);
    });

    const unsubInitial = wsClient.on('initial_state', (payload) => {
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
      if (payload.device === 'esp32') {
        const isOnline = payload.status === 'online';
        setEsp32Online(isOnline);
        if (payload.ip) setEsp32Ip(payload.ip);
        if (!isOnline) {
          soundManager.playHazardAlarm();
        }
      }
    });

    return () => {
      unsubStatus();
      unsubInitial();
      unsubSensor();
      unsubDeviceStatus();
    };
  }, [isDemoMode, ingestSensorData]);

  // Tactical Operator Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger hotkeys if user is typing in an input or textarea
      const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea') {
        if (e.key === 'Escape') {
          setShowSettingsModal(false);
          setShowHotkeysModal(false);
          setShowDebriefModal(false);
        }
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleToggleTimer();
      } else if (e.code === 'KeyS') {
        e.preventDefault();
        setTriggerSnapshot(c => c + 1);
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        const next = !soundManager.isMuted();
        soundManager.setMuted(next);
        if (!next) soundManager.playChirp();
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.code === 'KeyD') {
        e.preventDefault();
        handleToggleDemoMode();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        soundManager.playChirp();
        setShowDebriefModal(prev => !prev);
      } else if (e.key === '?' || e.code === 'KeyH') {
        e.preventDefault();
        soundManager.playChirp();
        setShowHotkeysModal(prev => !prev);
      } else if (e.key === 'Escape') {
        setShowSettingsModal(false);
        setShowHotkeysModal(false);
        setShowDebriefModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleDemoMode = () => {
    soundManager.playChirp();
    setIsDemoMode(prev => !prev);
  };

  const handleToggleSimulatedRover = () => {
    if (isDemoMode) {
      soundManager.playChirp();
      const next = mockSimulator.toggleSimulatedRoverOnline();
      setIsSimulatedOnline(next);
      setEsp32Online(next);
      if (!next) {
        soundManager.playHazardAlarm();
      }
    }
  };

  return (
    <div className={`min-h-screen flex flex-col selection:bg-[#00c2cb] selection:text-black transition-colors ${
      theme === 'light' ? 'bg-[#f1f5f9] text-slate-900' : 'bg-[#06090e] text-slate-100'
    }`}>
      
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
        // Match Timer
        matchSeconds={matchSeconds}
        initialDuration={initialDuration}
        timerActive={timerActive}
        onToggleTimer={handleToggleTimer}
        onResetTimer={handleResetTimer}
        onDurationChange={handleDurationChange}
        // Action Modals & Fullscreen
        onOpenSettings={() => { soundManager.playChirp(); setShowSettingsModal(true); }}
        onOpenHotkeys={() => { soundManager.playChirp(); setShowHotkeysModal(true); }}
        onOpenDebrief={() => { soundManager.playChirp(); setShowDebriefModal(true); }}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Mission Control Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-6">
        
        {/* Top Section: Metrics + Live Camera */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Left Column: Environmental Gauges & Waveforms (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-6">
            
            {/* Real-time Metric Cards with Custom Thresholds */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <MetricCard 
                type="temperature"
                value={temperature}
                unit="°C"
                previousValue={prevTemperature}
                history={history}
                isStale={!esp32Online && temperature !== null}
                thresholds={thresholds}
              />

              <MetricCard 
                type="humidity"
                value={humidity}
                unit="%"
                previousValue={prevHumidity}
                history={history}
                isStale={!esp32Online && humidity !== null}
                thresholds={thresholds}
              />
            </div>

            {/* Rolling Telemetry History Waveform */}
            <div className="flex-1 min-h-[320px]">
              <TelemetryChart data={history} />
            </div>

          </div>

          {/* Right Column: Multi-Camera Wireless Feed (5 Cols) */}
          <div className="lg:col-span-5 h-full">
            <CameraFeed 
              isDemoMode={isDemoMode}
              temperature={temperature}
              humidity={humidity}
              triggerSnapshot={triggerSnapshot}
              onSnapshotsCountChange={setSnapshotsCount}
              theme={theme}
            />
          </div>

        </div>

        {/* Environmental Threat Assessment & Heat Matrix */}
        <ThreatMatrix 
          temperature={temperature}
          humidity={humidity}
        />

        {/* Operator Mission Incident & Milestones Logbook */}
        <MissionLog 
          incidents={incidents}
          onAddIncident={handleAddIncident}
          onDeleteIncident={handleDeleteIncident}
          onClearIncidents={handleClearIncidents}
          matchSeconds={matchSeconds}
          currentTemp={temperature}
          currentHum={humidity}
        />

        {/* System Diagnostics & Link Health */}
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

        {/* Live JSON Bus Packet Log */}
        <PacketLog 
          logs={logs}
          onClear={() => setLogs([])}
        />

      </main>

      {/* Footer */}
      <footer className={`border-t py-4 px-6 text-center font-mono text-xs flex items-center justify-center gap-2.5 print:hidden transition-colors ${
        theme === 'light' ? 'bg-white border-slate-200 text-slate-600' : 'bg-[#0a0f18]/90 border-[#162338] text-slate-400'
      }`}>
        <img src="/urrt-logo.png" alt="URRT Logo" className="w-5 h-5 rounded-full border border-[#00c2cb]/40" />
        <span>UIU RESCUE ROVER TEAM (#URRT) • ROBOCUP RESCUE MISSION CONTROL SYSTEM</span>
      </footer>

      {/* Tactical Modals */}
      <ThresholdSettingsModal 
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        currentThresholds={thresholds}
        onSave={handleSaveThresholds}
      />

      <HotkeysModal 
        isOpen={showHotkeysModal}
        onClose={() => setShowHotkeysModal(false)}
      />

      <MissionDebriefModal 
        isOpen={showDebriefModal}
        onClose={() => setShowDebriefModal(false)}
        initialDuration={initialDuration}
        matchSeconds={matchSeconds}
        history={history}
        packetCount={packetCount}
        incidents={incidents}
        snapshotsCount={snapshotsCount}
        esp32Online={esp32Online}
      />

    </div>
  );
}
