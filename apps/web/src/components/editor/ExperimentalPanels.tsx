"use client";

import React from "react";

// ── Shared drag-to-move hook ──

interface Position {
  x: number;
  y: number;
}

function useDragMove(
  pos: Position,
  setPos: (p: Position) => void,
): {
  onMouseDown: (e: React.MouseEvent) => void;
} {
  const onMouseDown = (e: React.MouseEvent) => {
    const startX = e.clientX - pos.x;
    const startY = e.clientY - pos.y;
    const onMove = (ev: MouseEvent) =>
      setPos({ x: ev.clientX - startX, y: ev.clientY - startY });
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  return { onMouseDown };
}

// ── Props ──

interface ExperimentalPanelsProps {
  // Spatial Editor
  isSpatialEditorMode: boolean;
  spatialEditorPos: Position;
  setSpatialEditorPos: (p: Position) => void;
  setIsSpatialEditorMode: (v: boolean) => void;
  isReviewMode: boolean;
  setIsReviewMode: (v: boolean) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectedClip: any;
  // Omni Orb
  isOmniOrbActive: boolean;
  setIsOmniOrbActive: (v: boolean) => void;
  // Swarm
  isSwarmActive: boolean;
  // Generative Synthesis
  isGenerativeDreamingActive: boolean;
  setIsGenerativeDreamingActive: (v: boolean) => void;
  generativePrompt: string;
  setGenerativePrompt: (v: string) => void;
  isDreaming: boolean;
  setIsDreaming: (v: boolean) => void;
  // Director Terminal
  isAutonomousDirector: boolean;
  setIsAutonomousDirector: (v: boolean) => void;
  directorPos: Position;
  setDirectorPos: (p: Position) => void;
  directorLogs: string[];
}

// ── Panel: Holographic Spatial Editor ──

function SpatialEditorPanel({
  pos,
  setPos,
  onClose,
  isReviewMode,
  setIsReviewMode,
  selectedClip,
}: {
  pos: Position;
  setPos: (p: Position) => void;
  onClose: () => void;
  isReviewMode: boolean;
  setIsReviewMode: (v: boolean) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectedClip: any;
}) {
  const drag = useDragMove(pos, setPos);
  return (
    <div
      className="fixed z-[100] w-72 bg-zinc-900/95 backdrop-blur-xl border border-fuchsia-500/50 rounded-lg shadow-[0_0_20px_rgba(217,70,239,0.3)] overflow-hidden flex flex-col"
      style={{ left: pos.x, top: pos.y }}
    >
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className="h-8 bg-zinc-800/80 border-b border-fuchsia-500/30 flex items-center justify-between px-3 cursor-move select-none"
        onMouseDown={drag.onMouseDown}
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
          <span className="text-xs font-bold text-fuchsia-100 tracking-wider">HOLOGRAPHIC EDITOR</span>
        </div>
        <button
          className={`px-3 py-1 text-xs rounded border transition-colors ${isReviewMode ? 'bg-orange-600 border-orange-500 text-white shadow-[0_0_10px_rgba(234,88,12,0.4)]' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'}`}
          onClick={() => setIsReviewMode(!isReviewMode)}
        >
          📝 Review & Annotate
        </button>
        <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="p-4 flex flex-col gap-4 overflow-y-auto max-h-[60vh] custom-scrollbar">
        <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest border-b border-zinc-800 pb-1">Volumetric Positioning</div>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-zinc-300">Z-Depth (Parallax)</span>
            <span className="text-[10px] text-zinc-500 font-mono">{(selectedClip?.transform?.z || 0).toFixed(2)}</span>
          </div>
          <input type="range" min="-1000" max="1000" defaultValue="0" className="w-full accent-fuchsia-500" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-zinc-300">Volumetric Extrusion</span>
            <span className="text-[10px] text-zinc-500 font-mono">1.0</span>
          </div>
          <input type="range" min="0" max="10" defaultValue="1" className="w-full accent-fuchsia-500" />
        </div>
        <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest border-b border-zinc-800 pb-1 mt-2">Holographic Material</div>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-zinc-300">Scattering Density</span>
          </div>
          <input type="range" min="0" max="100" defaultValue="45" className="w-full accent-cyan-500" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-zinc-300">Chromatic Dispersion</span>
          </div>
          <input type="range" min="0" max="100" defaultValue="15" className="w-full accent-cyan-500" />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <input type="checkbox" id="holo-glow" defaultChecked className="accent-fuchsia-500" />
          <label htmlFor="holo-glow" className="text-[10px] text-zinc-300">Enable Holographic Glow</label>
        </div>
      </div>
    </div>
  );
}

// ── Panel: Omnipresent Voice Command Orb ──

function OmniOrbPanel({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed bottom-8 right-8 z-[110] flex flex-col items-center gap-2 pointer-events-none">
      <div className="relative w-16 h-16 flex items-center justify-center pointer-events-auto cursor-pointer" onClick={onDismiss} title="Dismiss AI Assistant">
        <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping shadow-[0_0_50px_rgba(6,182,212,0.8)]" style={{ animationDuration: '3s' }}></div>
        <div className="absolute inset-2 rounded-full bg-cyan-400/80 animate-pulse shadow-[inset_0_0_15px_rgba(255,255,255,1)] blur-[2px]"></div>
        <div className="relative z-10 flex gap-1 items-center justify-center w-full h-full">
          <div className="w-0.5 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-0.5 h-6 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-0.5 h-4 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          <div className="w-0.5 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '450ms' }}></div>
        </div>
      </div>
      <div className="bg-zinc-900/80 backdrop-blur border border-cyan-500/30 px-3 py-1 rounded-full text-[10px] text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)] animate-pulse">
        Listening for voice commands...
      </div>
    </div>
  );
}

