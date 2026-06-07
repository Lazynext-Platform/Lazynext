"use client";

import React from "react";
import { toast } from "sonner";

interface MediaPoolSidebarProps {
  assets: any;
  frame: any;
  handleAiVoiceover: any;
  handleAutoSubtitleTrack: any;
  handleCreateMulticam: any;
  handleFileUpload: any;
  handleRestoreRippleWord: any;
  handleDiffusionPrompt: any;
  handleTelepathicLink: any;
  setInstalledPlugins: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleDragStart: (e: React.DragEvent, asset: any) => void;
  setAssets: any;
  handleAddNodeToGraph: any;
  handleVisualDebugger: any;
  handleTranscribeAudio: any;
  handleMorphLips: any;
  handleDubVoiceTrack: any;
  handleSceneCutDetection: any;
  handleSyncAudioVideo: any;
  isEmotionHeatmapMode: any;
  setIsEmotionHeatmapMode: any;
  markers: any;
  setFrame: (f: number) => void;
  installedPlugins: any;
  mediaFilter: any;
  mediaPoolPos: any;
  mediaSearchQuery: any;
  projectData: any;
  setMediaFilter: any;
  setMediaPoolPos: any;
  setMediaSearchQuery: any;
  setSidebarTab: any;
  setSplitAudioVideoOnImport: any;
  sidebarTab: any;
  sidebarWidth: any;
  splitAudioVideoOnImport: any;
}

