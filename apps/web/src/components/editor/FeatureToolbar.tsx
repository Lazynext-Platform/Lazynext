"use client";

import React from "react";
import { useOptionalEditorState } from "./useEditorState";

// ── Props ──

interface FeatureToolbarProps {
  // State values
  is3DWorkspace: boolean;
  isSpatialEditorMode: boolean;
  isAutonomousDirector: boolean;
  isBioResponsive: boolean;
  systemStress: number;
  isOmniOrbActive: boolean;
  isSwarmActive: boolean;
  isGenerativeDreamingActive: boolean;
  isGodMode: boolean;
  isSingularity: boolean;
  isQuantumSuperposition: boolean;
  isCinematographyAI: boolean;
  isAssetForgeOpen: boolean;
  isSentientColorOpen: boolean;
  isAudioMixerOpen: boolean;
  isColorScopesOpen: boolean;
  isAutoCaptioning: boolean;
  hasBeatSync: boolean;
  isMultiplayer: boolean;
  isChatOpen: boolean;
  // State setters
  setIs3DWorkspace: (v: boolean) => void;
  setIsSpatialEditorMode: (v: boolean) => void;
  setIsAutonomousDirector: (v: boolean) => void;
  setIsBioResponsive: (v: boolean) => void;
  setIsOmniOrbActive: (v: boolean) => void;
  setIsSwarmActive: (v: boolean) => void;
  setIsGenerativeDreamingActive: (v: boolean) => void;
  setIsGodMode: (v: boolean) => void;
  setIsSingularity: (v: boolean) => void;
  setIsQuantumSuperposition: (v: boolean) => void;
  setIsCinematographyAI: (v: boolean) => void;
  setIsAssetForgeOpen: (v: boolean) => void;
  setIsSentientColorOpen: (v: boolean) => void;
  setIsAudioMixerOpen: (v: boolean) => void;
  setIsColorScopesOpen: (v: boolean) => void;
  setIsAutoCaptioning: (v: boolean) => void;
  setAutoCaptionProgress: (v: number) => void;
  setHasBeatSync: (v: boolean) => void;
  setIsMultiplayer: (v: boolean) => void;
  setIsChatOpen: (v: boolean) => void;
  // Actions
  activateGodMode: () => void;
  handleOpenDevConsole: () => void;
  handleCanvasAnnotation: () => void;
}

// ── Toggle Button Helper ──

function ToggleBtn({
  active,
  onToggle,
  icon,
  label,
  activeClass,
  title,
}: {
  active: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  label: string;
  activeClass: string;
  title: string;
}) {
  return (
    <button
      className={`text-[10px] backdrop-blur border px-2 py-1 rounded transition-colors flex items-center gap-1 mr-2 ${
        active ? activeClass : "bg-zinc-900/80 border-zinc-700/50 hover:bg-zinc-800 text-zinc-400 hover:text-white"
      }`}
      onClick={onToggle}
      title={title}
    >
      {icon}
      {label}
    </button>
  );
}

// ── SVG Icons (extracted to avoid inline bloat) ──

const CubeIcon = (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
  </svg>
);

