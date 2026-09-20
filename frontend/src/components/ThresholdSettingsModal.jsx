import React, { useState } from 'react';
import { X, Sliders, RotateCcw, Check, AlertTriangle, Thermometer, Droplets, Wifi } from 'lucide-react';
import { DEFAULT_THRESHOLDS } from '../utils/thresholdSettings';
import { soundManager } from '../utils/soundEffects';
import { wsClient } from '../services/websocket';

export default function ThresholdSettingsModal({ 
  isOpen, 
  onClose, 
  currentThresholds, 
  onSave 
}) {
  if (!isOpen) return null;

  const [form, setForm] = useState({ ...currentThresholds });
  const [wsUrl, setWsUrl] = useState(() => {
    try {
      return localStorage.getItem('urrt_ws_url') || wsClient.url || '';
    } catch (e) {
      return '';
    }
  });

  const handleChange = (key, val) => {
    setForm(prev => ({
      ...prev,
      [key]: Number(val)
    }));
  };

  const handleReset = () => {
    soundManager.playChirp();
    setForm({ ...DEFAULT_THRESHOLDS });
  };

  const handleApply = (e) => {
    e.preventDefault();
    soundManager.playChirp();
    if (wsUrl.trim() && wsUrl.trim() !== wsClient.url) {
      wsClient.updateUrl(wsUrl.trim());
    }
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-[#0a0f18] border border-[#00c2cb]/40 rounded-2xl shadow-2xl shadow-cyan-950/40 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#162338] bg-[#06090e]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#00c2cb]/15 border border-[#00c2cb]/30 text-[#00c2cb]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-tech text-white tracking-wider">
                HAZARD THRESHOLD SETPOINTS
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Configure environmental alarms for current arena
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleApply} className="p-5 space-y-4 font-mono text-xs">
          
          {/* Critical Danger Temperature */}
          <div className="p-3.5 rounded-xl bg-[#0f1624] border border-rose-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-rose-400">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                CRITICAL TEMP DANGER
              </span>
              <span className="text-sm font-bold text-rose-400">{form.tempDanger}°C</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Triggers the audible hazard siren and flashes danger matrix.
            </p>
            <input 
              type="range"
              min="30"
              max="60"
              step="1"
              value={form.tempDanger}
              onChange={e => handleChange('tempDanger', e.target.value)}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>

          {/* Warning Temperature */}
          <div className="p-3.5 rounded-xl bg-[#0f1624] border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-amber-400">
                <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                TEMP WARNING (CAUTION)
              </span>
              <span className="text-sm font-bold text-amber-400">{form.tempWarning}°C</span>
            </div>
            <input 
              type="range"
              min="25"
              max="45"
              step="1"
              value={form.tempWarning}
              onChange={e => handleChange('tempWarning', e.target.value)}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Low Temp Caution */}
          <div className="p-3.5 rounded-xl bg-[#0f1624] border border-[#00c2cb]/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-[#00c2cb]">
                <Thermometer className="w-3.5 h-3.5 text-[#00c2cb]" />
                MIN TEMP ALERT (COLD)
              </span>
              <span className="text-sm font-bold text-[#00c2cb]">{form.tempMinWarning}°C</span>
            </div>
            <input 
              type="range"
              min="5"
              max="25"
              step="1"
              value={form.tempMinWarning}
              onChange={e => handleChange('tempMinWarning', e.target.value)}
              className="w-full accent-[#00c2cb] cursor-pointer"
            />
          </div>

          {/* Humidity Danger */}
          <div className="p-3.5 rounded-xl bg-[#0f1624] border border-blue-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-blue-400">
                <Droplets className="w-3.5 h-3.5 text-blue-400" />
                HUMIDITY DANGER LIMIT
              </span>
              <span className="text-sm font-bold text-blue-400">{form.humidityDanger}%</span>
            </div>
            <input 
              type="range"
              min="50"
              max="95"
              step="1"
              value={form.humidityDanger}
              onChange={e => handleChange('humidityDanger', e.target.value)}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>

          {/* Telemetry Server URL (WebSocket) */}
          <div className="p-3.5 rounded-xl bg-[#0f1624] border border-[#162338] space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-[#00c2cb]">
                <Wifi className="w-3.5 h-3.5 text-[#00c2cb]" />
                TELEMETRY SERVER URL (WS)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">PORT 3001</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Local: <span className="text-[#00c2cb]">ws://localhost:3001</span> or <span className="text-[#00c2cb]">ws://&lt;PC_LAN_IP&gt;:3001</span>
            </p>
            <input 
              type="text"
              value={wsUrl}
              onChange={e => setWsUrl(e.target.value)}
              placeholder="ws://localhost:3001"
              className="w-full px-3 py-1.5 rounded-lg bg-[#06090e] border border-[#162338] text-white focus:outline-none focus:border-[#00c2cb] font-mono text-xs"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>DEFAULT (RCJ)</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-xl text-slate-400 hover:text-white transition-colors"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00c2cb] hover:bg-[#00e5ff] text-[#06090e] font-bold shadow-lg shadow-cyan-500/20 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>SAVE & APPLY</span>
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
