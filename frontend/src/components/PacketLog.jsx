import React, { useState } from 'react';
import { Terminal, Trash2, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

export default function PacketLog({ logs = [], onClear }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = logs.map(l => `[${l.time}] ${JSON.stringify(l.data)}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="rounded-2xl bg-rover-card border border-rover-border overflow-hidden shadow-xl">
      
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-rover-panel/90 border-b border-rover-border">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-tech tracking-wider text-slate-200 uppercase">
              LIVE SENSOR TELEMETRY BUS (JSON FRAMES)
            </h3>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <button
            onClick={handleCopy}
            disabled={logs.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-50 transition-colors"
            title="Copy logs"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span className="hidden sm:inline">{copied ? 'COPIED' : 'COPY'}</span>
          </button>

          <button
            onClick={onClear}
            disabled={logs.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-50 transition-colors"
            title="Clear logs"
          >
            <Trash2 className="w-3 h-3" />
            <span className="hidden sm:inline">CLEAR</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Log Output Body */}
      {isExpanded && (
        <div className="p-4 bg-black/90 font-mono text-[11px] h-48 overflow-y-auto space-y-1.5 scrollbar-thin">
          {logs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-600">
              No JSON frames recorded on bus yet.
            </div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="flex items-start gap-2 hover:bg-white/5 py-0.5 px-1 rounded transition-colors">
                <span className="text-slate-500 select-none shrink-0">[{log.time}]</span>
                <span className="text-cyan-400 shrink-0">RX &gt;</span>
                <span className="text-emerald-300 break-all">
                  {typeof log.data === 'string' ? log.data : JSON.stringify(log.data)}
                </span>
              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
}
