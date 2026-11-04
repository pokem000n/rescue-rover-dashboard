import React, { useState, useEffect, useRef } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Square, Lock, Gauge } from 'lucide-react';

const DIRECTIONS = [
  { key: 'forward', icon: ArrowUp, label: 'W', pos: 'col-start-2 row-start-1' },
  { key: 'left', icon: ArrowLeft, label: 'A', pos: 'col-start-1 row-start-2' },
  { key: 'stop', icon: Square, label: 'SPACE', pos: 'col-start-2 row-start-2' },
  { key: 'right', icon: ArrowRight, label: 'D', pos: 'col-start-3 row-start-2' },
  { key: 'backward', icon: ArrowDown, label: 'S', pos: 'col-start-2 row-start-3' },
];

export default function DriveControl({ mode, onDrive, theme }) {
  const locked = mode === 'autonomous';
  const isDark = theme !== 'light';
  const activeKeys = useRef(new Set());
  const [activeDir, setActiveDir] = useState(null);
  const [speed, setSpeed] = useState(180); // 120 (slow), 180 (normal), 255 (turbo)

  // Keyboard drive controls
  useEffect(() => {
    if (locked) return;
    const keyMap = { 
      KeyW: 'forward', ArrowUp: 'forward',
      KeyS: 'backward', ArrowDown: 'backward',
      KeyA: 'left', ArrowLeft: 'left',
      KeyD: 'right', ArrowRight: 'right',
      Space: 'stop'
    };

    const handleKeyDown = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      const dir = keyMap[e.code];
      if (dir) {
        e.preventDefault();
        if (!activeKeys.current.has(dir)) {
          activeKeys.current.add(dir);
          setActiveDir(dir);
          onDrive(dir, speed);
        }
      }
    };

    const handleKeyUp = (e) => {
      const dir = keyMap[e.code];
      if (dir) {
        activeKeys.current.delete(dir);
        if (activeKeys.current.size === 0) {
          setActiveDir(null);
          onDrive('stop', speed);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [locked, onDrive, speed]);

  const handlePressStart = (dir) => {
    if (locked) return;
    setActiveDir(dir);
    onDrive(dir, speed);
  };

  const handlePressEnd = (dir) => {
    if (locked) return;
    if (dir !== 'stop') {
      setActiveDir(null);
      onDrive('stop', speed);
    }
  };

  return (
    <div className={`rounded-2xl border p-4 space-y-3.5 transition-all ${
      isDark ? 'bg-[#0a0f18] border-[#162338]' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <ArrowUp className="w-4 h-4 text-[#00c2cb]" />
        <h3 className={`text-xs font-mono font-bold tracking-widest ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          DRIVE COCKPIT
        </h3>
        {locked ? (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/40 animate-pulse">
            <Lock className="w-2.5 h-2.5" /> AUTO LOCKED (×4)
          </span>
        ) : (
          <span className="ml-auto text-[10px] font-mono text-emerald-500 font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            MANUAL ACTIVE
          </span>
        )}
      </div>

      {/* Speed Selector */}
      <div className={`flex items-center justify-between p-2 rounded-xl border text-xs font-mono ${
        isDark ? 'bg-[#06090e] border-[#162338]' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Gauge className="w-3.5 h-3.5 text-[#00c2cb]" />
          <span>SPEED:</span>
        </div>
        <div className="flex gap-1">
          {[
            { label: 'SLOW', val: 120 },
            { label: 'NORM', val: 180 },
            { label: 'FAST', val: 255 }
          ].map(s => (
            <button
              key={s.val}
              disabled={locked}
              onClick={() => setSpeed(s.val)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                speed === s.val
                  ? 'bg-[#00c2cb] text-black shadow-sm'
                  : isDark
                  ? 'bg-[#0f1624] text-slate-400 hover:text-white'
                  : 'bg-slate-200 text-slate-600 hover:text-black'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Controls Container with Lock Overlay */}
      <div className={`relative ${locked ? 'opacity-40 pointer-events-none' : ''}`}>
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center z-20 backdrop-blur-[2px] rounded-xl">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-950/90 border-2 border-violet-500 text-violet-200 text-xs font-mono font-bold shadow-xl shadow-violet-500/30">
              <Lock className="w-4 h-4 text-violet-300" />
              <span>DRIVE LOCKED (AUTONOMOUS)</span>
            </div>
          </div>
        )}

        {/* D-Pad Buttons */}
        <div className="grid grid-cols-3 grid-rows-3 gap-2 w-fit mx-auto py-1">
          {DIRECTIONS.map(({ key, icon: Icon, label, pos }) => {
            const isPressed = activeDir === key;
            const isStop = key === 'stop';
            return (
              <button
                key={key}
                onMouseDown={() => handlePressStart(key)}
                onMouseUp={() => handlePressEnd(key)}
                onTouchStart={(e) => { e.preventDefault(); handlePressStart(key); }}
                onTouchEnd={() => handlePressEnd(key)}
                className={`${pos} w-16 h-16 sm:w-16 sm:h-16 flex flex-col items-center justify-center rounded-2xl border-2 transition-all select-none cursor-pointer disabled:opacity-50
                  ${isStop
                    ? isPressed || isDark
                      ? 'bg-rose-950/40 border-rose-500/60 text-rose-300 hover:bg-rose-900/60 active:scale-95'
                      : 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100'
                    : isPressed
                    ? 'bg-[#00c2cb] border-[#00c2cb] text-black scale-95 shadow-lg shadow-cyan-500/40 font-bold'
                    : isDark
                    ? 'bg-[#0f1624] border-[#1e2d47] text-slate-200 hover:border-[#00c2cb]/60 hover:text-[#00c2cb] active:scale-95'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-[#00c2cb] hover:text-[#00c2cb] active:scale-95 shadow-xs'
                  }
                `}
                disabled={locked}
                title={`Drive ${key.toUpperCase()} (${label})`}
              >
                <Icon className={`w-5 h-5 ${isPressed ? 'scale-110' : ''}`} />
                <span className="text-[9px] font-mono font-bold opacity-70 mt-0.5">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={`text-center text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
        Use Keyboard (WASD / Arrows) or Click Buttons
      </div>
    </div>
  );
}
