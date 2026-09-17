import React, { useState, useEffect } from 'react';
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
  Timer
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
  onOpenMobileCamera
}) {
  // RoboCup Round Countdown Timer (Default: 8:00 minutes = 480 seconds per official RCJ rules)
  const [initialDuration, setInitialDuration] = useState(480);
  const [matchSeconds, setMatchSeconds] = useState(480);
  const [timerActive, setTimerActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

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

  const toggleTimer = () => {
    soundManager.playChirp();
    setTimerActive(t => !t);
  };

  const resetTimer = () => {
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

  const formatTime = (ts) => {
    if (!ts) return '--:--:--';
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <header className="border-b border-[#162338] bg-[#0a0f18]/90 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-3 shadow-2xl shadow-black/40">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Official UIU Rescue Rover Team (#URRT) Brand */}
        <div className="flex items-center space-x-3.5">
          <div className="relative group cursor-pointer">
            {/* Illuminated Outer Ring matching Emblem border */}
            <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-[#00a8b5] to-[#00e5ff] shadow-[0_0_15px_rgba(0,194,203,0.4)] group-hover:shadow-[0_0_22px_rgba(0,194,203,0.7)] transition-all">
              <img 
                src="/urrt-logo.png" 
                alt="UIU Rescue Rover Team Logo" 
                className="w-full h-full rounded-full object-cover bg-black"
              />
            </div>
            {/* Live Hardware Status Pip */}
            <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0a0f18] ${
              esp32Online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
            }`} />
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-bold font-tech tracking-wider text-white drop-shadow-sm">
                UIU RESCUE ROVER TEAM
              </h1>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[#00c2cb]/15 border border-[#00c2cb]/40 text-[#00c2cb] tracking-wider">
                #URRT
              </span>
            </div>
            <p className="text-[11px] text-slate-400 tracking-widest font-mono uppercase mt-0.5 flex items-center gap-2">
              <span>REAL-TIME ENVIRONMENT MONITORING</span>
              <span className="w-1 h-1 rounded-full bg-[#00c2cb]/60 inline-block"></span>
              <span className="text-[#00c2cb]">MISSION HUD</span>
            </p>
          </div>
        </div>

        {/* Telemetry Status Bar, Timer & Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs font-mono">
          
          {/* RoboCup Round Countdown Timer */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
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
              onChange={handleDurationChange}
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
              onClick={toggleTimer}
              className="p-1 rounded-md hover:bg-white/10 text-slate-300 transition-colors ml-0.5"
              title={timerActive ? 'Pause match timer' : 'Start match timer'}
            >
              {timerActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 text-[#00c2cb]" />}
            </button>
            <button
              onClick={resetTimer}
              className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title={`Reset timer to ${formatTimer(initialDuration)}`}
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* ESP32 Hardware Status Badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
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
            <span className="font-semibold tracking-wider">
              ESP32: {esp32Online ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          {/* WebSocket Link Status Badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
            wsStatus === 'connected'
              ? 'bg-[#00c2cb]/10 border-[#00c2cb]/30 text-[#00c2cb]'
              : wsStatus === 'connecting'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}>
            {wsStatus === 'connected' ? (
              <Wifi className="w-3.5 h-3.5 text-[#00c2cb]" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span className="uppercase tracking-wider">
              WS: {wsStatus}
            </span>
          </div>

          {/* Audio Mute/Unmute Toggle */}
          <button
            onClick={toggleSound}
            className={`p-2 rounded-xl border transition-colors ${
              isMuted 
                ? 'bg-slate-900 border-slate-800 text-slate-500' 
                : 'bg-[#00c2cb]/10 border-[#00c2cb]/30 text-[#00c2cb]'
            }`}
            title={isMuted ? 'Unmute HUD Audio' : 'Mute HUD Audio'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Mobile Camera Link Button */}
          <button
            onClick={onOpenMobileCamera}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#00a8b5]/20 to-[#00c2cb]/10 border border-[#00c2cb]/40 text-[#00c2cb] hover:bg-[#00c2cb]/20 transition-all hover:shadow-[0_0_15px_rgba(0,194,203,0.3)] font-semibold"
            title="Open Mobile Camera Broadcaster Link"
          >
            <Camera className="w-3.5 h-3.5 text-[#00c2cb]" />
            <span>CONNECT PHONE</span>
          </button>

          {/* Demo Mode Switcher */}
          <div className="flex items-center rounded-xl border border-[#162338] overflow-hidden bg-[#06090e] p-0.5">
            <button
              onClick={onToggleDemoMode}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all font-sans font-semibold ${
                isDemoMode 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{isDemoMode ? 'DEMO ACTIVE' : 'ENABLE DEMO'}</span>
            </button>

            {isDemoMode && (
              <button
                onClick={onToggleSimulatedRover}
                className={`ml-1 px-2 py-1 rounded-md transition-colors text-[10px] font-mono flex items-center gap-1 ${
                  isSimulatedOnline 
                    ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30' 
                    : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                }`}
                title="Toggle simulated ESP32 disconnect"
              >
                <Power className="w-3 h-3" />
                <span>{isSimulatedOnline ? 'SIM DROP' : 'SIM RECONNECT'}</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </header>
  );
}