export function MediaPoolSidebar({
    assets,
    frame,
    handleAiVoiceover,
    handleAutoSubtitleTrack,
    handleCreateMulticam,
    handleFileUpload,
    handleRestoreRippleWord,
    handleDiffusionPrompt,
    handleTelepathicLink,
    markers,
    setFrame,
    installedPlugins,
    mediaFilter,
    mediaPoolPos,
    mediaSearchQuery,
    projectData,
    setMediaFilter,
    setMediaPoolPos,
    setMediaSearchQuery,
    setSidebarTab,
    setSplitAudioVideoOnImport,
    sidebarTab,
    sidebarWidth,
    splitAudioVideoOnImport,
    setIsEmotionHeatmapMode,
    isEmotionHeatmapMode,
    handleSyncAudioVideo,
    handleSceneCutDetection,
    handleDubVoiceTrack,
    handleMorphLips,
    handleTranscribeAudio,
    handleVisualDebugger,
    handleAddNodeToGraph,
    setAssets,
    setInstalledPlugins,
    handleDragStart
}: MediaPoolSidebarProps) {
  return (
<aside
        className={`${mediaPoolPos.floating ? 'fixed z-50 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] resize border border-zinc-700 bg-zinc-900/95 backdrop-blur overflow-hidden flex flex-col' : 'border-r border-zinc-700 bg-zinc-900 flex flex-col h-full shrink-0'} transition-shadow`}
        style={mediaPoolPos.floating ? { left: mediaPoolPos.x, top: mediaPoolPos.y, width: 300, height: 600 } : { width: sidebarWidth }}
      >
        {/* Floating Header */}
        {mediaPoolPos.floating && (
           // eslint-disable-next-line jsx-a11y/no-static-element-interactions
           <div
             className="h-8 bg-zinc-800 flex items-center justify-between px-3 cursor-move border-b border-zinc-700 select-none"
             onMouseDown={(e: React.MouseEvent) => {
                const startX = e.clientX - mediaPoolPos.x;
                const startY = e.clientY - mediaPoolPos.y;
                const onMove = (ev: MouseEvent) => setMediaPoolPos((p: { floating: boolean; x: number; y: number }) => ({ ...p, x: ev.clientX - startX, y: ev.clientY - startY }));
                const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
             }}
           >
             <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-400 font-medium tracking-wide">MEDIA POOL</span>
                <label className="flex items-center gap-1.5 cursor-pointer ml-4" title="Split Audio/Video on Import">
                  <input
                    type="checkbox"
                    checked={splitAudioVideoOnImport}
                    onChange={(e) => setSplitAudioVideoOnImport(e.target.checked)}
                    className="w-3 h-3 bg-zinc-800 border-zinc-700 rounded accent-indigo-500 cursor-pointer"
                  />
                  <span className="text-[10px] text-zinc-400 uppercase">Split A/V</span>
                </label>
              </div>
              <button onClick={() => setMediaPoolPos(p => ({...p, floating: false}))} className="text-zinc-400 hover:text-white p-0.5 rounded hover:bg-zinc-700">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
           </div>
        )}

        <div className="flex border-b border-zinc-700 items-center">
          <button
            className={`flex-1 py-3 text-xs font-semibold tracking-wider transition-colors ${sidebarTab === 'media' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-zinc-400 hover:text-zinc-300'}`}
            onClick={() => setSidebarTab('media')}
          >MEDIA</button>
          <button
            className={`flex-1 py-3 text-xs font-semibold tracking-wider transition-colors ${sidebarTab === 'titles' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-zinc-400 hover:text-zinc-300'}`}
            onClick={() => setSidebarTab('titles')}
          >TITLES</button>
          <button
            className={`flex-1 py-3 text-[10px] font-semibold tracking-wider transition-colors ${sidebarTab === 'effects' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-zinc-400 hover:text-zinc-300'}`}
            onClick={() => setSidebarTab('effects')}
          >FX</button>
          <button
            className={`flex-1 py-3 text-[10px] font-semibold tracking-wider transition-colors ${sidebarTab === 'transitions' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-zinc-400 hover:text-zinc-300'}`}
            onClick={() => setSidebarTab('transitions')}
          >TRANS</button>
          <button
            className={`flex-1 py-3 text-[10px] font-semibold tracking-wider transition-colors ${sidebarTab === 'history' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-zinc-400 hover:text-zinc-300'}`}
            onClick={() => setSidebarTab('history')}
            title="Undo History"
          >HIST</button>
          <button
            className={`flex-1 py-3 text-[10px] font-semibold tracking-wider transition-colors ${sidebarTab === 'transcript' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-zinc-400 hover:text-zinc-300'}`}
            onClick={() => setSidebarTab('transcript')}
            title="AI Transcript"
          >TEXT</button>
          <button
            className={`flex-1 py-3 text-[10px] font-semibold tracking-wider transition-colors ${sidebarTab === 'index' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-zinc-400 hover:text-zinc-300'}`}
            onClick={() => setSidebarTab('index')}
          >INDEX</button>
          <button
            className={`flex-1 py-3 text-[10px] font-semibold tracking-wider transition-colors ${sidebarTab === 'fusion' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-zinc-400 hover:text-zinc-300'}`}
            onClick={() => setSidebarTab('fusion')}
            title="Node Compositing"
          >FUSION</button>
          {/* Cloud Asset Library (Phase 196) */}
          <button
            className={`flex-1 py-3 text-[10px] font-semibold tracking-wider transition-colors ${sidebarTab === 'stock' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-zinc-400 hover:text-zinc-300'}`}
            onClick={() => setSidebarTab('stock')}
            title="Cloud Asset Library"
          >STOCK</button>
          {/* Phase 24: Extension API / Plugins */}
          <button
            className={`flex-1 py-3 text-[10px] font-semibold tracking-wider transition-colors ${sidebarTab === 'plugins' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-zinc-400 hover:text-zinc-300'}`}
            onClick={() => setSidebarTab('plugins')}
            title="Extension API & Plugins"
          >PLUGINS</button>
        </div>
        {/* ... (sidebar content) */}

        {sidebarTab === 'media' && (
          <div className="px-4 pt-4 pb-2 flex flex-col gap-3 shrink-0">
            <div className="relative">
              <svg className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                placeholder="Search Media..."
                value={mediaSearchQuery}
                onChange={e => setMediaSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus-ring focus:border-indigo-500 transition-colors"
              />
            </div>
            <div className="flex gap-1 bg-zinc-950 p-1 rounded border border-zinc-700 overflow-x-auto custom-scrollbar">
              {['all', 'video', 'audio', 'image'].map(f => (
                <button
                  key={f}


                  onClick={() => setMediaFilter(f as any)}
                  className={`flex-1 px-2 py-1 text-[10px] uppercase font-bold rounded transition-colors ${mediaFilter === f ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-300'}`}
                >
                  {f}
                </button>
              ))}
              <button
                  onClick={() => setIsEmotionHeatmapMode(!isEmotionHeatmapMode)}
                  className={`flex-1 px-2 py-1 text-[10px] uppercase font-bold rounded transition-colors ${isEmotionHeatmapMode ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-300'}`}
                >
                  HEATMAP
                </button>
            </div>

            {/* Smart Bins (Phase 182) */}
            <div className="flex gap-1 overflow-x-auto custom-scrollbar mt-1">
              <span className="text-[10px] text-zinc-400 font-bold uppercase py-1 mr-1 shrink-0">Smart Bins:</span>
              {['B-Roll', 'Interviews', 'Action', 'Faces (Actor A)', 'Faces (Actor B)'].map(bin => (
                <button key={bin} className="shrink-0 px-2 py-0.5 text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-full hover:bg-indigo-500/20 transition-colors whitespace-nowrap">
                  {bin}
                </button>
              ))}
            </div>

            <button
              className="mt-1 w-full flex items-center justify-center gap-2 text-[10px] font-bold text-zinc-300 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700 p-1.5 rounded uppercase tracking-wider transition-colors"
              onClick={handleCreateMulticam}
              title="Create a Multicam Sequence from selected clips"
            >
              🎥 Create Multicam Sequence
            </button>

            <button
              className="mt-2 w-full flex items-center justify-center gap-2 text-[10px] font-bold text-zinc-300 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700 p-1.5 rounded uppercase tracking-wider transition-colors"
              onClick={handleSyncAudioVideo}
              title="Automatically sync audio and video clips based on waveform analysis"
            >
              〰️ Auto-Sync Audio by Waveform
            </button>

            <div className="mt-4 pt-3 border-t border-zinc-700/50">
              <label className="text-[10px] text-zinc-400 font-bold uppercase block mb-1">🤖 Generative AI B-Roll (Sora/Runway)</label>
              <div className="flex flex-col gap-2">
                <textarea
                  placeholder="E.g., Cinematic drone shot of a cyberpunk city at night, neon lights reflecting on wet streets..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 min-h-[60px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      const val = e.currentTarget.value;
                      if (!val.trim()) return;
                      e.currentTarget.value = "";
                      const genPromise = new Promise<void>(resolve => setTimeout(resolve, 3000));
                      toast.promise(genPromise, {
                        loading: `Generating AI Video for: "${val.substring(0, 15)}..."`,
                        success: 'AI Video added to Media Pool!',
                        error: 'Failed to generate video.'
                      });

                      genPromise.then(() => {
                        const newAsset = {
                          id: `ai-gen-${Date.now()}`,
                          type: 'video',
                          name: `AI: ${val.substring(0, 20)}...`,
                          url: 'simulated_ai_broll.mp4',
                          duration_frames: 120
                        };
                        setAssets((prev: any[]) => [newAsset, ...prev]);
                      });
                    }
                  }}
                />
                <button
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[10px] font-bold py-1.5 rounded uppercase tracking-wider transition-all shadow-md"
                  onClick={(e) => {
                    const textarea = e.currentTarget.previousElementSibling as HTMLTextAreaElement;
                    const val = textarea.value;
                    if (!val.trim()) {
                      toast.error("Please enter a prompt first.");
                      return;
                    }
                    textarea.value = "";
                    const genPromise = new Promise<void>(resolve => setTimeout(resolve, 3000));
                    toast.promise(genPromise, {
                      loading: `Generating AI Video for: "${val.substring(0, 15)}..."`,
                      success: 'AI Video added to Media Pool!',
                      error: 'Failed to generate video.'
                    });

                    genPromise.then(() => {
                      const newAsset = {
                        id: `ai-gen-${Date.now()}`,
                        type: 'video',
                        name: `AI: ${val.substring(0, 20)}...`,
                        url: 'simulated_ai_broll.mp4',
                        duration_frames: 120
                      };
                      setAssets((prev: any[]) => [newAsset, ...prev]);
                    });
                  }}
                >
                  Generate Text-to-Video
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 flex-1 overflow-y-auto p-4 custom-scrollbar">
          {sidebarTab === 'media' && (
            <>
              {/* Phase 21: Multi-Cam Generation */}
              <button
                className="w-full mb-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-300 text-[10px] font-bold py-1.5 rounded flex items-center justify-center gap-1.5 transition-colors"
                onClick={() => {
                  const vids = assets.filter(a => a.type === 'video');
                  if (vids.length < 2) {
                    toast.error('Need at least 2 video clips to create a Multi-Cam sequence.');
                    return;
                  }
                  toast.promise(
                    new Promise<void>(resolve => setTimeout(resolve, 2000)),
                    {
                      loading: 'Syncing angles via Audio Waveforms...',
                      success: 'Multi-Cam Clip Created!',
                      error: 'Sync failed.'
                    }
                  ).then(() => {
                    const newAsset = {
                      id: `multicam-${Date.now()}`,
                      type: 'multicam',
                      name: `Multi-Cam Sync (${vids.length} Angles)`,
                      angles: vids.map(v => v.id),
                      duration_frames: vids[0]?.duration_frames || 200
                    };
                    setAssets((prev: any[]) => [newAsset, ...prev]);
                  });
                }}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                CREATE MULTI-CAM (SYNC AUDIO)
              </button>

              {assets.filter(a => {
                if (mediaFilter !== 'all' && a.type !== mediaFilter) return false;
                if (mediaSearchQuery && !a.name.toLowerCase().includes(mediaSearchQuery.toLowerCase())) return false;
                return true;
          }).map(asset => (
            <div
              key={asset.id}
              draggable
              onDragStart={(e) => handleDragStart(e, asset)}
              className="group relative flex flex-col p-2 bg-zinc-950/50 rounded-lg border border-zinc-700/50 cursor-grab active:cursor-grabbing hover:border-indigo-500/50 hover:bg-zinc-900 transition-all shadow-sm"
            >
              {asset.type === 'video' || asset.type === 'image' ? (
                <div className="w-full aspect-video bg-black rounded overflow-hidden mb-2 border border-zinc-700/50 relative">
                  {asset.thumbnail ? (
                    <img src={asset.thumbnail} alt={asset.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  ) : asset.type === 'image' ? (
                    <img src={asset.url} alt={asset.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  ) : (

                    <video src={asset.url} preload="metadata" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" onLoadedMetadata={(e) => { e.currentTarget.currentTime = Math.min(1.0, e.currentTarget.duration / 2); }} />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                    {asset.type === 'video' && <svg className="w-6 h-6 text-white drop-shadow-md" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z" /></svg>}
                  </div>
                </div>
              ) : asset.type === 'audio' ? (
                <div className="w-full h-10 bg-zinc-900 rounded mb-2 border border-zinc-700/50 flex items-center justify-center relative overflow-hidden">
                  <svg className="w-5 h-5 text-zinc-400 absolute left-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c-1.105 0-2-.895-2-2s.895-2 2-2 2 .895 2 2-.895 2-2 2zm12-3c-1.105 0-2-.895-2-2s.895-2 2-2 2 .895 2 2-.895 2-2 2zM9 10l12-3" /></svg>
                  <div className="w-full h-full opacity-30 text-indigo-400">
                    {asset.peaks ? (
                      <div className="flex items-center h-full px-8 gap-0.5 w-full">
                        {asset.peaks.slice(0, 40).map((p: number, i: number) => (
                           <div key={i} className="flex-1 bg-current rounded-full" style={{ height: `${Math.max(10, p * 100)}%` }} />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : asset.type === 'multicam' ? (
                <div className="w-full aspect-video bg-zinc-900 rounded overflow-hidden mb-2 border border-indigo-500/50 relative flex items-center justify-center p-1 gap-1">
                  <div className="flex-1 h-full bg-zinc-800 rounded"></div>
                  <div className="flex-1 h-full bg-zinc-800 rounded"></div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                    <svg className="w-6 h-6 text-indigo-400 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  </div>
                </div>
              ) : null}

              <div className="flex items-center justify-between w-full px-1">
                <span className="truncate text-xs font-medium text-zinc-300 group-hover:text-white transition-colors flex-1 pr-2" title={asset.name}>{asset.name}</span>
                {asset.type === 'video' && (
                  <button
                    onClick={() => handleSceneCutDetection()}
                    className="opacity-0 group-hover:opacity-100 mr-1 text-[10px] bg-zinc-700 hover:bg-indigo-600 px-1 rounded transition-all"
                    title="Scene Cut Detection"
                  >✂️</button>
                )}
                <span className="text-[10px] text-zinc-400 font-mono tracking-wider bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700/50 shrink-0">{asset.duration_frames}f</span>
              </div>
            </div>
          ))}
            </>
          )}

          {sidebarTab === 'titles' && (
            <div className="col-span-full mb-2 flex gap-2">
              <button
                onClick={handleAutoSubtitleTrack}
                className="flex-1 bg-amber-600/80 hover:bg-amber-500 text-white text-xs font-medium py-2 rounded border border-amber-500 transition-colors flex items-center justify-center gap-2"
              >
                🎙️ Auto-Generate Subtitles (AI)
              </button>
              <button
                className="flex-1 items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 rounded transition-colors text-xs font-medium border border-indigo-500/30 flex"
                onClick={handleAiVoiceover}
                title="Generate AI Voiceover"
              >
                <span>AI Voiceover</span>
              </button>
            </div>
          )}

          {sidebarTab === 'titles' && [
            { name: "Basic Title", type: "text", text_content: "Basic Title", font_family: "Inter", color: "#ffffff", font_size: 48 },
            { name: "Subtitle", type: "text", text_content: "Subtitle Text", font_family: "Inter", color: "#ffffff", font_size: 24, has_bg: true, bg_padding: 8 },
            { name: "Impact Heading", type: "text", text_content: "IMPACT", font_family: "Impact", color: "#ffea00", font_size: 72, drop_shadow_distance: 10, drop_shadow_color: "#000000" },
            { name: "Cinematic", type: "text", text_content: "CINEMATIC", font_family: "Georgia", color: "#ffffff", font_size: 36, letter_spacing: 10 }
          ].map((preset, i) => (
            <div
              key={i}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/json", JSON.stringify({ type: "preset", preset, isEffect: false }));
                e.dataTransfer.effectAllowed = "copy";
              }}
              className="p-4 bg-zinc-950/50 rounded-lg border border-zinc-700/50 cursor-grab active:cursor-grabbing hover:border-indigo-500/50 hover:bg-zinc-900 transition-all shadow-sm flex flex-col items-center justify-center min-h-20"
            >
               <span className="text-xl font-bold text-white mb-2" style={{ fontFamily: preset.font_family, color: preset.color }}>T</span>
               <span className="text-xs font-medium text-zinc-400">{preset.name}</span>
            </div>
          ))}

          {sidebarTab === 'effects' && [
            { name: "Cross Dissolve", effectType: "cross_dissolve", icon: "🔗" },
            { name: "Black & White", effectType: "black_and_white", icon: "🎞️" },
            { name: "Pixelate", effectType: "pixelate", icon: "👾" },
            { name: "Edge Detect", effectType: "edge_detect", icon: "✏️" },
            { name: "Color Space Transform", effectType: "cst", icon: "🌈" },
            { name: "Content-Aware Fill", effectType: "content_aware", icon: "✨" },
            { name: "Advanced 3D Keyer", effectType: "3d_keyer", icon: "🟩" },
            { name: "AI Depth of Field (Bokeh)", effectType: "ai_bokeh", icon: "📷" },
          ].map((preset, i) => (
            <div
              key={i}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/json", JSON.stringify({ type: "preset", preset, isEffect: true }));
                e.dataTransfer.effectAllowed = "copy";
              }}
              className="p-4 bg-zinc-950/50 rounded-lg border border-zinc-700/50 cursor-grab active:cursor-grabbing hover:border-purple-500/50 hover:bg-zinc-900 transition-all shadow-sm flex flex-col items-center justify-center min-h-20"
            >
               <span className="text-2xl mb-2">{preset.icon}</span>
               <span className="text-xs font-medium text-zinc-400">{preset.name}</span>
            </div>
          ))}

          {sidebarTab === 'transitions' && (
            <>
              {[
                {
                  category: 'Dissolves',
                  items: [
                    { name: 'Cross Dissolve', effectType: 'cross_dissolve', duration: 30, gradient: 'from-white/20 to-transparent' },
                    { name: 'Additive Dissolve', effectType: 'additive_dissolve', duration: 30, gradient: 'from-amber-300/20 to-transparent' },
                    { name: 'Dip to Black', effectType: 'dip_to_black', duration: 20, gradient: 'from-black to-transparent' },
                    { name: 'Dip to White', effectType: 'dip_to_white', duration: 20, gradient: 'from-white/40 to-transparent' },
                  ]
                },
                {
                  category: 'Audio',
                  items: [
                    { name: 'Constant Power', effectType: 'audio_constant_power', duration: 30, gradient: 'from-blue-400/20 to-transparent' },
                    { name: 'Constant Gain', effectType: 'audio_constant_gain', duration: 30, gradient: 'from-sky-300/20 to-transparent' },
                    { name: 'Exponential Fade', effectType: 'audio_exponential_fade', duration: 30, gradient: 'from-indigo-400/20 to-transparent' },
                  ]
                },
                {
                  category: 'Wipes',
                  items: [
                    { name: 'Wipe Left', effectType: 'wipe_left', duration: 20, gradient: 'from-indigo-500/20 to-transparent' },
                    { name: 'Wipe Right', effectType: 'wipe_right', duration: 20, gradient: 'from-transparent to-indigo-500/20' },
                    { name: 'Wipe Up', effectType: 'wipe_up', duration: 20, gradient: 'from-cyan-500/20 to-transparent' },
                    { name: 'Wipe Down', effectType: 'wipe_down', duration: 20, gradient: 'from-transparent to-cyan-500/20' },
                    { name: 'Clock Wipe', effectType: 'clock_wipe', duration: 30, gradient: 'from-purple-500/20 to-transparent' },
                  ]
                },
                {
                  category: 'Slides',
                  items: [
                    { name: 'Push Left', effectType: 'push_left', duration: 15, gradient: 'from-emerald-500/20 to-transparent' },
                    { name: 'Push Right', effectType: 'push_right', duration: 15, gradient: 'from-transparent to-emerald-500/20' },
                    { name: 'Slide Over', effectType: 'slide_over', duration: 20, gradient: 'from-pink-500/20 to-transparent' },
                  ]
                },
                {
                  category: 'Zooms & Spins',
                  items: [
                    { name: 'Zoom In', effectType: 'zoom_in', duration: 15, gradient: 'from-amber-500/20 to-transparent' },
                    { name: 'Zoom Out', effectType: 'zoom_out', duration: 15, gradient: 'from-transparent to-amber-500/20' },
                    { name: 'Spin', effectType: 'spin', duration: 20, gradient: 'from-rose-500/20 to-transparent' },
                    { name: 'Whip Pan', effectType: 'whip_pan', duration: 8, gradient: 'from-red-500/20 to-transparent' },
                  ]
                },
                {
                  category: 'Stylized',
                  items: [
                    { name: 'Glitch', effectType: 'glitch', duration: 10, gradient: 'from-fuchsia-500/20 to-transparent' },
                    { name: 'Light Leak', effectType: 'light_leak', duration: 25, gradient: 'from-amber-400/20 to-transparent' },
                  ]
                },
              ].map((group, gi) => (
                <div key={gi} className={gi > 0 ? 'mt-3' : ''}>
                  <h4 className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold mb-2 px-1">{group.category}</h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    {group.items.map((item, ii) => (
                      <div
                        key={ii}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("application/json", JSON.stringify({
                            type: "preset",
                            preset: { ...item, isTransition: true },
                            isEffect: true
                          }));
                          e.dataTransfer.effectAllowed = "copy";
                        }}
                        className="group/card relative bg-zinc-950/80 rounded-lg border border-zinc-700/50 cursor-grab active:cursor-grabbing hover:border-indigo-500/50 hover:bg-zinc-900 transition-all shadow-sm overflow-hidden"
                      >
                        {/* Mini SVG transition preview */}
                        <div className="h-12 relative overflow-hidden">
                          <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-60 group-hover/card:opacity-100 transition-opacity`} />
                          <svg viewBox="0 0 80 32" className="w-full h-full" preserveAspectRatio="none">
                            {/* Clip A representation */}
                            <rect x="0" y="4" width="35" height="24" rx="2" fill="rgba(99,102,241,0.3)" stroke="rgba(99,102,241,0.5)" strokeWidth="0.5" />
                            <text x="17.5" y="18" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="6" fontFamily="monospace">A</text>
                            {/* Transition zone */}
                            <rect x="30" y="2" width="20" height="28" rx="1" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" strokeDasharray="2 1" />
                            <line x1="40" y1="6" x2="40" y2="26" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                            {/* Clip B representation */}
                            <rect x="45" y="4" width="35" height="24" rx="2" fill="rgba(168,85,247,0.3)" stroke="rgba(168,85,247,0.5)" strokeWidth="0.5" />
                            <text x="62.5" y="18" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="6" fontFamily="monospace">B</text>
                          </svg>
                        </div>
                        <div className="px-2 py-1.5 flex items-center justify-between">
                          <span className="text-[10px] font-medium text-zinc-400 group-hover/card:text-zinc-200 truncate transition-colors">{item.name}</span>
                          <span className="text-[8px] text-zinc-400 font-mono">{item.duration}f</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
          {sidebarTab === 'transcript' && (
            <div className="flex flex-col h-full bg-zinc-950">
              <div className="px-3 py-2 border-b border-zinc-700 flex items-center justify-between sticky top-0 bg-zinc-950 z-10">
                <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <svg className="w-3 h-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                  Text-Based Editing
                </span>
                <div className="flex gap-1">
                  <button className="flex-1 flex items-center justify-center gap-1 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 transition-colors border border-zinc-700" onClick={handleDubVoiceTrack}>
                    Dub to ES
                  </button>
                  <button className="flex items-center justify-center gap-1 py-1 px-3 bg-fuchsia-600 hover:bg-fuchsia-500 rounded text-white transition-colors shadow-sm" onClick={handleMorphLips} title="Morph Lips to Dubbed Audio">
                    👄 Lip-Sync
                  </button>
                  <button className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded transition-colors flex items-center gap-1" onClick={handleTranscribeAudio}>
                    <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Transcribe
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                <p className="text-xs text-zinc-400 leading-loose">
                  <span className="hover:bg-zinc-800 cursor-pointer rounded px-1 transition-colors">So</span>

                  <span className="hover:bg-zinc-800 cursor-pointer rounded px-1 transition-colors">today</span>

                  <span className="hover:bg-zinc-800 cursor-pointer rounded px-1 transition-colors">we're</span>
                  <span className="hover:bg-zinc-800 cursor-pointer rounded px-1 transition-colors">going</span>
                  <span className="hover:bg-zinc-800 cursor-pointer rounded px-1 transition-colors">to</span>
                  <span className="hover:bg-zinc-800 cursor-pointer rounded px-1 transition-colors">talk</span>

                  <span className="hover:bg-zinc-800 cursor-pointer rounded px-1 transition-colors">about</span>

                  <span className="bg-red-500/20 text-red-300 line-through cursor-pointer rounded px-1 transition-colors" title="Ripple Deleted" onClick={handleRestoreRippleWord}>um</span>
                  <span className="hover:bg-zinc-800 cursor-pointer rounded px-1 transition-colors">the</span>
                  <span className="hover:bg-zinc-800 cursor-pointer rounded px-1 transition-colors">new</span>
                  <span className="hover:bg-zinc-800 cursor-pointer rounded px-1 transition-colors">features.</span>
                </p>
                <div className="mt-4 p-2 bg-zinc-900 border border-zinc-700 rounded flex flex-col gap-1">
                  <span className="text-[10px] text-zinc-400 font-semibold uppercase">Instructions</span>
                  <span className="text-[10px] text-zinc-400">Click a word to jump playhead. Press <kbd className="bg-zinc-800 px-1 rounded text-zinc-300 font-mono">Delete</kbd> to ripple-cut.</span>
                </div>
              </div>
            </div>
          )}

          {sidebarTab === 'fusion' && (
            <div className="flex flex-col h-full bg-zinc-950">
              <div className="px-3 py-2 border-b border-zinc-700 flex items-center justify-between sticky top-0 bg-zinc-950 z-10">
                <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <svg className="w-3 h-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  Fusion Nodes
                </span>
                <div className="flex gap-1">
                  <button className="text-[10px] bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 px-2 py-1 rounded transition-colors" onClick={handleVisualDebugger}>🐛 Debugger</button>
                  <button className="text-[10px] bg-zinc-800 hover:bg-indigo-600 text-white px-2 py-1 rounded transition-colors" onClick={handleAddNodeToGraph}>+ Node</button>
                </div>
              </div>
              <div className="flex-1 relative overflow-hidden bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0%,transparent_100%)]">
                <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-10 pointer-events-none">
                  {Array.from({length: 36}).map((_, i) => <div key={i} className="border-r border-b border-zinc-700"></div>)}
                </div>
                <div className="absolute top-1/4 left-4 p-2 bg-zinc-900 border border-zinc-700 rounded shadow-lg text-[10px] text-zinc-300 font-semibold cursor-move hover:border-indigo-500 transition-colors">
                  MediaIn1
                  <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-yellow-500 rounded-full" />
                </div>
                <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
                  <path d="M 64 25% C 100 25%, 80 50%, 120 50%" stroke="#eab308" strokeWidth="2" fill="none" />
                  <path d="M 180 50% C 220 50%, 200 75%, 240 75%" stroke="#3b82f6" strokeWidth="2" fill="none" />
                </svg>
                <div className="absolute top-1/2 left-32 p-2 bg-zinc-900 border border-zinc-700 rounded shadow-lg text-[10px] text-zinc-300 font-semibold cursor-move hover:border-indigo-500 transition-colors">
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-yellow-500 rounded-full" />
                  Merge1
                  <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full" />
                </div>
                <div className="absolute top-3/4 left-60 p-2 bg-zinc-900 border border-zinc-700 rounded shadow-lg text-[10px] text-zinc-300 font-semibold cursor-move hover:border-indigo-500 transition-colors">
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full" />
                  MediaOut1
                </div>
              </div>
            </div>
          )}

          {sidebarTab === 'plugins' && (
            <div className="flex flex-col h-full bg-zinc-950 p-4 overflow-y-auto custom-scrollbar">
              <h3 className="text-sm font-bold text-zinc-200 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>
                Plugin Manager
              </h3>
              <p className="text-xs text-zinc-500 mb-4">Manage 3rd-party extensions and dockable panel scripts (CEP Parity).</p>

              <button
                className="w-full bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/50 text-indigo-300 text-xs font-bold py-2 rounded mb-4 transition-colors flex items-center justify-center gap-2"
                onClick={() => {
                  toast.promise(
                    new Promise<void>(resolve => setTimeout(resolve, 2000)),
                    {
                      loading: 'Installing plugin from local script...',
                      success: 'Script loaded and registered new extension API endpoints!',
                      error: 'Failed to install plugin.'
                    }
                  ).then(() => {
                    setInstalledPlugins([...installedPlugins, {
                      id: `ext-${Date.now()}`,
                      name: 'Custom User Script',
                      author: 'Local User',
                      version: '1.0.0',
                      enabled: true
                    }]);
                  });
                }}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Load Custom Script (.js)
              </button>

              <div className="flex flex-col gap-2">
                {installedPlugins.map((plugin: any) => (
                  <div key={plugin.id} className="bg-zinc-900 border border-zinc-800 rounded p-3 flex flex-col gap-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-zinc-200">{plugin.name}</h4>
                        <span className="text-[10px] text-zinc-500">v{plugin.version} • by {plugin.author}</span>
                      </div>
                      <label className="flex items-center cursor-pointer">
                        <div className="relative">
                          <input type="checkbox" className="sr-only" checked={plugin.enabled} onChange={(e) => {
                            setInstalledPlugins(installedPlugins.map((p: any) => p.id === plugin.id ? { ...p, enabled: e.target.checked } : p));
                          }} />
                          <div className={`block w-8 h-5 rounded-full transition-colors ${plugin.enabled ? 'bg-indigo-500' : 'bg-zinc-700'}`}></div>
                          <div className={`dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${plugin.enabled ? 'transform translate-x-3' : ''}`}></div>
                        </div>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sidebarTab === 'index' && (
            <div className="flex flex-col h-full bg-zinc-950">
              <div className="px-3 py-2 border-b border-zinc-700 flex items-center justify-between sticky top-0 bg-zinc-950 z-10">
                <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <svg className="w-3 h-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                  Edit Index
                </span>

                <span className="text-[10px] text-zinc-400 font-mono">

                  {markers.length + (projectData.tracks?.reduce((acc: number, t: any) => acc + (t.clips?.reduce((cAcc: number, c: any) => cAcc + (c.notes?.length || 0), 0) || 0), 0) || 0)} Events
                </span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 flex flex-col gap-1.5">
                {(() => {

                  const events: any[] = [];
                  markers.forEach(m => events.push({
                    type: 'marker',
                    frame: m.frame,
                    label: m.label,
                    color: m.color,
                    icon: '📍',
                    id: `g-${m.frame}-${m.label}`
                  }));

                  projectData.tracks?.forEach((t: any) => {

                    t.clips?.forEach((c: any) => {

                      c.notes?.forEach((n: any) => events.push({
                        type: 'note',
                        frame: c.start_frame + n.frame,
                        label: n.text,
                        color: n.type === 'bug' ? '#f87171' : n.type === 'todo' ? '#fbbf24' : n.type === 'approved' ? '#34d399' : '#a1a1aa',
                        icon: '📝',
                        id: n.id,
                        clipName: c.name || c.id
                      }));

                      c.markers?.forEach((m: any) => events.push({
                         type: 'clip_marker',
                         frame: c.start_frame + m.frameOffset,
                         label: m.label,
                         color: m.color,
                         icon: '📌',
                         id: `c-${c.id}-${m.frameOffset}`,
                         clipName: c.name || c.id
                      }));
                    });
                  });
                  events.sort((a, b) => a.frame - b.frame);
                  if (events.length === 0) {
                     return (
                       <div className="text-center p-8 flex flex-col items-center">
                         <svg className="w-8 h-8 text-zinc-700 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                         <p className="text-[10px] text-zinc-400">No markers or notes found.</p>
                       </div>
                     );
                  }
                  return events.map((ev, i) => (


                    <div
                      key={`${ev.id}-${i}`}
                      className="group flex flex-col p-2 bg-zinc-900/50 border border-zinc-700/80 hover:bg-zinc-800 hover:border-zinc-700 rounded cursor-pointer transition-colors"
                      onClick={() => setFrame(ev.frame)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full shadow-[0_0_5px_rgba(0,0,0,0.5)]" style={{ backgroundColor: ev.color }} />
                        <span className="text-[10px] font-bold text-zinc-300 font-mono tracking-wider">@{ev.frame}f</span>
                        <span className="text-[10px] text-zinc-400 uppercase ml-auto">{ev.type.replace('_', ' ')}</span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed truncate">{ev.icon} {ev.label}</p>
                      {ev.clipName && <span className="text-[8px] text-zinc-400 mt-1 truncate block">Clip: {ev.clipName}</span>}
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {sidebarTab === 'history' && (
            <div className="flex flex-col h-full bg-zinc-950 p-2 overflow-y-auto custom-scrollbar">
              <h3 className="text-[10px] uppercase text-zinc-400 font-semibold tracking-widest mb-3 px-2">Undo Stack</h3>
              <div className="flex flex-col gap-1">
                <div className="text-xs bg-indigo-900/40 text-indigo-300 border border-indigo-700/50 px-3 py-2 rounded flex justify-between items-center cursor-default">
                  <span>Move Clip</span>
                  <span className="text-[10px] opacity-70">Current</span>
                </div>
                <div className="text-xs text-zinc-400 hover:bg-zinc-800 px-3 py-2 rounded flex justify-between items-center cursor-pointer transition-colors">
                  <span>Add Color Grade</span>
                  <span className="text-[10px] opacity-50">Undo (⌘Z)</span>
                </div>
                <div className="text-xs text-zinc-400 hover:bg-zinc-800 px-3 py-2 rounded flex justify-between items-center cursor-pointer transition-colors">
                  <span>Delete Track</span>
                  <span className="text-[10px] opacity-50">1m ago</span>
                </div>
                <div className="text-xs text-zinc-400 hover:bg-zinc-800 px-3 py-2 rounded flex justify-between items-center cursor-pointer transition-colors">
                  <span>Import Media</span>
                  <span className="text-[10px] opacity-50">5m ago</span>
                </div>
                <div className="text-xs text-zinc-400 px-3 py-2 rounded flex justify-between items-center">
                  <span>Project Created</span>
                  <span className="text-[10px] opacity-50">Initial</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {sidebarTab === 'media' && (
          <div className="flex flex-col border-t border-zinc-700 mt-auto">
             <div className="px-4 py-2 flex flex-col gap-2">
                <input
                  type="text"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-full px-4 py-1.5 text-xs text-zinc-300 focus:outline-none focus-ring focus:border-indigo-500 placeholder-zinc-600 transition-colors"
                  placeholder="Search Media..."
                />

                {/* Text-to-Video Generation (Phase 206) */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 bg-indigo-900/20 border border-indigo-500/30 rounded-full px-3 py-1 text-[10px] text-zinc-300 focus:outline-none focus-ring focus:border-indigo-500 placeholder-indigo-400/50 transition-colors"
                    placeholder="Type to generate AI video..."
                  />
                  <button className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] px-3 py-1 rounded-full transition-colors flex items-center gap-1" onClick={handleDiffusionPrompt}>
                    ✨ Generate
                  </button>
                </div>
              </div>
            <label className="block w-full text-center text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded py-2 cursor-pointer transition-colors shadow-sm">
              Upload Media
              <input
                type="file"
                className="hidden"
                accept="audio/*,video/*"
                onChange={handleFileUpload}
              />
            </label>

            {/* Telepathic Asset Retrieval (Phase 217) */}
            <button className="mt-2 block w-full text-center text-[10px] font-bold text-sky-300 bg-sky-900/30 hover:bg-sky-800/50 border border-sky-500/50 rounded py-1.5 cursor-pointer transition-colors shadow-sm" onClick={() => handleTelepathicLink()}>
              🧠 Telepathic Import
            </button>
          </div>
        )}
      </aside>

      
  );
}
