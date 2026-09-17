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
    <div className="rounded-2xl bg-[#0f1624] border border-[#162338] overflow-hidden shadow-xl hover:border-[#00c2cb]/30 transition-colors">
      
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-[#0a0f18]/95 border-b border-[#162338]">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-[#00c2cb]/10 border border-[#00c2cb]/30 text-[#00c2cb]">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-tech tracking-wider text-white uppercase flex items-center gap-2">
              <span>LIVE SENSOR TELEMETRY BUS (JSON FRAMES)</span>
              <span className="text-[10px] font-mono text-[#00c2cb] px-1.5 py-0.2 bg-[#00c2cb]/10 rounded border border-[#00c2cb]/30">
                #URRT
              </span>
            </h3>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <button
            onClick={handleCopy}
            disabled={logs.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#06090e] hover:bg-slate-800 text-slate-300 border border-[#162338] disabled:opacity-40 transition-colors"
            title="Copy logs"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span className="hidden sm:inline">{copied ? 'COPIED' : 'COPY'}</span>
          </button>

          <button
            onClick={onClear}
            disabled={logs.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#06090e] hover:bg-slate-800 text-slate-300 border border-[#162338] disabled:opacity-40 transition-colors"
            title="Clear logs"
          >
            <Trash2 className="w-3 h-3" />
            <span className="hidden sm:inline">CLEAR</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg bg-[#06090e] hover:bg-slate-800 text-slate-300 border border-[#162338] transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Log Output Body */}
      {isExpanded && (
        <div className="p-4 bg-black/95 font-mono text-[11px] h-48 overflow-y-auto space-y-1.5 scrollbar-thin">
          {logs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-600">
              No JSON frames recorded on bus yet.
            </div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="flex items-start gap-2 hover:bg-white/5 py-0.5 px-1.5 rounded transition-colors">
                <span className="text-slate-500 select-none shrink-0">[{log.time}]</span>
                <span className="text-[#00c2cb] shrink-0 font-semibold">RX &gt;</span>
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
