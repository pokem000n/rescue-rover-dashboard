import React from 'react';
import { 
  Cpu, 
  Server, 
  Clock, 
  Users, 
  Layers, 
  Gauge, 
  HardDrive
} from 'lucide-react';

export default function SystemInfo({
  esp32Online,
  esp32Ip,
  wsStatus,
  wsUrl,
  lastUpdated,
  packetCount,
  uptimeSeconds,
  connectedDashboards = 1,
  sampleRateHz = 0.67,
  latestData
}) {
  const formatUptime = (totalSec) => {
    if (!totalSec || isNaN(totalSec)) return '00:00:00';
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = Math.floor(totalSec % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="rounded-2xl bg-[#0f1624] border border-[#162338] p-5 lg:p-6 shadow-xl hover:border-[#00c2cb]/30 transition-colors">
      
      {/* Header */}
      <div className="flex items-center space-x-3 pb-4 mb-4 border-b border-[#162338]">
        <div className="p-2 rounded-xl bg-[#00c2cb]/10 border border-[#00c2cb]/30 text-[#00c2cb]">
          <Server className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold font-tech tracking-wider text-white uppercase">
            SYSTEM DIAGNOSTICS & TELEMETRY HEALTH
          </h3>
          <span className="text-[11px] font-mono text-slate-400">
            UIU RESCUE ROVER TEAM (#URRT) • HARDWARE & NETWORK METRICS
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
        
        {/* Node Status */}
        <div className="bg-[#06090e] rounded-xl p-3.5 border border-[#162338] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] uppercase">ESP32 Node</span>
            <Cpu className="w-3.5 h-3.5 text-[#00c2cb]" />
          </div>
          <div className="font-bold text-sm">
            <span className={esp32Online ? 'text-emerald-400' : 'text-rose-400'}>
              {esp32Online ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1 truncate" title={esp32Ip || 'Pending...'}>
            IP: {esp32Ip || 'Not Assigned'}
          </div>
        </div>

        {/* WebSocket Health */}
        <div className="bg-[#06090e] rounded-xl p-3.5 border border-[#162338] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] uppercase">Link Health</span>
            <Layers className="w-3.5 h-3.5 text-[#00c2cb]" />
          </div>
          <div className="font-bold text-sm">
            <span className={wsStatus === 'connected' ? 'text-[#00c2cb]' : 'text-amber-400'}>
              {wsStatus.toUpperCase()}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1 truncate">
            {wsUrl ? wsUrl.replace('ws://', '') : '3001'}
          </div>
        </div>

        {/* Sampling Interval */}
        <div className="bg-[#06090e] rounded-xl p-3.5 border border-[#162338] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] uppercase">Sample Rate</span>
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="font-bold text-sm text-white">
            1.50 s
          </div>
          <div className="text-[10px] text-emerald-400 mt-1">
            ~0.67 Hz POLLING
          </div>
        </div>

        {/* Packets Transmitted */}
        <div className="bg-[#06090e] rounded-xl p-3.5 border border-[#162338] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] uppercase">Packets RX</span>
            <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="font-bold text-sm text-white">
            {packetCount.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            FRAME INTEGRITY OK
          </div>
        </div>

        {/* Uptime */}
        <div className="bg-[#06090e] rounded-xl p-3.5 border border-[#162338] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] uppercase">Rover Uptime</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="font-bold text-sm text-amber-300">
            {formatUptime(uptimeSeconds)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            SESSION ACTIVE
          </div>
        </div>

        {/* Connected Monitors */}
        <div className="bg-[#06090e] rounded-xl p-3.5 border border-[#162338] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] uppercase">Dashboards</span>
            <Users className="w-3.5 h-3.5 text-[#00c2cb]" />
          </div>
          <div className="font-bold text-sm text-white">
            {connectedDashboards} ACTIVE
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            MISSION MONITORS
          </div>
        </div>

      </div>

    </div>
  );
}
