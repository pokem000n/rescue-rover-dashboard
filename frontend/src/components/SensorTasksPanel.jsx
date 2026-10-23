import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Wifi, Eye, Activity, Mic, CheckCircle, XCircle, Clock, Target } from 'lucide-react';

function TaskCard({ title, icon: Icon, children, theme, status }) {
  const isDark = theme !== 'light';
  const statusColor = status === 'success' ? 'border-emerald-500/40 bg-emerald-500/5' : status === 'failed' ? 'border-rose-500/40 bg-rose-500/5' : isDark ? 'border-[#162338] bg-[#0a0f18]' : 'border-slate-200 bg-white';
  return (
    <div className={`rounded-2xl border p-4 space-y-3 transition-all ${statusColor}`}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-[#00c2cb]" />
        <h4 className={`text-xs font-mono font-bold tracking-widest ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{title}</h4>
        {status === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400 ml-auto" />}
        {status === 'failed' && <XCircle className="w-4 h-4 text-rose-400 ml-auto" />}
      </div>
      {children}
    </div>
  );
}

export default function SensorTasksPanel({ sensors, mode, onSendPing, theme }) {
  const isDark = theme !== 'light';

  // QR & Ping state
  const [qrIp, setQrIp] = useState(sensors?.qrIp || '');
  const [pingStatus, setPingStatus] = useState('idle'); // idle | pinging | success | failed
  const [pingMs, setPingMs] = useState(null);

  // Sonar state
  const sonar = sensors?.sonar ?? null;
  const sonarInRange = sonar !== null && sonar >= 80 && sonar <= 120;

  // Color & Shape
  const detectedColor = sensors?.color ?? null;
  const detectedShape = sensors?.shape ?? null;
  const [manualColor, setManualColor] = useState('');
  const [manualShape, setManualShape] = useState('');

  // Motion tracking
  const [tracking, setTracking] = useState(false);
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
    if (onSendPing) {
      const result = await onSendPing(qrIp);
      if (result?.success) {
        setPingStatus('success');
        setPingMs(result.ms || null);
      } else {
        setPingStatus('failed');
      }
    } else {
      // Demo: simulate ping
      setTimeout(() => {
        setPingStatus('success');
        setPingMs(Math.floor(Math.random() * 30) + 5);
      }, 1200);
    }
  };

  const startMotionTracking = () => {
    if (trackStatus === 'tracking') return;
    setTrackStatus('tracking');
    setTrackCountdown(5);
    let count = 5;
    trackInterval.current = setInterval(() => {
      count--;
      setTrackCountdown(count);
      if (count <= 0) {
        clearInterval(trackInterval.current);
        setTrackStatus(sensors?.motionTracking ? 'success' : 'success'); // demo: always success
      }
    }, 1000);
  };

  useEffect(() => () => { if (trackInterval.current) clearInterval(trackInterval.current); }, []);

  const colorSwatches = { red: '#ef4444', blue: '#3b82f6', green: '#22c55e', yellow: '#eab308', orange: '#f97316', white: '#f8fafc', black: '#1e293b' };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-[#00c2cb]" />
        <h3 className={`text-xs font-mono font-bold tracking-widest ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          SENSOR CRATE TASKS
        </h3>
        <span className={`ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full border ${isDark ? 'border-[#162338] text-slate-500' : 'border-slate-200 text-slate-400'}`}>
          Rulebook V1.3
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* QR Decode & Ping */}
        <TaskCard title="QR DECODE & PING" icon={QrCode} theme={theme} status={pingStatus === 'success' ? 'success' : pingStatus === 'failed' ? 'failed' : null}>
          <p className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Decode QR → get IPv4 → ping from rover's onboard computer
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={qrIp}
              onChange={e => setQrIp(e.target.value)}
              placeholder="e.g. 192.168.1.100"
              className={`flex-1 px-3 py-2 rounded-xl border font-mono text-xs outline-none focus:border-[#00c2cb]/60 transition-all ${isDark ? 'bg-[#06090e] border-[#162338] text-slate-200 placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'}`}
            />
            <button
              onClick={handlePing}
              disabled={!qrIp || pingStatus === 'pinging'}
              className="px-4 py-2 rounded-xl bg-[#00c2cb]/20 hover:bg-[#00c2cb]/30 border border-[#00c2cb]/40 text-[#00c2cb] font-mono font-bold text-xs cursor-pointer disabled:opacity-40 transition-all"
            >
              {pingStatus === 'pinging' ? '...' : 'PING'}
            </button>
          </div>
          {pingStatus === 'success' && (
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Ping success{pingMs ? ` — ${pingMs}ms` : ''}</span>
            </div>
          )}
          {pingStatus === 'failed' && (
            <div className="flex items-center gap-2 text-xs font-mono text-rose-400">
              <XCircle className="w-3.5 h-3.5" />
              <span>Ping failed — check IP address</span>
            </div>
          )}
        </TaskCard>

        {/* Sonar Proximity */}
        <TaskCard title="SONAR PROXIMITY" icon={Target} theme={theme} status={sonarInRange ? 'success' : sonar !== null && !sonarInRange ? 'failed' : null}>
          <p className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Stop rover 100 ± 20mm from wall
          </p>
          <div className={`p-3 rounded-xl border text-center ${isDark ? 'bg-[#06090e] border-[#162338]' : 'bg-slate-50 border-slate-200'}`}>
            <div className={`text-3xl font-mono font-bold ${sonarInRange ? 'text-emerald-400' : sonar !== null ? 'text-rose-400' : 'text-slate-500'}`}>
              {sonar !== null ? `${sonar}mm` : '--'}
            </div>
            <div className={`text-[10px] font-mono mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Target: 80–120mm
            </div>
          </div>
          {sonar !== null && (
            <div className={`h-2 rounded-full ${isDark ? 'bg-[#0f1624]' : 'bg-slate-200'} overflow-hidden`}>
              <div
                className={`h-full rounded-full transition-all ${sonarInRange ? 'bg-emerald-400' : 'bg-rose-500'}`}
                style={{ width: `${Math.min(100, Math.max(0, (sonar / 300) * 100))}%` }}
              />
            </div>
          )}
        </TaskCard>

        {/* Colour & Shape Detection */}
        <TaskCard title="COLOUR & SHAPE DETECTION" icon={Eye} theme={theme} status={(detectedColor || manualColor) && (detectedShape || manualShape) ? 'success' : null}>
          <p className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Identify displayed card's color and shape
          </p>
          <div className="flex items-center gap-3">
            {detectedColor && (
              <div
                className="w-10 h-10 rounded-xl border-2 border-white/20 flex-shrink-0"
                style={{ backgroundColor: colorSwatches[detectedColor.toLowerCase()] || '#888' }}
                title={detectedColor}
              />
            )}
            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={detectedColor || manualColor}
                onChange={e => setManualColor(e.target.value)}
                placeholder="Color (e.g. Red)"
                readOnly={!!detectedColor}
                className={`w-full px-3 py-1.5 rounded-xl border font-mono text-xs outline-none ${isDark ? 'bg-[#06090e] border-[#162338] text-slate-200 placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
              />
              <input
                type="text"
                value={detectedShape || manualShape}
                onChange={e => setManualShape(e.target.value)}
                placeholder="Shape (e.g. Circle)"
                readOnly={!!detectedShape}
                className={`w-full px-3 py-1.5 rounded-xl border font-mono text-xs outline-none ${isDark ? 'bg-[#06090e] border-[#162338] text-slate-200 placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
              />
            </div>
          </div>
        </TaskCard>

        {/* Motion Tracking */}
        <TaskCard title="MOTION TRACKING" icon={Activity} theme={theme} status={trackStatus === 'success' ? 'success' : trackStatus === 'failed' ? 'failed' : null}>
          <p className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Track a slow-moving target for 5 seconds
          </p>
          <div className={`p-3 rounded-xl border text-center space-y-2 ${isDark ? 'bg-[#06090e] border-[#162338]' : 'bg-slate-50 border-slate-200'}`}>
            <div className={`text-4xl font-mono font-bold ${trackStatus === 'tracking' ? 'text-amber-400' : trackStatus === 'success' ? 'text-emerald-400' : isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {trackStatus === 'tracking' ? trackCountdown : trackStatus === 'success' ? '✓' : '5'}
            </div>
            <div className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {trackStatus === 'tracking' ? 'Tracking...' : trackStatus === 'success' ? 'Tracking complete!' : 'Press START to begin'}
            </div>
          </div>
          <button
            onClick={startMotionTracking}
            disabled={trackStatus === 'tracking'}
            className="w-full py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 font-mono font-bold text-xs cursor-pointer disabled:opacity-40 transition-all"
          >
            {trackStatus === 'tracking' ? 'TRACKING...' : trackStatus === 'success' ? 'TRACK AGAIN' : 'START TRACKING'}
          </button>
        </TaskCard>

        {/* Two-Way Audio (Teleop only) */}
        <TaskCard
          title={`TWO-WAY AUDIO ${mode === 'autonomous' ? '(TELEOP ONLY)' : ''}`}
          icon={Mic}
          theme={theme}
          status={audioStatus === 'success' ? 'success' : null}
        >
          <p className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Exchange code word with referee via speaker/mic • ×1 only
          </p>
          {mode === 'autonomous' ? (
            <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-mono text-center">
              Not available in Autonomous mode
            </div>
          ) : (
            <>
              <input
                type="text"
                value={codeWord}
                onChange={e => setCodeWord(e.target.value)}
                placeholder="Enter code word received from referee..."
                className={`w-full px-3 py-2 rounded-xl border font-mono text-xs outline-none focus:border-[#00c2cb]/60 ${isDark ? 'bg-[#06090e] border-[#162338] text-slate-200 placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
              />
              <button
                onClick={() => { if (codeWord) setAudioStatus('success'); }}
                disabled={!codeWord}
                className="w-full py-2 rounded-xl bg-[#00c2cb]/20 hover:bg-[#00c2cb]/30 border border-[#00c2cb]/40 text-[#00c2cb] font-mono font-bold text-xs cursor-pointer disabled:opacity-40 transition-all"
              >
                CONFIRM CODE WORD
              </button>
            </>
          )}
        </TaskCard>

      </div>
    </div>
  );
}
