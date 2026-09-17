import React from 'react';
import { 
  Thermometer, 
  Droplets, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertTriangle 
} from 'lucide-react';

export default function MetricCard({
  type = 'temperature', // 'temperature' | 'humidity'
  value,
  unit,
  previousValue,
  history = [],
  isStale = false
}) {
  const isTemp = type === 'temperature';
  const numericValue = value !== null && value !== undefined ? Number(value) : null;

  // Calculate session statistics
  const validHistory = history.map(h => isTemp ? h.temperature : h.humidity).filter(v => typeof v === 'number');
  const minVal = validHistory.length > 0 ? Math.min(...validHistory).toFixed(1) : '--';
  const maxVal = validHistory.length > 0 ? Math.max(...validHistory).toFixed(1) : '--';
  const avgVal = validHistory.length > 0 ? (validHistory.reduce((a, b) => a + b, 0) / validHistory.length).toFixed(1) : '--';

  // Calculate trend
  let trend = 'steady';
  if (numericValue !== null && previousValue !== null && previousValue !== undefined) {
    const diff = numericValue - Number(previousValue);
    if (diff > 0.1) trend = 'rising';
    else if (diff < -0.1) trend = 'falling';
  }

  // Determine threshold status
  let statusBadge = { label: 'OPTIMAL', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
  let gaugePercent = 50;

  if (isTemp) {
    if (numericValue === null) {
      gaugePercent = 0;
      statusBadge = { label: 'NO DATA', color: 'text-slate-400 bg-slate-800 border-slate-700' };
    } else if (numericValue < 18) {
      statusBadge = { label: 'COOL', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' };
      gaugePercent = Math.max(10, ((numericValue) / 50) * 100);
    } else if (numericValue <= 32) {
      statusBadge = { label: 'NOMINAL', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
      gaugePercent = ((numericValue) / 50) * 100;
    } else if (numericValue <= 40) {
      statusBadge = { label: 'WARM', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
      gaugePercent = Math.min(95, ((numericValue) / 50) * 100);
    } else {
      statusBadge = { label: 'HAZARD', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
      gaugePercent = 100;
    }
  } else {
    // Humidity
    if (numericValue === null) {
      gaugePercent = 0;
      statusBadge = { label: 'NO DATA', color: 'text-slate-400 bg-slate-800 border-slate-700' };
    } else if (numericValue < 30) {
      statusBadge = { label: 'DRY', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
      gaugePercent = numericValue;
    } else if (numericValue <= 65) {
      statusBadge = { label: 'OPTIMAL', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
      gaugePercent = numericValue;
    } else if (numericValue <= 80) {
      statusBadge = { label: 'ELEVATED', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' };
      gaugePercent = numericValue;
    } else {
      statusBadge = { label: 'SATURATED', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
      gaugePercent = 100;
    }
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-rover-card border ${
      isStale ? 'border-amber-500/30' : 'border-rover-border'
    } p-5 lg:p-6 shadow-xl transition-all duration-300 hover:border-cyan-500/40 group`}>
      
      {/* Top subtle corner accent */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-cyan-500/5 to-transparent pointer-events-none" />

      {/* Stale Warning Banner if offline */}
      {isStale && (
        <div className="mb-3 flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 animate-bounce" />
          <span>OFFLINE - DISPLAYING LAST KNOWN VALUE</span>
        </div>
      )}

      {/* Card Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2.5">
          <div className={`p-2.5 rounded-xl border ${
            isTemp 
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
              : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
          }`}>
            {isTemp ? <Thermometer className="w-5 h-5" /> : <Droplets className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wider font-tech text-slate-300 uppercase">
              {isTemp ? 'Ambient Temperature' : 'Relative Humidity'}
            </h3>
            <span className="text-[11px] font-mono text-slate-500">SENSOR: DHT11 (GPIO 4)</span>
          </div>
        </div>

        {/* Status Tag */}
        <span className={`text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full border ${statusBadge.color}`}>
          {statusBadge.label}
        </span>
      </div>

      {/* Primary Value Display */}
      <div className="flex items-baseline justify-between my-2">
        <div className="flex items-baseline space-x-1.5">
          <span className="text-4xl lg:text-5xl font-extrabold font-mono tracking-tight text-white drop-shadow-sm">
            {numericValue !== null ? numericValue.toFixed(1) : '--.-'}
          </span>
          <span className="text-lg lg:text-xl font-mono text-slate-400 font-semibold">
            {unit}
          </span>
        </div>

        {/* Trend Indicator */}
        <div className="flex items-center space-x-1 text-xs font-mono px-2 py-1 rounded bg-rover-dark/70 border border-rover-border">
          {trend === 'rising' && (
            <>
              <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-rose-400 font-medium">RISING</span>
            </>
          )}
          {trend === 'falling' && (
            <>
              <TrendingDown className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-cyan-400 font-medium">FALLING</span>
            </>
          )}
          {trend === 'steady' && (
            <>
              <Minus className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400 font-medium">STEADY</span>
            </>
          )}
        </div>
      </div>

      {/* Gauge Bar */}
      <div className="my-3.5">
        <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden border border-slate-700/50">
          <div 
            className={`h-full transition-all duration-700 ease-out rounded-full ${
              isTemp 
                ? 'bg-gradient-to-r from-cyan-500 via-emerald-400 to-rose-500' 
                : 'bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-300'
            }`}
            style={{ width: `${Math.min(100, Math.max(3, gaugePercent))}%` }}
          />
        </div>
      </div>

      {/* Statistics Footer */}
      <div className="pt-3 border-t border-rover-border/60 grid grid-cols-3 gap-2 text-center text-xs font-mono">
        <div className="bg-rover-dark/50 rounded-lg p-1.5 border border-rover-border/40">
          <span className="text-[10px] text-slate-500 block uppercase">Min</span>
          <span className="text-slate-200 font-semibold">{minVal} {unit}</span>
        </div>
        <div className="bg-rover-dark/50 rounded-lg p-1.5 border border-rover-border/40">
          <span className="text-[10px] text-slate-500 block uppercase">Avg</span>
          <span className="text-cyan-300 font-semibold">{avgVal} {unit}</span>
        </div>
        <div className="bg-rover-dark/50 rounded-lg p-1.5 border border-rover-border/40">
          <span className="text-[10px] text-slate-500 block uppercase">Max</span>
          <span className="text-slate-200 font-semibold">{maxVal} {unit}</span>
        </div>
      </div>

    </div>
  );
}
