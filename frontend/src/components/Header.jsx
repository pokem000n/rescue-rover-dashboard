import React from 'react';
import { 
  Activity, 
  Radio, 
  Wifi, 
  WifiOff, 
  Clock, 
  Cpu, 
  Camera, 
  Sparkles,
  Power
} from 'lucide-react';

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
  const formatTime = (ts) => {
    if (!ts) return '--:--:--';
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <header className="border-b border-rover-border bg-rover-panel/80 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-3.5 shadow-xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Brand & Mission Title */}
        <div className="flex items-center space-x-3.5">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            {/* Status pip */}
            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-rover-panel ${
              esp32Online ? 'bg-emerald-400' : 'bg-rose-500'
            }`} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold font-tech tracking-wider text-slate-100 flex items-center gap-2">
                UIU RESCUE ROVER
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                  RCJ-TASK-3
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 tracking-widest font-mono uppercase">
              REAL-TIME ENVIRONMENT MONITORING
            </p>
          </div>
        </div>

        {/* Telemetry Status Bar & Actions */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs font-mono">
          
          {/* ESP32 Hardware Status Badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
            esp32Online 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 glow-emerald' 
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400 glow-red'
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

          {/* WebSocket Status Badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
            wsStatus === 'connected'
              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
              : wsStatus === 'connecting'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}>
            {wsStatus === 'connected' ? (
              <Wifi className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span className="uppercase tracking-wider">
              WS: {wsStatus}
            </span>
          </div>

          {/* Timestamp Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rover-card border border-rover-border text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>UPDATED:</span>
            <span className="text-cyan-300 font-semibold">{formatTime(lastUpdated)}</span>
          </div>

          {/* Mobile Camera Link Button */}
          <button
            onClick={onOpenMobileCamera}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 transition-colors"
            title="Open Mobile Camera Broadcaster Link"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>CONNECT PHONE</span>
          </button>

          {/* Demo Mode Switcher */}
          <div className="flex items-center rounded-lg border border-rover-border overflow-hidden bg-rover-dark p-0.5">
            <button
              onClick={onToggleDemoMode}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-sans font-semibold ${
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
                className={`ml-1 px-2 py-1 rounded transition-colors text-[10px] font-mono flex items-center gap-1 ${
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
