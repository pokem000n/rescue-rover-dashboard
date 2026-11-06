import React from 'react';
import { 
  X, 
  Award, 
  Printer, 
  Download, 
  Clock, 
  Thermometer, 
  Droplets, 
  ShieldAlert, 
  CheckCircle2, 
  Flag, 
  FileText 
} from 'lucide-react';
import { soundManager } from '../utils/soundEffects';

export default function MissionDebriefModal({
  isOpen,
  onClose,
  initialDuration = 480,
  matchSeconds = 0,
  history = [],
  packetCount = 0,
  incidents = [],
  snapshotsCount = 0,
  esp32Online = true
}) {
  if (!isOpen) return null;

  const elapsedSec = Math.max(0, initialDuration - matchSeconds);
  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Telemetry aggregates
  const temps = history.map(h => h.temperature).filter(t => typeof t === 'number');
  const hums = history.map(h => h.humidity).filter(h => typeof h === 'number');

  const minTemp = temps.length ? Math.min(...temps).toFixed(1) : '--';
  const maxTemp = temps.length ? Math.max(...temps).toFixed(1) : '--';
  const avgTemp = temps.length ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : '--';

  const minHum = hums.length ? Math.min(...hums).toFixed(1) : '--';
  const maxHum = hums.length ? Math.max(...hums).toFixed(1) : '--';
  const avgHum = hums.length ? (hums.reduce((a, b) => a + b, 0) / hums.length).toFixed(1) : '--';

  // Incident aggregates
  const victimsCount = incidents.filter(i => i.type === 'victim').length;
  const checkpointsCount = incidents.filter(i => i.type === 'checkpoint').length;
  const hazardsCount = incidents.filter(i => i.type === 'hazard').length;

  const handlePrint = () => {
    soundManager.playChirp();
    window.print();
  };

  const handleExportReport = () => {
    soundManager.playChirp();
    const report = {
      team: 'UIU Rescue Rover Team (#URRT)',
      competition: 'RoboCupJunior Rescue Rover',
      generatedAt: new Date().toISOString(),
      matchSummary: {
        totalAllocatedTime: formatTimer(initialDuration),
        elapsedRunTime: formatTimer(elapsedSec),
        remainingTime: formatTimer(matchSeconds),
        status: matchSeconds === 0 ? 'TIME EXPIRED' : 'MISSION COMPLETED',
        totalPacketsReceived: packetCount,
        linkStatus: esp32Online ? 'ONLINE' : 'DISCONNECTED'
      },
      environmentalTelemetry: {
        temperatureC: { min: minTemp, max: maxTemp, average: avgTemp },
        humidityPercent: { min: minHum, max: maxHum, average: avgHum }
      },
      missionEvents: {
        totalIncidents: incidents.length,
        victimsLocated: victimsCount,
        checkpointsCleared: checkpointsCount,
        hazardsEncountered: hazardsCount,
        inspectionSnapshotsTaken: snapshotsCount,
        logs: incidents
      }
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `URRT_Mission_Debrief_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-[#0a0f18] border border-[#00c2cb]/50 rounded-2xl shadow-2xl shadow-cyan-950/60 overflow-hidden my-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Printable Section Begins */}
        <div className="p-6 space-y-6">
          
          {/* Header Banner */}
          <div className="flex items-center justify-between pb-5 border-b border-[#162338]">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-[#00a8b5] to-[#00e5ff] shadow-[0_0_15px_rgba(0,194,203,0.4)]">
                <img 
                  src="/urrt-logo.png" 
                  alt="URRT Logo" 
                  className="w-full h-full rounded-full object-cover bg-black"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold font-tech tracking-wider text-white">
                    UIU RESCUE ROVER TEAM
                  </h2>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#00c2cb]/15 border border-[#00c2cb]/40 text-[#00c2cb]">
                    #URRT
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono tracking-widest mt-0.5 uppercase">
                  OFFICIAL ROBOCUP MISSION DEBRIEF REPORT
                </p>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors print:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mission Run Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-center">
            <div className="p-3 rounded-xl bg-[#0f1624] border border-[#162338]">
              <span className="text-[10px] text-slate-400 block uppercase">MISSION STATUS</span>
              <span className={`text-xs font-bold mt-1 inline-block px-2 py-0.5 rounded ${
                matchSeconds === 0 
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}>
                {matchSeconds === 0 ? 'TIME EXPIRED' : 'RUN COMPLETED'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#0f1624] border border-[#162338]">
              <span className="text-[10px] text-slate-400 block uppercase">ACTIVE RUN TIME</span>
              <span className="text-base font-bold text-white mt-0.5 block">
                {formatTimer(elapsedSec)} / {formatTimer(initialDuration)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#0f1624] border border-[#162338]">
              <span className="text-[10px] text-slate-400 block uppercase">DATA PACKETS</span>
              <span className="text-base font-bold text-[#00c2cb] mt-0.5 block">
                {packetCount} PKTS
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#0f1624] border border-[#162338]">
              <span className="text-[10px] text-slate-400 block uppercase">PHOTOS TAKEN</span>
              <span className="text-base font-bold text-purple-400 mt-0.5 block">
                {snapshotsCount} FRAMES
              </span>
            </div>
          </div>

          {/* Environmental Telemetry Analysis */}
          <div className="p-4 rounded-xl bg-[#0f1624] border border-[#162338] space-y-3 font-mono">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
              <Thermometer className="w-4 h-4 text-[#00c2cb]" />
              <span>ENVIRONMENTAL TELEMETRY RANGE</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Temperature Column */}
              <div className="p-3 rounded-lg bg-[#06090e] border border-slate-800">
                <span className="text-[11px] text-amber-400 font-bold block mb-1">TEMPERATURE RANGE</span>
                <div className="flex justify-between text-xs text-slate-300">
                  <span>MIN: <strong className="text-white">{minTemp}°C</strong></span>
                  <span>AVG: <strong className="text-[#00c2cb]">{avgTemp}°C</strong></span>
                  <span>MAX: <strong className="text-rose-400">{maxTemp}°C</strong></span>
                </div>
              </div>

              {/* Humidity Column */}
              <div className="p-3 rounded-lg bg-[#06090e] border border-slate-800">
                <span className="text-[11px] text-blue-400 font-bold block mb-1">HUMIDITY RANGE</span>
                <div className="flex justify-between text-xs text-slate-300">
                  <span>MIN: <strong className="text-white">{minHum}%</strong></span>
                  <span>AVG: <strong className="text-[#00c2cb]">{avgHum}%</strong></span>
                  <span>MAX: <strong className="text-white">{maxHum}%</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Mission Milestones & Field Incidents */}
          <div className="p-4 rounded-xl bg-[#0f1624] border border-[#162338] space-y-3 font-mono">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                <Flag className="w-4 h-4 text-emerald-400" />
                <span>MISSION MILESTONES & INCIDENTS SUMMARY</span>
              </span>
              <span className="text-xs text-slate-400 font-bold">
                {incidents.length} TOTAL EVENTS
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                <span className="text-[10px] block text-emerald-400/80 uppercase">VICTIMS SIGHTED</span>
                <strong className="text-base">{victimsCount}</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-[#00c2cb]/10 border border-[#00c2cb]/30 text-[#00c2cb]">
                <span className="text-[10px] block text-[#00c2cb]/80 uppercase">CHECKPOINTS CLEARED</span>
                <strong className="text-base">{checkpointsCount}</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300">
                <span className="text-[10px] block text-rose-400/80 uppercase">HAZARDS DETECTED</span>
                <strong className="text-base">{hazardsCount}</strong>
              </div>
            </div>

            {/* List of Recent Incidents */}
            {incidents.length > 0 && (
              <div className="max-h-36 overflow-y-auto space-y-1.5 pt-2 border-t border-[#162338] text-[11px]">
                {incidents.map(i => (
                  <div key={i.id} className="flex items-center justify-between p-1.5 rounded bg-[#06090e] border border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-mono">[{i.matchTime || i.time}]</span>
                      <strong className="text-[#00c2cb]">{i.tag}</strong>
                      {i.notes && <span className="text-slate-300 font-sans">{i.notes}</span>}
                    </div>
                    <span className="text-slate-400">{i.temp} / {i.hum}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Technical Certification */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#00a8b5]/10 to-transparent border border-[#00c2cb]/20 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>TELEMETRY INTEGRITY CERTIFIED BY URRT GROUND CONTROL</span>
            </div>
            <span className="text-slate-400">
              {new Date().toLocaleDateString()}
            </span>
          </div>

        </div>
        {/* Printable Section Ends */}

        {/* Action Footer (Hidden when printing) */}
        <div className="px-6 py-4 border-t border-[#162338] bg-[#06090e] flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0f1624] hover:bg-slate-800 border border-[#162338] text-white text-xs font-mono font-bold transition-all"
            >
              <Printer className="w-4 h-4 text-[#00c2cb]" />
              <span>PRINT / PDF</span>
            </button>
            <button
              onClick={handleExportReport}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00c2cb]/15 hover:bg-[#00c2cb]/25 border border-[#00c2cb]/40 text-[#00c2cb] text-xs font-mono font-bold transition-all"
            >
              <Download className="w-4 h-4" />
              <span>EXPORT JSON</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#00c2cb] hover:bg-[#00e5ff] text-[#06090e] text-xs font-mono font-bold shadow-lg shadow-cyan-500/20 transition-all"
          >
            DISMISS
          </button>
        </div>

      </div>
    </div>
  );
}
