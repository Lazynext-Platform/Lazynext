"use client";

import React, { useState, createContext, useContext, type ReactNode } from "react";
import type { Project, Asset, Clip, TimelineMarker } from "@/types/editor";

/**
 * Phase 51-60: Editor State Migration
 *
 * This context provider gradually extracts state from EditorClient
 * into a shared context, enabling sub-components to access editor
 * state without prop drilling.
 *
 * Migration status:
 * - Phase 51: Core state (project, assets, playback, activeTool) ✅
 * - Phase 52: Selection state (selectedClipId, selectedClipIds) ✅
 * - Phase 53: Viewport state (zoomLevel, isSnappingEnabled) ✅
 * - Phase 54: Workspace state (activeWorkspace) ✅
 * - Phase 55: Markers and clipboard ✅
 * - Phase 57-60: WASM core ✅
 */

export type ActiveTool = "select" | "blade" | "razor" | "slip" | "pen" | "hand";

export type Workspace =
  | "timeline"
  | "fusion"
  | "color"
  | "audio"
  | "ai"
  | "export";

interface EditorState {
  // Core
  projectData: Project | null;
  setProjectData: (data: Project | null) => void;
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  // Playback
  currentTime: number;
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  // Tools
  activeTool: ActiveTool;
  setActiveTool: React.Dispatch<React.SetStateAction<ActiveTool>>;
  // Selection
  selectedClipId: string | null;
  setSelectedClipId: (id: string | null) => void;
  selectedClipIds: string[];
  setSelectedClipIds: React.Dispatch<React.SetStateAction<string[]>>;
  // Viewport
  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
  isSnappingEnabled: boolean;
  setIsSnappingEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  // Command Palette
  showCommandPalette: boolean;
  setShowCommandPalette: React.Dispatch<React.SetStateAction<boolean>>;
  // Workspace
  activeWorkspace: Workspace;
  setActiveWorkspace: React.Dispatch<React.SetStateAction<Workspace>>;
  // Markers & Clipboard
  markers: TimelineMarker[];
  setMarkers: React.Dispatch<React.SetStateAction<TimelineMarker[]>>;
  clipboard: Clip | null;
  setClipboard: (data: Clip | null) => void;
  // WASM
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wasmCore: any | null;
}

const EditorContext = createContext<EditorState | null>(null);

export function EditorStateProvider({ children, initialProject }: { children: ReactNode; initialProject?: Project | null }) {
  // Core
  const [projectData, setProjectData] = useState<Project | null>(initialProject ?? null);
  const [assets, setAssets] = useState<Asset[]>([]);
  // Playback
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  // Tools
  const [activeTool, setActiveTool] = useState<ActiveTool>("select");
  // Selection
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  // Viewport
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isSnappingEnabled, setIsSnappingEnabled] = useState(true);
  // Command Palette
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  // Workspace
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace>("timeline");
  // Markers & Clipboard
  const [markers, setMarkers] = useState<TimelineMarker[]>([]);
  const [clipboard, setClipboard] = useState<Clip | null>(null);
  // WASM
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [wasmCore, setWasmCore] = useState<any | null>(null);

  // Initialize WASM Engine
  React.useEffect(() => {
    async function initWasm() {
      try {
        const wasm = await import("lazynext-wasm");
        console.log("🚀 Rust Core Loaded Successfully:", wasm);
        setWasmCore(wasm);
      } catch (err) {
        console.error("Failed to load Rust core:", err);
      }
    }
    initWasm();
  }, []);

  const value: EditorState = {
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
    selectedClipId,
    setSelectedClipId,
    selectedClipIds,
    setSelectedClipIds,
    zoomLevel,
    setZoomLevel,
    isSnappingEnabled,
    setIsSnappingEnabled,
    showCommandPalette,
    setShowCommandPalette,
    activeWorkspace,
    setActiveWorkspace,
    markers,
    setMarkers,
    clipboard,
    setClipboard,
    wasmCore,
  };

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
}

export function useEditorState() {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error(
      "useEditorState must be used within an EditorStateProvider",
    );
  }
  return context;
}

/**
 * Like useEditorState(), but returns null instead of throwing when
 * used outside an EditorStateProvider. Use this for gradual migration
 * from prop-based to context-based state.
 */
export function useOptionalEditorState(): EditorState | null {
  return useContext(EditorContext);
}
