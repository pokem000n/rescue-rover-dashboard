import React, { useState, useEffect, useRef } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Square, Lock, Gauge } from 'lucide-react';

const DIRECTIONS = [
  { key: 'forward', icon: ArrowUp, label: 'W', pos: 'col-start-2 row-start-1' },
  { key: 'left', icon: ArrowLeft, label: 'A', pos: 'col-start-1 row-start-2' },
  { key: 'stop', icon: Square, label: 'STOP', pos: 'col-start-2 row-start-2' },
  { key: 'right', icon: ArrowRight, label: 'D', pos: 'col-start-3 row-start-2' },
  { key: 'backward', icon: ArrowDown, label: 'S', pos: 'col-start-2 row-start-3' },
];

export default function DriveControl({ mode, onDrive, theme }) {
  const locked = mode === 'autonomous';
  const isDark = theme === 'dark';
  const activeKeys = useRef(new Set());
  const [activeDir, setActiveDir] = useState(null);
  const [speed, setSpeed] = useState(180); // 120 (slow), 180 (normal), 255 (turbo)

  // Keyboard drive controls (WASD, Arrows, Space)
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
    <div className={`rounded-xl border p-2.5 space-y-2 transition-all ${
      isDark ? 'bg-[#0a0f18] border-[#162338]' : 'bg-white border-slate-200 shadow-xs'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ArrowUp className="w-3.5 h-3.5 text-[#00a8b5]" />
          <h3 className={`text-xs font-mono font-bold tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            DRIVE CONTROLS
          </h3>
        </div>
        {locked ? (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/40 animate-pulse">
            <Lock className="w-2.5 h-2.5" /> LOCKED
          </span>
        ) : (
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono text-slate-400 mr-1">SPD:</span>
            {[
              { label: 'S', val: 120 },
              { label: 'N', val: 180 },
              { label: 'F', val: 255 }
            ].map(s => (
              <button
                key={s.val}
                disabled={locked}
                onClick={() => setSpeed(s.val)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition-all ${
                  speed === s.val
                    ? 'bg-[#00c2cb] text-black font-extrabold shadow-xs'
                    : isDark ? 'bg-[#162338] text-slate-400' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title={`Speed: ${s.val} PWM`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* D-Pad Container with Lock Overlay */}
      <div className={`relative ${locked ? 'opacity-40 pointer-events-none' : ''}`}>
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center z-20 backdrop-blur-xs rounded-xl">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-950/90 border border-violet-500 text-violet-200 text-xs font-mono font-bold shadow-lg">
              <Lock className="w-3.5 h-3.5 text-violet-400" />
              <span>DRIVE LOCKED (AUTONOMOUS)</span>
            </div>
          </div>
        )}

        {/* Tactile D-Pad Buttons */}
        <div className="grid grid-cols-3 grid-rows-3 gap-1.5 w-fit mx-auto">
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
                className={`${pos} w-13 h-12 flex flex-col items-center justify-center rounded-xl border transition-all select-none cursor-pointer disabled:opacity-50
                  ${isStop
                    ? isPressed || isDark
                      ? 'bg-rose-950/50 border-rose-500 text-rose-300 hover:bg-rose-900 active:scale-95'
                      : 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100'
                    : isPressed
                    ? 'bg-[#00c2cb] border-[#00c2cb] text-black scale-95 shadow-md shadow-cyan-500/30 font-bold'
                    : isDark
                    ? 'bg-[#0f1624] border-[#1e2d47] text-slate-200 hover:border-[#00c2cb]/60 hover:text-[#00c2cb] active:scale-95'
                    : 'bg-slate-100 border-slate-300 text-slate-700 hover:border-[#00c2cb] hover:text-[#00a8b5] active:scale-95 shadow-xs'
                  }
                `}
                disabled={locked}
                title={`Drive ${key.toUpperCase()} (Key: ${label})`}
              >
                <Icon className={`w-4 h-4 ${isPressed ? 'scale-110' : ''}`} />
                <span className="text-[8px] font-mono font-bold opacity-70">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={`text-center text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
        WASD Keys or Click D-Pad
      </div>
    </div>
  );
}
