import React, { useState } from 'react';
import { OctagonX } from 'lucide-react';

export default function EStopButton({ onEStop, size = 'normal' }) {
  const [activated, setActivated] = useState(false);

  const handleClick = () => {
    setActivated(true);
    onEStop();
    setTimeout(() => setActivated(false), 2000);
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 font-bold font-mono tracking-widest rounded-xl border-2 transition-all cursor-pointer select-none
        ${activated
          ? 'bg-rose-700 border-rose-400 text-white scale-95 shadow-rose-500/60 shadow-lg'
          : 'bg-rose-600 hover:bg-rose-500 border-rose-400 text-white hover:scale-105 shadow-rose-500/40 shadow-md animate-pulse'
        }
        ${size === 'large' ? 'px-8 py-4 text-lg' : 'px-4 py-2 text-xs'}
      `}
      title="Software E-Stop (Key: E)"
    >
      <OctagonX className={size === 'large' ? 'w-7 h-7' : 'w-4 h-4'} />
      {activated ? 'E-STOP SENT' : 'E-STOP'}
    </button>
  );
}
