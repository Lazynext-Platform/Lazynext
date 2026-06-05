import React, { useState } from 'react';
import { Download, Film, AudioWaveform, MonitorUp } from 'lucide-react';
import { toast } from 'sonner';

export function ExportDelivery({ projectData }: { projectData: any }) {
  const [format, setFormat] = useState('mp4');
  const [preset, setPreset] = useState('youtube-4k');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    toast.promise(
      new Promise(resolve => setTimeout(resolve, 4000)),
      {
        loading: 'Rendering and compiling timeline metadata...',
        success: () => {
          setIsExporting(false);
          return `Successfully exported project as ${format.toUpperCase()}!`;
        },
        error: () => {
          setIsExporting(false);
          return 'Failed to export project.';
        }
      }
    );
  };

  return (
    <div className="absolute inset-0 bg-zinc-950 flex p-4 gap-4 z-40 overflow-hidden">
      {/* Left Sidebar: Render Settings */}
      <div className="w-[400px] flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden h-full shadow-2xl">
        <div className="flex items-center px-4 h-14 border-b border-zinc-800 bg-zinc-950/80">
          <Download className="w-5 h-5 text-indigo-400 mr-2" />
          <span className="text-sm font-bold text-zinc-100 tracking-wider">DELIVER</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 custom-scrollbar">
          
          <div>
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Professional Roundtrip</h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button 
                onClick={() => { setFormat('aaf'); setPreset('protools'); }}
                className={`flex flex-col items-center justify-center py-4 border rounded-lg transition-colors ${format === 'aaf' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'}`}
              >
                <AudioWaveform className="w-6 h-6 mb-2" />
                <span className="text-[10px] font-bold">ProTools (.AAF)</span>
              </button>
              <button 
                onClick={() => { setFormat('fcpxml'); setPreset('premiere'); }}
                className={`flex flex-col items-center justify-center py-4 border rounded-lg transition-colors ${format === 'fcpxml' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'}`}
              >
                <Film className="w-6 h-6 mb-2" />
                <span className="text-[10px] font-bold">FCPX / Premiere (.XML)</span>
              </button>
            </div>
            
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Video Export</h3>
            <div className="grid grid-cols-3 gap-2">
               <button onClick={() => setFormat('mp4')} className={`py-2 text-[10px] font-bold rounded border ${format === 'mp4' ? 'bg-blue-600/20 border-blue-500 text-blue-300' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>H.265 / MP4</button>
               <button onClick={() => setFormat('mov')} className={`py-2 text-[10px] font-bold rounded border ${format === 'mov' ? 'bg-blue-600/20 border-blue-500 text-blue-300' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>ProRes / MOV</button>
               <button onClick={() => setFormat('dcp')} className={`py-2 text-[10px] font-bold rounded border ${format === 'dcp' ? 'bg-blue-600/20 border-blue-500 text-blue-300' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>Cinema DCP</button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-medium text-zinc-500 block mb-1">Resolution</label>
              <select className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500">
                <option>3840 x 2160 Ultra HD</option>
                <option>1920 x 1080 HD</option>
                <option>4096 x 2160 DCI 4K</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-zinc-500 block mb-1">Hardware Output / SDI</label>
              <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 p-2 rounded">
                 <MonitorUp className="w-4 h-4 text-zinc-500" />
                 <span className="text-[10px] text-zinc-400">DeckLink 8K Pro (Not Detected)</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-zinc-800 bg-zinc-950">
           <button 
             onClick={handleExport}
             disabled={isExporting}
             className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold tracking-wider rounded-lg shadow-lg transition-colors"
           >
             {isExporting ? 'RENDERING...' : 'ADD TO RENDER QUEUE'}
           </button>
        </div>
      </div>

      {/* Right Area: Timeline Overview */}
      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col items-center justify-center relative overflow-hidden">
         <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500 via-zinc-900 to-zinc-950"></div>
         <div className="z-10 text-center">
            <Film className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-zinc-500 mb-2">Export Preparation</h2>
            <p className="text-sm text-zinc-600 max-w-sm mx-auto">
              Your timeline contains {projectData.tracks?.reduce((acc: number, track: any) => acc + (track.clips?.length || 0), 0) || 0} clips 
              across {projectData.tracks?.length || 0} tracks.
            </p>
         </div>
      </div>
    </div>
  );
}