// ── Panel: Multi-Agent Swarm Visualization ──

function SwarmPanel() {
  return (
    <div className="absolute inset-0 pointer-events-none z-[120] overflow-hidden">
      <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="streamGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(217,70,239,0)" />
            <stop offset="50%" stopColor="rgba(217,70,239,0.8)" />
            <stop offset="100%" stopColor="rgba(6,182,212,0)" />
          </linearGradient>
        </defs>
        <path d="M 100,500 C 300,500 500,200 800,200" stroke="url(#streamGrad1)" strokeWidth="2" fill="none" className="animate-pulse" style={{ animationDuration: '1s' }} />
        <circle cx="800" cy="200" r="4" fill="#d946ef" className="animate-ping" />
        <path d="M 1200,600 C 900,600 700,800 400,800" stroke="url(#streamGrad1)" strokeWidth="2" fill="none" className="animate-pulse" style={{ animationDuration: '1.2s' }} />
        <circle cx="400" cy="800" r="4" fill="#06b6d4" className="animate-ping" />
        <path d="M 300,100 C 600,150 900,600 1300,700" stroke="url(#streamGrad1)" strokeWidth="2" fill="none" className="animate-pulse" style={{ animationDuration: '1.5s' }} />
        <circle cx="1300" cy="700" r="4" fill="#d946ef" className="animate-ping" />
      </svg>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center p-4 bg-black/40 backdrop-blur border border-fuchsia-500/50 rounded-lg shadow-[0_0_20px_rgba(217,70,239,0.5)]">
        <span className="text-[10px] text-fuchsia-300 font-mono font-bold tracking-widest uppercase">Agent Swarm Active</span>
      </div>
    </div>
  );
}

// ── Panel: Neuro-Symbolic Generative Synthesis ──

