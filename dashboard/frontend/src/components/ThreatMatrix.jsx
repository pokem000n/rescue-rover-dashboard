import React from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, Flame, Droplets } from 'lucide-react';
import { calculateHeatIndex, calculateDewPoint, getThreatLevel } from '../utils/telemetryMath';

export default function ThreatMatrix({ temperature, humidity }) {
  const heatIndex = calculateHeatIndex(temperature, humidity);
  const dewPoint = calculateDewPoint(temperature, humidity);
  const threat = getThreatLevel(temperature, humidity);

  const isHazard = threat.level.includes('HAZARD');
  const isCaution = threat.level.includes('CAUTION');

  return (
    <div className={`rounded-2xl bg-[#0f1624] border ${
      isHazard 
        ? 'border-rose-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' 
        : isCaution 
        ? 'border-amber-500/40' 
        : 'border-[#162338]'
    } p-4 sm:p-5 transition-all`}>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#162338]">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-xl border ${
            isHazard 
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 animate-pulse' 
              : isCaution
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
              : 'bg-[#00c2cb]/10 border-[#00c2cb]/30 text-[#00c2cb]'
          }`}>
            {isHazard ? (
              <Flame className="w-5 h-5 text-rose-400" />
            ) : isCaution ? (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-[#00c2cb]" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold font-tech tracking-wider text-white uppercase flex items-center gap-2">
              ENVIRONMENTAL THREAT & HEAT MATRIX
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              THERMAL INDEX & DEW POINT CALCULATION • #URRT
            </span>
          </div>
        </div>

        {/* Threat Level Badge */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono font-bold px-3 py-1 rounded-xl border tracking-wider ${threat.color}`}>
            THREAT: {threat.level}
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 font-mono text-xs">
        
        {/* Heat Index */}
        <div className="bg-[#06090e] rounded-xl p-3 border border-[#162338] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">Heat Index</span>
            <span className="text-base font-bold text-white">
              {heatIndex !== null ? `${heatIndex} °C` : '--.- °C'}
            </span>
          </div>
          <Flame className="w-4 h-4 text-rose-400/80" />
        </div>

        {/* Dew Point */}
        <div className="bg-[#06090e] rounded-xl p-3 border border-[#162338] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">Dew Point</span>
            <span className="text-base font-bold text-[#00c2cb]">
              {dewPoint !== null ? `${dewPoint} °C` : '--.- °C'}
            </span>
          </div>
          <Droplets className="w-4 h-4 text-[#00c2cb]/80" />
        </div>

        {/* Status Assessment */}
        <div className="col-span-2 sm:col-span-1 bg-[#06090e] rounded-xl p-3 border border-[#162338] flex flex-col justify-center">
          <span className="text-[10px] text-slate-400 uppercase">Assessment</span>
          <span className="text-[11px] text-slate-200 font-semibold truncate">
            {threat.desc}
          </span>
        </div>

      </div>

    </div>
  );
}
