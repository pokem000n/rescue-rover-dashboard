import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Trash2, Copy, Check, Radio } from 'lucide-react';
import { soundManager } from '../utils/soundEffects';

export default function PacketLog({ logs = [], onClear, theme = 'light' }) {
  const [copied, setCopied] = useState(false);
  const logContainerRef = useRef(null);
  const isDark = theme === 'dark';

  // Auto-scroll to bottom on new log entry
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCopy = () => {
    const text = logs.map(l => `[${l.time}] ${l.type ? l.type + ' > ' : ''}${typeof l.data === 'string' ? l.data : JSON.stringify(l.data)}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      soundManager.playChirp();
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={`rounded-xl border flex flex-col overflow-hidden transition-all ${
      isDark ? 'bg-[#0a0f18] border-[#162338]' : 'bg-white border-slate-200 shadow-xs'
    }`}>
      {/* Terminal Title Bar */}
      <div className={`flex items-center justify-between px-3 py-1.5 border-b font-mono text-xs ${
        isDark ? 'bg-[#06090e] border-[#162338]' : 'bg-slate-100 border-slate-200'
      }`}>
        <div className="flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-[#00a8b5]" />
          <span className={`font-bold tracking-wider text-[11px] ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            SERIAL MONITOR • TELEMETRY BUS
          </span>
          <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            LIVE
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="text-slate-400 hidden sm:inline">
            {logs.length} FRAMES
          </span>

          <button
            onClick={handleCopy}
            disabled={logs.length === 0}
            className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors cursor-pointer disabled:opacity-40 ${
              isDark ? 'bg-[#0f1624] border-[#162338] text-slate-300 hover:text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
            title="Copy all telemetry logs"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'COPIED' : 'COPY'}</span>
          </button>

          <button
            onClick={() => {
              soundManager.playChirp();
              onClear();
            }}
            disabled={logs.length === 0}
            className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors cursor-pointer disabled:opacity-40 ${
              isDark ? 'bg-[#0f1624] border-[#162338] text-slate-300 hover:text-rose-400' : 'bg-white border-slate-300 text-slate-700 hover:text-rose-600 hover:bg-slate-50'
            }`}
            title="Clear serial buffer"
          >
            <Trash2 className="w-3 h-3" />
            <span>CLEAR</span>
          </button>
        </div>
      </div>

      {/* Terminal Screen (Console output) */}
      <div 
        ref={logContainerRef}
        className="p-2 bg-[#05080e] font-mono text-[10px] leading-relaxed h-28 sm:h-32 overflow-y-auto space-y-1 select-text scrollbar-thin"
      >
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-600">
            Ready. Waiting for incoming telemetry frames on bus...
          </div>
        ) : (
          logs.map((log, index) => {
            const isRx = log.type === 'RX';
            const isTx = log.type === 'TX';
            const isAlert = log.type === 'ALERT';
            const isSys = log.type === 'SYS';

            return (
              <div key={index} className="flex items-start gap-1.5 hover:bg-white/5 py-0.2 px-1 rounded transition-colors">
                <span className="text-slate-500 select-none shrink-0 font-mono">[{log.time}]</span>
                <span className={`shrink-0 font-bold select-none ${
                  isRx ? 'text-[#00c2cb]' : isTx ? 'text-amber-400' : isAlert ? 'text-rose-400' : 'text-purple-400'
                }`}>
                  {log.type ? `${log.type} >` : 'RX >'}
                </span>
                <span className={`break-all ${
                  isAlert ? 'text-rose-300 font-bold' : isTx ? 'text-amber-300' : isSys ? 'text-purple-300' : 'text-emerald-300'
                }`}>
                  {typeof log.data === 'string' ? log.data : JSON.stringify(log.data)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