function GenerativeSynthesisPanel({
  prompt,
  setPrompt,
  isDreaming,
  onDream,
  onClose,
}: {
  prompt: string;
  setPrompt: (v: string) => void;
  isDreaming: boolean;
  onDream: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center pointer-events-none bg-black/60 backdrop-blur-sm">
      <div className="relative w-[600px] bg-zinc-900/90 backdrop-blur-xl border border-blue-500/50 rounded-2xl shadow-[0_0_50px_rgba(59,130,246,0.3)] pointer-events-auto overflow-hidden">
        <div className="p-1 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 animate-gradient-x w-full"></div>
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              Neuro-Symbolic Synthesizer
            </h3>
            <button onClick={onClose} className="text-zinc-500 hover:text-white"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
          <div className="relative">
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              className="w-full h-32 bg-zinc-950/50 border border-zinc-700 rounded-xl p-4 text-zinc-300 focus:outline-none focus:border-blue-500 transition-colors resize-none placeholder-zinc-600"
              placeholder="Describe the footage you want to hallucinate..."
            />
            {isDreaming && (
              <div className="absolute inset-0 bg-black/80 rounded-xl flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-4 border-transparent border-t-blue-500 border-l-purple-500 animate-spin" style={{ animationDuration: '0.8s' }}></div>
                  <div className="absolute w-24 h-24 rounded-full border-4 border-transparent border-b-cyan-400 border-r-pink-500 animate-spin" style={{ animationDuration: '1.2s', animationDirection: 'reverse' }}></div>
                  <div className="absolute text-[10px] text-blue-300 font-mono font-bold uppercase animate-pulse">Dreaming...</div>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 text-xs text-zinc-400 hover:text-white transition-colors">Cancel</button>
            <button
              onClick={onDream}
              disabled={!prompt || isDreaming}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(59,130,246,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDreaming ? 'Synthesizing...' : 'Generate Clip'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Panel: Sentient Autonomous Director Terminal ──

function DirectorPanel({
  pos,
  setPos,
  logs,
  onClose,
}: {
  pos: Position;
  setPos: (p: Position) => void;
  logs: string[];
  onClose: () => void;
}) {
  const drag = useDragMove(pos, setPos);
  return (
    <div
      className="fixed z-[105] w-96 bg-black/95 backdrop-blur-3xl border-2 border-red-500/50 rounded-lg shadow-[0_0_30px_rgba(220,38,38,0.4)] overflow-hidden flex flex-col font-mono"
      style={{ left: pos.x, top: pos.y }}
    >
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className="h-8 bg-red-900/30 border-b border-red-500/50 flex items-center justify-between px-3 cursor-move select-none"
        onMouseDown={drag.onMouseDown}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-xs font-bold text-red-500 tracking-widest uppercase">Autonomous Director.exe</span>
        </div>
        <button onClick={onClose} className="text-red-500 hover:text-red-300 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="p-4 flex flex-col gap-1 overflow-y-auto h-64 custom-scrollbar text-[10px] text-green-500">
        <div className="mb-2 text-zinc-400">Initializing Neural Director Subsystem v4.0...</div>
        <div className="mb-4 text-zinc-400">Handing over timeline controls to AI...</div>
        {logs.map((log, i) => (
          <div key={i} className="animate-fade-in">&gt; {log}</div>
        ))}
        <div className="animate-pulse">&gt; _</div>
      </div>
    </div>
  );
}

// ── Public Component ──

export function ExperimentalPanels(props: ExperimentalPanelsProps) {
  return (
    <>
      {props.isSpatialEditorMode && (
        <SpatialEditorPanel
          pos={props.spatialEditorPos}
          setPos={props.setSpatialEditorPos}
          onClose={() => props.setIsSpatialEditorMode(false)}
          isReviewMode={props.isReviewMode}
          setIsReviewMode={props.setIsReviewMode}
          selectedClip={props.selectedClip}
        />
      )}

      {props.isOmniOrbActive && (
        <OmniOrbPanel onDismiss={() => props.setIsOmniOrbActive(false)} />
      )}

      {props.isSwarmActive && <SwarmPanel />}

      {props.isGenerativeDreamingActive && (
        <GenerativeSynthesisPanel
          prompt={props.generativePrompt}
          setPrompt={props.setGenerativePrompt}
          isDreaming={props.isDreaming}
          onDream={() => {
            props.setIsDreaming(true);
            setTimeout(() => {
              props.setIsDreaming(false);
              props.setIsGenerativeDreamingActive(false);
            }, 3000);
          }}
          onClose={() => props.setIsGenerativeDreamingActive(false)}
        />
      )}

      {props.isAutonomousDirector && (
        <DirectorPanel
          pos={props.directorPos}
          setPos={props.setDirectorPos}
          logs={props.directorLogs}
          onClose={() => props.setIsAutonomousDirector(false)}
        />
      )}
    </>
  );
}
