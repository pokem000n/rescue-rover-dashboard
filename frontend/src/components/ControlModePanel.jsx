import React, { useState } from 'react';
import { Radio, Bot, Lock } from 'lucide-react';
import { soundManager } from '../utils/soundEffects';

export default function ControlModePanel({ mode, onModeChange, theme }) {
  const [showDeclareModal, setShowDeclareModal] = useState(false);
  const isDark = theme === 'dark';

  const handleModeClick = (newMode) => {
    if (newMode === mode) return;
    if (newMode === 'autonomous') {
      setShowDeclareModal(true);
    } else {
      soundManager.playChirp();
      onModeChange('teleop');
    }
  };

  const confirmAutonomous = () => {
    soundManager.playChirp();
    setShowDeclareModal(false);
    onModeChange('autonomous');
  };

  return (
    <>
      <div className={`rounded-xl border p-2.5 space-y-2 transition-all ${
        isDark ? 'bg-[#0a0f18] border-[#162338]' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-[#00a8b5]" />
            <h3 className={`text-xs font-mono font-bold tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              CONTROL MODE (TABLE 7: 20 MARKS)
            </h3>
          </div>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
            mode === 'autonomous'
              ? 'bg-violet-500/20 text-violet-600 dark:text-violet-300 border-violet-500/40 animate-pulse'
              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300'
          }`}>
            {mode === 'autonomous' ? '×4 MULTIPLIER' : '×1 MULTIPLIER'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Teleoperation Button */}
          <button
            onClick={() => handleModeClick('teleop')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2 font-mono font-bold text-xs transition-all cursor-pointer ${
              mode === 'teleop'
                ? isDark
                  ? 'bg-[#00c2cb]/20 border-[#00c2cb] text-[#00c2cb] shadow-sm'
                  : 'bg-cyan-50 border-cyan-500 text-cyan-800 shadow-xs'
                : isDark
                ? 'border-[#162338] text-slate-400 hover:text-slate-200 hover:bg-[#0f1624]'
                : 'border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Radio className="w-4 h-4" />
            <div className="text-left leading-tight">
              <div>TELEOP</div>
              <div className="text-[9px] opacity-70">Manual (×1)</div>
            </div>
          </button>

          {/* Autonomous Button */}
          <button
            onClick={() => handleModeClick('autonomous')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2 font-mono font-bold text-xs transition-all cursor-pointer ${
              mode === 'autonomous'
                ? isDark
                  ? 'bg-violet-500/20 border-violet-500 text-violet-300 shadow-sm'
                  : 'bg-violet-50 border-violet-500 text-violet-800 shadow-xs'
                : isDark
                ? 'border-[#162338] text-slate-400 hover:text-violet-300 hover:bg-[#0f1624]'
                : 'border-slate-200 text-slate-500 hover:text-violet-700 hover:bg-slate-50'
            }`}
          >
            <Bot className="w-4 h-4" />
            <div className="text-left leading-tight">
              <div>AUTONOMOUS</div>
              <div className="text-[9px] opacity-70">Locked (×4)</div>
            </div>
          </button>
        </div>
      </div>

      {/* Referee Declaration Confirmation Modal */}
      {showDeclareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className={`w-full max-w-sm rounded-2xl border p-5 shadow-2xl ${
            isDark ? 'bg-[#0d1220] border-violet-500/60 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2 rounded-xl bg-violet-500/20 text-violet-500">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold font-mono text-sm">DECLARE AUTONOMOUS MODE</h4>
                <p className="text-[10px] text-slate-500 font-mono">Rulebook V1.3 Mandatory Declaration</p>
              </div>
            </div>

            <p className="text-xs mb-4 text-slate-600 dark:text-slate-300 leading-relaxed">
              Declare to referee before starting. In Autonomous mode, <strong>manual drive controls are strictly locked</strong>. Successful attempt receives <strong>×4 multiplier</strong>.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setShowDeclareModal(false)}
                className="flex-1 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={confirmAutonomous}
                className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-mono font-bold cursor-pointer shadow-sm"
              >
                CONFIRM (×4)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
