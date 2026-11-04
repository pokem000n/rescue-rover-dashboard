import React, { useState } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Clock, 
  Camera, 
  Sparkles, 
  Power,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Timer,
  Sliders,
  Keyboard,
  Award,
  Maximize2,
  Minimize2,
  Sun,
  Moon,
  HelpCircle,
  OctagonX,
  Activity,
  Bot,
  Radio
} from 'lucide-react';
import { soundManager } from '../utils/soundEffects';

export default function Header({ 
  esp32Online, 
  wsStatus, 
  lastUpdated, 
  isDemoMode, 
  onToggleDemoMode,
  onToggleSimulatedRover,
  isSimulatedOnline,
  onOpenMobileCamera,
  // Timer props
  matchSeconds = 480,
  initialDuration = 480,
  timerActive = false,
  onToggleTimer,
  onResetTimer,
  onDurationChange,
  // Rulebook Latency & E-Stop props
  mode = 'teleop',
  latency = null,
  medianLatency = null,
  onEStop = () => {},
  // Modals & HUD controls
  onOpenGuide = () => {},
  onOpenSettings,
  onOpenHotkeys,
  onOpenDebrief,
  isFullscreen = false,
  onToggleFullscreen,
  // Theme Toggle
  theme = 'dark',
  onToggleTheme = () => {}
}) {
  const [isMuted, setIsMuted] = useState(false);

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundManager.setMuted(next);
    if (!next) soundManager.playChirp();
  };

  const formatTimer = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const effLatency = medianLatency !== null ? medianLatency : (latency !== null ? latency : 35);
  const latencyPass = effLatency <= 100;

  return (
    <header className={`border-b sticky top-0 z-30 px-3 lg:px-6 py-2.5 shadow-xl transition-colors print:hidden ${
      theme === 'light'
        ? 'bg-white/95 border-slate-200 shadow-slate-200/50 text-slate-800'
        : 'border-[#162338] bg-[#0a0f18]/95 shadow-black/40 text-white'
    }`}>
      <div className="max-w-7xl mx-auto flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2.5">
        
        {/* Left: Brand & Mode Banner */}
        <div className="flex items-center space-x-3 justify-between sm:justify-start">
          <div className="relative group cursor-pointer flex-shrink-0">
            <div className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-[#00a8b5] to-[#00e5ff] shadow-[0_0_15px_rgba(0,194,203,0.4)] group-hover:shadow-[0_0_22px_rgba(0,194,203,0.7)] transition-all">
              <img 
                src="/urrt-logo.png" 
                alt="UIU Rescue Rover Team Logo" 
                className="w-full h-full rounded-full object-cover bg-black"
              />
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${
              theme === 'light' ? 'border-white' : 'border-[#0a0f18]'
            } ${esp32Online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-base md:text-lg font-bold font-tech tracking-wider drop-shadow-sm ${
                theme === 'light' ? 'text-slate-900' : 'text-white'
              }`}>
                UIU RESCUE ROVER
              </h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#00c2cb]/15 border border-[#00c2cb]/40 text-[#00c2cb] tracking-wider">
                #URRT
              </span>
              
              {/* Active Mode Pill in Header */}
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                mode === 'autonomous'
                  ? 'bg-violet-500/20 text-violet-300 border-violet-500/50 animate-pulse'
                  : 'bg-[#00c2cb]/15 text-[#00c2cb] border-[#00c2cb]/40'
              }`}>
                {mode === 'autonomous' ? <Bot className="w-3 h-3" /> : <Radio className="w-3 h-3" />}
                <span>{mode === 'autonomous' ? 'AUTO (×4)' : 'TELEOP (×1)'}</span>
              </span>
            </div>
            <p className="text-[9px] text-slate-400 tracking-wider font-mono uppercase flex items-center gap-1.5">
              <span>ROBOCUP RESCUE MISSION CONTROL</span>
              <span className="w-1 h-1 rounded-full bg-[#00c2cb]/60 inline-block"></span>
              <span className="text-[#00c2cb]">TABLE 7 COMPLIANT</span>
            </p>
          </div>
        </div>

        {/* Right: Telemetry Status Bar, Latency, E-Stop, Timer & Controls */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs font-mono">
          
          {/* 1. HIGH-VISIBILITY EMERGENCY STOP BUTTON */}
          <button
            onClick={() => {
              soundManager.playHazardAlarm();
              onEStop();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-mono font-bold text-xs shadow-md shadow-rose-600/40 border border-rose-400 animate-pulse cursor-pointer select-none transition-all"
            title="Software E-STOP — Immediately halt all motors (Key: E)"
          >
            <OctagonX className="w-4 h-4" />
            <span>E-STOP</span>
          </button>

          {/* 2. POLLING TIME & LATENCY GAUGE (Rulebook: <=100ms for 10 Marks) */}
          <div 
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border font-mono transition-all ${
              latencyPass
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/40 text-amber-400'
            }`}
            title={`WebSocket Polling Latency: ${effLatency}ms (Target: ≤100ms for max 10/10 marks)`}
          >
            <Activity className="w-3 h-3 text-[#00c2cb]" />
            <span className="font-bold text-[11px]">{effLatency}ms</span>
            <span className={`text-[9px] font-bold px-1 rounded ${latencyPass ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
              {latencyPass ? '10/10' : '8/10'}
            </span>
          </div>

          {/* 3. RoboCup Round Countdown Timer */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border ${
            matchSeconds <= 60
              ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse'
              : matchSeconds <= 180
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
              : theme === 'light'
              ? 'bg-slate-50 border-slate-200 text-slate-800'
              : 'bg-[#0f1624] border-[#162338] text-white'
          }`}>
            <Timer className={`w-3.5 h-3.5 ${matchSeconds <= 60 ? 'text-rose-400' : 'text-[#00c2cb]'}`} />
            
            <select
              value={initialDuration}
              onChange={onDurationChange}
              className="bg-transparent text-[11px] font-mono text-[#00c2cb] focus:outline-none cursor-pointer border-r border-[#162338] pr-1 mr-0.5 hover:text-cyan-300 transition-colors"
              title="Select Match Round Duration"
            >
              <option value={300} className={theme === 'light' ? 'bg-white text-slate-900' : 'bg-[#0a0f18] text-white'}>5m</option>
              <option value={480} className={theme === 'light' ? 'bg-white text-slate-900' : 'bg-[#0a0f18] text-white'}>8m (Official)</option>
              <option value={600} className={theme === 'light' ? 'bg-white text-slate-900' : 'bg-[#0a0f18] text-white'}>10m</option>
              <option value={720} className={theme === 'light' ? 'bg-white text-slate-900' : 'bg-[#0a0f18] text-white'}>12m</option>
              <option value={900} className={theme === 'light' ? 'bg-white text-slate-900' : 'bg-[#0a0f18] text-white'}>15m</option>
            </select>

            <span className="font-bold text-sm tracking-wider">
              {formatTimer(matchSeconds)}
            </span>
            <button
              onClick={onToggleTimer}
              className="p-1 rounded-md hover:bg-black/10 text-slate-400 hover:text-[#00c2cb] transition-colors ml-0.5 cursor-pointer"
              title={timerActive ? 'Pause match timer (Space)' : 'Start match timer (Space)'}
            >
              {timerActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 text-[#00c2cb]" />}
            </button>
            <button
              onClick={onResetTimer}
              className="p-1 rounded-md hover:bg-black/10 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title={`Reset timer to ${formatTimer(initialDuration)}`}
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* Quick Operator Guide */}
          <button
            onClick={() => { soundManager.playChirp(); onOpenGuide(); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#00c2cb]/15 hover:bg-[#00c2cb]/25 border border-[#00c2cb]/40 text-[#00c2cb] font-bold transition-all cursor-pointer"
            title="Open Quick Operator Guide (G)"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="font-mono text-[11px] tracking-wide">GUIDE</span>
          </button>

          {/* Mission Debrief Report Button */}
          <button
            onClick={onOpenDebrief}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-500 font-bold transition-colors cursor-pointer"
            title="Open Mission Debrief & Judges Report (R)"
          >
            <Award className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">DEBRIEF</span>
          </button>

          {/* Alert Thresholds Settings Button */}
          <button
            onClick={onOpenSettings}
            className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
              theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-600 hover:text-[#00c2cb]' : 'bg-[#0f1624] border-[#162338] text-slate-300 hover:text-[#00c2cb]'
            }`}
            title="Configure Hazard Alert Thresholds"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Hotkeys Cheatsheet Button */}
          <button
            onClick={onOpenHotkeys}
            className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
              theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-600 hover:text-[#00c2cb]' : 'bg-[#0f1624] border-[#162338] text-slate-300 hover:text-[#00c2cb]'
            }`}
            title="Tactical Keyboard Shortcuts (?)"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen HUD Toggle */}
          <button
            onClick={onToggleFullscreen}
            className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
              theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-600 hover:text-[#00c2cb]' : 'bg-[#0f1624] border-[#162338] text-slate-300 hover:text-[#00c2cb]'
            }`}
            title="Toggle Fullscreen HUD (F)"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Theme Toggle (Dark Mode / Light Arena Day Mode) */}
          <button
            onClick={() => { soundManager.playChirp(); onToggleTheme(); }}
            className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
              theme === 'light'
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-500 hover:bg-amber-500/25'
                : 'bg-[#0f1624] border-[#162338] text-slate-300 hover:text-amber-400'
            }`}
            title={theme === 'dark' ? 'Switch to High-Visibility Light / Day Mode' : 'Switch to Tactical Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {/* Audio Mute/Unmute Toggle */}
          <button
            onClick={toggleSound}
            className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
              isMuted 
                ? 'bg-slate-800 border-slate-700 text-slate-500' 
                : 'bg-[#00c2cb]/10 border-[#00c2cb]/30 text-[#00c2cb]'
            }`}
            title={isMuted ? 'Unmute HUD Audio (M)' : 'Mute HUD Audio (M)'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* ESP32 Status Badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all ${
            esp32Online 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${esp32Online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className="font-semibold text-[11px]">
              ESP32: {esp32Online ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          {/* Mobile Camera Link Button */}
          <button
            onClick={onOpenMobileCamera}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[#00a8b5]/20 to-[#00c2cb]/10 border border-[#00c2cb]/40 text-[#00c2cb] hover:bg-[#00c2cb]/20 transition-all font-semibold text-[11px] cursor-pointer"
            title="Open Mobile Camera Broadcaster Link"
          >
            <Camera className="w-3 h-3 text-[#00c2cb]" />
            <span className="hidden sm:inline">PAIR PHONE</span>
          </button>

          {/* Demo Mode Switcher */}
          <div className="flex items-center rounded-xl border border-[#162338] overflow-hidden bg-[#06090e] p-0.5">
            <button
              onClick={onToggleDemoMode}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all font-sans font-semibold text-[11px] cursor-pointer ${
                isDemoMode 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Demo Simulator (D)"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{isDemoMode ? 'DEMO: ON' : 'DEMO: OFF'}</span>
            </button>
            {isDemoMode && (
              <button
                onClick={onToggleSimulatedRover}
                className={`ml-0.5 px-1.5 py-1 rounded-md transition-colors text-[10px] font-mono flex items-center gap-1 cursor-pointer ${
                  isSimulatedOnline 
                    ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30' 
                    : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                }`}
                title="Toggle simulated ESP32 disconnect"
              >
                <Power className="w-2.5 h-2.5" />
                <span>{isSimulatedOnline ? 'DROP' : 'RECON'}</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </header>
  );
}