const MonitorIcon = (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const FlaskIcon = (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
  </svg>
);

const MicIcon = (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

const BoltIcon = (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const CodeIcon = (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

// ── Component ──

export function FeatureToolbar(props: FeatureToolbarProps) {
  return (
    <>
      {/* Phase 23: 3D Workspace Toggle */}
      <ToggleBtn
        active={props.is3DWorkspace}
        onToggle={() => props.setIs3DWorkspace(!props.is3DWorkspace)}
        icon={CubeIcon}
        label="3D Mode"
        activeClass="bg-teal-600 border-teal-500 text-white"
        title="Toggle 3D Compositing Workspace"
      />

      {/* Phase 29: Holographic Volumetric Editor Toggle */}
      <ToggleBtn
        active={props.isSpatialEditorMode}
        onToggle={() => props.setIsSpatialEditorMode(!props.isSpatialEditorMode)}
        icon={MonitorIcon}
        label="Spatial Editor"
        activeClass="bg-fuchsia-600 border-fuchsia-500 text-white shadow-[0_0_10px_rgba(217,70,239,0.5)]"
        title="Toggle Holographic Volumetric Spatial Editor"
      />

      {/* Phase 30: Sentient Autonomous Studio Toggle */}
      <button
        className={`text-[10px] font-bold backdrop-blur border px-2 py-1 rounded transition-all flex items-center gap-1 mr-2 ${
          props.isAutonomousDirector
            ? "bg-red-600 border-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.8)] animate-pulse"
            : "bg-zinc-900/80 border-zinc-700/50 hover:bg-zinc-800 text-zinc-400 hover:text-white"
        }`}
        onClick={() => props.setIsAutonomousDirector(!props.isAutonomousDirector)}
        title="Toggle Sentient Autonomous Director AI"
      >
        🤖 Autonomous Director
      </button>

      {/* Phase 31: Bio-Responsive UI Themes */}
      <button
        className={`text-[10px] font-bold backdrop-blur border px-2 py-1 rounded transition-all flex items-center gap-1 mr-2 ${
          props.isBioResponsive
            ? "bg-orange-600 border-orange-500 text-white shadow-[0_0_15px_rgba(234,88,12,0.8)]"
            : "bg-zinc-900/80 border-zinc-700/50 hover:bg-zinc-800 text-zinc-400 hover:text-white"
        }`}
        onClick={() => props.setIsBioResponsive(!props.isBioResponsive)}
        title={`Toggle Bio-Responsive UI Theme (Current Stress: ${props.systemStress.toFixed(1)}%)`}
      >
        {FlaskIcon}
        Bio-Sync
      </button>

      {/* Phase 32: Omnipresent Voice Orb Toggle */}
      <ToggleBtn
        active={props.isOmniOrbActive}
        onToggle={() => props.setIsOmniOrbActive(!props.isOmniOrbActive)}
        icon={MicIcon}
        label="Omni Orb"
        activeClass="bg-cyan-600 border-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.6)]"
        title="Toggle AI Voice Command Orb"
      />

      {/* Phase 33: Multi-Agent Swarm Toggle */}
      <ToggleBtn
        active={props.isSwarmActive}
        onToggle={() => props.setIsSwarmActive(!props.isSwarmActive)}
        icon={BoltIcon}
        label="Agent Swarm"
        activeClass="bg-indigo-600 border-indigo-500 text-white shadow-[0_0_10px_rgba(79,70,229,0.6)]"
        title="Toggle Multi-Agent Rendering Swarm"
      />

      {/* Phase 34: Neuro-Symbolic Generative Synthesis Toggle */}
      <ToggleBtn
        active={props.isGenerativeDreamingActive}
        onToggle={() => props.setIsGenerativeDreamingActive(!props.isGenerativeDreamingActive)}
        icon={FlaskIcon}
        label="Dream Clip"
        activeClass="bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.7)]"
        title="Toggle Neuro-Symbolic Scene Synthesis"
      />

      {/* Phase 35: God Mode Toggle */}
      <button
        className={`text-[10px] font-black backdrop-blur border-2 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 mr-2 ${
          props.isGodMode
            ? "bg-gradient-to-r from-yellow-500 via-red-500 to-fuchsia-600 border-yellow-400 text-white shadow-[0_0_25px_rgba(234,179,8,0.9),0_0_50px_rgba(220,38,38,0.5)] animate-pulse scale-105"
            : "bg-zinc-900/80 border-zinc-600/50 hover:bg-zinc-800 text-zinc-400 hover:text-yellow-400 hover:border-yellow-500/50 hover:shadow-[0_0_15px_rgba(234,179,8,0.3)]"
        }`}
        onClick={props.activateGodMode}
        title="Activate God Mode — Enable All AI Modes Simultaneously"
      >
        ⚡ GOD MODE
      </button>

      {/* Phase 40: The Singularity ∞ Toggle */}
      <button
        className={`text-[10px] font-black backdrop-blur border-2 px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 mr-2 ${
          props.isSingularity
            ? "bg-white text-black border-white shadow-[0_0_50px_rgba(255,255,255,1)] animate-bounce scale-110"
            : "bg-black text-white border-zinc-700 hover:border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.5)]"
        }`}
        onClick={() => props.setIsSingularity(!props.isSingularity)}
        title="Activate The Singularity: Infinite Canvas Mode"
      >
        ∞ SINGULARITY
      </button>

      {/* Phase 36: Quantum Timeline Superposition Toggle */}
      <div className="flex items-center">
        {props.isQuantumSuperposition && (
          <button
            onClick={() => props.setIsQuantumSuperposition(false)}
            className="text-[10px] font-black bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded-l animate-pulse shadow-[0_0_15px_rgba(79,70,229,0.8)]"
          >
            👁️ OBSERVE
          </button>
        )}
        <button
          className={`text-[10px] backdrop-blur border px-2 py-1 rounded transition-colors flex items-center gap-1 mr-2 ${
            props.isQuantumSuperposition
              ? "bg-indigo-900/80 border-indigo-500 text-indigo-300 rounded-r shadow-[0_0_10px_rgba(79,70,229,0.4)]"
              : "bg-zinc-900/80 border-zinc-700/50 hover:bg-zinc-800 text-zinc-400 hover:text-white"
          }`}
          onClick={() => props.setIsQuantumSuperposition(!props.isQuantumSuperposition)}
          title="Toggle Quantum Superposition Timeline"
        >
          {CubeIcon}
          Quantum
        </button>
      </div>

      {/* Phase 37: Neural Cinematography AI Toggle */}
      <button
        className={`text-[10px] backdrop-blur border px-2 py-1 rounded transition-colors flex items-center gap-1 mr-2 ${
          props.isCinematographyAI
            ? "bg-cyan-600/80 border-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.6)]"
            : "bg-zinc-900/80 border-zinc-700/50 hover:bg-zinc-800 text-zinc-400 hover:text-white"
        }`}
        onClick={() => props.setIsCinematographyAI(!props.isCinematographyAI)}
        title="Toggle Neural Cinematography Analysis"
      >
        🎥 Neural Cinema
      </button>

      {/* Phase 38: Holographic Asset Forge Toggle */}
      <ToggleBtn
        active={props.isAssetForgeOpen}
        onToggle={() => props.setIsAssetForgeOpen(!props.isAssetForgeOpen)}
        icon={FlaskIcon}
        label="Asset Forge"
        activeClass="bg-fuchsia-600/80 border-fuchsia-500 text-white shadow-[0_0_10px_rgba(217,70,239,0.5)]"
        title="Open Holographic Asset Forge"
      />

      {/* Phase 39: Sentient Color Intelligence Toggle */}
      <button
        className={`text-[10px] font-medium backdrop-blur border px-2 py-1 rounded transition-colors flex items-center gap-1 mr-2 ${
          props.isSentientColorOpen
            ? "bg-rose-600/80 border-rose-500 text-white shadow-[0_0_10px_rgba(225,29,72,0.5)]"
            : "bg-zinc-900/80 border-zinc-700/50 hover:bg-zinc-800 text-zinc-400 hover:text-white"
        }`}
        onClick={() => props.setIsSentientColorOpen(!props.isSentientColorOpen)}
        title="Open Sentient Color Intelligence"
      >
        🎨 Sentient Color
      </button>

      {/* Phase 43: Professional Audio Mixer Toggle */}
      <button
        className={`text-[10px] font-medium backdrop-blur border px-2 py-1 rounded transition-colors flex items-center gap-1 mr-2 ${
          props.isAudioMixerOpen
            ? "bg-indigo-600/80 border-indigo-500 text-white shadow-[0_0_10px_rgba(79,70,229,0.5)]"
            : "bg-zinc-900/80 border-zinc-700/50 hover:bg-zinc-800 text-zinc-400 hover:text-white"
        }`}
        onClick={() => props.setIsAudioMixerOpen(!props.isAudioMixerOpen)}
        title="Open Professional Audio Mixer"
      >
        🎛️ Mixer
      </button>

      {/* Phase 44: DaVinci-Style Color Scopes Toggle */}
      <button
        className={`text-[10px] font-medium backdrop-blur border px-2 py-1 rounded transition-colors flex items-center gap-1 mr-2 ${
          props.isColorScopesOpen
            ? "bg-teal-600/80 border-teal-500 text-white shadow-[0_0_10px_rgba(20,184,166,0.5)]"
            : "bg-zinc-900/80 border-zinc-700/50 hover:bg-zinc-800 text-zinc-400 hover:text-white"
        }`}
        onClick={() => props.setIsColorScopesOpen(!props.isColorScopesOpen)}
        title="Open Color Scopes (Waveform / Vectorscope)"
      >
        📊 Scopes
      </button>

      {/* Phase 45: CapCut-Style Tools */}
      <button
        className={`text-[10px] font-medium backdrop-blur border px-2 py-1 rounded transition-colors flex items-center gap-1 mr-2 ${
          props.isAutoCaptioning
            ? "bg-orange-600/80 border-orange-500 text-white animate-pulse"
            : "bg-zinc-900/80 border-zinc-700/50 hover:bg-zinc-800 text-zinc-400 hover:text-white"
        }`}
        onClick={() => {
          props.setIsAutoCaptioning(true);
          props.setAutoCaptionProgress(0);
        }}
        title="Auto-Generate Captions (Speech-to-Text)"
      >
        💬 Auto-Captions
      </button>

      <button
        className={`text-[10px] font-medium backdrop-blur border px-2 py-1 rounded transition-colors flex items-center gap-1 mr-2 ${
          props.hasBeatSync
            ? "bg-pink-600/80 border-pink-500 text-white shadow-[0_0_10px_rgba(236,72,153,0.5)]"
            : "bg-zinc-900/80 border-zinc-700/50 hover:bg-zinc-800 text-zinc-400 hover:text-white"
        }`}
        onClick={() => props.setHasBeatSync(!props.hasBeatSync)}
        title="Auto Beat Sync Markers"
      >
        🥁 Beat Sync
      </button>

      {/* Phase 46: Multiplayer Toggle */}
      <button
        className={`text-[10px] font-medium backdrop-blur border px-2 py-1 rounded transition-colors flex items-center gap-1 mr-2 ${
          props.isMultiplayer
            ? "bg-blue-600/80 border-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]"
            : "bg-zinc-900/80 border-zinc-700/50 hover:bg-zinc-800 text-zinc-400 hover:text-white"
        }`}
        onClick={() => props.setIsMultiplayer(!props.isMultiplayer)}
        title="Toggle Live Multiplayer Mode"
      >
        👥 Co-op
      </button>

      {/* Phase 48: Chat Toggle */}
      <button
        className={`text-[10px] font-medium backdrop-blur border px-2 py-1 rounded transition-colors flex items-center gap-1 mr-2 ${
          props.isChatOpen
            ? "bg-indigo-600/80 border-indigo-500 text-white shadow-[0_0_10px_rgba(79,70,229,0.5)]"
            : "bg-zinc-900/80 border-zinc-700/50 hover:bg-zinc-800 text-zinc-400 hover:text-white"
        }`}
        onClick={() => props.setIsChatOpen(!props.isChatOpen)}
        title="Open Session Chat"
      >
        💬 Chat
      </button>

      {/* Dev Console */}
      <button
        className="text-[10px] bg-zinc-900/80 backdrop-blur border border-zinc-700/50 hover:bg-zinc-800 text-zinc-400 hover:text-white px-2 py-1 rounded transition-colors flex items-center gap-1 mr-2"
        onClick={props.handleOpenDevConsole}
      >
        {CodeIcon}
        Dev Console
      </button>

      {/* Annotation / Color Picker */}
      <div className="flex items-center gap-1 bg-zinc-900/80 backdrop-blur border border-zinc-700/50 rounded-lg p-1 mr-4">
        <button
          className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          title="Draw Annotation (Arrow)"
          onClick={props.handleCanvasAnnotation}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <div className="w-3 h-3 rounded-full bg-red-500 cursor-pointer border border-zinc-300 ml-1" />
      </div>
    </>
  );
}
