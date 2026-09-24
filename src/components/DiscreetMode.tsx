'use client';

import { useState } from 'react';
import { EyeOff } from 'lucide-react';

export default function DiscreetMode() {
  const [isDiscreet, setIsDiscreet] = useState(false);

  if (isDiscreet) {
    // Fake Calculator UI
    return (
      <div className="fixed inset-0 z-[100] bg-zinc-950 text-white flex flex-col p-4 font-mono">
        <div className="flex-1 flex items-end justify-end p-8 text-6xl font-light">
          0
        </div>
        <div className="grid grid-cols-4 gap-4 p-2">
          {['AC', '+/-', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '='].map((btn, i) => (
            <button 
              key={i} 
              className={`
                aspect-square rounded-full flex items-center justify-center text-2xl font-medium
                ${btn === '0' ? 'col-span-2 aspect-auto' : ''}
                ${['÷', '×', '-', '+', '='].includes(btn) ? 'bg-amber-500 text-white' : 
                  ['AC', '+/-', '%'].includes(btn) ? 'bg-zinc-300 text-black' : 'bg-zinc-800 text-white'}
              `}
              onClick={() => {
                if (btn === 'AC') setIsDiscreet(false);
              }}
            >
              {btn}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-zinc-600 mt-4 opacity-30">Press AC to exit</p>
      </div>
    );
  }

  return (
    <button 
      onClick={() => setIsDiscreet(true)}
      className="p-3 rounded-full glass-panel hover:bg-muted/50 text-muted-fg transition-colors"
      title="Quick Exit (Discreet Mode)"
    >
      <EyeOff className="w-5 h-5" />
    </button>
  );
}
