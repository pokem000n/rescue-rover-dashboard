import React from 'react';
import { X, Keyboard, Command, Sparkles } from 'lucide-react';

export default function HotkeysModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'SPACE', label: 'Start / Pause Match Timer', category: 'Match Control' },
    { key: 'S', label: 'Take Camera Snapshot (Watermarked)', category: 'Camera' },
    { key: 'M', label: 'Mute / Unmute HUD Audio', category: 'Audio' },
    { key: 'F', label: 'Toggle Fullscreen Tactical HUD', category: 'Display' },
    { key: 'D', label: 'Toggle Simulation / Demo Mode', category: 'Simulation' },
    { key: 'E', label: 'Export Telemetry CSV Spreadsheet', category: 'Data' },
    { key: 'R', label: 'Open Mission Debrief Report', category: 'Mission' },
    { key: '?', label: 'Open / Close Hotkeys Reference', category: 'General' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-[#0a0f18] border border-[#00c2cb]/40 rounded-2xl shadow-2xl shadow-cyan-950/50 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#162338] bg-[#06090e]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#00c2cb]/15 border border-[#00c2cb]/30 text-[#00c2cb]">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-tech text-white tracking-wider">
                TACTICAL OPERATOR HOTKEYS
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Hands-on-keyboard rapid control shortcuts
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

        {/* Shortcuts List */}
        <div className="p-5 grid grid-cols-1 gap-2.5 font-mono">
          {shortcuts.map((sc, idx) => (
            <div 
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-xl bg-[#0f1624] border border-[#162338] hover:border-[#00c2cb]/30 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 w-24">
                  {sc.category}
                </span>
                <span className="text-xs text-slate-200">
                  {sc.label}
                </span>
              </div>
              <kbd className="px-2.5 py-1 rounded-lg bg-[#06090e] border border-[#00c2cb]/40 text-[#00c2cb] font-bold text-xs shadow-inner shadow-cyan-950/40 min-w-[36px] text-center">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#162338] bg-[#06090e] flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#00c2cb]" />
            Active across the entire HUD
          </span>
          <button 
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-[#00c2cb]/20 text-[#00c2cb] hover:bg-[#00c2cb]/30 font-semibold"
          >
            GOT IT
          </button>
        </div>

      </div>
    </div>
  );
}
