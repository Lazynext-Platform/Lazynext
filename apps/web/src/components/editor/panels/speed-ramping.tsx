import React from 'react';
import { Activity, FastForward } from 'lucide-react';

export function SpeedRamping({ updateSelectedClip, selectedClip }: { updateSelectedClip: any, selectedClip: any }) {
  if (!selectedClip) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 mt-4 border-t border-zinc-800 pt-4">
      <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 shadow-inner">
        <div className="flex items-center gap-2 mb-3">
          <FastForward className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Speed & Retime</h3>
        </div>
        
        <div className="mb-4">
          // eslint-disable-next-line jsx-a11y/label-has-associated-control
          <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2 block">Interpolation Mode</label>
          <select className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500">
            <option>Nearest Neighbor</option>
            <option>Frame Blend</option>
            <option>Optical Flow (Smooth)</option>
          </select>
        </div>

        <div>
          // eslint-disable-next-line jsx-a11y/label-has-associated-control
          <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2 block">Speed Ramp Curve</label>
          <div className="h-24 bg-zinc-900 border border-zinc-800 rounded relative overflow-hidden group cursor-crosshair">
            {/* Mock Curve Editor */}
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
              <path 
                d="M 0,50 C 30,50 40,20 50,20 C 60,20 70,80 100,80" 
                fill="none" 
                stroke="#22d3ee" 
                strokeWidth="2" 
                className="vector-path"
              />
              <circle cx="0" cy="50" r="4" fill="#22d3ee" className="cursor-pointer" />
              <circle cx="50" cy="20" r="4" fill="#22d3ee" className="cursor-pointer" />
              <circle cx="100" cy="80" r="4" fill="#22d3ee" className="cursor-pointer" />
            </svg>
            <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/20 to-transparent pointer-events-none"></div>
          </div>
          <div className="flex justify-between text-[9px] text-zinc-500 mt-1 font-mono">
             <span>0%</span>
             <span>100%</span>
             <span>200%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
