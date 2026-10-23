import React, { useEffect, useRef } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Square, Lock } from 'lucide-react';

const DIRECTIONS = [
  { key: 'forward', icon: ArrowUp, label: 'W', pos: 'col-start-2 row-start-1' },
  { key: 'left', icon: ArrowLeft, label: 'A', pos: 'col-start-1 row-start-2' },
  { key: 'stop', icon: Square, label: '⏹', pos: 'col-start-2 row-start-2' },
  { key: 'right', icon: ArrowRight, label: 'D', pos: 'col-start-3 row-start-2' },
  { key: 'backward', icon: ArrowDown, label: 'S', pos: 'col-start-2 row-start-3' },
];

export default function DriveControl({ mode, onDrive, theme }) {
  const locked = mode === 'autonomous';
  const isDark = theme !== 'light';
  const activeKeys = useRef(new Set());

  // Keyboard drive controls
  useEffect(() => {
    if (locked) return;
    const keyMap = { KeyW: 'forward', KeyS: 'backward', KeyA: 'left', KeyD: 'right' };

    const handleKeyDown = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      const dir = keyMap[e.code];
      if (dir && !activeKeys.current.has(dir)) {
        activeKeys.current.add(dir);
        onDrive(dir);
      }
    };

    const handleKeyUp = (e) => {
      const dir = keyMap[e.code];
      if (dir) {
        activeKeys.current.delete(dir);
        if (activeKeys.current.size === 0) {
          onDrive('stop');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [locked, onDrive]);

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${isDark ? 'bg-[#0a0f18] border-[#162338]' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center gap-2">
        <ArrowUp className="w-4 h-4 text-[#00c2cb]" />
        <h3 className={`text-xs font-mono font-bold tracking-widest ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          DRIVE CONTROL
        </h3>
        {locked && (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/40">
            <Lock className="w-2.5 h-2.5" /> AUTO LOCKED
          </span>
        )}
        {!locked && (
          <span className="ml-auto text-[10px] font-mono text-slate-500">WASD or D-Pad</span>
        )}
      </div>

      <div className={`relative ${locked ? 'opacity-40 pointer-events-none' : ''}`}>
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center z-10 rounded-xl">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-900/80 border border-violet-500/60 text-violet-300 text-xs font-mono font-bold">
              <Lock className="w-3.5 h-3.5" />
              DRIVE LOCKED — AUTONOMOUS
            </div>
          </div>
        )}
        <div className="grid grid-cols-3 grid-rows-3 gap-2 w-fit mx-auto">
          {DIRECTIONS.map(({ key, icon: Icon, label, pos }) => (
            <button
              key={key}
              onMouseDown={() => !locked && onDrive(key)}
              onMouseUp={() => !locked && key !== 'stop' && onDrive('stop')}
              onTouchStart={(e) => { e.preventDefault(); !locked && onDrive(key); }}
              onTouchEnd={() => !locked && key !== 'stop' && onDrive('stop')}
              className={`${pos} w-14 h-14 flex flex-col items-center justify-center rounded-xl border-2 transition-all select-none
                ${key === 'stop'
                  ? isDark ? 'bg-rose-900/40 border-rose-500/60 text-rose-400 hover:bg-rose-800/60 active:scale-95' : 'bg-rose-100 border-rose-400 text-rose-600'
                  : isDark ? 'bg-[#0f1624] border-[#1e2d47] text-slate-300 hover:border-[#00c2cb]/60 hover:text-[#00c2cb] active:scale-95 active:bg-[#00c2cb]/10' : 'bg-slate-100 border-slate-300 text-slate-700 hover:border-blue-400 hover:text-blue-600'
                }
                cursor-pointer disabled:opacity-50
              `}
              disabled={locked}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-mono font-bold opacity-60">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
