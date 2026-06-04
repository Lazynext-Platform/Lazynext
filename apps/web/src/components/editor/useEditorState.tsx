// @ts-nocheck
import { useState, useCallback, useMemo, createContext, useContext, ReactNode } from 'react';
import type { Project, Clip, Track, Asset, AgentEvent, TimelineMarker } from '@/types/editor';

// This is the beginning of the great state migration (Phase 51)
// We are extracting the massive state clusters from EditorClient into a Context Provider

interface EditorState {
  projectData: Project | null;
  setProjectData: (data: Project | null) => void;
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  currentTime: number;
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  activeTool: 'select' | 'blade' | 'razor' | 'slip' | 'pen' | 'hand';
  setActiveTool: React.Dispatch<React.SetStateAction<'select' | 'blade' | 'razor' | 'slip' | 'pen' | 'hand'>>;
  // Phase 57-60: WASM Core Reference
  wasmCore: any | null;
}

const EditorContext = createContext<EditorState | null>(null);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [projectData, setProjectData] = useState<Project | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTool, setActiveTool] = useState<'select' | 'blade' | 'razor' | 'slip' | 'pen' | 'hand'>('select');
  const [wasmCore, setWasmCore] = useState<any | null>(null);

  // Initialize WASM Engine
  React.useEffect(() => {
    async function initWasm() {
      try {
        const wasm = await import('lazynext-wasm');
        console.log("🚀 Rust Core Loaded Successfully:", wasm);
        setWasmCore(wasm);
      } catch (err) {
        console.error("Failed to load Rust core:", err);
      }
    }
    initWasm();
  }, []);

  const value = {
    projectData,
    setProjectData,
    assets,
    setAssets,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    activeTool,
    setActiveTool,
    wasmCore,
  };

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditorState() {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditorState must be used within an EditorProvider');
  }
  return context;
}
