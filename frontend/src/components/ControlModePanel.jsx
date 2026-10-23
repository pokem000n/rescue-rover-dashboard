import React, { useState } from 'react';
import { Radio, Bot, ShieldAlert, Lock, Unlock } from 'lucide-react';

export default function ControlModePanel({ mode, onModeChange, onEStop, theme }) {
  const [showDeclareModal, setShowDeclareModal] = useState(false);
  const [pendingMode, setPendingMode] = useState(null);

  const handleModeClick = (newMode) => {
    if (newMode === mode) return;
    if (newMode === 'autonomous') {
      setPendingMode('autonomous');
      setShowDeclareModal(true);
    } else {
      // Switching back to teleop from autonomous
      onModeChange('teleop');
    }
  };

  const confirmAutonomous = () => {
    setShowDeclareModal(false);
    onModeChange('autonomous');
  };

  const isDark = theme !== 'light';

  return (
    <>
      <div className={`rounded-2xl border p-4 space-y-4 ${isDark ? 'bg-[#0a0f18] border-[#162338]' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-[#00c2cb]" />
          <h3 className={`text-xs font-mono font-bold tracking-widest ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            CONTROL MODE
          </h3>
          <span className={`ml-auto text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
            mode === 'autonomous'
              ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
              : 'bg-[#00c2cb]/20 text-[#00c2cb] border-[#00c2cb]/40'
          }`}>
            {mode === 'autonomous' ? '×4 MULTIPLIER' : '×1 MULTIPLIER'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Teleoperation Button */}
          <button
            onClick={() => handleModeClick('teleop')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
              mode === 'teleop'
                ? 'bg-[#00c2cb]/20 border-[#00c2cb] text-[#00c2cb] shadow-md shadow-cyan-500/20'
                : isDark
                  ? 'border-[#162338] text-slate-400 hover:border-slate-500 hover:text-slate-200'
                  : 'border-slate-200 text-slate-500 hover:border-slate-400'
            }`}
          >
            <Radio className="w-7 h-7" />
            <div className="text-center">
              <div className="font-bold font-mono text-sm tracking-wider">TELEOP</div>
              <div className="text-[10px] font-mono opacity-70">×1 Multiplier</div>
            </div>
            {mode === 'teleop' && <Unlock className="w-3.5 h-3.5" />}
          </button>

          {/* Autonomous Button */}
          <button
            onClick={() => handleModeClick('autonomous')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
              mode === 'autonomous'
                ? 'bg-violet-500/20 border-violet-500 text-violet-300 shadow-md shadow-violet-500/20'
                : isDark
                  ? 'border-[#162338] text-slate-400 hover:border-violet-500/50 hover:text-violet-300'
                  : 'border-slate-200 text-slate-500 hover:border-violet-400'
            }`}
          >
            <Bot className="w-7 h-7" />
            <div className="text-center">
              <div className="font-bold font-mono text-sm tracking-wider">AUTONOMOUS</div>
              <div className="text-[10px] font-mono opacity-70">×4 Multiplier</div>
            </div>
            {mode === 'autonomous' && <Lock className="w-3.5 h-3.5" />}
          </button>
        </div>

        {mode === 'autonomous' && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-mono">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <div>
              <div className="font-bold">AUTONOMOUS MODE ACTIVE</div>
              <div className="opacity-70 mt-0.5">Drive controls locked. Only E-Stop allowed.</div>
            </div>
          </div>
        )}
      </div>

      {/* Declare to Referee Confirmation Modal */}
      {showDeclareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className={`w-full max-w-md mx-4 rounded-2xl border-2 border-violet-500/60 p-6 shadow-2xl shadow-violet-500/20 ${isDark ? 'bg-[#0d1220]' : 'bg-white'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-violet-500/20 border border-violet-500/40">
                <Bot className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <h3 className={`font-bold font-mono text-lg tracking-wide ${isDark ? 'text-violet-200' : 'text-violet-900'}`}>
                  DECLARE AUTONOMOUS MODE
                </h3>
                <p className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Rulebook V1.3 — Required declaration to referee
                </p>
              </div>
            </div>

            <div className={`p-4 rounded-xl border mb-5 text-sm space-y-2 ${isDark ? 'bg-[#0a0f18] border-[#162338] text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
              <p>✅ <strong>Declare to referee</strong> before starting this autonomous attempt.</p>
              <p>✅ Multiplier will be <strong>×4</strong> if successful.</p>
              <p>⚠️ <strong>No control signals</strong> can be sent during autonomous operation.</p>
              <p>⚠️ If E-Stop is pressed, this attempt scores <strong>×0</strong>.</p>
              <p>⚠️ Cancelling to teleop reverts to <strong>×1</strong>.</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeclareModal(false); setPendingMode(null); }}
                className={`flex-1 py-2.5 rounded-xl border font-mono font-bold text-sm cursor-pointer transition-all ${isDark ? 'border-[#162338] text-slate-400 hover:border-slate-500' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}
              >
                CANCEL
              </button>
              <button
                onClick={confirmAutonomous}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 border border-violet-400 text-white font-mono font-bold text-sm cursor-pointer transition-all shadow-md shadow-violet-500/20"
              >
                CONFIRM — I'VE DECLARED
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
