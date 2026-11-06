import React from 'react';
import { 
  X, 
  HelpCircle, 
  Smartphone, 
  Timer, 
  Flag, 
  FileText, 
  CheckCircle2, 
  Sparkles,
  Camera,
  Layers
} from 'lucide-react';
import { soundManager } from '../utils/soundEffects';

export default function UserGuideModal({ isOpen, onClose, theme = 'dark' }) {
  if (!isOpen) return null;

  const steps = [
    {
      step: '1',
      title: 'Pair Wireless Smartphone Camera',
      desc: 'Click "ADD CAM" in the camera window. Scan the generated QR code with any smartphone and allow camera access. The live video feed connects to the HUD instantly.',
      tip: 'Pair two phones concurrently as CAM 01 (Drive) and CAM 02 (Arm) to view side-by-side DUAL SPLIT screen.',
      icon: Smartphone,
      color: 'text-[#00c2cb] bg-[#00c2cb]/15 border-[#00c2cb]/30'
    },
    {
      step: '2',
      title: 'Operate Match Countdown Timer',
      desc: 'Press SPACEBAR or click the Play button in the header when the match begins. Amber warnings trigger at 3 minutes, with pulsing sirens during the final 60 seconds.',
      tip: 'Use the duration dropdown to select official RoboCup 8-minute rounds, 5-minute sprints, or 10-minute trials.',
      icon: Timer,
      color: 'text-amber-400 bg-amber-500/15 border-amber-500/30'
    },
    {
      step: '3',
      title: 'Log Incidents & Capture Snapshots',
      desc: 'When spotting a survivor, click "+ VICTIM SIGHTED" or press "S" to take an instant timestamped watermarked photo. Tag obstacles with "+ HAZARD / DEBRIS".',
      tip: 'Every entry records remaining match time, local timestamp, and real-time environmental telemetry.',
      icon: Flag,
      color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
    },
    {
      step: '4',
      title: 'Generate Official Debrief & PDF Report',
      desc: 'When the match finishes, click "DEBRIEF" (or press "R") to open the mission debrief certificate. Click "PRINT / PDF" for an official report to submit to the judges.',
      tip: 'In the Logbook tab, click "EXPORT LOG" to download the complete spreadsheet as a CSV file.',
      icon: FileText,
      color: 'text-purple-400 bg-purple-500/15 border-purple-500/30'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border transition-all ${
          theme === 'light' ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0a0f18] border-[#00c2cb]/40 text-white'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#06090e] border-[#162338]'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#00c2cb]/15 border border-[#00c2cb]/30 text-[#00c2cb]">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-tech tracking-wider">
                UIU RESCUE ROVER • QUICK OPERATOR GUIDE
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Essential 4-step workflow for operating the mission control system
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps List */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto font-mono text-xs">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx}
                className={`p-4 rounded-xl border transition-all ${
                  theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#0f1624] border-[#162338]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm border flex-shrink-0 ${item.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-xs sm:text-sm font-bold font-tech ${
                        theme === 'light' ? 'text-slate-900' : 'text-white'
                      }`}>
                        {item.title}
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00c2cb]/10 text-[#00c2cb] font-bold">
                        STEP {item.step}
                      </span>
                    </div>
                    <p className={`text-xs leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>
                      {item.desc}
                    </p>
                    <div className="pt-1 flex items-center gap-1.5 text-[11px] text-[#00c2cb]">
                      <Sparkles className="w-3 h-3 flex-shrink-0" />
                      <span className="font-semibold">{item.tip}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className={`px-6 py-3.5 border-t flex items-center justify-between font-mono text-xs ${
          theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#06090e] border-[#162338]'
        }`}>
          <span className="text-slate-400">
            UIU Rescue Rover Team (#URRT) • Mission Control
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#00c2cb] hover:bg-[#00e5ff] text-black font-bold shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
          >
            GOT IT
          </button>
        </div>

      </div>
    </div>
  );
}
