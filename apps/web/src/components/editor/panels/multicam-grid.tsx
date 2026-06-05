import React, { useState } from 'react';
import { LayoutGrid, CheckCircle2 } from 'lucide-react';

export function MulticamGrid({ isMulticamMode }: { isMulticamMode: boolean }) {
  const [activeCam, setActiveCam] = useState<number>(1);

  if (!isMulticamMode) return null;

  return (
    <div className="absolute inset-0 bg-black z-40 flex flex-col">
      <div className="h-8 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 justify-between">
         <div className="flex items-center gap-2">
           <LayoutGrid className="w-3 h-3 text-red-500" />
           <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Multicam Live Edit</span>
         </div>
         <span className="text-[10px] text-zinc-500">Press 1-4 to switch angles</span>
      </div>
      
      <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-1 bg-zinc-950 p-1">
        {[1, 2, 3, 4].map((camNum) => (
          // eslint-disable-next-line jsx-a11y/no-static-element-interactions
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events
          <div 
            key={camNum}
            onClick={() => setActiveCam(camNum)}
            className={`relative bg-zinc-900 border-2 rounded overflow-hidden cursor-pointer transition-colors ${activeCam === camNum ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'border-zinc-800 hover:border-zinc-600'}`}
          >
            {/* Placeholder for camera feeds */}
            <div className="absolute inset-0 flex items-center justify-center text-zinc-800 text-6xl font-black">
              CAM {camNum}
            </div>
            
            {activeCam === camNum && (
              <div className="absolute top-2 right-2 bg-red-500 rounded-full p-1 shadow-lg">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
            )}
            
            <div className="absolute bottom-2 left-2 bg-black/80 px-2 py-0.5 rounded text-[10px] text-white font-mono border border-zinc-700/50">
              Angle {camNum}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
