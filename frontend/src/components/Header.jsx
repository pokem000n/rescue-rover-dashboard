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
  Minimize2
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
  // Lifted Timer props
  matchSeconds = 480,
  initialDuration = 480,
  timerActive = false,
  onToggleTimer,
  onResetTimer,
  onDurationChange,
  // Modals & HUD controls
  onOpenSettings,
  onOpenHotkeys,
  onOpenDebrief,
  isFullscreen = false,
  onToggleFullscreen
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

  return (
    <header className="border-b border-[#162338] bg-[#0a0f18]/95 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-6 py-2.5 shadow-2xl shadow-black/40 print:hidden">
      <div className="max-w-7xl mx-auto flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
        
        {/* Official UIU Rescue Rover Team (#URRT) Brand */}
        <div className="flex items-center space-x-3">
          <div className="relative group cursor-pointer">
            {/* Illuminated Outer Ring matching Emblem border */}
            <div className="w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-[#00a8b5] to-[#00e5ff] shadow-[0_0_15px_rgba(0,194,203,0.4)] group-hover:shadow-[0_0_22px_rgba(0,194,203,0.7)] transition-all">
              <img 
                src="/urrt-logo.png" 
                alt="UIU Rescue Rover Team Logo" 
                className="w-full h-full rounded-full object-cover bg-black"
              />
            </div>
            {/* Live Hardware Status Pip */}
            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0a0f18] ${
              esp32Online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
            }`} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-bold font-tech tracking-wider text-white drop-shadow-sm">
                UIU RESCUE ROVER TEAM
              </h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#00c2cb]/15 border border-[#00c2cb]/40 text-[#00c2cb] tracking-wider">
                #URRT
              </span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-widest font-mono uppercase flex items-center gap-2">
              <span>REAL-TIME ENVIRONMENT MONITORING</span>
              <span className="w-1 h-1 rounded-full bg-[#00c2cb]/60 inline-block"></span>
              <span className="text-[#00c2cb]">MISSION CONTROL HUD</span>
            </p>
          </div>
        </div>

        {/* Telemetry Status Bar, Timer & Controls */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs font-mono">
          
          {/* RoboCup Round Countdown Timer */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border ${
            matchSeconds <= 60
              ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse'
              : matchSeconds <= 180
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
              : 'bg-[#0f1624] border-[#162338] text-white'
          }`}>
            <Timer className={`w-3.5 h-3.5 ${matchSeconds <= 60 ? 'text-rose-400' : 'text-[#00c2cb]'}`} />
            
            {/* Quick Preset Selector for competition rules */}
            <select
              value={initialDuration}
              onChange={onDurationChange}
              className="bg-transparent text-[11px] font-mono text-[#00c2cb] focus:outline-none cursor-pointer border-r border-[#162338] pr-1 mr-0.5 hover:text-cyan-300 transition-colors"
              title="Select Match Round Duration"
            >
              <option value={300} className="bg-[#0a0f18] text-white">5m</option>
              <option value={480} className="bg-[#0a0f18] text-white">8m (Official)</option>
              <option value={600} className="bg-[#0a0f18] text-white">10m</option>
              <option value={720} className="bg-[#0a0f18] text-white">12m</option>
              <option value={900} className="bg-[#0a0f18] text-white">15m</option>
              <option value={1200} className="bg-[#0a0f18] text-white">20m</option>
            </select>

            <span className="font-bold text-sm tracking-wider">
              {formatTimer(matchSeconds)}
            </span>
            <button
              onClick={onToggleTimer}
              className="p-1 rounded-md hover:bg-white/10 text-slate-300 transition-colors ml-0.5"
              title={timerActive ? 'Pause match timer (Space)' : 'Start match timer (Space)'}
            >
              {timerActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 text-[#00c2cb]" />}
            </button>
            <button
              onClick={onResetTimer}
              className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title={`Reset timer to ${formatTimer(initialDuration)}`}
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* Mission Debrief Report Button */}
          <button
            onClick={onOpenDebrief}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 transition-colors font-semibold"
            title="Open Mission Debrief & Judges Report (R)"
          >
            <Award className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">DEBRIEF</span>
          </button>

          {/* Alert Thresholds Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-xl bg-[#0f1624] hover:bg-slate-800 border border-[#162338] text-slate-300 hover:text-[#00c2cb] transition-colors"
            title="Configure Hazard Alert Thresholds"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Hotkeys Cheatsheet Button */}
          <button
            onClick={onOpenHotkeys}
            className="p-1.5 rounded-xl bg-[#0f1624] hover:bg-slate-800 border border-[#162338] text-slate-300 hover:text-[#00c2cb] transition-colors"
            title="Tactical Keyboard Shortcuts (?)"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen HUD Toggle */}
          <button
            onClick={onToggleFullscreen}
            className="p-1.5 rounded-xl bg-[#0f1624] hover:bg-slate-800 border border-[#162338] text-slate-300 hover:text-[#00c2cb] transition-colors"
            title="Toggle Fullscreen HUD (F)"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Audio Mute/Unmute Toggle */}
          <button
            onClick={toggleSound}
            className={`p-1.5 rounded-xl border transition-colors ${
              isMuted 
                ? 'bg-slate-900 border-slate-800 text-slate-500' 
                : 'bg-[#00c2cb]/10 border-[#00c2cb]/30 text-[#00c2cb]'
            }`}
            title={isMuted ? 'Unmute HUD Audio (M)' : 'Mute HUD Audio (M)'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* ESP32 Hardware Status Badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all ${
            esp32Online 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]' 
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
          }`}>
            <span className="relative flex h-2 w-2">
              {esp32Online && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                esp32Online ? 'bg-emerald-400' : 'bg-rose-500'
              }`}></span>
            </span>
            <span className="font-semibold tracking-wider text-[11px]">
              ESP32: {esp32Online ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          {/* WebSocket Link Status Badge */}
          <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border ${
            wsStatus === 'connected'
              ? 'bg-[#00c2cb]/10 border-[#00c2cb]/30 text-[#00c2cb]'
              : wsStatus === 'connecting'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}>
            {wsStatus === 'connected' ? (
              <Wifi className="w-3 h-3 text-[#00c2cb]" />
            ) : (
              <WifiOff className="w-3 h-3 text-slate-500" />
            )}
            <span className="uppercase tracking-wider text-[11px]">
              {wsStatus}
            </span>
          </div>

          {/* Mobile Camera Link Button */}
          <button
            onClick={onOpenMobileCamera}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[#00a8b5]/20 to-[#00c2cb]/10 border border-[#00c2cb]/40 text-[#00c2cb] hover:bg-[#00c2cb]/20 transition-all hover:shadow-[0_0_15px_rgba(0,194,203,0.3)] font-semibold text-[11px]"
            title="Open Mobile Camera Broadcaster Link"
          >
            <Camera className="w-3 h-3 text-[#00c2cb]" />
            <span className="hidden sm:inline">PAIR PHONE</span>
          </button>

          {/* Demo Mode Switcher */}
          <div className="flex items-center rounded-xl border border-[#162338] overflow-hidden bg-[#06090e] p-0.5">
            <button
              onClick={onToggleDemoMode}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all font-sans font-semibold text-[11px] ${
                isDemoMode 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Demo Simulator (D)"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{isDemoMode ? 'DEMO' : 'DEMO'}</span>
            </button>

            {isDemoMode && (
              <button
                onClick={onToggleSimulatedRover}
                className={`ml-0.5 px-1.5 py-1 rounded-md transition-colors text-[10px] font-mono flex items-center gap-1 ${
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
