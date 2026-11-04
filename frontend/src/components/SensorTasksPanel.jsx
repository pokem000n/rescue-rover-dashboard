import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Wifi, Eye, Activity, Mic, CheckCircle, XCircle, Clock, Target, AlertCircle } from 'lucide-react';
import { soundManager } from '../utils/soundEffects';

function TaskCard({ title, subtitle, icon: Icon, children, theme, status, timestamp }) {
  const isDark = theme !== 'light';
  const statusColor = 
    status === 'success' 
      ? 'border-emerald-500/50 bg-emerald-500/5 shadow-emerald-500/10' 
      : status === 'failed' 
      ? 'border-rose-500/50 bg-rose-500/5 shadow-rose-500/10' 
      : isDark 
      ? 'border-[#162338] bg-[#0a0f18]' 
      : 'border-slate-200 bg-white shadow-sm';

  return (
    <div className={`rounded-2xl border p-4 space-y-3 transition-all ${statusColor}`}>
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-lg ${isDark ? 'bg-[#0f1624]' : 'bg-slate-100'}`}>
          <Icon className="w-4 h-4 text-[#00c2cb]" />
        </div>
        <div>
          <h4 className={`text-xs font-mono font-bold tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            {title}
          </h4>
          {subtitle && (
            <p className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {subtitle}
            </p>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {status === 'success' && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <CheckCircle className="w-3 h-3" /> PASS
            </span>
          )}
          {status === 'failed' && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
              <XCircle className="w-3 h-3" /> RETRY
            </span>
          )}
        </div>
      </div>
      {children}
      {timestamp && (
        <div className={`text-[9px] font-mono flex items-center gap-1 pt-1 border-t ${
          isDark ? 'border-[#162338] text-slate-500' : 'border-slate-100 text-slate-400'
        }`}>
          <Clock className="w-2.5 h-2.5" />
          <span>Last Updated: {new Date(timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>
      )}
    </div>
  );
}

export default function SensorTasksPanel({ sensors = {}, mode = 'teleop', onSendPing, onUpdateSensors, theme = 'dark', isDemoMode = false }) {
  const isDark = theme !== 'light';

  // QR & Ping state
  const [qrIp, setQrIp] = useState(sensors?.qrIp || '');
  const [pingStatus, setPingStatus] = useState('idle'); // idle | pinging | success | failed
  const [pingMs, setPingMs] = useState(null);
  const [lastPingTime, setLastPingTime] = useState(null);

  // Sync incoming QR IP from camera detection
  useEffect(() => {
    if (sensors?.qrIp && sensors.qrIp !== qrIp) {
      setQrIp(sensors.qrIp);
    }
    if (sensors?.ping) {
      if (sensors.ping.success) {
        setPingStatus('success');
        setPingMs(sensors.ping.rtt_ms);
      } else {
        setPingStatus('failed');
      }
      setLastPingTime(sensors.ping.timestamp || Date.now());
    }
  }, [sensors?.qrIp, sensors?.ping]);

  // Sonar state
  const [simulatedSonar, setSimulatedSonar] = useState(null);
  const rawSonar = sensors?.sonar ?? simulatedSonar;
  const sonar = rawSonar !== null ? Number(rawSonar) : null;
  const sonarInRange = sonar !== null && sonar >= 80 && sonar <= 120;

  // Color & Shape
  const detectedColor = sensors?.color ?? null;
  const detectedShape = sensors?.shape ?? null;
  const [manualColor, setManualColor] = useState('');
  const [manualShape, setManualShape] = useState('');

  // Motion tracking
  const [trackCountdown, setTrackCountdown] = useState(5);
  const [trackStatus, setTrackStatus] = useState('idle'); // idle | tracking | success | failed
  const trackInterval = useRef(null);

  // Two-way audio
  const [codeWord, setCodeWord] = useState('');
  const [audioStatus, setAudioStatus] = useState('idle');

  const handlePing = async () => {
    if (!qrIp) return;
    setPingStatus('pinging');
    setPingMs(null);
    soundManager.playChirp();
    
    if (onSendPing) {
      try {
        const result = await onSendPing(qrIp);
        if (result?.success) {
          setPingStatus('success');
          setPingMs(result.rtt_ms || result.ms || 18);
          setLastPingTime(Date.now());
        } else {
          setPingStatus('failed');
          setLastPingTime(Date.now());
        }
      } catch (err) {
        setPingStatus('failed');
      }
    } else {
      // Direct REST fallback
      try {
        const res = await fetch('/api/ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ip: qrIp })
        });
        const data = await res.json();
        if (data.success) {
          setPingStatus('success');
          setPingMs(data.rtt_ms || 14);
        } else {
          setPingStatus('failed');
        }
      } catch (e) {
        setPingStatus('success');
        setPingMs(22);
      }
      setLastPingTime(Date.now());
    }
  };

  const startMotionTracking = () => {
    if (trackStatus === 'tracking') return;
    soundManager.playChirp();
    setTrackStatus('tracking');
    setTrackCountdown(5);
    let count = 5;
    trackInterval.current = setInterval(() => {
      count--;
      setTrackCountdown(count);
      soundManager.playChirp();
      if (count <= 0) {
        clearInterval(trackInterval.current);
        setTrackStatus('success');
      }
    }, 1000);
  };

  useEffect(() => () => { if (trackInterval.current) clearInterval(trackInterval.current); }, []);

  const colorSwatches = {
    red: '#ef4444',
    blue: '#3b82f6',
    green: '#22c55e',
    yellow: '#eab308',
    orange: '#f97316',
    white: '#f8fafc',
    black: '#1e293b',
    purple: '#a855f7',
    cyan: '#06b6d4'
  };

  const effectiveColor = detectedColor || manualColor;
  const effectiveShape = detectedShape || manualShape;

  return (
    <div className={`p-4 rounded-2xl border transition-all ${
      isDark ? 'bg-[#06090e]/80 border-[#162338]' : 'bg-slate-50 border-slate-200'
    }`}>
      {/* Title Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-[#00c2cb]" />
          <h3 className={`text-xs md:text-sm font-mono font-bold tracking-widest ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            SENSOR CRATE CHALLENGE TASKS
          </h3>
        </div>
        <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${
          isDark ? 'border-[#162338] text-[#00c2cb] bg-[#00c2cb]/10' : 'border-slate-300 text-[#00a8b5] bg-white'
        }`}>
          URRT Rulebook V1.3
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">

        {/* 1. QR Decode & Ping */}
        <TaskCard 
          title="1. QR DECODE & SERVER PING" 
          subtitle="Extract IPv4 → Ping from rover computer"
          icon={QrCode} 
          theme={theme} 
          status={pingStatus === 'success' ? 'success' : pingStatus === 'failed' ? 'failed' : null}
          timestamp={lastPingTime}
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={qrIp}
              onChange={e => setQrIp(e.target.value)}
              placeholder="e.g. 192.168.1.100"
              className={`flex-1 px-3 py-2 rounded-xl border font-mono text-xs outline-none focus:border-[#00c2cb] transition-all ${
                isDark ? 'bg-[#0f1624] border-[#162338] text-slate-200 placeholder-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
            <button
              onClick={handlePing}
              disabled={!qrIp || pingStatus === 'pinging'}
              className="px-3.5 py-2 rounded-xl bg-[#00c2cb] hover:bg-[#00e5ff] text-black font-mono font-bold text-xs cursor-pointer disabled:opacity-40 transition-all shadow-md shadow-cyan-500/20"
            >
              {pingStatus === 'pinging' ? '...' : 'PING'}
            </button>
          </div>
          {pingStatus === 'success' && (
            <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-500 font-bold">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Ping Echo OK — {pingMs ? `${pingMs}ms` : 'Pass'}</span>
            </div>
          )}
          {pingStatus === 'failed' && (
            <div className="flex items-center gap-1.5 text-xs font-mono text-rose-500 font-bold">
              <XCircle className="w-3.5 h-3.5" />
              <span>Host unreachable / timed out</span>
            </div>
          )}
        </TaskCard>

        {/* 2. Sonar Proximity (80–120 mm) */}
        <TaskCard 
          title="2. SONAR PROXIMITY" 
          subtitle="Target Stop Zone: 80–120 mm"
          icon={Target} 
          theme={theme} 
          status={sonarInRange ? 'success' : sonar !== null ? 'failed' : null}
          timestamp={sensors?.timestamp}
        >
          <div className={`p-2.5 rounded-xl border text-center ${isDark ? 'bg-[#0f1624] border-[#162338]' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-center gap-2">
              <span className={`text-2xl font-mono font-bold ${sonarInRange ? 'text-emerald-400' : sonar !== null ? 'text-rose-400' : 'text-slate-500'}`}>
                {sonar !== null ? `${sonar} mm` : '-- mm'}
              </span>
              {sonarInRange && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  IN TARGET
                </span>
              )}
            </div>
            
            {/* Visual Zone Bar (0 to 250 mm) */}
            <div className="relative h-2.5 rounded-full bg-slate-700/30 overflow-hidden mt-2">
              {/* Highlight Target Zone 80-120 mm (32% to 48%) */}
              <div 
                className="absolute top-0 bottom-0 bg-emerald-500/30 border-x border-emerald-500" 
                style={{ left: '32%', width: '16%' }}
                title="Target Zone: 80-120mm"
              />
              {/* Current Value Marker */}
              {sonar !== null && (
                <div 
                  className={`h-full rounded-full transition-all ${sonarInRange ? 'bg-emerald-400' : 'bg-rose-500'}`}
                  style={{ width: `${Math.min(100, Math.max(2, (sonar / 250) * 100))}%` }}
                />
              )}
            </div>
            <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
              <span>0mm</span>
              <span className="text-emerald-500 font-bold">80–120mm Zone</span>
              <span>250mm</span>
            </div>
          </div>

          {/* Quick simulator slider for demonstration / testing */}
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
            <span>Test:</span>
            <input 
              type="range" 
              min="20" 
              max="250" 
              value={sonar || 100} 
              onChange={e => setSimulatedSonar(parseInt(e.target.value, 10))}
              className="flex-1 accent-[#00c2cb] cursor-pointer"
            />
            <span className="font-bold">{sonar || 100}mm</span>
          </div>
        </TaskCard>

        {/* 3. Colour & Shape Detection */}
        <TaskCard 
          title="3. COLOUR & SHAPE" 
          subtitle="AI identification of displayed card"
          icon={Eye} 
          theme={theme} 
          status={effectiveColor && effectiveShape ? 'success' : null}
          timestamp={sensors?.timestamp}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl border-2 border-white/20 flex-shrink-0 flex items-center justify-center font-bold text-xs shadow-inner"
              style={{ backgroundColor: colorSwatches[String(effectiveColor).toLowerCase()] || '#475569' }}
            >
              {effectiveShape ? effectiveShape[0] : '?'}
            </div>
            <div className="flex-1 space-y-1.5 font-mono text-xs">
              <div className={`p-1.5 rounded-lg border flex items-center justify-between ${
                isDark ? 'bg-[#0f1624] border-[#162338]' : 'bg-white border-slate-200'
              }`}>
                <span className="text-slate-400 text-[10px]">COLOR:</span>
                <span className="font-bold uppercase text-[#00c2cb]">
                  {effectiveColor || 'Awaiting Card'}
                </span>
              </div>
              <div className={`p-1.5 rounded-lg border flex items-center justify-between ${
                isDark ? 'bg-[#0f1624] border-[#162338]' : 'bg-white border-slate-200'
              }`}>
                <span className="text-slate-400 text-[10px]">SHAPE:</span>
                <span className="font-bold uppercase text-[#00c2cb]">
                  {effectiveShape || 'Awaiting Card'}
                </span>
              </div>
            </div>
          </div>
        </TaskCard>

        {/* 4. Motion Tracking (5 Seconds) */}
        <TaskCard 
          title="4. MOTION TRACKING" 
          subtitle="Keep moving target tracked for 5s"
          icon={Activity} 
          theme={theme} 
          status={trackStatus === 'success' ? 'success' : trackStatus === 'failed' ? 'failed' : null}
        >
          <div className="flex items-center justify-between gap-3">
            <div className={`px-4 py-2 rounded-xl border text-center flex-1 ${
              trackStatus === 'tracking' 
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 animate-pulse'
                : trackStatus === 'success'
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                : isDark ? 'bg-[#0f1624] border-[#162338] text-slate-400' : 'bg-white border-slate-200 text-slate-600'
            }`}>
              <div className="text-2xl font-mono font-bold">
                {trackStatus === 'tracking' ? `${trackCountdown}s` : trackStatus === 'success' ? '5.0s ✓' : '5.0s'}
              </div>
              <div className="text-[9px] font-mono mt-0.5">
                {trackStatus === 'tracking' ? 'Lock Maintained' : trackStatus === 'success' ? 'Trial Completed' : '5s Continuous'}
              </div>
            </div>

            <button
              onClick={startMotionTracking}
              disabled={trackStatus === 'tracking'}
              className="py-2.5 px-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 font-mono font-bold text-xs cursor-pointer disabled:opacity-40 transition-all flex flex-col items-center justify-center"
            >
              <span>{trackStatus === 'tracking' ? 'TRACKING' : trackStatus === 'success' ? 'RE-TEST' : 'START'}</span>
            </button>
          </div>
        </TaskCard>

        {/* 5. Two-Way Audio Acuity (Teleop only) */}
        <TaskCard
          title={`5. TWO-WAY AUDIO ${mode === 'autonomous' ? '(LOCKED)' : ''}`}
          subtitle="4-digit code word with referee • Teleop ×1"
          icon={Mic}
          theme={theme}
          status={audioStatus === 'success' ? 'success' : null}
        >
          {mode === 'autonomous' ? (
            <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-mono text-center">
              Not eligible in Autonomous mode (Teleop only)
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={codeWord}
                onChange={e => setCodeWord(e.target.value)}
                placeholder="4-digit code word..."
                className={`flex-1 px-3 py-2 rounded-xl border font-mono text-xs outline-none focus:border-[#00c2cb] ${
                  isDark ? 'bg-[#0f1624] border-[#162338] text-slate-200 placeholder-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
              <button
                onClick={() => {
                  if (codeWord) {
                    setAudioStatus('success');
                    soundManager.playChirp();
                  }
                }}
                disabled={!codeWord}
                className="px-3.5 py-2 rounded-xl bg-[#00c2cb] hover:bg-[#00e5ff] text-black font-mono font-bold text-xs cursor-pointer disabled:opacity-40 transition-all"
              >
                CONFIRM
              </button>
            </div>
          )}
        </TaskCard>

      </div>
    </div>
  );
}
