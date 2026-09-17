import React, { useState } from 'react';
import { 
  ClipboardList, 
  Flag, 
  AlertOctagon, 
  CheckCircle, 
  Flame, 
  Plus, 
  Trash2, 
  Download, 
  Sparkles,
  PackageCheck
} from 'lucide-react';
import { soundManager } from '../utils/soundEffects';

const PRESET_TAGS = [
  { label: 'VICTIM SIGHTED', type: 'victim', icon: Flag, color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/40 hover:bg-emerald-500/25' },
  { label: 'HAZARD / DEBRIS', type: 'hazard', icon: AlertOctagon, color: 'text-rose-400 bg-rose-500/15 border-rose-500/40 hover:bg-rose-500/25' },
  { label: 'CHECKPOINT CLEARED', type: 'checkpoint', icon: CheckCircle, color: 'text-[#00c2cb] bg-[#00c2cb]/15 border-[#00c2cb]/40 hover:bg-[#00c2cb]/25' },
  { label: 'THERMAL ANOMALY', type: 'thermal', icon: Flame, color: 'text-amber-400 bg-amber-500/15 border-amber-500/40 hover:bg-amber-500/25' },
  { label: 'PAYLOAD DEPLOYED', type: 'payload', icon: PackageCheck, color: 'text-indigo-400 bg-indigo-500/15 border-indigo-500/40 hover:bg-indigo-500/25' }
];

export default function MissionLog({ 
  incidents = [], 
  onAddIncident, 
  onDeleteIncident, 
  onClearIncidents,
  matchSeconds,
  currentTemp,
  currentHum 
}) {
  const [customText, setCustomText] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const formatTimer = (totalSec) => {
    if (totalSec === undefined || totalSec === null) return '--:--';
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAddPreset = (preset) => {
    soundManager.playLogPing();
    onAddIncident({
      type: preset.type,
      tag: preset.label,
      notes: '',
      matchTime: formatTimer(matchSeconds),
      temp: currentTemp !== null ? `${currentTemp}°C` : '--',
      hum: currentHum !== null ? `${currentHum}%` : '--'
    });
  };

  const handleAddCustom = (e) => {
    e.preventDefault();
    if (!customText.trim()) return;
    soundManager.playLogPing();
    onAddIncident({
      type: 'custom',
      tag: 'NOTE',
      notes: customText.trim(),
      matchTime: formatTimer(matchSeconds),
      temp: currentTemp !== null ? `${currentTemp}°C` : '--',
      hum: currentHum !== null ? `${currentHum}%` : '--'
    });
    setCustomText('');
  };

  const exportIncidentLog = () => {
    if (incidents.length === 0) return;
    soundManager.playChirp();
    const rows = [
      ['ID', 'MATCH_TIME_REMAINING', 'LOCAL_TIME', 'TAG_TYPE', 'TAG_LABEL', 'TEMPERATURE', 'HUMIDITY', 'OPERATOR_NOTES'],
      ...incidents.map(i => [
        i.id,
        i.matchTime || '--:--',
        i.time,
        i.type,
        `"${i.tag}"`,
        i.temp,
        i.hum,
        `"${(i.notes || '').replace(/"/g, '""')}"`
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `URRT_MissionLog_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = activeFilter === 'all' 
    ? incidents 
    : incidents.filter(i => i.type === activeFilter);

  return (
    <div className="rounded-2xl bg-[#0f1624] border border-[#162338] p-5 shadow-2xl flex flex-col space-y-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#162338]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#00c2cb]/15 border border-[#00c2cb]/30 text-[#00c2cb]">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold font-tech tracking-wider text-white uppercase">
                OPERATOR MISSION LOGBOOK
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#00c2cb]/20 text-[#00c2cb] border border-[#00c2cb]/40 font-bold">
                {incidents.length} RECORDS
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Tag victim markers, hazards, and mission milestones in real time
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {incidents.length > 0 && (
            <>
              <button
                onClick={exportIncidentLog}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00c2cb]/15 hover:bg-[#00c2cb]/25 border border-[#00c2cb]/40 text-[#00c2cb] transition-all font-semibold"
                title="Export mission incidents log as CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>EXPORT LOG</span>
              </button>
              <button
                onClick={() => {
                  if (confirm('Clear all mission logbook entries?')) {
                    onClearIncidents();
                  }
                }}
                className="p-1.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-colors"
                title="Clear all logbook entries"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Quick Tagging Preset Palette */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
          QUICK TACTICAL TAGGERS (CLICK TO LOG INSTANTLY):
        </span>
        <div className="flex flex-wrap gap-2">
          {PRESET_TAGS.map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.type}
                onClick={() => handleAddPreset(preset)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all shadow-sm active:scale-95 ${preset.color}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Note Entry Form */}
      <form onSubmit={handleAddCustom} className="flex gap-2">
        <input 
          type="text"
          value={customText}
          onChange={e => setCustomText(e.target.value)}
          placeholder="Type operator notes (e.g. 'Rubble cleared near ramp, victim detected')..."
          className="flex-1 bg-[#06090e] border border-[#162338] focus:border-[#00c2cb]/60 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none transition-colors"
        />
        <button
          type="submit"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#00a8b5] to-[#00c2cb] hover:from-[#00c2cb] hover:to-[#00e5ff] text-[#06090e] text-xs font-mono font-bold transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>LOG NOTE</span>
        </button>
      </form>

      {/* Filter Tabs */}
      {incidents.length > 0 && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-[#162338] text-[11px] font-mono">
          <span className="text-slate-400 mr-1">FILTER:</span>
          {['all', 'victim', 'hazard', 'checkpoint', 'thermal', 'custom'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-2 py-0.5 rounded-lg uppercase transition-colors ${
                activeFilter === filter 
                  ? 'bg-[#00c2cb]/20 text-[#00c2cb] border border-[#00c2cb]/40 font-bold' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      )}

      {/* Log Entries Container */}
      <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1 font-mono text-xs">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-slate-500 border border-dashed border-[#162338] rounded-xl">
            <Sparkles className="w-5 h-5 mx-auto mb-1 text-slate-600" />
            <span>No mission incidents logged yet. Use quick tags above to record event telemetry.</span>
          </div>
        ) : (
          filtered.map((entry) => {
            let badgeBg = 'bg-purple-500/15 text-purple-400 border-purple-500/30';
            if (entry.type === 'victim') badgeBg = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
            else if (entry.type === 'hazard') badgeBg = 'bg-rose-500/15 text-rose-400 border-rose-500/40';
            else if (entry.type === 'checkpoint') badgeBg = 'bg-[#00c2cb]/15 text-[#00c2cb] border-[#00c2cb]/40';
            else if (entry.type === 'thermal') badgeBg = 'bg-amber-500/15 text-amber-400 border-amber-500/40';
            else if (entry.type === 'payload') badgeBg = 'bg-indigo-500/15 text-indigo-400 border-indigo-500/40';

            return (
              <div 
                key={entry.id}
                className="flex items-start justify-between p-2.5 rounded-xl bg-[#06090e] border border-[#162338] hover:border-slate-700 transition-colors"
              >
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-bold">
                      {entry.matchTime} REMAINING
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${badgeBg}`}>
                      {entry.tag}
                    </span>
                  </div>

                  <div className="flex-1 flex items-center justify-between gap-2">
                    {entry.notes && (
                      <span className="text-slate-200 font-sans text-xs">
                        {entry.notes}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 ml-auto flex items-center gap-2">
                      <span className="text-[#00c2cb]">{entry.temp}</span>
                      <span>{entry.hum}</span>
                      <span className="text-slate-600">• {entry.time}</span>
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onDeleteIncident(entry.id)}
                  className="ml-2 p-1 text-slate-500 hover:text-rose-400 transition-colors"
                  title="Delete record"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
