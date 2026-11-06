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
  isStale = false,
  thresholds = null
}) {
  const isTemp = type === 'temperature';
  const numericValue = value !== null && value !== undefined ? Number(value) : null;

  const tempDanger = thresholds?.tempDanger || 40;
  const tempWarn = thresholds?.tempWarning || 35;
  const tempMin = thresholds?.tempMinWarning || 18;
  const humDanger = thresholds?.humidityDanger || 80;

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
    } else if (numericValue < tempMin) {
      statusBadge = { label: 'COOL', color: 'text-[#00c2cb] bg-[#00c2cb]/10 border-[#00c2cb]/30' };
      gaugePercent = Math.max(10, ((numericValue) / 50) * 100);
    } else if (numericValue <= tempWarn) {
      statusBadge = { label: 'NOMINAL', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
      gaugePercent = ((numericValue) / 50) * 100;
    } else if (numericValue <= tempDanger) {
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
    } else if (numericValue <= humDanger) {
      statusBadge = { label: 'ELEVATED', color: 'text-[#00c2cb] bg-[#00c2cb]/10 border-[#00c2cb]/30' };
      gaugePercent = numericValue;
    } else {
      statusBadge = { label: 'SATURATED', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
      gaugePercent = 100;
    }
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-[#0f1624] border ${
      isStale ? 'border-amber-500/40' : 'border-[#162338]'
    } p-5 lg:p-6 shadow-xl transition-all duration-300 hover:border-[#00c2cb]/50 hover:shadow-[0_0_25px_rgba(0,194,203,0.12)] group`}>
      
      {/* Top subtle corner accent in URRT teal */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#00c2cb]/10 to-transparent pointer-events-none" />

      {/* Stale Warning Banner if offline */}
      {isStale && (
        <div className="mb-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 animate-bounce" />
          <span>ROVER OFFLINE - SHOWING LAST KNOWN SENSOR VALUE</span>
        </div>
      )}

      {/* Card Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl border ${
            isTemp 
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
              : 'bg-[#00c2cb]/10 border-[#00c2cb]/30 text-[#00c2cb]'
          }`}>
            {isTemp ? <Thermometer className="w-5 h-5" /> : <Droplets className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-sm font-bold font-tech tracking-wider text-slate-200 uppercase">
              {isTemp ? 'Ambient Temperature' : 'Relative Humidity'}
            </h3>
            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
              <span>SENSOR: DHT11</span>
              <span className="text-slate-600">•</span>
              <span className="text-[#00c2cb]">GPIO 4</span>
            </span>
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
        <div className="flex items-center space-x-1.5 text-xs font-mono px-2.5 py-1 rounded-lg bg-[#06090e] border border-[#162338]">
          {trend === 'rising' && (
            <>
              <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-rose-400 font-medium">RISING</span>
            </>
          )}
          {trend === 'falling' && (
            <>
              <TrendingDown className="w-3.5 h-3.5 text-[#00c2cb]" />
              <span className="text-[#00c2cb] font-medium">FALLING</span>
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
        <div className="w-full h-2 rounded-full bg-[#06090e] overflow-hidden border border-[#162338]">
          <div 
            className={`h-full transition-all duration-700 ease-out rounded-full ${
              isTemp 
                ? 'bg-gradient-to-r from-[#00c2cb] via-emerald-400 to-rose-500' 
                : 'bg-gradient-to-r from-[#00a8b5] via-[#00c2cb] to-[#00e5ff]'
            }`}
            style={{ width: `${Math.min(100, Math.max(3, gaugePercent))}%` }}
          />
        </div>
      </div>

      {/* Statistics Footer */}
      <div className="pt-3 border-t border-[#162338] grid grid-cols-3 gap-2 text-center text-xs font-mono">
        <div className="bg-[#06090e]/80 rounded-xl p-2 border border-[#162338]">
          <span className="text-[10px] text-slate-400 block uppercase">Min</span>
          <span className="text-slate-200 font-semibold">{minVal} {unit}</span>
        </div>
        <div className="bg-[#06090e]/80 rounded-xl p-2 border border-[#162338]">
          <span className="text-[10px] text-slate-400 block uppercase">Session Avg</span>
          <span className="text-[#00c2cb] font-semibold">{avgVal} {unit}</span>
        </div>
        <div className="bg-[#06090e]/80 rounded-xl p-2 border border-[#162338]">
          <span className="text-[10px] text-slate-400 block uppercase">Max</span>
          <span className="text-slate-200 font-semibold">{maxVal} {unit}</span>
        </div>
      </div>

    </div>
  );
}
