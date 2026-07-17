/**
 * Editor state provider — React context for project state, frames,
 * settings, playback, and transport controls across the editor tree.
 *
 * @module components/editor/useEditorState
 */

"use client";

import React, {
	useState,
	createContext,
	useContext,
	type ReactNode,
} from "react";
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

export type ActiveTool =
	| "select"
	| "blade"
	| "razor"
	| "slip"
	| "pen"
	| "hand"
	| "ripple"
	| "slide"
	| "magic-eraser"
	| "roll";

/** Type definition for Workspace. */
export type Workspace =
	| "timeline"
	| "fusion"
	| "color"
	| "audio"
	| "ai"
	| "export";

interface EditorState {
	// Core
	/** Current project data, or null if none loaded. */
	projectData: Project | null;
	/** Sets the current project data. */
	setProjectData: (data: Project | null) => void;
	/** Media assets available in the project. */
	assets: Asset[];
	/** State setter for the assets list. */
	setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
	// Playback
	/** Current playhead time in seconds. */
	currentTime: number;
	/** State setter for the current time. */
	setCurrentTime: React.Dispatch<React.SetStateAction<number>>;
	/** Whether playback is active. */
	isPlaying: boolean;
	/** State setter for the playing flag. */
	setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
	// Tools
	/** Currently active editing tool. */
	activeTool: ActiveTool;
	/** State setter for the active tool. */
	setActiveTool: React.Dispatch<React.SetStateAction<ActiveTool>>;
	// Selection
	/** ID of the primary selected clip, or null. */
	selectedClipId: string | null;
	/** Sets the primary selected clip ID. */
	setSelectedClipId: (id: string | null) => void;
	/** IDs of all selected clips. */
	selectedClipIds: string[];
	/** State setter for the selected clip IDs. */
	setSelectedClipIds: React.Dispatch<React.SetStateAction<string[]>>;
	// Viewport
	/** Timeline zoom level. */
	zoomLevel: number;
	/** State setter for the zoom level. */
	setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
	/** Whether snapping is enabled. */
	isSnappingEnabled: boolean;
	/** State setter for the snapping flag. */
	setIsSnappingEnabled: React.Dispatch<React.SetStateAction<boolean>>;
	// Command Palette
	/** Whether the command palette is visible. */
	showCommandPalette: boolean;
	/** State setter for command palette visibility. */
	setShowCommandPalette: React.Dispatch<React.SetStateAction<boolean>>;
	// Workspace
	/** Currently active workspace tab. */
	activeWorkspace: Workspace;
	/** State setter for the active workspace. */
	setActiveWorkspace: React.Dispatch<React.SetStateAction<Workspace>>;
	// Markers & Clipboard
	/** Timeline markers in the project. */
	markers: TimelineMarker[];
	/** State setter for the markers list. */
	setMarkers: React.Dispatch<React.SetStateAction<TimelineMarker[]>>;
	/** Clip currently on the clipboard, or null. */
	clipboard: Clip | null;
	/** Sets the clipboard clip. */
	setClipboard: (data: Clip | null) => void;
	// WASM
	/** Loaded WASM core module, or null if not yet loaded. */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	wasmCore: any | null;
}

const EditorContext = createContext<EditorState | null>(null);

/** React component rendering EditorStateProvider. */
export function EditorStateProvider({
	children,
	initialProject,
}: {
	children: ReactNode;
	initialProject?: Project | null;
}) {
	// Core
	const [projectData, setProjectData] = useState<Project | null>(
		initialProject ?? null,
	);
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
		async function loadWasm() {
			try {
				const { ensureWasmInitialized } = await import("@/wasm/init");
				await ensureWasmInitialized();
				const wasm = await import("lazynext-wasm");
				console.log("🚀 Rust Core Loaded Successfully:", wasm);
				setWasmCore(wasm);
			} catch (err) {
				console.error("Failed to load Rust core:", err);
			}
		}
		loadWasm();
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

/** Custom hook providing useEditorState functionality. */
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
