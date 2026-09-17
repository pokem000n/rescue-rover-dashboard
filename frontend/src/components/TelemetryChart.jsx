import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { LineChart as ChartIcon, Eye, Zap, Download } from 'lucide-react';
import { exportTelemetryToCSV } from '../utils/telemetryMath';
import { soundManager } from '../utils/soundEffects';

export default function TelemetryChart({ data = [] }) {
  // Format timestamps for display
  const chartData = data.map((item, index) => {
    let label = '';
    if (item.timestamp) {
      const date = new Date(item.timestamp);
      label = date.toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' });
    } else {
      label = `#${index + 1}`;
    }
    return {
      ...item,
      displayTime: label
    };
  });

  const handleExportCSV = () => {
    soundManager.playChirp();
    exportTelemetryToCSV(data);
  };

  return (
    <div className="rounded-2xl bg-[#0f1624] border border-[#162338] p-5 lg:p-6 shadow-xl flex flex-col h-full hover:border-[#00c2cb]/30 transition-colors">
      
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-2 border-b border-[#162338] gap-2">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-[#00c2cb]/10 border border-[#00c2cb]/30 text-[#00c2cb]">
            <ChartIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-tech tracking-wider text-white uppercase flex items-center gap-2">
              ENVIRONMENT TELEMETRY HISTORY
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              REAL-TIME ROLLING SENSOR WAVEFORMS • #URRT
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <button
            onClick={handleExportCSV}
            disabled={data.length === 0}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#00c2cb]/15 hover:bg-[#00c2cb]/25 border border-[#00c2cb]/40 text-[#00c2cb] disabled:opacity-40 transition-colors font-semibold shadow-sm"
            title="Export session data as CSV spreadsheet"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT CSV</span>
          </button>

          <span className="px-2.5 py-1 rounded-lg bg-[#06090e] border border-[#162338] text-slate-400">
            BUFFER: <strong className="text-[#00c2cb]">{chartData.length}</strong> / 50 SAMPLES
          </span>

          <span className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Zap className="w-3 h-3" />
            LIVE SYNC
          </span>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="flex-1 w-full min-h-[260px] lg:min-h-[300px] pt-2">
        {chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 font-mono text-xs">
            <Eye className="w-8 h-8 mb-2 stroke-1 opacity-50 text-[#00c2cb]" />
            <span>Waiting for initial sensor packets from ESP32...</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="humGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00c2cb" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#00c2cb" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#162338" opacity={0.7} />

              <XAxis 
                dataKey="displayTime" 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false}
                fontFamily="JetBrains Mono"
              />

              {/* Left Axis: Temperature */}
              <YAxis 
                yAxisId="left" 
                stroke="#f43f5e" 
                fontSize={10}
                domain={['dataMin - 2', 'dataMax + 2']} 
                tickLine={false}
                fontFamily="JetBrains Mono"
                unit="°C"
              />

              {/* Right Axis: Humidity */}
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                stroke="#00c2cb" 
                fontSize={10}
                domain={[0, 100]} 
                tickLine={false}
                fontFamily="JetBrains Mono"
                unit="%"
              />

              <Tooltip content={<CustomTooltip />} />

              <Legend 
                verticalAlign="top" 
                height={36}
                wrapperStyle={{
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono',
                  paddingBottom: '8px'
                }}
              />

              <Area
                yAxisId="left"
                type="monotone"
                dataKey="temperature"
                name="Temperature (°C)"
                stroke="#f43f5e"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#tempGradient)"
                isAnimationActive={false}
              />

              <Area
                yAxisId="right"
                type="monotone"
                dataKey="humidity"
                name="Humidity (%)"
                stroke="#00c2cb"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#humGradient)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0a0f18]/95 backdrop-blur-md border border-[#162338] p-3 rounded-xl shadow-2xl font-mono text-xs shadow-black/60">
        <div className="text-slate-400 border-b border-[#162338] pb-1 mb-2 font-semibold">
          TIME: {label}
        </div>
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4 py-0.5">
            <span style={{ color: entry.color }} className="font-medium">
              {entry.name}:
            </span>
            <span className="text-white font-bold">
              {entry.value} {entry.name.includes('°C') ? '°C' : '%'}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}
