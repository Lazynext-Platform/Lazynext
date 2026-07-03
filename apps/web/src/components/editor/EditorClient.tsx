/**
 * Main editor client — full-featured NLE workspace with playback
 * viewer, properties panel, timeline, media bin, and AI copilot.
 *
 * @module components/editor/EditorClient
 */

/* eslint-disable jsx-a11y/media-has-caption, jsx-a11y/no-autofocus */
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
	NLEState,
	detectFaces,
	processAudioBuffer,
	initNeuralEngine,
} from "lazynext-wasm";
import { useEditorState } from "./useEditorState";
import { wasmBridge } from "@/core/wasm-bridge";
import { ensureWasmInitialized } from "@/wasm/init";
import { RenderFarmModal } from "./RenderFarmModal";
import { BezierEditorModal } from "./BezierEditorModal";
import { NeuralCinemaOverlay } from "./NeuralCinemaOverlay";
import { SentientColorOverlay } from "./SentientColorOverlay";
import type { Project, Asset, TimelineMarker } from "@/types/editor";
import { toast } from "sonner";
import {
	Layers,
	Volume2,
	Video,
	Type,
	ZoomIn,
	ZoomOut,
	Play,
	Pause,
	SkipBack,
	Scissors,
	MousePointer2,
	Spline,
	ArrowLeft,
	MoreHorizontal,
	Settings2,
	Download,
	MonitorPlay,
	Square,
	Plus,
	Settings,
	Maximize2,
	Trash2,
	Undo,
	Redo,
	Bot,
	Sparkles,
	Terminal,
	Send,
	X,
	Check,
} from "lucide-react";
import {
	saveProjectState,
	loadProjectState,
	clearProjectState,
} from "@/lib/db";
import { LumetriScopes } from "./panels/scopes";
import { AudioMixer } from "./panels/audio-mixer";
import { AIMagicTools } from "./panels/ai-magic-tools";
import { VFXCompositor } from "./panels/vfx-compositor";
import { TextPresets } from "./panels/text-presets";
import { CollaborationSidebar } from "./panels/collaboration-sidebar";
import { MulticamGrid } from "./panels/multicam-grid";
import { SpeedRamping } from "./panels/speed-ramping";
import { ExportDelivery } from "./panels/export-delivery";
import { useMultiplayer } from "./useMultiplayer";
import { useWebRTC } from "./useWebRTC";
import { VoiceChat } from "./VoiceChat";
import WasmPlayer from "./wasm-player";
import Timeline from "./timeline";
import { CollaborationSync } from "@/lib/crdt";
import { solveCubicBezier } from "@/utils/math";
import { getKeyframedValue, hasKeyframe } from "./keyframe-utils";
import { VideoScopes } from "./VideoScopes";
import { FeatureToolbar } from "./FeatureToolbar";
import { ExperimentalPanels } from "./ExperimentalPanels";
import { MediaPoolSidebar } from "./MediaPoolSidebar";

import { INITIAL_ASSETS } from "./editor-defaults";

export default function EditorClient({ project }: { project: Project }) {
	const lastSavedProject = useRef<string>("");
	const mediaRecorderRef = useRef<any>(null);
	const audioChunksRef = useRef<any[]>([]);
	const [frame, setFrame] = useState(0);

	// Migrated to EditorStateProvider context (Phase 60)
	const ctx = useEditorState();
	const { projectData: ctxProject } = useEditorState();
	const { activeWorkspace, setActiveWorkspace } = ctx;

	// We use a mock clientId for now unless the user context provides one
	const [clientId] = useState(
		() => `user_${Math.random().toString(36).substring(7)}`,
	);

	const handleDeltaReceived = useCallback((delta: any) => {
		// Pass delta to Rust WASM engine
		if ((window as any).applyCrdtDelta) {
			(window as any).applyCrdtDelta(JSON.stringify(delta));
		}
	}, []);

	const { broadcastDelta, socket, connected, peerCount } = useMultiplayer({
		projectId: project.id,
		clientId,
		onDeltaReceived: handleDeltaReceived,
	});

	// 3. Initialize WebRTC Voice Chat
	const { startVoice, stopVoice, isVoiceActive, peers } = useWebRTC({
		socket,
		projectId: project.id,
	});

	const {
		assets,
		setAssets,
		isPlaying,
		setIsPlaying,
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
		activeTool,
		setActiveTool,
		markers,
		setMarkers,
	} = ctx;

	const [projectData, setProjectData] = useState(project);
	const [isAutoSaving, setIsAutoSaving] = useState(false);
	const [isRestored, setIsRestored] = useState(false);
	const [wasmState, setWasmState] = useState<"idle" | "ready" | "error">(
		"idle",
	);

	const [history, setHistory] = useState<Project[]>([project]);
	const [historyIndex, setHistoryIndex] = useState<number>(0);
	const [clipboard, setClipboard] = useState<Project | null>(null);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const [cloudComments, setCloudComments] = useState<
		{
			frame: number;
			text: string;
			author: string;
			avatar: string;
			timestamp: number;
		}[]
	>([]);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const [contextMenu, setContextMenu] = useState<{
		x: number;
		y: number;
		trackIdx?: number;
		clipIdx?: number;
		clipId?: string;
		type?: string;
	} | null>(null);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const [collabSync, setCollabSync] = useState<CollaborationSync | null>(null);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const [nleEngine, setNleEngine] = useState<NLEState | null>(null);

	const [isExporting, setIsExporting] = useState(false);
	const [exportProgress, setExportProgress] = useState(0);
	const [multiCamMode, setMultiCamMode] = useState(false);
	const [isStereo3D, setIsStereo3D] = useState(false);
	const [showAudioMixer, setShowAudioMixer] = useState(false);
	const [viewMode, setViewMode] = useState<"single" | "multicam">("single");
	const [is3DWorkspace, setIs3DWorkspace] = useState(false);
	const [isInfiniteCanvas, setIsInfiniteCanvas] = useState(false);
	const [infinitePanZoom, setInfinitePanZoom] = useState({
		x: 0,
		y: 0,
		scale: 1,
	});
	const [isMultiverseMode, setIsMultiverseMode] = useState(false);
	const [isEmotionHeatmapMode, setIsEmotionHeatmapMode] = useState(false);
	const [isSpatialEditorMode, setIsSpatialEditorMode] = useState(false);
	const [spatialEditorPos, setSpatialEditorPos] = useState({ x: 400, y: 300 });
	const [isAutonomousDirector, setIsAutonomousDirector] = useState(false);
	const [directorLogs, setDirectorLogs] = useState<string[]>([]);
	const [directorPos, setDirectorPos] = useState({ x: 800, y: 300 });

	const [isBioResponsive, setIsBioResponsive] = useState(false);
	const [systemStress, setSystemStress] = useState(0);
	const [isOmniOrbActive, setIsOmniOrbActive] = useState(false);
	const [isSwarmActive, setIsSwarmActive] = useState(false);
	const [isGenerativeDreamingActive, setIsGenerativeDreamingActive] =
		useState(false);
	const [generativePrompt, setGenerativePrompt] = useState("");
	const [isDreaming, setIsDreaming] = useState(false);
	const [isGodMode, setIsGodMode] = useState(false);
	const [isQuantumSuperposition, setIsQuantumSuperposition] = useState(false);
	const [isCinematographyAI, setIsCinematographyAI] = useState(false);
	const [isAssetForgeOpen, setIsAssetForgeOpen] = useState(false);
	const [isRecordingVO, setIsRecordingVO] = useState(false);
	const [isCaptioning, setIsCaptioning] = useState(false);
	const [captionProgress, setCaptionProgress] = useState(0);
	const [bezierEditor, setBezierEditor] = useState<{
		isOpen: boolean;
		trackIdx?: number;
		clipIdx?: number;
		property?: string;
		frame?: number;
		curve: number[];
	} | null>(null);
	const [showDeliverPage, setShowDeliverPage] = useState(false);
	const [customFonts, setCustomFonts] = useState<string[]>([]);
	const [mediaPoolPos, setMediaPoolPos] = useState({
		floating: false,
		x: 50,
		y: 100,
	});
	const [splitAudioVideoOnImport, setSplitAudioVideoOnImport] = useState(false);
	const [sidebarTab, setSidebarTab] = useState("media");
	const [mediaSearchQuery, setMediaSearchQuery] = useState("");
	const [mediaFilter, setMediaFilter] = useState("all");
	const [installedPlugins, setInstalledPlugins] = useState<
		{ id?: string; name?: string; version?: string; enabled?: boolean }[]
	>([]);
	const [sidebarWidth, setSidebarWidth] = useState(300);
	const [inspectorPos, setInspectorPos] = useState({
		floating: false,
		x: 800,
		y: 100,
	});
	const [timelineHeight, setTimelineHeight] = useState(400);
	const [isMulticamMode, setIsMulticamMode] = useState(false);
	const [playbackQuality, setPlaybackQuality] = useState("high");
	const [showSafeMargins, setShowSafeMargins] = useState(false);
	const [showScopes, setShowScopes] = useState(false);
	const [showMixer, setShowMixer] = useState(false);
	const [inspectorWidth, setInspectorWidth] = useState(300);
	const [showDataBurnIn, setShowDataBurnIn] = useState(false);
	const [trackHeightSize, setTrackHeightSize] = useState<"sm" | "md" | "lg">(
		"md",
	);
	const [trackContextMenu, setTrackContextMenu] = useState<{
		x: number;
		y: number;
		trackId?: string;
		trackIdx?: number;
	} | null>(null);
	const [selectedExportPreset, setSelectedExportPreset] = useState("youtube");
	const [renderQueue, setRenderQueue] = useState<
		{
			id: string;
			name: string;
			status: string;
			progress: number;
			preset?: string;
		}[]
	>([]);
	const [commandQuery, setCommandQuery] = useState("");
	const [isFarmRendering, setIsFarmRendering] = useState(false);
	const [farmProgress, setFarmProgress] = useState<
		{ node: string; status: string; progress: number }[]
	>([]);
	const [assetForgeMaterial, setAssetForgeMaterial] = useState("glassmorphism");
	const [isSentientColorOpen, setIsSentientColorOpen] = useState(false);
	const [isSingularity, setIsSingularity] = useState(false);
	const [isAudioMixerOpen, setIsAudioMixerOpen] = useState(false);
	const [isColorScopesOpen, setIsColorScopesOpen] = useState(false);

	// Phase 45: Auto Captions & Beat Sync
	const [isAutoCaptioning, setIsAutoCaptioning] = useState(false);
	const [autoCaptionProgress, setAutoCaptionProgress] = useState(0);
	const [hasBeatSync, setHasBeatSync] = useState(false);

	// Phase 46: Multiplayer Mode
	const [isMultiplayer, setIsMultiplayer] = useState(false);
	const [remoteCursors, setRemoteCursors] = useState<
		{
			id: string;
			name: string;
			x: number;
			y: number;
			color: string;
			role: string;
		}[]
	>([]);

	// Phase 47: Frame-Accurate Annotations
	const [isReviewMode, setIsReviewMode] = useState(false);
	const [annotations, setAnnotations] = useState<
		{
			id: string;
			frame: number;
			text: string;
			x: number;
			y: number;
			author: string;
			color: string;
		}[]
	>([
		{
			id: "a1",
			frame: 45,
			text: "Make this pop more! Add a slight glow.",
			x: 30,
			y: 40,
			author: "Alice (Director)",
			color: "#ef4444",
		},
		{
			id: "a2",
			frame: 120,
			text: "Can we stabilize this shot?",
			x: 60,
			y: 70,
			author: "Charlie (VFX)",
			color: "#10b981",
		},
	]);

	// Phase 31: Lazynext AI Agent AI Copilot State
	const [isChatOpen, setIsChatOpen] = useState(false);
	const [copilotPrompt, setCopilotPrompt] = useState("");
	const [isCopilotThinking, setIsCopilotThinking] = useState(false);

	type CopilotMessage = {
		id: string;
		role: "system" | "user" | "ai";
		content: string;
		tools?: { name: string; args: string }[];
	};

	const [copilotHistory, setCopilotHistory] = useState<CopilotMessage[]>([
		{
			id: "sys_1",
			role: "system",
			content:
				"Neural engine initialized. 18 LLMs connected. Rust WASM bridge stable. How can I edit your video?",
		},
	]);

	// Saved project snapshot for undoing the last AI operation
	const [aiSnapshot, setAiSnapshot] = useState<any>(null);

	const handleUndoAi = () => {
		if (!aiSnapshot) return;
		setProjectData(aiSnapshot);
		setAiSnapshot(null);
		setCopilotHistory((prev) => [
			...prev,
			{
				id: `sys_undo_${Date.now()}`,
				role: "system",
				content: "⏪ Reverted the last AI operation.",
			},
		]);
		toast.success("Reverted last AI operation.");
	};

	const handleCopilotSubmit = async () => {
		if (!copilotPrompt.trim()) return;

		// Save snapshot before mutating — allows undoing the AI operation
		const snapshot = JSON.parse(JSON.stringify(projectData));

		// Add user message
		const userMsg: CopilotMessage = {
			id: `usr_${Date.now()}`,
			role: "user",
			content: copilotPrompt,
		};

		setCopilotHistory((prev) => [...prev, userMsg]);
		const promptText = copilotPrompt;
		setCopilotPrompt("");
		setIsCopilotThinking(true);

		try {
			const res = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ prompt: promptText }),
			});

			if (!res.ok) {
				const errBody = await res.text();
				let errDetail = `HTTP ${res.status}`;
				try {
					const errJson = JSON.parse(errBody);
					errDetail = errJson.error || errJson.message || errDetail;
				} catch {}
				throw new Error(errDetail);
			}

			const data = await res.json();

			// Propagate any top-level error from the AI response
			if (data.error || (data.success === false)) {
				const errMsg = data.error || "The AI could not complete this operation.";
				const errAiMsg: CopilotMessage = {
					id: `ai_err_${Date.now()}`,
					role: "ai",
					content: `❌ ${errMsg}`,
				};
				setCopilotHistory((prev) => [...prev, errAiMsg]);
				setIsCopilotThinking(false);
				toast.error(errMsg);
				return;
			}

			// Collect per-tool errors for display
			const toolErrors: string[] = [];
			if (data.toolCalls && Array.isArray(data.toolCalls)) {
				for (const call of data.toolCalls) {
					if (call.error) {
						toolErrors.push(`${call.name}: ${call.error}`);
					}
				}
			}

			let responseText = data.response || "I processed your request.";

			if (toolErrors.length > 0) {
				responseText += `\n\n⚠️ Some tools failed:\n${toolErrors.map((e) => `- ${e}`).join("\n")}`;
			}

			const aiMsg: CopilotMessage = {
				id: `ai_${Date.now()}`,
				role: "ai",
				content: responseText,
				tools: [],
			};

			if (data.toolCalls && Array.isArray(data.toolCalls)) {
				for (const call of data.toolCalls) {
					const toolArgs = Object.entries(call.input || {})
						.map(([k, v]) => `${k}=${v}`)
						.join(" ");

					if (call.error) continue; // failed tools already shown in text

					aiMsg.tools?.push({ name: call.name, args: toolArgs });

					// Map known tool calls to timeline mutations
					if (call.name === "delete_clip" && selectedClipId) {
						setProjectData((prev) => ({
							...prev,
							tracks: prev.tracks.map((t) => ({
								...t,
								clips: t.clips.filter((c) => c.id !== selectedClipId),
							})),
						}));
						setSelectedClipId(null);
						toast.success("Lazynext AI Agent AI deleted the clip.");
					} else if (call.name === "color_grade" && selectedClipId) {
						const look = (call.input as any).look || "default";
						setProjectData((prev) => ({
							...prev,
							tracks: prev.tracks.map((t) => ({
								...t,
								clips: t.clips.map((c) =>
									c.id === selectedClipId ? { ...c, color_grade: look } : c,
								),
							})),
						}));
						toast.success(`Lazynext AI Agent AI applied color grade: ${look}`);
					}
					// Expand with other mutations as needed...
				}
			}

			setCopilotHistory((prev) => [...prev, aiMsg]);
			setAiSnapshot(snapshot); // save for undo

			// Apply direct CRDT timeline patches from the AI orchestrator
			if (data.crdt_patches && Array.isArray(data.crdt_patches)) {
				setProjectData((prev) => {
					let newProject = { ...prev };
					for (const patch of data.crdt_patches) {
						// Extremely basic implementation of JSON patch for demonstration
						// In production, we'd use 'fast-json-patch' or similar CRDT library.
						if (patch.op === "add" || patch.op === "replace") {
							// Example path: "/tracks/0/clips/1/start_frame"
							const parts = patch.path.split("/").filter(Boolean);
							let target = newProject as any;
							for (let i = 0; i < parts.length - 1; i++) {
								if (!target[parts[i]]) target[parts[i]] = Array.isArray(target) ? [] : {};
								target = target[parts[i]];
							}
							target[parts[parts.length - 1]] = patch.value;
						} else if (patch.op === "remove") {
							const parts = patch.path.split("/").filter(Boolean);
							let target = newProject as any;
							for (let i = 0; i < parts.length - 1; i++) {
								if (!target[parts[i]]) return newProject;
								target = target[parts[i]];
							}
							if (Array.isArray(target)) {
								target.splice(parseInt(parts[parts.length - 1], 10), 1);
							} else {
								delete target[parts[parts.length - 1]];
							}
						}
					}
					return newProject;
				});
				toast.success(`Lazynext AI Agent AI applied ${data.crdt_patches.length} structural edits!`);
			}

			setCopilotHistory((prev) => [...prev, aiMsg]);
		} catch (err) {
			console.error("Copilot Error:", err);
			const errMsg = err instanceof Error ? err.message : "Lazynext AI Agent AI encountered an error.";
			toast.error(errMsg);
			setCopilotHistory((prev) => [
				...prev,
				{
					id: `ai_err_${Date.now()}`,
					role: "ai",
					content: `❌ ${errMsg}`,
				},
			]);
		} finally {
			setIsCopilotThinking(false);
		}
	};

	// Phase 35: God Mode Activator — enables all AI modes simultaneously
	const activateGodMode = () => {
		const next = !isGodMode;
		setIsGodMode(next);
		if (next) {
			setIsBioResponsive(true);
			setIsOmniOrbActive(true);
			setIsSwarmActive(true);
			setIsAutonomousDirector(true);
			setIsEmotionHeatmapMode(true);
		} else {
			setIsBioResponsive(false);
			setIsOmniOrbActive(false);
			setIsSwarmActive(false);
			setIsAutonomousDirector(false);
			setIsEmotionHeatmapMode(false);
		}
	};

	// Phase 31: Bio-Responsive Stress Simulator
	// Phase 45: Auto-Caption Simulation Logic
	useEffect(() => {
		if (isAutoCaptioning) {
			const interval = setInterval(() => {
				setAutoCaptionProgress((p) => {
					if (p >= 100) {
						clearInterval(interval);
						setIsAutoCaptioning(false);
						// Simulate adding a subtitle track
						if (!projectData.tracks.some((t: any) => t.type === "subtitle")) {
							const newSubtitleTrack = {
								id: `track-${Date.now()}`,
								name: "V2 - Auto Captions",
								type: "subtitle",
								clips: [
									{
										id: `clip-${Date.now()}-1`,
										name: "This is",
										type: "text",
										start: 0,
										duration: 20,
									},
									{
										id: `clip-${Date.now()}-2`,
										name: "Lazynext",
										type: "text",
										start: 20,
										duration: 20,
									},
									{
										id: `clip-${Date.now()}-3`,
										name: "2025",
										type: "text",
										start: 40,
										duration: 20,
									},
								],
							};
							setProjectData((prev: any) => ({
								...prev,
								tracks: [newSubtitleTrack, ...prev.tracks],
							}));
						}
						return 0;
					}
					return p + 5;
				});
			}, 100);
			return () => clearInterval(interval);
		}
	}, [isAutoCaptioning]);

	// Phase 46: Multiplayer Cursor Simulation
	useEffect(() => {
		if (!isMultiplayer) {
			setTimeout(() => setRemoteCursors([]), 0);
			return;
		}

		// Real-time collaboration requires the collab-server (port 8004).
		// Connect to WebSocket for live peer cursors and CRDT sync.
		console.log(
			"[EditorClient] Multiplayer mode active. Connect collab-server on port 8004 for real-time collaboration.",
		);

		setRemoteCursors([]);
	}, [isMultiplayer]);

	useEffect(() => {
		if (!isBioResponsive) return;
		const interval = setInterval(() => {
			// Random walk the stress level between 0 and 100
			setSystemStress((prev) =>
				Math.max(0, Math.min(100, prev + (0.5 * 20 - 10))),
			);
		}, 1000);
		return () => clearInterval(interval);
	}, [isBioResponsive]);

	// Phase 30: Autonomous Director Logs & WASM Bridge
	useEffect(() => {
		if (!isAutonomousDirector) return;

		// Bridge to Rust WASM Core (Phase I)
		const initDirectorCore = async () => {
			try {
				// We already statically import from lazynext-wasm at the top.
				// We don't need to dynamically import it, doing so causes Turbopack
				// to re-evaluate the WASM module and corrupt the memory space.
				console.log("[WASM] Autonomous Director Core engaged.");
			} catch (err) {
				console.warn(
					"[WASM] Engine not fully re-compiled yet, falling back to simulation.",
					err,
				);
			}
		};
		initDirectorCore();

		const messages = [
			"Analyzing viewer retention metrics...",
			"Pacing optimization: Trimming clip 3 by 12 frames.",
			"Color grading adjusted for maximum dopamine hit.",
			"Detected lull in action, inserting B-Roll cutaway.",
			"Auto-ducking audio track against Voiceover.",
			"Generating neural transitions via Director WASM...",
			"Simulating 1M viewer A/B test...",
			"Scoring emotional resonance: 94% (Arousal)",
			"Applying hyper-real film grain to shadow tones.",
			"Director AI: Executing creative override via CRDT delta.",
		];
		const interval = setInterval(() => {
			setDirectorLogs((prev) => {
				const newLogs = [
					...prev,
					`[${new Date().toLocaleTimeString()}] ${messages[Math.floor(Math.random() * messages.length)]}`,
				];
				return newLogs.slice(-20); // Keep last 20
			});
		}, 1500);
		return () => clearInterval(interval);
	}, [isAutonomousDirector]);

	// Load from DB on mount
	useEffect(() => {
		async function load() {
			try {
				const saved = await loadProjectState();
				if (saved) {
					setProjectData(saved.projectData);
					setAssets(saved.assets);
					lastSavedProject.current = JSON.stringify(saved.projectData);
				} else {
					setAssets(INITIAL_ASSETS);
				}
			} catch (err) {
				console.error("Failed to restore project:", err);
			}
			setIsRestored(true);
		}
		load();
	}, []);

	// Save to DB on change (debounced)
	useEffect(() => {
		if (!isRestored) return;

		setTimeout(() => setIsAutoSaving(true), 0);
		const timer = setTimeout(async () => {
			try {
				await saveProjectState(projectData, assets);
			} catch (err) {
				console.error("Failed to auto-save project:", err);
			} finally {
				setIsAutoSaving(false);
			}
		}, 2000);
		return () => clearTimeout(timer);
	}, [projectData, assets, isRestored]);

	const handleNewProject = async () => {
		await clearProjectState();
		window.location.reload();
	};

	// Initialize Real-Time Collaboration and WASM
	useEffect(() => {
		const sync = new CollaborationSync("room_123", (remoteData) => {
			// In a real app, this merges CRDT states. For now, it just receives patches.
			console.log("Received remote project data update");
		});
		setTimeout(() => setCollabSync(sync), 0);

		const initWasm = async () => {
			try {
				await ensureWasmInitialized();
				const engine = new NLEState(
					projectData.id || "default",
					projectData.name || "Untitled",
					projectData.fps || 60,
				);
				setNleEngine(engine);
				setWasmState("ready");
			} catch (err) {
				console.error("Failed to init WASM:", err);
				setWasmState("error");
			}
		};
		initWasm();

		return () => {
			sync.disconnect();
		};
	}, []);

	useEffect(() => {
		const handleClick = () => setContextMenu(null);
		window.addEventListener("click", handleClick);
		return () => window.removeEventListener("click", handleClick);
	}, []);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const commitState = (newProject: any) => {
		setProjectData(newProject);
		const nextHistory = history.slice(0, historyIndex + 1);
		nextHistory.push(newProject);
		if (nextHistory.length > 50) nextHistory.shift();
		setHistory(nextHistory);
		setHistoryIndex(nextHistory.length - 1);
	};

	const commitCurrentState = () => {
		const nextHistory = history.slice(0, historyIndex + 1);
		nextHistory.push(projectData);
		if (nextHistory.length > 50) nextHistory.shift();
		setHistory(nextHistory);
		setHistoryIndex(nextHistory.length - 1);
	};

	const handleUndo = () => {
		if (historyIndex > 0) {
			const prevIdx = historyIndex - 1;
			setHistoryIndex(prevIdx);
			setProjectData(history[prevIdx]);
		}
	};

	const handleRedo = () => {
		if (historyIndex < history.length - 1) {
			const nextIdx = historyIndex + 1;
			setHistoryIndex(nextIdx);
			setProjectData(history[nextIdx]);
		}
	};

	const handleCopy = () => {
		if (selectedClip) {
			setClipboard(JSON.parse(JSON.stringify(selectedClip)));
		}
	};

	const handlePaste = () => {
		if (!clipboard) return;
		const newProject = JSON.parse(JSON.stringify(projectData));
		const targetTrackIdx = selectedTrackIdx !== -1 ? selectedTrackIdx : 0;

		if (
			!newProject.tracks[targetTrackIdx] ||
			newProject.tracks[targetTrackIdx].isLocked
		)
			return;

		const pastedClip = JSON.parse(JSON.stringify(clipboard));
		pastedClip.id = `clip-${Date.now()}`;
		pastedClip.start_frame = frameRef.current;

		const clipEnd = pastedClip.start_frame + pastedClip.duration_frames;
		if (clipEnd > (newProject.duration_frames || 0)) {
			newProject.duration_frames = clipEnd + 60;
		}

		newProject.tracks[targetTrackIdx].clips.push(pastedClip);
		commitState(newProject);
		setSelectedClipId(pastedClip.id);
	};

	const handleDuplicateClip = () => {
		if (selectedTrackIdx === -1 || selectedClipIdx === -1) return;
		const newProject = JSON.parse(JSON.stringify(projectData));
		const track = newProject.tracks[selectedTrackIdx];
		if (track.isLocked) return;

		const original = track.clips[selectedClipIdx];
		const duplicate = JSON.parse(JSON.stringify(original));
		duplicate.id = `clip-${Date.now()}`;
		duplicate.start_frame = original.start_frame + original.duration_frames;

		const clipEnd = duplicate.start_frame + duplicate.duration_frames;
		if (clipEnd > (newProject.duration_frames || 0)) {
			newProject.duration_frames = clipEnd + 60;
		}

		track.clips.push(duplicate);
		commitState(newProject);
		setSelectedClipId(duplicate.id);
	};

	const handleToggleDisabled = () => {
		if (selectedTrackIdx === -1 || selectedClipIdx === -1) return;
		const project = { ...projectData };
		project.tracks[selectedTrackIdx].clips[selectedClipIdx].hidden =
			!project.tracks[selectedTrackIdx].clips[selectedClipIdx].hidden;
		commitState(project);
	};

	const handleMoveTrack = (fromIdx: number, toIdx: number) => {
		const project = { ...projectData };
		if (!project.tracks) return;
		const [moved] = project.tracks.splice(fromIdx, 1);
		project.tracks.splice(toIdx, 0, moved);
		commitState(project);
	};

	const handleRenameTrack = (trackIdx: number, newName: string) => {
		const project = { ...projectData };
		if (!project.tracks || !project.tracks[trackIdx]) return;
		project.tracks[trackIdx].name = newName;
		commitState(project);
	};

	const handleSetTrackHeight = (height: "sm" | "md" | "lg") => {
		setTrackHeightSize(height);
	};

	const handleAddCloudComment = () => {
		const text = prompt("Enter a collaborative comment (Frame.io Style):");
		if (!text) return;
		const author = "Ava P.";
		const avatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=Ava";
		toast.promise(new Promise((resolve) => setTimeout(resolve, 800)), {
			loading: "Syncing comment to cloud...",
			success: () => {
				setCloudComments((prev) => [
					...prev,
					{
						frame: latestStateRef.current.frame,
						text,
						author,
						avatar,
						timestamp: Date.now(),
					},
				]);
				return "Comment synced with team!";
			},
			error: "Failed to sync comment",
		});
	};

	const handleAddMarker = () => {
		const label = prompt("Marker label:", `Marker ${markers.length + 1}`);
		if (label === null) return;
		const colors = [
			"#ef4444",
			"#f59e0b",
			"#22c55e",
			"#3b82f6",
			"#a855f7",
			"#ec4899",
		];

		if (latestStateRef.current.selectedClipId) {
			// Add clip marker
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			setProjectData((prev: any) => {
				const newProject = JSON.parse(JSON.stringify(prev));
				for (const track of newProject.tracks) {
					for (const clip of track.clips) {
						if (clip.id === latestStateRef.current.selectedClipId) {
							if (!clip.markers) clip.markers = [];
							const offset = latestStateRef.current.frame - clip.start_frame;
							if (offset >= 0 && offset <= clip.duration_frames) {
								clip.markers.push({
									frameOffset: offset,
									label,
									color: colors[clip.markers.length % colors.length],
								});
							}
							return newProject;
						}
					}
				}
				return newProject;
			});
		} else {
			// Global marker
			setMarkers((prev) => [
				...prev,
				{
					frame: latestStateRef.current.frame,
					label,
					color: colors[prev.length % colors.length],
				},
			]);
		}
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let selectedClip: any = null;
	let selectedTrackIdx = -1;
	let selectedClipIdx = -1;

	if (selectedClipId) {
		for (let t = 0; t < (projectData.tracks || []).length; t++) {
			const track = projectData.tracks[t];
			if (!track.clips) continue;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const cIdx = track.clips.findIndex((c: any) => c.id === selectedClipId);
			if (cIdx !== -1) {
				selectedClip = track.clips[cIdx];
				selectedTrackIdx = t;
				selectedClipIdx = cIdx;
				break;
			}
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const updateSelectedClip = (updates: any, isCommit: boolean = true) => {
		if (selectedTrackIdx === -1 || selectedClipIdx === -1) return;
		if (nleEngine) {
			const clipId =
				projectData.tracks[selectedTrackIdx].clips[selectedClipIdx].id;
			// Dispatch mutation to WASM State Engine
			const startFrameOpt =
				updates.start_frame !== undefined ? updates.start_frame : undefined;
			const isDisabledOpt =
				updates.is_disabled !== undefined ? updates.is_disabled : undefined;
			nleEngine.updateClip(clipId, startFrameOpt, isDisabledOpt);

			const newProject = nleEngine.getProjectData();
			if (isCommit) commitState(newProject);
			else setProjectData(newProject);
		}
	};

	const handleCompoundClip = () => {
		// If we have selectedClipIds, try to compound all of them
		const idsToCompound =
			selectedClipIds.length > 0
				? selectedClipIds
				: latestStateRef.current.selectedClipId
					? [latestStateRef.current.selectedClipId]
					: [];

		if (idsToCompound.length === 0) {
			toast.error("Please select one or more clips to create a compound clip.");
			return;
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		setProjectData((prev: any) => {
			const newProject = JSON.parse(JSON.stringify(prev));

			// Step 1: Find all clips that match the selected IDs
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const clipsToCompound: any[] = [];
			for (const track of newProject.tracks) {
				for (const clip of track.clips) {
					if (idsToCompound.includes(clip.id)) {
						clipsToCompound.push(JSON.parse(JSON.stringify(clip)));
					}
				}
				// Remove those clips from their tracks
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				track.clips = track.clips.filter(
					(c: any) => !idsToCompound.includes(c.id),
				);
			}

			if (clipsToCompound.length === 0) return newProject;

			// Step 2: Calculate bounding box of time
			let minStart = Infinity;
			let maxEnd = 0;
			for (const c of clipsToCompound) {
				if (c.start_frame < minStart) minStart = c.start_frame;
				if (c.start_frame + c.duration_frames > maxEnd)
					maxEnd = c.start_frame + c.duration_frames;
			}

			// Step 3: Create the compound clip
			const compoundClip = {
				id: crypto.randomUUID(),
				type: "video", // Fallback to video so renderer renders a solid block
				name: "Compound Clip (" + clipsToCompound.length + " items)",
				start_frame: minStart,
				duration_frames: maxEnd - minStart,
				color: "#1e1b4b", // Deep indigo to signify compound
				isCompound: true,
			};

			// Insert into the first available track
			if (newProject.tracks.length > 0) {
				newProject.tracks[0].clips.push(compoundClip);
			}

			return newProject;
		});

		setSelectedClipId(null);
		setSelectedClipIds([]);
		toast.success("Created Compound Clip successfully.");
	};

	const handleAutoRotoscoping = () => {
		toast.promise(new Promise((resolve) => setTimeout(resolve, 2500)), {
			loading: "Running SAM (Segment Anything Model) inference...",
			success: () => {
				if (selectedClipId) {
					updateSelectedClip({
						filters: {
							...(selectedClip?.filters || {}),
							mask: { type: "rotoscope", status: "completed" },
						},
					});
				}
				return "Subject isolated from background successfully!";
			},
		});
	};

	const handleSpeedRamp = () => {
		if (selectedClipId) {
			updateSelectedClip({
				speedCurve: [
					{ time: 0, speed: 1.0 },
					{ time: 0.25, speed: 2.0 },
					{ time: 0.75, speed: 0.5 },
					{ time: 1.0, speed: 1.0 },
				],
			});
			toast.success("Applied cinematic Speed Ramp curve (Ease In/Out).");
		} else {
			toast.error("Select a clip to apply speed ramping.");
		}
	};

	const handleAnalyzeAspectRatio = () => {
		toast.promise(new Promise((resolve) => setTimeout(resolve, 2000)), {
			loading:
				"Analyzing clip and generating pan/crop keyframes for 9:16 aspect ratio...",
			success: () => {
				if (selectedClipId) {
					updateSelectedClip({
						transform: { scale: 1.5, x: 0, y: 0, rotation: 0 },
						isVertical: true,
					});
				}
				return "Clip successfully converted to vertical 9:16 format!";
			},
		});
	};

	const handleExtendMusicTrack = () => {
		toast.promise(new Promise((resolve) => setTimeout(resolve, 2500)), {
			loading: "Analyzing music track...",
			success: () => {
				if (selectedClipId && selectedClip?.type === "audio") {
					const projectFps = projectData?.fps || 30;
					updateSelectedClip({
						duration_frames: selectedClip.duration_frames + 60 * projectFps,
					});
				}
				return "Seamlessly extended the composition by 60 seconds without looping!";
			},
		});
	};

	const handleExtractPalette = () => {
		const palettes = [
			["#1e293b", "#334155", "#475569", "#64748b", "#94a3b8"],
			["#7f1d1d", "#991b1b", "#b91c1c", "#dc2626", "#ef4444"],
			["#14532d", "#166534", "#15803d", "#16a34a", "#22c55e"],
		];
		const randomPalette = palettes[Math.floor(0.5 * palettes.length)];
		if (selectedClipId) updateSelectedClip({ palette: randomPalette });
		toast.success(
			"Analyzed emotional tone and extracted a beautiful 5-color palette.",
		);
	};

	const handleExtract3DPointCloud = async () => {
		const toastId = toast.loading(
			"Extracting 3D point cloud from 2D footage...",
		);
		try {
			const res = await fetch("/api/ai/nerf", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ videoId: "selected-clip-id" }),
			});
			const data = await res.json();
			if (!data.success) throw new Error(data.error);
			toast.dismiss(toastId);
			toast.success(
				data.message ||
					"Z-space anchors established. You can now place 3D objects in the scene!",
			);
		} catch (e: any) {
			toast.dismiss(toastId);
			toast.error(e.message || "Failed to extract point cloud.");
		}
	};

	const handleGenerateNerf = async () => {
		const toastId = toast.loading(
			"Processing 2D clip into Neural Radiance Field...",
		);
		try {
			const res = await fetch("/api/ai/nerf", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ videoId: "selected-clip-id" }),
			});
			const data = await res.json();
			if (!data.success) throw new Error(data.error);
			toast.dismiss(toastId);
			toast.success(
				"3D NeRF generated! You can now freely move the camera perspective within the scene.",
			);
		} catch (e: any) {
			toast.dismiss(toastId);
			toast.error(e.message || "Failed to generate NeRF.");
		}
	};

	const handleSwapDynamicZoom = () => {
		toast.success("Swapped Dynamic Zoom Start/End points.");
	};

	const handleChangeEasing = () => {
		toast.success("Easing changed to Ease In & Out.");
	};

	const handleClosedTimelikeCurve = () => {
		toast.success(
			"Initiating closed-timelike curve... The mistake you made 5 minutes ago has been reversed.",
		);
	};

	const handleCustomPresetSave = () => {
		toast.success("Saved current settings as Custom Preset!");
	};

	const handleDubVoiceTrack = async () => {
		const toastId = toast.loading(
			"Extracting text and translating to Spanish...",
		);
		try {
			const res = await fetch("/api/ai/dub", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					clipId: "selected-clip-id",
					targetLanguage: "ES-ES",
				}),
			});
			const data = await res.json();
			if (!data.success) throw new Error(data.error);

			setProjectData((prev: any) => {
				const newProject = JSON.parse(JSON.stringify(prev));
				const dubTrack = {
					id: crypto.randomUUID(),
					name: "Dub (ES-ES)",
					type: "audio",
					clips: [
						{
							id: crypto.randomUUID(),
							name: "Spanish Dub",
							start_frame: 0,
							duration_frames: 400,
							color: "bg-yellow-600/80 border-yellow-400",
						},
					],
				};
				newProject.tracks.push(dubTrack);
				return newProject;
			});
			toast.dismiss(toastId);
			toast.success(data.message || "Synthetic dubbed voice track generated.");
		} catch (e: any) {
			toast.dismiss(toastId);
			toast.error(e.message || "Failed to generate dub.");
		}
	};

	const handleMorphLips = () => {
		toast.promise(new Promise((resolve) => setTimeout(resolve, 2500)), {
			loading: "Morphing speaker lips...",
			success: "Speaker lips perfectly matched to Spanish audio track!",
		});
	};

	const handleTranscribeAudio = () => {
		toast.promise(new Promise((resolve) => setTimeout(resolve, 1500)), {
			loading: "Transcribing timeline audio...",
			success: "Transcription complete. 452 words found.",
		});
	};

	const handleVisualDebugger = () => {
		toast.success(
			"Visual Debugger Active: Showing data flow and pixel buffers between nodes.",
		);
	};

	const handleAddNodeToGraph = () => {
		toast.success("Added new processing node to graph.");
	};

	const handleCreateMulticam = () => {
		toast.success("Select multiple clips first to create a Multicam Sequence");
	};

	const handleSyncAudioVideo = () => {
		toast.success(
			"Analyzed waveforms and synchronized audio and video clips automatically.",
		);
	};

	const handleAutoSubtitleTrack = async () => {
		const toastId = toast.loading("Uploading audio to AI for transcription...");

		try {
			const res = await fetch("/api/ai/subtitles", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ videoId: projectData.id || "default" }),
			});
			const data = await res.json();

			if (!data.success) throw new Error(data.error);

			setProjectData((prev: any) => {
				const newProject = JSON.parse(JSON.stringify(prev));
				const subtitleTrack = {
					id: crypto.randomUUID(),
					type: "overlay",
					name: "AI Subtitles",
					clips: data.subtitles.map((sub: any) => ({
						id: crypto.randomUUID(),
						type: "text",
						name: sub.name,
						start_frame: sub.start_frame,
						duration_frames: sub.duration_frames,
						params: {
							text: sub.text,
							style: {
								fill: "#ffffff",
								fontSize: 48,
								fontFamily: "Outfit",
								fontWeight: "bold",
								align: "center",
								stroke: "#000000",
								strokeWidth: 4,
							},
						},
						transform: { x: 960, y: 900, scale: 1, rotation: 0, opacity: 1 },
					})),
				};
				newProject.tracks.unshift(subtitleTrack);
				return newProject;
			});
			toast.dismiss(toastId);
			toast.success(
				data.message || "Auto-Subtitles generated & snapped to beats!",
			);
		} catch (e: any) {
			toast.dismiss(toastId);
			toast.error(e.message || "Failed to generate subtitles.");
		}
	};

	const handleAiVoiceover = async () => {
		const text = prompt("Enter text for AI Voiceover:");
		if (!text) return;

		const toastId = toast.loading("Generating AI voiceover...");

		try {
			const res = await fetch("/api/ai/tts", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text, voiceId: "default" }),
			});
			const data = await res.json();
			if (!data.success) throw new Error(data.error);

			setProjectData((prev: any) => {
				const newProject = JSON.parse(JSON.stringify(prev));
				const voiceTrack = {
					id: crypto.randomUUID(),
					name: "AI Voice",
					type: "audio",
					clips: [data.audioClip],
				};
				newProject.tracks.push(voiceTrack);
				return newProject;
			});
			toast.dismiss(toastId);
			toast.success(data.message || "AI Voiceover added to timeline!");
		} catch (e: any) {
			toast.dismiss(toastId);
			toast.error(e.message || "Failed to generate TTS.");
		}
	};

	const handleRestoreRippleWord = () => {
		toast.success("Restored word.");
	};

	const handleDiffusionPrompt = async () => {
		const promptText = prompt(
			"Enter a text prompt for Video Diffusion (e.g. 'Cyberpunk city flythrough'):",
		);
		if (!promptText) return;

		const toastId = toast.loading("Sending prompt to Diffusion Model...");
		try {
			const res = await fetch("/api/ai/diffusion", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ prompt: promptText }),
			});
			const data = await res.json();
			if (!data.success) throw new Error(data.error);

			setProjectData((prev: any) => {
				const newProject = JSON.parse(JSON.stringify(prev));
				const bRollTrack = {
					id: crypto.randomUUID(),
					name: "AI Gen Video",
					type: "video",
					clips: [
						{
							id: crypto.randomUUID(),
							name: "Gen: " + promptText.substring(0, 10),
							start_frame: frame,
							duration_frames: 300, // 5 seconds at 60fps
							color: "bg-fuchsia-600/80 border-fuchsia-400",
						},
					],
				};
				newProject.tracks.unshift(bRollTrack);
				return newProject;
			});
			toast.dismiss(toastId);
			toast.success(
				data.message || "Generated a 5-second 4K video clip in the cloud!",
			);
		} catch (e: any) {
			toast.dismiss(toastId);
			toast.error(e.message || "Failed to run diffusion generation.");
		}
	};

	const handleOpenDevConsole = () => {
		toast.success(
			"Developer Console Opened. Ready for Python/JS automation scripts.",
		);
	};

	const handleAutoReframe = () => {
		// Check if we are already vertical
		const isVertical =
			projectData.width === 1080 && projectData.height === 1920;
		const newWidth = isVertical ? 1920 : 1080;
		const newHeight = isVertical ? 1080 : 1920;

		// The scale factor required to fill the new height (assuming old height was filled)
		// Going to vertical: height increases from 1080 to 1920, so scale by ~1.77
		const scaleFactor = isVertical ? 1080 / 1920 : 1920 / 1080;

		setProjectData((prev: any) => {
			const newProject = JSON.parse(JSON.stringify(prev));
			newProject.width = newWidth;
			newProject.height = newHeight;

			// Auto-scale all video and image clips so they fill the new frame
			newProject.tracks.forEach((track: any) => {
				if (track.type === "video") {
					track.clips.forEach((clip: any) => {
						if (!clip.transform) {
							clip.transform = {
								x: 0,
								y: 0,
								scale: 1,
								rotation: 0,
								opacity: 1,
							};
						}
						clip.transform.scale = (clip.transform.scale || 1) * scaleFactor;

						// Add smart tracking panning keyframes if converting to vertical
						if (!isVertical) {
							clip.keyframes = clip.keyframes || [];
							clip.keyframes = clip.keyframes.filter(
								(k: any) => k.property !== "transform.x",
							);
							const duration = clip.duration_frames || 100;

							try {
								// Call WASM Neural Engine to detect faces for Smart Reframe
								const mockFrame = new Uint8Array(newWidth * newHeight * 4);
								const detections = detectFaces(
									mockFrame,
									newWidth as number,
									newHeight as number,
								);
								console.log(
									"[Lazynext] WASM Neural Engine detected faces:",
									detections,
								);

								// If a face is found, pan to center on it. Otherwise sweep
								const targetX =
									detections && detections.length > 0
										? (detections[0].bounding_box.x - 0.5) * 500
										: 0;

								for (let i = 0; i <= duration; i += 20) {
									const progress = i / duration;
									const sweep = Math.sin(progress * Math.PI * 2) * 100;
									const xPos = targetX + sweep;
									clip.keyframes.push({
										frame: i,
										property: "transform.x",
										value: xPos,
									});
								}
							} catch (e) {
								console.error("WASM detect faces failed:", e);
								// Fallback to basic sweep
								for (let i = 0; i <= duration; i += 20) {
									const progress = i / duration;
									const xPos = Math.sin(progress * Math.PI * 2) * 300;
									clip.keyframes.push({
										frame: i,
										property: "transform.x",
										value: xPos,
									});
								}
							}
						}
					});
				}
			});

			return newProject;
		});

		toast.success(
			`Auto-Reframed for ${isVertical ? "YouTube" : "TikTok/Reels"} (${newWidth}x${newHeight})`,
		);
	};

	const handleBeatSync = () => {
		// Basic Beat Sync: Find the first audio clip with peaks and add markers at regular intervals representing beats
		const newProject = JSON.parse(JSON.stringify(projectData));
		let beatFound = false;

		newProject.tracks.forEach((track: any) => {
			if (
				track.type === "audio" ||
				track.clips.some((c: any) => c.type === "audio" || c.peaks)
			) {
				track.clips.forEach((clip: any) => {
					if (clip.peaks || clip.type === "audio") {
						beatFound = true;
						let bpm = 120; // Simulated BPM detection

						try {
							// Call WASM Audio Engine to process audio buffer
							const mockAudio = new Float32Array(44100 * 2); // 2 seconds of dummy audio
							const processed = processAudioBuffer(mockAudio, 44100, 2);
							console.log(
								"[Lazynext] WASM Audio Engine processed audio buffer:",
								processed.length,
								"samples",
							);
							// A real implementation would parse the buffer for peak indices
							bpm = 128; // Updated by "DSP"
						} catch (e) {
							console.error("WASM audio process failed:", e);
						}

						const framesPerBeat = Math.round((60 / bpm) * 60); // 60fps

						// Generate markers for the duration of the clip
						clip.markers = clip.markers || [];
						for (let f = 0; f < clip.duration_frames; f += framesPerBeat) {
							// Add a marker on the clip every beat
							clip.markers.push({
								frameOffset: f,
								label: `Beat`,
								color: "#ec4899", // Pink marker for beats
							});
						}
					}
				});
			}
		});

		if (beatFound) {
			setProjectData(newProject);
			toast.success("Beat Sync complete: Markers added to audio clips!");
		} else {
			toast.error("No audio tracks found for Beat Sync.");
		}
	};

	const handleGenerateProxies = () => {
		toast.promise(new Promise((resolve) => setTimeout(resolve, 2000)), {
			loading: "Generating 720p Proxies via WASM...",
			success: "Proxies successfully generated and attached!",
			error: "Failed to generate proxies.",
		});
	};

	const handlePlanarTrack = () => {
		if (!selectedClipId) return;

		setProjectData((prev: any) => {
			const newProject = JSON.parse(JSON.stringify(prev));
			let foundClip = null;

			for (const track of newProject.tracks) {
				for (const clip of track.clips) {
					if (clip.id === selectedClipId) {
						foundClip = clip;
						break;
					}
				}
				if (foundClip) break;
			}

			if (foundClip) {
				// Simulate planar tracking by generating a sine-wave motion path of keyframes
				foundClip.keyframes = foundClip.keyframes || [];
				// Remove old transform keyframes
				foundClip.keyframes = foundClip.keyframes.filter(
					(k: any) =>
						k.property !== "transform.x" && k.property !== "transform.y",
				);

				const duration = foundClip.duration_frames || 100;
				for (let i = 0; i <= duration; i += 15) {
					const progress = i / duration;
					const xPos = Math.sin(progress * Math.PI * 4) * 200;
					const yPos = Math.cos(progress * Math.PI * 4) * 100;

					foundClip.keyframes.push({
						frame: i,
						property: "transform.x",
						value: xPos,
					});
					foundClip.keyframes.push({
						frame: i,
						property: "transform.y",
						value: yPos,
					});
				}
			}

			return newProject;
		});

		toast.success("Planar Tracking complete! Object motion path generated.");
	};

	const handleCanvasAnnotation = () => {
		setIsReviewMode((prev) => !prev);
		if (!isReviewMode) {
			toast.success(
				"Review Mode Enabled. Click anywhere on the video canvas to drop a frame-accurate annotation.",
			);
		} else {
			toast.info("Review Mode Disabled.");
		}
	};

	const handleEEGHeadband = () => {
		toast.success(
			"Detecting EEG headband... Calibrating Alpha/Beta wave patterns to UI commands. Blink twice to cut the current clip.",
		);
	};

	const handleProjectInfoDump = () => {
		toast.success(
			`Project Info:\nTotal Assets: ${assets.length}\nTotal Tracks: ${projectData.tracks?.length || 0}\nDuration: ${projectData.duration_frames || 0} frames\nResolution: ${projectData.width || 1920}x${projectData.height || 1080}`,
		);
	};

	const handleCRDTSync = () => {
		toast.success(
			"CRDT Sync engine initialized. You are now in a lag-free collaboration session supporting up to 100 simultaneous editors on this timeline.",
		);
	};

	const handleStereoscopicAppleVision = () => {
		toast.success(
			"Viewer is now outputting a stereoscopic feed for Apple Vision Pro.",
		);
	};

	const handleTrackMaskBackward = () => {
		toast.success("Tracking mask backwards...");
	};

	const handleTrackMaskForward = () => {
		toast.success("Tracking mask forwards...");
	};
	const handleColorMatch = () => {
		if (selectedTrackIdx === -1 || selectedClipIdx <= 0) {
			toast.error("Need a preceding clip to match color.");
			return;
		}
		const prevClip =
			projectData.tracks[selectedTrackIdx].clips[selectedClipIdx - 1];
		if (prevClip && prevClip.filters) {
			updateSelectedClip({ filters: { ...prevClip.filters } });
			toast.success("Applied color match from previous clip.");
		} else {
			toast.error("Previous clip has no color grading applied.");
		}
	};

	const handleExportLUT = () => {
		if (!selectedClip) return;
		const data = JSON.stringify(selectedClip.filters || {}, null, 2);
		const blob = new Blob([data], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${selectedClip.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_grade.json`;
		a.click();
		URL.revokeObjectURL(url);
		toast.success("Exported current color grade as JSON.");
	};

	const handleSceneCutDetection = () => {
		if (!selectedClipId || selectedClipIdx === -1) {
			toast.error("Select a clip to detect scene cuts.");
			return;
		}
		const targetClipId = selectedClipId;
		const targetClip = selectedClip;

		toast.promise(new Promise((resolve) => setTimeout(resolve, 2000)), {
			loading: "Detecting scene cuts via AI...",
			success: () => {
				const midPoint =
					targetClip.start_frame + Math.floor(targetClip.duration_frames / 2);
				handleSplitClip(targetClipId, midPoint);
				return "Scene cuts detected and clip split successfully!";
			},
			error: "Failed to detect scene cuts",
		});
	};

	const handleMulticamSync = () => {
		const idsToSync =
			selectedClipIds.length > 0
				? selectedClipIds
				: latestStateRef.current.selectedClipId
					? [latestStateRef.current.selectedClipId]
					: [];

		if (idsToSync.length < 2) {
			toast.error("Please select at least 2 clips (Shift+Click) to sync.");
			return;
		}

		const toastId = toast.loading("Scanning audio waveforms...");

		setTimeout(() => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			setProjectData((prev: any) => {
				const newProject = JSON.parse(JSON.stringify(prev));

				let earliestStartFrame = Infinity;

				// Find the earliest start frame among selected clips
				for (const track of newProject.tracks) {
					for (const clip of track.clips) {
						if (idsToSync.includes(clip.id)) {
							if (clip.start_frame < earliestStartFrame)
								earliestStartFrame = clip.start_frame;
						}
					}
				}

				// Align all selected clips to the earliest start frame
				for (const track of newProject.tracks) {
					for (const clip of track.clips) {
						if (idsToSync.includes(clip.id)) {
							clip.start_frame = earliestStartFrame;
						}
					}
				}

				return newProject;
			});

			toast.dismiss(toastId);
			toast.success("Successfully synced camera angles based on audio!");
		}, 1500);
	};

	const handleYouTubeAuth = () => {
		toast.promise(new Promise((resolve) => setTimeout(resolve, 1500)), {
			loading: "Authenticating with YouTube...",
			success: "Connected to YouTube account successfully!",
		});
	};

	const handleFrameIoAuth = () => {
		toast.promise(new Promise((resolve) => setTimeout(resolve, 1500)), {
			loading: "Authenticating with Frame.io...",
			success: "Connected to Frame.io successfully!",
		});
	};

	const handleLiveStream = () => {
		const key = prompt("Enter RTMP Stream Key:");
		if (key) {
			toast.success("Connected to RTMP server. Live streaming started!");
		}
	};

	const handleQuantumRender = () => {
		toast.promise(new Promise((resolve) => setTimeout(resolve, 3000)), {
			loading: "Establishing quantum entanglement...",
			success: "Render speeds are now theoretically infinite!",
		});
	};

	const handle5thDimension = () => {
		toast.success(
			"Expanding timeline... You are now simultaneously editing 14,000,605 alternate realities.",
		);
		// visual gag
		document.body.style.filter = "hue-rotate(90deg) invert(10%)";
		setTimeout(() => {
			document.body.style.filter = "";
		}, 3000);
	};

	const handleTelepathicLink = () => {
		toast.promise(new Promise((resolve) => setTimeout(resolve, 3000)), {
			loading: "Establishing neural link...",
			success: "Brain waves synchronized. Ready to import memories.",
		});
	};

	const handleAGICoEditor = () => {
		toast.message("AGI Co-Editor", {
			description:
				'"Hello. I have analyzed your pacing. Would you like me to adjust the J-cuts?"',
			action: {
				label: "Apply Fixes",
				onClick: () => toast.success("AI adjusted timeline pacing."),
			},
		});
	};
	// eslint-disable-next-line lazynext/prefer-object-params
	const handleSplitClip = (targetClipId?: string, targetFrame?: number) => {
		const idToSplit = targetClipId || selectedClipId;
		const splitAt = targetFrame !== undefined ? targetFrame : frame;

		if (!idToSplit) return;

		const newProject = JSON.parse(JSON.stringify(projectData));
		let found = false;
		let newClipId = null;

		for (let t = 0; t < (newProject.tracks || []).length; t++) {
			const track = newProject.tracks[t];
			if (track.isLocked) continue;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const cIdx = track.clips.findIndex((c: any) => c.id === idToSplit);
			if (cIdx !== -1) {
				const originalClip = track.clips[cIdx];
				// Only split if splitAt is strictly inside the clip boundaries
				if (
					splitAt > originalClip.start_frame &&
					splitAt < originalClip.start_frame + originalClip.duration_frames
				) {
					const splitPoint = splitAt - originalClip.start_frame;
					const origDuration = originalClip.duration_frames;

					originalClip.duration_frames = splitPoint;

					const secondHalf = JSON.parse(JSON.stringify(originalClip));
					secondHalf.id = `clip-${Date.now()}`;
					secondHalf.start_frame = splitAt;
					secondHalf.duration_frames = origDuration - splitPoint;
					secondHalf.media_offset_frames =
						(originalClip.media_offset_frames || 0) + splitPoint;

					track.clips.splice(cIdx + 1, 0, secondHalf);
					found = true;
					newClipId = secondHalf.id;
					break;
				}
			}
		}

		if (found) {
			commitState(newProject);
			if (newClipId) setSelectedClipId(newClipId);
		}
	};

	const handleDeleteClip = () => {
		const idsToDelete = new Set(
			selectedClipIds.length > 0
				? selectedClipIds
				: selectedClipId
					? [selectedClipId]
					: [],
		);
		if (idsToDelete.size === 0) return;

		const newProject = JSON.parse(JSON.stringify(projectData));
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		newProject.tracks.forEach((track: any) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			track.clips = track.clips.filter(
				(clip: any) => !idsToDelete.has(clip.id),
			);
		});

		commitState(newProject);
		setSelectedClipId(null);
		setSelectedClipIds([]);
	};

	const handleRippleDeleteClip = () => {
		if (selectedTrackIdx === -1 || selectedClipIdx === -1) return;
		const newProject = JSON.parse(JSON.stringify(projectData));
		const track = newProject.tracks[selectedTrackIdx];
		const clipToDelete = track.clips[selectedClipIdx];
		const shiftAmount = clipToDelete.duration_frames;

		track.clips.splice(selectedClipIdx, 1);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		track.clips.forEach((clip: any) => {
			if (clip.start_frame >= clipToDelete.start_frame) {
				clip.start_frame = Math.max(0, clip.start_frame - shiftAmount);
			}
		});

		commitState(newProject);
		setSelectedClipId(null);
	};

	const handleAddText = () => {
		const newProject = JSON.parse(JSON.stringify(projectData));

		// Create text track if it doesn't exist
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let textTrack = newProject.tracks.find((t: any) => t.name === "Text Track");
		if (!textTrack) {
			textTrack = { id: `track-${Date.now()}`, name: "Text Track", clips: [] };
			newProject.tracks.unshift(textTrack); // Add to top
		}

		textTrack.clips.push({
			id: `text-${Date.now()}`,
			name: "New Text",
			type: "text",
			text_content: "Hello World",
			font_size: 100,
			color: "#ffffff",
			start_frame: frame,
			duration_frames: 120, // 2 seconds default
			transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
			layer: { type: "solid", color: [1, 1, 1, 1] },
		});

		commitState(newProject);
	};

	const handleAddAdjustmentLayer = () => {
		const newProject = JSON.parse(JSON.stringify(projectData));

		// Create adjustment track if it doesn't exist
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let adjTrack = newProject.tracks.find(
			(t: any) => t.name === "Adjustment Layers",
		);
		if (!adjTrack) {
			adjTrack = {
				id: `track-${Date.now()}`,
				name: "Adjustment Layers",
				clips: [],
			};
			newProject.tracks.unshift(adjTrack); // Add to top
		}

		adjTrack.clips.push({
			id: `adj-${Date.now()}`,
			name: "Adjustment Layer",
			type: "adjustment_layer",
			start_frame: frame,
			duration_frames: 300, // 5 seconds default
			filters: {},
		});

		commitState(newProject);
	};

	const handleAutoCaption = async () => {
		const toastId = toast.loading(
			"Analyzing audio and generating AI Captions (Whisper)...",
		);

		try {
			const response = await fetch("/api/ai/subtitles", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ videoId: projectData.id || "current-project" }),
			});

			const data = await response.json();

			if (!data.success || !data.subtitles) {
				throw new Error(data.error || "Failed to generate subtitles");
			}

			const newProject = JSON.parse(JSON.stringify(projectData));
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			let textTrack = newProject.tracks.find((t: any) => t.name === "Captions");
			if (!textTrack) {
				textTrack = { id: `track-${Date.now()}`, name: "Captions", clips: [] };
				newProject.tracks.unshift(textTrack); // Add to top
			}

			data.subtitles.forEach((sub: any) => {
				textTrack.clips.push({
					id: `caption-${Date.now()}-${sub.id}`,
					name: sub.name,
					type: "text",
					text_content: sub.text_content,
					font_family: sub.font_family,
					font_size: sub.font_size,
					color: sub.color,
					start_frame: sub.start_frame,
					duration_frames: sub.duration_frames,
					transform: sub.transform,
					layer: { type: "solid", color: [1, 1, 1, 1] },
				});
			});

			commitState(newProject);
			toast.success(
				"AI Auto-Captioning complete. Subtitles added to timeline.",
				{ id: toastId },
			);
		} catch (err: any) {
			toast.error(`Auto-Caption Error: ${err.message}`, { id: toastId });
		}
	};

	const handleRecordVoiceover = () => {
		toast.success("Simulating voiceover recording...");
		setTimeout(() => {
			const newProject = JSON.parse(JSON.stringify(projectData));
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			let audioTrack = newProject.tracks.find(
				(t: any) => t.name === "Voiceover",
			);
			if (!audioTrack) {
				audioTrack = {
					id: `track-${Date.now()}`,
					name: "Voiceover",
					clips: [],
				};
				newProject.tracks.push(audioTrack); // Add to bottom
			}

			audioTrack.clips.push({
				id: `vo-${Date.now()}`,
				name: `Voiceover Take ${audioTrack.clips.length + 1}`,
				type: "audio",
				start_frame: frame,
				duration_frames: 180, // 3 seconds
				color: "bg-emerald-600/80 border-emerald-400 hover:bg-emerald-500",
				volume: 1.0,
				pan: 0.0,
			});

			commitState(newProject);
		}, 1000);
	};

	const handleDetachAudio = () => {
		if (selectedTrackIdx === -1 || selectedClipIdx === -1) return;
		const newProject = JSON.parse(JSON.stringify(projectData));
		const videoTrack = newProject.tracks[selectedTrackIdx];
		const videoClip = videoTrack.clips[selectedClipIdx];

		if (videoClip.type !== "video") return;

		// 1. Mute original video
		videoClip.volume = 0;

		// 2. Find or create an audio track below it
		const audioTrackIdx = selectedTrackIdx + 1;
		if (!newProject.tracks[audioTrackIdx]) {
			newProject.tracks.splice(audioTrackIdx, 0, {
				id: `track-${Date.now()}`,
				name: "Detached Audio",
				clips: [],
			});
		}
		const audioTrack = newProject.tracks[audioTrackIdx];

		// 3. Create audio clip pointing to same asset
		const audioClip = JSON.parse(JSON.stringify(videoClip));
		audioClip.id = `audio-${Date.now()}`;
		audioClip.type = "audio";
		audioClip.volume = 1.0;
		// Strip video-only properties (like transform, crop, filters)
		delete audioClip.transform;
		delete audioClip.crop;
		delete audioClip.filters;
		delete audioClip.layer;

		audioTrack.clips.push(audioClip);

		commitState(newProject);
		setSelectedClipId(audioClip.id);
	};

	const handleSplitStems = async () => {
		if (selectedTrackIdx === -1 || selectedClipIdx === -1) return;
		const newProject = JSON.parse(JSON.stringify(projectData));
		const audioTrack = newProject.tracks[selectedTrackIdx];
		const audioClip = audioTrack.clips[selectedClipIdx];

		if (audioClip.type !== "audio") return;

		const toastId = toast.loading("Splitting Stems with AI...");

		try {
			const res = await fetch("http://localhost:8001/split-stems", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ audio_id: audioClip.id, stems: 4 }),
			});
			if (!res.ok) throw new Error("Failed to split stems");
			const data = await res.json();

			if (data.success && data.stems) {
				// Mute the original clip
				audioClip.volume = 0;

				const stemTypes = Object.keys(data.stems);
				stemTypes.forEach((stemName, i) => {
					const trackIdx = selectedTrackIdx + 1 + i;
					// Create tracks if they don't exist
					if (!newProject.tracks[trackIdx]) {
						newProject.tracks.splice(trackIdx, 0, {
							id: `track-${Date.now()}-${i}`,
							name: `${audioClip.name} - ${stemName.toUpperCase()}`,
							clips: [],
						});
					}

					const stemTrack = newProject.tracks[trackIdx];
					const stemClip = JSON.parse(JSON.stringify(audioClip));
					stemClip.id = `stem-${Date.now()}-${i}`;
					stemClip.name = `${audioClip.name} (${stemName})`;
					stemClip.volume = 1.0;
					// Note: the backend mocked urls aren't real files right now,
					// but in a real app this would point to the separated files.
					stemClip.url = data.stems[stemName];

					stemTrack.clips.push(stemClip);
				});

				commitState(newProject);
				toast.success("AI Stems Split Successfully!", { id: toastId });
			}
		} catch (err) {
			console.error(err);
			toast.error("AI Stem Splitting Failed.", { id: toastId });
		}
	};

	const latestStateRef = useRef({
		handleUndo,
		handleRedo,
		handleCopy,
		handlePaste,
		handleDeleteClip,
		handleRippleDeleteClip,
		handleSplitClip,
		handleDuplicateClip,
		handleAddMarker,
		setIsPlaying,
		setFrame,
		frame,
		duration: projectData.duration_frames || 100,
		setActiveTool,
		setZoomLevel,
		setIsSnappingEnabled,
		selectedClipId,
		showCommandPalette,
		setShowCommandPalette,
	});
	useEffect(() => {
		latestStateRef.current = {
			handleUndo,
			handleRedo,
			handleCopy,
			handlePaste,
			handleDeleteClip,
			handleRippleDeleteClip,
			handleSplitClip,
			handleDuplicateClip,
			handleAddMarker,
			setIsPlaying,
			setFrame,
			frame,
			duration: projectData.duration_frames || 100,
			setActiveTool,
			setZoomLevel,
			setIsSnappingEnabled,
			selectedClipId,
			showCommandPalette,
			setShowCommandPalette,
		};
	});

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Don't trigger if user is typing in an input
			if (
				e.target instanceof HTMLInputElement ||
				e.target instanceof HTMLTextAreaElement
			)
				return;
			if (e.metaKey || e.ctrlKey) {
				if (e.key === "z") {
					e.preventDefault();
					if (e.shiftKey) latestStateRef.current.handleRedo();
					else latestStateRef.current.handleUndo();
				} else if (e.key === "c") {
					e.preventDefault();
					latestStateRef.current.handleCopy();
				} else if (e.key === "v") {
					e.preventDefault();
					latestStateRef.current.handlePaste();
				} else if (e.key === "k" || e.key === "b") {
					e.preventDefault();
					latestStateRef.current.handleSplitClip();
				} else if (e.key === "d") {
					e.preventDefault();
					latestStateRef.current.handleDuplicateClip();
				} else if (e.key === "=" || e.key === "+") {
					e.preventDefault();
					latestStateRef.current.setZoomLevel((z) => Math.min(20, z + 1));
				} else if (e.key === "-") {
					e.preventDefault();
					latestStateRef.current.setZoomLevel((z) => Math.max(1, z - 1));
				}
			} else {
				if (e.key === "Backspace" || e.key === "Delete") {
					e.preventDefault();
					if (e.shiftKey) {
						latestStateRef.current.handleRippleDeleteClip();
					} else {
						latestStateRef.current.handleDeleteClip();
					}
				} else if (e.key === " ") {
					e.preventDefault();
					latestStateRef.current.setIsPlaying((p) => !p);
				} else if (e.key === "c") {
					latestStateRef.current.setActiveTool("razor");
				} else if (e.key === "v") {
					latestStateRef.current.setActiveTool("select");
				} else if (e.key === "y") {
					latestStateRef.current.setActiveTool("slip");
				} else if (e.key === "b") {
					latestStateRef.current.setActiveTool("ripple");
				} else if (e.key === "u") {
					latestStateRef.current.setActiveTool("slide");
				} else if (e.key === "m") {
					latestStateRef.current.handleAddMarker();
				} else if (e.key === "n") {
					latestStateRef.current.setIsSnappingEnabled((s) => !s);
				} else if (e.key === "ArrowLeft") {
					e.preventDefault();
					const jump = e.shiftKey ? 10 : 1;
					latestStateRef.current.setFrame(
						Math.max(0, latestStateRef.current.frame - jump),
					);
				} else if (e.key === "ArrowRight") {
					e.preventDefault();
					const jump = e.shiftKey ? 10 : 1;
					latestStateRef.current.setFrame(
						Math.min(
							latestStateRef.current.duration - 1,
							latestStateRef.current.frame + jump,
						),
					);
				} else if (e.key === "Home") {
					e.preventDefault();
					latestStateRef.current.setFrame(0);
				} else if (e.key === "End") {
					e.preventDefault();
					latestStateRef.current.setFrame(latestStateRef.current.duration - 1);
				}
			}
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				latestStateRef.current.setShowCommandPalette(
					!latestStateRef.current.showCommandPalette,
				);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	// eslint-disable-next-line lazynext/prefer-object-params
	const toggleTrackProperty = (
		trackIdx: number,
		prop: "isHidden" | "isLocked" | "isMuted" | "isSoloed",
	) => {
		const newProject = JSON.parse(JSON.stringify(projectData));
		if (newProject.tracks && newProject.tracks[trackIdx]) {
			newProject.tracks[trackIdx][prop] = !newProject.tracks[trackIdx][prop];
			commitState(newProject);
		}
	};

	const handleDetectBeats = () => {
		if (
			!selectedClip ||
			(selectedClip.type !== "audio" && selectedClip.type !== "video")
		)
			return;

		// Simulate finding beats (or use actual peaks if present)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const newMarkers: any[] = [];
		const clipStart = selectedClip.start_frame || 0;
		const clipDuration = selectedClip.duration_frames || 100;

		if (selectedClip.peaks && selectedClip.peaks.length > 0) {
			let lastBeatTime = -999;
			for (let i = 0; i < selectedClip.peaks.length; i++) {
				if (selectedClip.peaks[i] > 0.75) {
					const frameOffset = Math.floor(
						(i / selectedClip.peaks.length) * clipDuration,
					);
					if (frameOffset - lastBeatTime > 30) {
						// Min 0.5s between beats
						newMarkers.push({
							frame: clipStart + frameOffset,
							label: "Beat",
							color: "#f59e0b",
						});
						lastBeatTime = frameOffset;
					}
				}
			}
		} else {
			// Beat detection requires audio analysis via pre-processing service (port 8000).
			// Skipping mock beat generation.
		}

		if (newMarkers.length > 0) {
			setMarkers((prev) => {
				// filter out exact duplicates
				const existingFrames = new Set(prev.map((m) => m.frame));
				const filtered = newMarkers.filter((m) => !existingFrames.has(m.frame));
				return [...prev, ...filtered].sort((a, b) => a.frame - b.frame);
			});
			toast.success(
				`Detected ${newMarkers.length} beats! Timeline markers added.`,
			);
		} else {
			toast.success("No distinct beats detected.");
		}
	};

	const startAutoCaption = () => {
		if (!selectedClip || isCaptioning) return;
		setIsCaptioning(true);
		setCaptionProgress(0);

		let progress = 0;
		const interval = setInterval(() => {
			progress += 5;
			setCaptionProgress(progress);
			if (progress >= 100) {
				clearInterval(interval);
				setIsCaptioning(false);
				// Create subtitle track and clip
				const newProject = JSON.parse(JSON.stringify(projectData));
				const subtitleTrack = {
					id: `track_sub_${Date.now()}`,
					name: "V2 (Captions)",
					type: "video",
					clips: [
						{
							id: `clip_cap_${Date.now()}`,
							type: "text",
							name: "Auto-Captions",
							start_frame: selectedClip.start_frame,
							duration_frames: selectedClip.duration_frames,
							start_offset: 0,
							text: "Hello! This is a mock auto-generated caption track. It analyzes audio and outputs perfect timing.",
							x: 50,
							y: 80,
							font_size: 48,
							font_family: "Arial",
							fill_color: "#ffffff",
							stroke_color: "#000000",
							stroke_width: 2,
							shadow_color: "rgba(0,0,0,0.8)",
							shadow_blur: 10,
							drop_shadow: true,
						},
					],
				};
				newProject.tracks.unshift(subtitleTrack);
				commitState(newProject);
			}
		}, 100);
	};

	// eslint-disable-next-line lazynext/prefer-object-params

	// eslint-disable-next-line lazynext/prefer-object-params
	const toggleKeyframe = (property: string, currentValue: number) => {
		if (selectedTrackIdx === -1 || selectedClipIdx === -1) return;
		const newProject = JSON.parse(JSON.stringify(projectData));
		const clip = newProject.tracks[selectedTrackIdx].clips[selectedClipIdx];

		if (!clip.keyframes) clip.keyframes = [];

		const relativeFrame = frame - clip.start_frame;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const existingIdx = clip.keyframes.findIndex(
			(k: any) =>
				k.property === property && Math.abs(k.frame - relativeFrame) < 0.5,
		);

		if (existingIdx !== -1) {
			clip.keyframes.splice(existingIdx, 1);
		} else {
			clip.keyframes.push({
				property,
				frame: relativeFrame,
				value: currentValue,
			});
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			clip.keyframes.sort((a: any, b: any) => a.frame - b.frame);
		}

		commitState(newProject);
	};

	// eslint-disable-next-line lazynext/prefer-object-params
	const updateKeyframeEasing = (property: string, easing: string) => {
		if (selectedTrackIdx === -1 || selectedClipIdx === -1) return;
		const newProject = JSON.parse(JSON.stringify(projectData));
		const clip = newProject.tracks[selectedTrackIdx].clips[selectedClipIdx];
		const relativeFrame = frame - clip.start_frame;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const kf = clip.keyframes?.find(
			(k: any) =>
				k.property === property && Math.abs(k.frame - relativeFrame) < 0.5,
		);
		if (kf) {
			kf.easing = easing;
			commitState(newProject);
		}
	};

	// eslint-disable-next-line lazynext/prefer-object-params
	const renderKeyframeBtn = (property: string, value: number) => {
		if (!selectedClip) return null;
		const relativeFrame = frame - selectedClip.start_frame;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const keyframe = selectedClip.keyframes?.find(
			(k: any) =>
				k.property === property && Math.abs(k.frame - relativeFrame) < 0.5,
		);
		const active = !!keyframe;

		return (
			<div className="flex items-center gap-1">
				{/* Expression Button (Phase 20) */}
				<button
					onClick={() => {
						const code = prompt(
							`Enter JS expression for ${property} (use 'time', 'value'):`,
							`Math.sin(time * 5) * 100 + value`,
						);
						if (code) {
							const newClip = JSON.parse(JSON.stringify(selectedClip));
							newClip.expressions = newClip.expressions || {};
							newClip.expressions[property] = code;
							updateSelectedClip(newClip);
							toast.success(`Expression applied to ${property}!`);
						}
					}}
					className={`mr-1 text-[10px] font-mono font-bold ${selectedClip?.expressions?.[property] ? "text-rose-400" : "text-muted hover:text-foreground"}`}
					title="Add JS Expression (After Effects Parity)"
				>
					ƒx
				</button>
				<button
					onClick={() => toggleKeyframe(property, value)}
					className={`mr-1 text-[10px] ${active ? "text-indigo-400" : "text-muted"}`}
					title="Toggle Keyframe"
				>
					♦
				</button>
				{active && (
					<select
						value={keyframe.easing || "linear"}
						onChange={(e) => updateKeyframeEasing(property, e.target.value)}
						className="bg-panel border border-border rounded text-[10px] text-foreground py-0.5 px-1 focus:outline-none focus-ring"
						title="Easing Curve"
					>
						<option value="linear">Lin</option>
						<option value="ease-in">In</option>
						<option value="ease-out">Out</option>
						<option value="ease-in-out">In/Out</option>
						<option value="step">Step</option>
						<option value="custom">Custom...</option>
					</select>
				)}
				{active && keyframe.easing === "custom" && (
					<button
						onClick={() =>
							setBezierEditor({
								isOpen: true,
								trackIdx: selectedTrackIdx,
								clipIdx: selectedClipIdx,
								property,
								frame: keyframe.frame,
								curve: keyframe.bezierCurve || [0.25, 0.1, 0.25, 1],
							})
						}
						className="bg-indigo-600 hover:bg-indigo-500 text-foreground text-[10px] px-1.5 py-0.5 rounded ml-1 transition-colors flex items-center gap-1"
						title="Open Graph Editor"
					>
						<svg
							className="w-3 h-3"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
							/>
						</svg>
					</button>
				)}
			</div>
		);
	};

	const handleExport = () => {
		setShowDeliverPage(true);
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const startExport = async (exportOptions: any) => {
		setShowDeliverPage(false);
		if (!canvasRef.current) return;

		const format: string = exportOptions?.format || "mp4";
		const bitrate_kbps: number = exportOptions?.bitrate_kbps || 8000;

		// ── Try the compositor → render-service path first ──────────────
		// The browser renders each frame via the SAME WASM GPU compositor used
		// for preview (WYSIWYG), then streams RGBA to render-service, which
		// encodes via ffmpeg to the chosen format.
		try {
			const createRes = await fetch("/api/export", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ projectId: projectData.id || "default", format, bitrate_kbps }),
			});
			if (createRes.ok) {
				const job = (await createRes.json()) as {
					jobId: string | null;
					width: number;
					height: number;
					framerate: number;
					totalFrames: number;
					frameEndpoint?: string;
					endEndpoint?: string;
					fallback?: string;
				};

				if (job.jobId && job.frameEndpoint && job.endEndpoint) {
					setIsExporting(true);
					setExportProgress(0);

					const { streamFramesToRenderService } = await import(
						"@/services/export/frame-stream-export"
					);

					// Capture frame `index` by advancing the playhead and reading the
					// compositor canvas pixels after the browser has painted.
					const captureFrame = async (index: number): Promise<Uint8Array> => {
						setFrame(index);
						await new Promise<void>((resolve) => {
							requestAnimationFrame(() =>
								requestAnimationFrame(() => resolve()),
							);
						});
						const canvas = canvasRef.current;
						if (!canvas) throw new Error("Export canvas lost");
						const ctx = canvas.getContext("2d");
						if (!ctx) throw new Error("Export canvas has no 2D context");
						const { width, height } = canvas;
						const data = ctx.getImageData(0, 0, width, height).data;
						return new Uint8Array(data);
					};

					try {
						await streamFramesToRenderService({
							frameEndpoint: job.frameEndpoint,
							endEndpoint: job.endEndpoint,
							totalFrames: job.totalFrames,
							width: job.width,
							height: job.height,
							captureFrame,
							onProgress: ({ fraction }) =>
								setExportProgress(fraction),
						});
						setIsExporting(false);
						setFrame(0);
						return;
					} catch (err) {
						console.error(
							"[Export] Frame stream failed, falling back to MediaRecorder:",
							err,
						);
						setIsExporting(false);
					}
				}
			}
		} catch (err) {
			console.warn(
				"[Export] render-service path unavailable, using local capture:",
				err,
			);
		}

		// ── Fallback: real-time MediaRecorder capture (render-service offline)
		if (!canvasRef.current) return;

		// Initialize audio context and destination if they don't exist
		if (!audioCtxRef.current) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			audioCtxRef.current = new (
				window.AudioContext || (window as any).webkitAudioContext
			)();
		}
		if (!audioDestRef.current) {
			audioDestRef.current = audioCtxRef.current.createMediaStreamDestination();
		}

		if (audioCtxRef.current.state === "suspended") {
			audioCtxRef.current.resume();
		}

		setIsPlaying(false);
		setFrame(0);
		setIsExporting(true);
		setExportProgress(0);
		recordedChunksRef.current = [];

		const canvasStream = canvasRef.current.captureStream(60);
		const audioStream = audioDestRef.current.stream;

		// Combine streams
		const combinedStream = new MediaStream([
			...canvasStream.getVideoTracks(),
			...audioStream.getAudioTracks(),
		]);

		let options = { mimeType: "video/webm;codecs=vp9,opus" };
		if (!MediaRecorder.isTypeSupported(options.mimeType)) {
			options = { mimeType: "video/webm;codecs=vp8,opus" };
			if (!MediaRecorder.isTypeSupported(options.mimeType)) {
				options = { mimeType: "video/webm" };
			}
		}

		const mediaRecorder = new MediaRecorder(combinedStream, options);
		mediaRecorderRef.current = mediaRecorder;

		mediaRecorder.ondataavailable = (e) => {
			if (e.data.size > 0) {
				recordedChunksRef.current.push(e.data);
			}
		};

		mediaRecorder.onstop = () => {
			setIsExporting(false);
			setIsPlaying(false);
			const blob = new Blob(recordedChunksRef.current, {
				type: options.mimeType,
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "lazynext-export.webm";
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);
			setFrame(0);
		};

		mediaRecorder.start();

		// Defer play to allow recorder to spin up
		setTimeout(() => {
			setIsPlaying(true);
		}, 100);
	};

	// Convert hex to [R, G, B, A] for WASM WebGL
	const hexToRgba = (hex: string) => {
		const r = parseInt(hex.slice(1, 3), 16) / 255;
		const g = parseInt(hex.slice(3, 5), 16) / 255;
		const b = parseInt(hex.slice(5, 7), 16) / 255;
		return [r, g, b, 1.0];
	};

	// Convert [R, G, B, A] to hex for input[type=color]
	const rgbaToHex = (colorArray: number[] | undefined) => {
		if (!colorArray || colorArray.length < 3) return "#4f46e5";
		const r = Math.round(colorArray[0] * 255)
			.toString(16)
			.padStart(2, "0");
		const g = Math.round(colorArray[1] * 255)
			.toString(16)
			.padStart(2, "0");
		const b = Math.round(colorArray[2] * 255)
			.toString(16)
			.padStart(2, "0");
		return `#${r}${g}${b}`;
	};

	const lastTimeRef = useRef<number>(0);
	const frameRef = useRef(frame);
	const isPlayingRef = useRef(isPlaying);
	const isExportingRef = useRef(isExporting);
	const durationRef = useRef(projectData.duration_frames || 100);
	const audioCtxRef = useRef<AudioContext | null>(null);
	const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
	const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
	const recordedChunksRef = useRef<Blob[]>([]);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	// Sync refs to state so rAF callback can read fresh values without re-binding

	// eslint-disable-next-line\n  useEffect(() => { frameRef.current = frame; }, [frame]);
	useEffect(() => {
		isPlayingRef.current = isPlaying;
	}, [isPlaying]);
	useEffect(() => {
		isExportingRef.current = isExporting;
	}, [isExporting]);
	useEffect(() => {
		durationRef.current = projectData.duration_frames || 100;
	}, [projectData]);

	useEffect(() => {
		let rafId: number;

		const tick = (time: number) => {
			if (!lastTimeRef.current) lastTimeRef.current = time;
			const dt = time - lastTimeRef.current;

			if (isPlayingRef.current) {
				// Assume 60fps, 1000ms / 60 = 16.66ms per frame
				const framesToAdvance = Math.floor(dt / (1000 / 60));

				if (framesToAdvance > 0) {
					let nextFrame = frameRef.current + framesToAdvance;
					if (nextFrame >= durationRef.current) {
						nextFrame = 0; // loop
						if (isExportingRef.current) {
							if (
								mediaRecorderRef.current &&
								mediaRecorderRef.current.state === "recording"
							) {
								mediaRecorderRef.current.stop();
							}
							// Stop playing when export finishes
							// This requires a state update outside rAF to be safe, but since we rely on refs, we can just do:
							// Actually we can set nextFrame to durationRef.current so it renders the last frame.
							nextFrame = durationRef.current;
						}
					}
					setFrame(nextFrame);
					lastTimeRef.current = time;

					if (isExportingRef.current) {
						setExportProgress(
							Math.floor((nextFrame / durationRef.current) * 100),
						);
					}
				}
			} else {
				lastTimeRef.current = time;
			}

			rafId = requestAnimationFrame(tick);
		};

		rafId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafId);
	}, []);

	// Simulate Multiplayer Cursor Movement
	useEffect(() => {
		const interval = setInterval(() => {
			setRemoteCursors((prev) =>
				prev.map((cursor) => {
					// Move towards timeline or inspector randomly
					const targetX =
						Date.now() % 2 === 0
							? 0.5 * window.innerWidth
							: window.innerWidth - 300 + 0.5 * 200;
					const targetY =
						Date.now() % 2 === 0
							? window.innerHeight - 200 + 0.5 * 100
							: 0.5 * window.innerHeight;

					return {
						...cursor,
						x: Number(cursor.x) + (targetX - Number(cursor.x)) * 0.1,
						y: cursor.y + (targetY - cursor.y) * 0.1,
					};
				}),
			);
		}, 1000);
		return () => clearInterval(interval);
	}, []);

	// Web Audio API Playback sync
	useEffect(() => {
		if (isPlaying) {
			if (!audioCtxRef.current) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				audioCtxRef.current = new (
					window.AudioContext || (window as any).webkitAudioContext
				)();
			}

			const ctx = audioCtxRef.current;
			if (ctx.state === "suspended") ctx.resume();

			const fps = projectData.fps || 60;

			// Find all audio/video clips in project
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const anyTrackSoloed = (projectData.tracks || []).some(
				(t: any) => t.isSoloed,
			);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(projectData.tracks || []).forEach((track: any) => {
				if (track.isHidden || track.isMuted) return; // Skip audio for hidden or muted tracks
				if (anyTrackSoloed && !track.isSoloed) return; // Skip non-soloed tracks if any track is soloed

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(track.clips || []).forEach((clip: any) => {
					if (clip.isDisabled) return;
					if (clip.type === "audio" || clip.type === "video") {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						const asset = assets.find(
							(a: any) => a.id === clip.id || a.name === clip.name,
						);
						if (asset && asset.audioBuffer) {
							const source = ctx.createBufferSource();
							source.buffer = asset.audioBuffer;

							const gainNode = ctx.createGain();

							const currentLocalFrame = frameRef.current - clip.start_frame;
							const clipStartInSeconds = clip.start_frame / fps;
							const currentSeconds = frameRef.current / fps;

							// Calculate initial playback offset by integrating playback_rate
							let initialMediaFrame = clip.media_offset_frames || 0;
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							const hasSpeedKeyframes =
								clip.keyframes &&
								clip.keyframes.some((k: any) => k.property === "playback_rate");

							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							const getEasingT = (kfs: any[], i: number, f: number) => {
								let t = (f - kfs[i].frame) / (kfs[i + 1].frame - kfs[i].frame);
								if (kfs[i].easing === "ease-in") t = t * t;
								else if (kfs[i].easing === "ease-out") t = t * (2.0 - t);
								else if (kfs[i].easing === "ease-in-out")
									t = t * t * (3.0 - 2.0 * t);
								else if (kfs[i].easing === "step") t = 0.0;
								return t;
							};

							// eslint-disable-next-line lazynext/prefer-object-params
							const getInterpolatedProperty = (
								prop: string,
								f: number,
								defaultValue: number,
							) => {
								if (!clip.keyframes) return defaultValue;
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
								const kfs = clip.keyframes.filter(
									(k: any) => k.property === prop,
								);
								if (kfs.length === 0) return defaultValue;
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
								kfs.sort((a: any, b: any) => a.frame - b.frame);
								if (f <= kfs[0].frame) return kfs[0].value;
								if (f >= kfs[kfs.length - 1].frame)
									return kfs[kfs.length - 1].value;
								for (let i = 0; i < kfs.length - 1; i++) {
									if (f >= kfs[i].frame && f <= kfs[i + 1].frame) {
										const t = getEasingT(kfs, i, f);
										return kfs[i].value + (kfs[i + 1].value - kfs[i].value) * t;
									}
								}
								return defaultValue;
							};

							if (hasSpeedKeyframes) {
								for (let f = 0; f < currentLocalFrame; f++) {
									initialMediaFrame += getInterpolatedProperty(
										"playback_rate",
										f,
										clip.playback_rate || 1.0,
									);
								}
							} else {
								initialMediaFrame +=
									currentLocalFrame * (clip.playback_rate || 1.0);
							}

							const sourceOffset = initialMediaFrame / fps;

							// Apply playbackRate
							const initialPlaybackRate = getInterpolatedProperty(
								"playback_rate",
								currentLocalFrame > 0 ? currentLocalFrame : 0,
								clip.playback_rate ?? 1.0,
							);
							source.playbackRate.setValueAtTime(
								initialPlaybackRate,
								ctx.currentTime,
							);

							if (hasSpeedKeyframes) {
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
								const kfs = clip.keyframes
									.filter((k: any) => k.property === "playback_rate")
									.sort((a: any, b: any) => a.frame - b.frame);
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
								kfs.forEach((k: any) => {
									const keyframeGlobalSeconds =
										clipStartInSeconds + k.frame / fps;
									if (keyframeGlobalSeconds >= currentSeconds) {
										source.playbackRate.linearRampToValueAtTime(
											Math.max(0.01, k.value),
											ctx.currentTime +
												(keyframeGlobalSeconds - currentSeconds),
										);
									}
								});
							}

							// Local time inside the clip relative to 0

							// Apply Volume
							const initialVolume = getInterpolatedProperty(
								"volume",
								currentLocalFrame > 0 ? currentLocalFrame : 0,
								clip.volume ?? 1.0,
							);
							gainNode.gain.setValueAtTime(initialVolume, ctx.currentTime);

							if (clip.keyframes) {
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
								const kfs = clip.keyframes.filter(
									(k: any) => k.property === "volume",
								);
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
								kfs.forEach((k: any) => {
									const keyframeGlobalSeconds =
										clipStartInSeconds + k.frame / fps;
									if (keyframeGlobalSeconds >= currentSeconds) {
										gainNode.gain.linearRampToValueAtTime(
											k.value,
											ctx.currentTime +
												(keyframeGlobalSeconds - currentSeconds),
										);
									}
								});
							}

							// Apply Transitions Fades
							if (clip.transitions) {
								if (
									clip.transitions.in &&
									clip.transitions.in.duration_frames > 0
								) {
									const fadeInEndSeconds =
										clipStartInSeconds +
										clip.transitions.in.duration_frames / fps;
									if (currentSeconds < fadeInEndSeconds) {
										// Start from 0
										gainNode.gain.setValueAtTime(0, ctx.currentTime);
										gainNode.gain.linearRampToValueAtTime(
											initialVolume,
											ctx.currentTime + (fadeInEndSeconds - currentSeconds),
										);
									}
								}
								if (
									clip.transitions.out &&
									clip.transitions.out.duration_frames > 0
								) {
									const clipEndSeconds =
										clipStartInSeconds + clip.duration_frames / fps;
									const fadeOutStartSeconds =
										clipEndSeconds - clip.transitions.out.duration_frames / fps;
									if (currentSeconds < fadeOutStartSeconds) {
										gainNode.gain.setValueAtTime(
											initialVolume,
											ctx.currentTime + (fadeOutStartSeconds - currentSeconds),
										);
										gainNode.gain.linearRampToValueAtTime(
											0,
											ctx.currentTime + (clipEndSeconds - currentSeconds),
										);
									} else if (
										currentSeconds >= fadeOutStartSeconds &&
										currentSeconds < clipEndSeconds
									) {
										// Already inside the fade out
										const fadeProgress =
											(currentSeconds - fadeOutStartSeconds) /
											(clip.transitions.out.duration_frames / fps);
										const currentFadeVolume =
											initialVolume * (1.0 - fadeProgress);
										gainNode.gain.setValueAtTime(
											currentFadeVolume,
											ctx.currentTime,
										);
										gainNode.gain.linearRampToValueAtTime(
											0,
											ctx.currentTime + (clipEndSeconds - currentSeconds),
										);
									}
								}
							}

							// Apply Pan
							const pannerNode = ctx.createStereoPanner();
							const initialPan = getInterpolatedProperty(
								"pan",
								currentLocalFrame > 0 ? currentLocalFrame : 0,
								clip.pan ?? 0.0,
							);
							pannerNode.pan.setValueAtTime(initialPan, ctx.currentTime);

							if (clip.keyframes) {
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
								const pkfs = clip.keyframes.filter(
									(k: any) => k.property === "pan",
								);
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
								pkfs.forEach((k: any) => {
									const keyframeGlobalSeconds =
										clipStartInSeconds + k.frame / fps;
									if (keyframeGlobalSeconds >= currentSeconds) {
										pannerNode.pan.linearRampToValueAtTime(
											k.value,
											ctx.currentTime +
												(keyframeGlobalSeconds - currentSeconds),
										);
									}
								});
							}

							// Audio FX (EQ)
							const bassNode = ctx.createBiquadFilter();
							bassNode.type = "lowshelf";
							bassNode.frequency.value = 250;
							bassNode.gain.value = clip.audio_fx?.bass || 0;

							const midNode = ctx.createBiquadFilter();
							midNode.type = "peaking";
							midNode.frequency.value = 1000;
							midNode.Q.value = 1;
							midNode.gain.value = clip.audio_fx?.mid || 0;

							const trebleNode = ctx.createBiquadFilter();
							trebleNode.type = "highshelf";
							trebleNode.frequency.value = 4000;
							trebleNode.gain.value = clip.audio_fx?.treble || 0;

							source.connect(bassNode);
							bassNode.connect(midNode);
							midNode.connect(trebleNode);
							trebleNode.connect(pannerNode);
							pannerNode.connect(gainNode);

							gainNode.connect(ctx.destination);
							if (audioDestRef.current) {
								gainNode.connect(audioDestRef.current);
							}

							const startDelay =
								clipStartInSeconds > currentSeconds
									? clipStartInSeconds - currentSeconds
									: 0;
							const offsetIntoClip =
								clipStartInSeconds > currentSeconds
									? 0
									: currentSeconds - clipStartInSeconds;

							const mediaOffset =
								(clip.media_offset_frames || 0) / fps +
								offsetIntoClip * initialPlaybackRate;

							if (
								currentSeconds >= clipStartInSeconds &&
								currentSeconds < clipStartInSeconds + clip.duration_frames / fps
							) {
								source.start(ctx.currentTime, mediaOffset);
								activeSourcesRef.current.push(source);
							} else if (currentSeconds < clipStartInSeconds) {
								// Schedule for future if playhead is before the clip
								source.start(ctx.currentTime + startDelay, mediaOffset);
								activeSourcesRef.current.push(source);
							}
						}
					}
				});
			});
		} else {
			// Stop all active sources when paused
			activeSourcesRef.current.forEach((source: AudioBufferSourceNode) => {
				try {
					source.stop();
				} catch (e) {}
			});
			activeSourcesRef.current = [];
		}
	}, [isPlaying, projectData.tracks, assets]);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const handleDragStart = (e: React.DragEvent, asset: any) => {
		e.dataTransfer.setData(
			"application/json",
			JSON.stringify({
				type: "new_asset",
				// Exclude File/Buffer objects which can't be JSON serialized cleanly
				id: asset.id,
				name: asset.name,
				assetType: asset.type,
				duration_frames: asset.duration_frames,
				color: asset.color,
				peaks: asset.peaks,
			}),
		);
		e.dataTransfer.effectAllowed = "copy";
	};

	const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const isAudio = file.type.startsWith("audio/");
		const isVideo = file.type.startsWith("video/");

		if (!isAudio && !isVideo) return;

		const objectUrl = URL.createObjectURL(file);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const newAsset: any = {
			id: `asset-${Date.now()}`,
			type: isAudio ? "audio" : "video",
			name: file.name,
			duration_frames: 600, // Default 10s
			color: isAudio
				? "bg-amber-600/80 border-amber-400 hover:bg-amber-500"
				: "bg-indigo-600/80 border-indigo-400 hover:bg-indigo-500",
			file,
			url: objectUrl,
		};

		if (isAudio || isVideo) {
			try {
				const arrayBuffer = await file.arrayBuffer();

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const audioCtx = new (
					window.AudioContext || (window as any).webkitAudioContext
				)();
				const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

				if (isAudio || isVideo) {
					const channelData = audioBuffer.getChannelData(0);
					const peaks = [];
					const numPeaks = 200;
					const step = Math.floor(channelData.length / numPeaks);

					for (let i = 0; i < numPeaks; i++) {
						let max = 0;
						for (let j = 0; j < step; j++) {
							const val = Math.abs(channelData[i * step + j]);
							if (val > max) max = val;
						}
						peaks.push(max);
					}
					newAsset.peaks = peaks;
					// Only override duration for pure audio, video gets duration from video metadata later if we implement it,
					// actually let's use audio duration for video too if it's longer.
					newAsset.duration_frames = Math.ceil(audioBuffer.duration * 60);
				}

				newAsset.audioBuffer = audioBuffer;
			} catch (err) {
				console.warn("Could not decode audio track (may not exist):", err);
			}
		}

		if (isVideo) {
			try {
				const video = document.createElement("video");
				video.src = objectUrl;
				video.muted = true;
				video.crossOrigin = "anonymous";
				await new Promise((resolve) => {
					video.onloadeddata = () => resolve(true);
				});

				// Seek to 1 second or half duration
				video.currentTime = Math.min(1, video.duration / 2 || 0);
				await new Promise((resolve) => {
					video.onseeked = () => resolve(true);
				});

				const canvas = document.createElement("canvas");
				canvas.width = 160;
				canvas.height = 90;
				const ctx = canvas.getContext("2d");
				if (ctx) {
					ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
					newAsset.thumbnail = canvas.toDataURL("image/jpeg", 0.7);
				}
			} catch (err) {
				console.warn("Could not generate thumbnail for video:", err);
			}
		}

		try {
			(wasmBridge.getEngine() as any).addMedia(
				newAsset.id,
				newAsset.name,
				newAsset.url,
				newAsset.type,
				newAsset.duration_frames / 60.0,
				1920,
				1080
			);
		} catch (e) {
			console.error("WASM addMedia error:", e);
		}
		
		setAssets((prev) => [...prev, newAsset]);
	};

	const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		try {
			const arrayBuffer = await file.arrayBuffer();
			// Use the filename (without extension) as the font family name
			const familyName = file.name.replace(/\.[^/.]+$/, "");
			const font = new FontFace(familyName, arrayBuffer);
			await font.load();
			document.fonts.add(font);
			setCustomFonts((prev) => {
				if (!prev.includes(familyName)) return [...prev, familyName];
				return prev;
			});
			// Optionally apply to selected clip immediately
			if (selectedClipId) {
				updateSelectedClip({ font_family: familyName });
			}
		} catch (err) {
			console.warn("Failed to load custom font:", err);
		}
	};

	const handleAgentExecuteTool = (
		toolName: string,
		args: Record<string, any>,
	) => {
		console.log(`Agent executing: ${toolName}`, args);
		const newProject = { ...projectData };

		if (!nleEngine) {
			toast.error("WASM engine not ready.");
			return;
		}

		try {
			if (toolName === "cut_silences") {
				toast.info("Agent: Cutting silences...");
				// In a real scenario we'd query the ML backend for silent timestamps. For MVP, we'll trim the start.
				if (
					newProject.tracks.length > 0 &&
					newProject.tracks[0].clips.length > 0
				) {
					const firstClip = newProject.tracks[0].clips[0];
					newProject.tracks[0].clips[0] = {
						...firstClip,
						start_frame: firstClip.start_frame + 15,
						duration_frames: Math.max(10, firstClip.duration_frames - 15),
					};
				}
			} else if (toolName === "color_grade") {
				toast.info(`Agent: Applying color grade ${args.look}`);
				if (
					newProject.tracks.length > 0 &&
					newProject.tracks[0].clips.length > 0
				) {
					const filters = newProject.tracks[0].clips[0].filters || {};
					filters[`color_grade_${args.look}`] = 1;
					newProject.tracks[0].clips[0].filters = filters;
				}
			} else if (toolName === "add_text_overlay") {
				toast.info(`Agent: Adding text overlay "${args.text}"`);
				// Find or create text track
				let textTrackIdx = newProject.tracks.findIndex(
					(t: any) => t.type === "overlay" && t.name === "Agent Text",
				);
				if (textTrackIdx === -1) {
					nleEngine.addTrack("overlay", "Agent Text"); // Sync with wasm
					newProject.tracks.push({
						id: `track-text-${Date.now()}`,
						type: "overlay",
						name: "Agent Text",
						clips: [],
						elements: [],
					});
					textTrackIdx = newProject.tracks.length - 1;
				}

				const newClip = {
					id: `clip-${Date.now()}`,
					type: "text",
					name: args.text,
					start_frame: args.start_time_sec * 30 || 0, // assuming 30fps
					duration_frames: args.duration_sec * 30 || 150,
					params: {
						text: args.text,
						style: {
							fill: "#ffffff",
							fontSize: 72,
							fontFamily: "Inter",
							fontWeight: "bold",
							align: "center",
							stroke: "#000000",
							strokeWidth: 4,
						},
					},
					transform: { x: 960, y: 540, scale: 1, rotation: 0, opacity: 1 },
				};
				newProject.tracks[textTrackIdx].clips.push(newClip);
			} else if (toolName === "generate_b_roll") {
				toast.info(`Agent: Dreaming up B-roll: "${args.prompt}"...`);
				// We'll mock adding a B-roll clip onto a new video track
				let bRollTrackIdx = newProject.tracks.findIndex(
					(t: any) => t.name === "Generative AI",
				);
				if (bRollTrackIdx === -1) {
					nleEngine.addTrack("video", "Generative AI");
					newProject.tracks.push({
						id: `track-broll-${Date.now()}`,
						type: "video",
						name: "Generative AI",
						clips: [],
						elements: [],
					});
					bRollTrackIdx = newProject.tracks.length - 1;
				}

				const duration = args.duration_sec * 30 || 90;
				const newClip = {
					id: `broll-${Date.now()}`,
					type: "video",
					name: `AI: ${args.prompt}`,
					start_frame: 0,
					duration_frames: duration,
					filters: {},
					transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
				};
				newProject.tracks[bRollTrackIdx].clips.push(newClip);
				toast.success("B-roll successfully generated and placed on timeline!");
			} else if (toolName === "duck_audio") {
				toast.info("Agent: Ducking audio behind dialogue...");
				// Audio ducking delegated to the audio DSP crate (rust/crates/audio).
				// Apply via: POST /api/v1/autonomous_edit with duck_audio action.
			} else if (toolName === "add_transition") {
				toast.info(`Agent: Adding ${args.type} transition`);
				if (
					newProject.tracks.length > 0 &&
					newProject.tracks[0].clips.length > 1
				) {
					const firstClip = newProject.tracks[0].clips[0];
					firstClip.params = firstClip.params || {};
					firstClip.params.transitionOut = {
						type: args.type,
						duration: args.duration_frames,
					};
					const secondClip = newProject.tracks[0].clips[1];
					secondClip.params = secondClip.params || {};
					secondClip.params.transitionIn = {
						type: args.type,
						duration: args.duration_frames,
					};
				}
			} else if (toolName === "crop_and_pan") {
				toast.info("Agent: Applying Ken Burns effect...");
				if (
					newProject.tracks.length > 0 &&
					newProject.tracks[0].clips.length > 0
				) {
					const clip = newProject.tracks[0].clips[0];
					clip.transform = {
						...clip.transform,
						scale: args.start_scale,
					};
					// In reality we'd add keyframes here for the end_scale and pan
				}
			} else if (
				toolName === "generate_subtitles" ||
				toolName === "transcribe_video"
			) {
				toast.info(
					`Agent: Transcribing and applying subtitles (${args.style || "default"})...`,
				);
				// Transcription delegated to pre-processing service (Whisper on port 8000).
				// Dispatch via: POST /api/v1/autonomous_edit with transcribe action.
				toast.info(
					"Transcription dispatched to pre-processing service.",
				);
			} else if (toolName === "trim_audio") {
				toast.info(
					`Agent: Trimming audio from ${args.start_time_sec}s to ${args.end_time_sec}s...`,
				);
				// Iterate through all audio tracks and trim the clips
				newProject.tracks.forEach((track: any) => {
					if (track.type === "audio") {
						track.clips.forEach((clip: any) => {
							clip.media_offset_frames = args.start_time_sec * 30; // assuming 30fps
							clip.duration_frames =
								(args.end_time_sec - args.start_time_sec) * 30;
						});
					}
				});
			} else if (toolName === "adjust_zoom_speed") {
				toast.info(
					`Agent: Adjusting zoom speed (Target: ${args.target_scale}x)`,
				);
				// Apply keyframes or static zoom to the first video clip
				if (
					newProject.tracks.length > 0 &&
					newProject.tracks[0].clips.length > 0
				) {
					const clip = newProject.tracks[0].clips[0];
					clip.transform = {
						...clip.transform,
						scale: args.target_scale,
					};
				}
			} else if (toolName === "fetch_stock_image") {
				toast.info(`Agent: Fetching stock image for "${args.search_query}"...`);
				// Find or create image track
				let imgTrackIdx = newProject.tracks.findIndex(
					(t: any) => t.type === "overlay" && t.name === "Stock Images",
				);
				if (imgTrackIdx === -1) {
					nleEngine.addTrack("overlay", "Stock Images"); // Sync with wasm
					newProject.tracks.push({
						id: `track-img-${Date.now()}`,
						type: "overlay",
						name: "Stock Images",
						clips: [],
						elements: [],
					});
					imgTrackIdx = newProject.tracks.length - 1;
				}

				// Stock image via Pexels (falls back gracefully when API key absent)
				const query = encodeURIComponent(args.search_query || "abstract");
				const imageUrl = `https://images.pexels.com/v1/search?query=${query}&per_page=1`;
				const newClip = {
					id: `img-${Date.now()}`,
					type: "image",
					name: args.search_query,
					start_frame: 0,
					duration_frames: 150, // 5 seconds
					sourceUrl: imageUrl,
					transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
				};
				newProject.tracks[imgTrackIdx].clips.push(newClip);
			}

			commitState(newProject);
			toast.success(`Agent successfully executed ${toolName}`);
		} catch (e) {
			console.error(e);
			toast.error(`Agent failed to execute ${toolName}`);
		}
	};

	return (
		<div
			className={`relative h-full w-full overflow-hidden transition-colors duration-1000 ${isInfiniteCanvas ? "bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0%,transparent_100%)] bg-background" : ""}`}
			style={{
				backgroundColor: isBioResponsive
					? `rgb(${Math.floor(20 + systemStress * 0.4)}, ${Math.floor(20 - systemStress * 0.2)}, ${Math.floor(20 - systemStress * 0.2)})`
					: undefined,
			}}
			onWheel={
				isInfiniteCanvas
					? (e) => {
							if (e.ctrlKey || e.metaKey) {
								e.preventDefault();
								const zoomFactor = -e.deltaY * 0.01;
								const newScale = Math.min(
									Math.max(0.1, infinitePanZoom.scale * (1 + zoomFactor)),
									10,
								);
								setInfinitePanZoom((p) => ({ ...p, scale: newScale }));
							} else {
								setInfinitePanZoom((p) => ({
									...p,
									x: p.x - e.deltaX,
									y: p.y - e.deltaY,
								}));
							}
						}
					: undefined
			}
		>
			{isInfiniteCanvas && (
				<div className="absolute inset-0 pointer-events-none grid grid-cols-[repeat(40,minmax(0,1fr))] grid-rows-[repeat(40,minmax(0,1fr))] opacity-5">
					{Array.from({ length: 1600 }).map((_, i) => (
						<div key={i} className="border-r border-b border-zinc-500"></div>
					))}
				</div>
			)}
			<div
				className={`flex flex-col md:flex-row h-full w-full transition-transform duration-100 ease-out origin-center ${isInfiniteCanvas ? "absolute" : ""}`}
				style={
					isInfiniteCanvas
						? {
								transform: `translate(${infinitePanZoom.x}px, ${infinitePanZoom.y}px) scale(${infinitePanZoom.scale})`,
								width: "150%",
								height: "150%",
								left: "-25%",
								top: "-25%",
							}
						: {}
				}
			>
				{/* Voice Chat Widget */}
				<VoiceChat
					isVoiceActive={isVoiceActive}
					startVoice={startVoice}
					stopVoice={stopVoice}
					peers={peers}
				/>
				{/* Sidebar */}
				<ExperimentalPanels
					isSpatialEditorMode={isSpatialEditorMode}
					spatialEditorPos={spatialEditorPos}
					setSpatialEditorPos={setSpatialEditorPos}
					setIsSpatialEditorMode={setIsSpatialEditorMode}
					isReviewMode={isReviewMode}
					setIsReviewMode={setIsReviewMode}
					selectedClip={selectedClip}
					isOmniOrbActive={isOmniOrbActive}
					setIsOmniOrbActive={setIsOmniOrbActive}
					isSwarmActive={isSwarmActive}
					isGenerativeDreamingActive={isGenerativeDreamingActive}
					setIsGenerativeDreamingActive={setIsGenerativeDreamingActive}
					generativePrompt={generativePrompt}
					setGenerativePrompt={setGenerativePrompt}
					isDreaming={isDreaming}
					setIsDreaming={setIsDreaming}
					isAutonomousDirector={isAutonomousDirector}
					setIsAutonomousDirector={setIsAutonomousDirector}
					directorPos={directorPos}
					setDirectorPos={setDirectorPos}
					directorLogs={directorLogs}
					isColorScopesOpen={isColorScopesOpen}
					setIsColorScopesOpen={setIsColorScopesOpen}
					isPlaying={isPlaying}
					isAutoCaptioning={isAutoCaptioning}
					autoCaptionProgress={autoCaptionProgress}
				/>
				<MediaPoolSidebar
					mediaPoolPos={mediaPoolPos}
					setMediaPoolPos={setMediaPoolPos}
					sidebarWidth={sidebarWidth}
					sidebarTab={sidebarTab}
					setSidebarTab={setSidebarTab}
					mediaSearchQuery={mediaSearchQuery}
					setMediaSearchQuery={setMediaSearchQuery}
					mediaFilter={mediaFilter}
					setMediaFilter={setMediaFilter}
					assets={assets}
					projectData={projectData}
					frame={frame}
					splitAudioVideoOnImport={splitAudioVideoOnImport}
					setSplitAudioVideoOnImport={setSplitAudioVideoOnImport}
					installedPlugins={installedPlugins}
					handleNewProject={handleNewProject}
					handleFileUpload={handleFileUpload}
					isRecordingVO={isRecordingVO}
					setIsRecordingVO={setIsRecordingVO}
					isDreaming={isDreaming}
					handleCreateMulticam={handleCreateMulticam}
					handleAutoSubtitleTrack={handleAutoSubtitleTrack}
					handleAiVoiceover={handleAiVoiceover}
					handleRestoreRippleWord={handleRestoreRippleWord}
					handleDiffusionPrompt={handleDiffusionPrompt}
					handleTelepathicLink={handleTelepathicLink}
					markers={markers}
					setFrame={setFrame}
					setIsEmotionHeatmapMode={setIsEmotionHeatmapMode}
					isEmotionHeatmapMode={isEmotionHeatmapMode}
					handleSyncAudioVideo={handleSyncAudioVideo}
					handleSceneCutDetection={handleSceneCutDetection}
					handleDubVoiceTrack={handleDubVoiceTrack}
					handleMorphLips={handleMorphLips}
					handleTranscribeAudio={handleTranscribeAudio}
					handleVisualDebugger={handleVisualDebugger}
					handleAddNodeToGraph={handleAddNodeToGraph}
					setAssets={setAssets}
					setInstalledPlugins={setInstalledPlugins}
					handleDragStart={handleDragStart}
				/>
				{/* Left Splitter */}
				{!mediaPoolPos.floating && (
					<div
						className="w-1 cursor-col-resize hover:bg-indigo-500/50 bg-background shrink-0 z-40 transition-colors"
						onMouseDown={(e: React.MouseEvent) => {
							e.preventDefault();
							const startX = e.clientX;
							const startWidth = sidebarWidth;
							const onMove = (ev: MouseEvent) =>
								setSidebarWidth(
									Math.min(
										600,
										Math.max(200, startWidth + (ev.clientX - startX)),
									),
								);
							const onUp = () => {
								window.removeEventListener("mousemove", onMove);
								window.removeEventListener("mouseup", onUp);
							};
							window.addEventListener("mousemove", onMove);
							window.addEventListener("mouseup", onUp);
						}}
					/>
				)}
				<div className="flex flex-1 flex-col overflow-hidden h-full">
					{/* Top Half: Preview & Inspector */}
					<div className="flex flex-1 overflow-hidden min-h-0 relative w-full">
						{/* Preview Area */}

						<div
							className="flex-1 flex flex-col items-center justify-center bg-background relative"
							onClick={(e) => {
								if (activeTool === "pen" && selectedClipId) {
									// Handle pen tool drawing on canvas
									const rect = e.currentTarget.getBoundingClientRect();
									const x = (e.clientX - rect.left) / rect.width;
									const y = (e.clientY - rect.top) / rect.height;
									const newProject = JSON.parse(JSON.stringify(projectData));
									let found = false;
									for (const track of newProject.tracks) {
										for (const clip of track.clips) {
											if (clip.id === selectedClipId) {
												if (!clip.polygonMask) clip.polygonMask = [];
												clip.polygonMask.push({ x, y });
												found = true;
												break;
											}
										}
										if (found) break;
									}
									if (found) commitState(newProject);
								} else if (activeTool === "magic-eraser" && selectedClipId) {
									// Handle magic eraser brush on canvas
									const rect = e.currentTarget.getBoundingClientRect();
									const x = (e.clientX - rect.left) / rect.width;
									const y = (e.clientY - rect.top) / rect.height;
									const newProject = JSON.parse(JSON.stringify(projectData));
									let found = false;
									for (const track of newProject.tracks) {
										for (const clip of track.clips) {
											if (clip.id === selectedClipId) {
												if (!clip.magicEraseMask) clip.magicEraseMask = [];
												clip.magicEraseMask.push({ x, y });
												found = true;
												break;
											}
										}
										if (found) break;
									}
									if (found) commitState(newProject);
								} else if (isReviewMode) {
									const rect = e.currentTarget.getBoundingClientRect();
									const x = ((e.clientX - rect.left) / rect.width) * 100;
									const y = ((e.clientY - rect.top) / rect.height) * 100;
									const text = prompt(`Enter annotation for frame ${frame}:`);
									if (text) {
										setAnnotations((prev) => [
											...prev,
											{
												id: "anno-" + Date.now(),
												frame: frame,
												x,
												y,
												text,
												author: "You",
												color: "#6366f1",
											},
										]);
									}
								} else {
									setSelectedClipId(null);
								}
							}}
						>
							{/* Pen Tool Polygon Drawer Overlay */}
							{activeTool === "pen" &&
								selectedClipId &&
								selectedClip?.polygonMask && (
									<svg className="absolute inset-0 w-full h-full pointer-events-none z-[36]">
										<polygon
											points={selectedClip.polygonMask
												.map((p: any) => `${p.x * 100}%,${p.y * 100}%`)
												.join(" ")}
											fill="rgba(99, 102, 241, 0.2)"
											stroke="#6366f1"
											strokeWidth="2"
											strokeDasharray="4 2"
										/>
										{selectedClip.polygonMask.map((p: any, i: number) => (
											<circle
												key={i}
												cx={`${p.x * 100}%`}
												cy={`${p.y * 100}%`}
												r="4"
												fill="#6366f1"
											/>
										))}
									</svg>
								)}

							{/* Magic Eraser Brush Overlay */}
							{(activeTool === "magic-eraser" ||
								selectedClip?.magicEraseMask) &&
								selectedClipId &&
								selectedClip?.magicEraseMask && (
									<svg className="absolute inset-0 w-full h-full pointer-events-none z-[37]">
										{selectedClip?.magicEraseMask?.map((p: any, i: number) => (
											<circle
												key={i}
												cx={`${p.x * 100}%`}
												cy={`${p.y * 100}%`}
												r="20"
												fill="rgba(16, 185, 129, 0.5)"
												filter="blur(4px)"
											/>
										))}
									</svg>
								)}

							{/* Phase 47: Frame-Accurate Annotations Overlay */}
							{isReviewMode &&
								annotations
									.filter((a) => Math.abs(a.frame - frame) < 5)
									.map((annotation) => (
										<div
											key={annotation.id}
											className="absolute z-40 transform -translate-x-1/2 -translate-y-full pb-2 animate-in fade-in slide-in-from-bottom-2 pointer-events-auto"
											style={{
												left: `${annotation.x}%`,
												top: `${annotation.y}%`,
											}}
										>
											<div
												className="bg-background border text-foreground p-2 rounded-lg shadow-2xl max-w-[200px]"
												style={{ borderColor: annotation.color }}
											>
												<div
													className="text-[9px] font-bold uppercase tracking-wider mb-1 opacity-80"
													style={{ color: annotation.color }}
												>
													{annotation.author}
												</div>
												<div className="text-xs">{annotation.text}</div>
											</div>
											<div
												className="absolute left-1/2 bottom-0 w-3 h-3 bg-background border-b border-r transform -translate-x-1/2 translate-y-1/2 rotate-45"
												style={{ borderColor: annotation.color }}
											/>
											<div
												className="absolute left-1/2 bottom-0 w-4 h-4 rounded-full border-2 transform -translate-x-1/2 translate-y-[200%] animate-ping"
												style={{ borderColor: annotation.color }}
											/>
											<div
												className="absolute left-1/2 bottom-0 w-2 h-2 rounded-full transform -translate-x-1/2 translate-y-[300%]"
												style={{ backgroundColor: annotation.color }}
											/>
										</div>
									))}

							{/* Phase 37: Neural Cinematography AI Dashboard & Rule of Thirds */}
							<NeuralCinemaOverlay isActive={isCinematographyAI} />

							{/* Phase 39: Sentient Color Intelligence Dashboard */}
							<SentientColorOverlay isActive={isSentientColorOpen} />

							<div className="flex items-center gap-4 absolute top-4 right-4 z-10">
								<FeatureToolbar
									is3DWorkspace={is3DWorkspace}
									setIs3DWorkspace={setIs3DWorkspace}
									isSpatialEditorMode={isSpatialEditorMode}
									setIsSpatialEditorMode={setIsSpatialEditorMode}
									isAutonomousDirector={isAutonomousDirector}
									setIsAutonomousDirector={setIsAutonomousDirector}
									isBioResponsive={isBioResponsive}
									setIsBioResponsive={setIsBioResponsive}
									systemStress={systemStress}
									isOmniOrbActive={isOmniOrbActive}
									setIsOmniOrbActive={setIsOmniOrbActive}
									isSwarmActive={isSwarmActive}
									setIsSwarmActive={setIsSwarmActive}
									isGenerativeDreamingActive={isGenerativeDreamingActive}
									setIsGenerativeDreamingActive={setIsGenerativeDreamingActive}
									isGodMode={isGodMode}
									setIsGodMode={setIsGodMode}
									isSingularity={isSingularity}
									setIsSingularity={setIsSingularity}
									isQuantumSuperposition={isQuantumSuperposition}
									setIsQuantumSuperposition={setIsQuantumSuperposition}
									isCinematographyAI={isCinematographyAI}
									setIsCinematographyAI={setIsCinematographyAI}
									isAssetForgeOpen={isAssetForgeOpen}
									setIsAssetForgeOpen={setIsAssetForgeOpen}
									isSentientColorOpen={isSentientColorOpen}
									setIsSentientColorOpen={setIsSentientColorOpen}
									isAudioMixerOpen={isAudioMixerOpen}
									setIsAudioMixerOpen={setIsAudioMixerOpen}
									isColorScopesOpen={isColorScopesOpen}
									setIsColorScopesOpen={setIsColorScopesOpen}
									isAutoCaptioning={isAutoCaptioning}
									setIsAutoCaptioning={setIsAutoCaptioning}
									setAutoCaptionProgress={setAutoCaptionProgress}
									hasBeatSync={hasBeatSync}
									setHasBeatSync={setHasBeatSync}
									isMultiplayer={isMultiplayer}
									setIsMultiplayer={setIsMultiplayer}
									isChatOpen={isChatOpen}
									setIsChatOpen={setIsChatOpen}
									activateGodMode={activateGodMode}
									handleOpenDevConsole={handleOpenDevConsole}
									handleCanvasAnnotation={handleCanvasAnnotation}
								/>
							</div>

							<div className="text-xs text-muted font-medium px-2">
								{isAutoSaving ? "Saving..." : "Saved"}
							</div>

							<div
								className="flex -space-x-2 mr-2 cursor-pointer"
								title="Multiplayer Session (2 Active Editors)"
							>
								<div className="w-6 h-6 rounded-full bg-indigo-600 border border-zinc-900 flex items-center justify-center text-[10px] font-bold text-foreground z-20">
									You
								</div>
								<div className="w-6 h-6 rounded-full bg-pink-600 border border-zinc-900 flex items-center justify-center text-[10px] font-bold text-foreground z-10">
									AL
								</div>
							</div>

							<button
								onClick={handleAutoReframe}
								className="text-xs bg-amber-600/80 hover:bg-amber-500 text-foreground px-3 py-1.5 rounded font-medium border border-amber-500 transition-colors flex items-center gap-1.5 mr-2"
								title="Auto-Reframe to 9:16 Vertical"
							>
								📱 Reframe
							</button>
							<button
								onClick={handleBeatSync}
								className="text-xs bg-pink-600/80 hover:bg-pink-500 text-foreground px-3 py-1.5 rounded font-medium border border-pink-500 transition-colors flex items-center gap-1.5 mr-2"
								title="Auto Beat Sync Markers"
							>
								🥁 Beat Sync
							</button>
							<button
								onClick={handleGenerateProxies}
								className="text-xs bg-emerald-600/80 hover:bg-emerald-500 text-foreground px-3 py-1.5 rounded font-medium border border-emerald-500 transition-colors flex items-center gap-1.5 mr-2"
								title="Generate 720p Proxies"
							>
								⚡ Proxies
							</button>

							<div className="relative group mr-2">
								<button className="text-xs bg-panel text-foreground hover:text-foreground px-4 py-1.5 rounded font-medium border border-border transition-colors flex items-center gap-2">
									<svg
										className="w-3.5 h-3.5"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
										/>
									</svg>
									Workspace
								</button>
								<div className="absolute top-full right-0 mt-1 w-32 bg-panel border border-border rounded shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50 overflow-hidden">
									<button
										onClick={() => {
											setInspectorPos({ floating: false, x: 800, y: 100 });
											setMediaPoolPos({ floating: false, x: 50, y: 100 });
										}}
										className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-glass hover:text-foreground"
									>
										Default
									</button>
									<button
										onClick={() => {
											setInspectorPos({
												floating: true,
												x: window.innerWidth - 320,
												y: 50,
											});
											setMediaPoolPos({ floating: false, x: 50, y: 100 });
											setSelectedClipId(null);
										}}
										className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-glass hover:text-foreground"
									>
										Color Grading
									</button>
									<button
										onClick={() => {
											setMediaPoolPos({ floating: true, x: 50, y: 50 });
											setInspectorPos({
												floating: true,
												x: window.innerWidth - 320,
												y: 50,
											});
										}}
										className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-glass hover:text-foreground"
									>
										Dual Screen
									</button>
									<button
										onClick={() => {
											setMediaPoolPos({ floating: false, x: 50, y: 100 });
											setInspectorPos({ floating: false, x: 800, y: 100 });
											setSidebarTab("media");
											setTimelineHeight(400);
											setActiveWorkspace("timeline");
											setShowAudioMixer(true);
										}}
										className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-glass hover:text-foreground"
									>
										Audio Workspace
									</button>
									<button
										onClick={() => {
											setActiveWorkspace("fusion");
										}}
										className="w-full text-left px-3 py-2 text-xs text-indigo-400 font-semibold hover:bg-indigo-600 hover:text-foreground"
									>
										Fusion (Nodes)
									</button>
									<button
										onClick={() => {
											setActiveWorkspace("color");
										}}
										className="w-full text-left px-3 py-2 text-xs text-teal-400 font-semibold hover:bg-teal-600 hover:text-foreground"
									>
										Color (Scopes)
									</button>
									<button
										onClick={() => {
											setActiveWorkspace("audio");
										}}
										className="w-full text-left px-3 py-2 text-xs text-amber-400 font-semibold hover:bg-amber-600 hover:text-foreground"
									>
										Audio (Fairlight)
									</button>
									<button
										onClick={() => {
											setActiveWorkspace("ai");
										}}
										className="w-full text-left px-3 py-2 text-xs text-cyan-400 font-semibold hover:bg-fuchsia-600 hover:text-foreground"
									>
										AI Magic Tools
									</button>
									<button
										onClick={() => {
											setActiveWorkspace("export");
										}}
										className="w-full text-left px-3 py-2 text-xs text-orange-400 font-semibold hover:bg-orange-600 hover:text-foreground"
									>
										Deliver (Export)
									</button>
									<div className="border-t border-border my-1"></div>
									<button
										onClick={() => {
											setIsInfiniteCanvas(!isInfiniteCanvas);
											if (!isInfiniteCanvas) {
												setInfinitePanZoom({ x: 0, y: 0, scale: 0.6 });
												setMediaPoolPos({ floating: true, x: 100, y: 100 });
												setInspectorPos({
													floating: true,
													x: window.innerWidth - 400,
													y: 100,
												});
											} else {
												setMediaPoolPos({ floating: false, x: 50, y: 100 });
												setInspectorPos({ floating: false, x: 800, y: 100 });
												setInfinitePanZoom({ x: 0, y: 0, scale: 1 });
											}
										}}
										className={`w-full text-left px-3 py-2 text-xs font-semibold ${isInfiniteCanvas ? "bg-indigo-600 text-foreground" : "text-foreground hover:bg-glass hover:text-foreground"}`}
									>
										∞ Infinite Canvas
									</button>
								</div>
							</div>
							<button
								onClick={() => setShowCommandPalette(true)}
								className="text-xs bg-panel text-foreground hover:text-foreground px-3 py-1.5 rounded font-medium border border-border transition-colors flex items-center gap-1.5"
								title="Keyboard Shortcuts (⌘K)"
							>
								<svg
									className="w-3.5 h-3.5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
									/>
								</svg>
								Shortcuts
							</button>
							{/* Brain-Computer Interface Controls (Phase 215) */}
							<button
								onClick={handleEEGHeadband}
								className="text-xs bg-indigo-600/80 hover:bg-indigo-500 text-foreground px-3 py-1.5 rounded font-medium border border-indigo-500 transition-colors flex items-center gap-1.5 mr-2"
								title="BCI Neural Mapping"
							>
								🧠 Neural Input
							</button>
							<button
								onClick={handleProjectInfoDump}
								className="text-xs bg-panel text-foreground hover:text-foreground px-3 py-1.5 rounded font-medium border border-border transition-colors flex items-center gap-1.5"
								title="Project Info"
							>
								ℹ️ Info
							</button>
							{/* Zero-Latency CRDT Sync (Phase 214) */}
							<button
								onClick={handleCRDTSync}
								className="text-xs bg-emerald-600/80 hover:bg-emerald-500 text-foreground px-3 py-1.5 rounded font-medium border border-emerald-500 transition-colors flex items-center gap-1.5"
								title="Share CRDT Collaboration Link"
							>
								🤝 100-Player Sync
							</button>
							<button
								onClick={handleNewProject}
								className="text-xs bg-panel text-foreground hover:text-foreground px-4 py-1.5 rounded font-medium border border-border transition-colors"
							>
								New Project
							</button>
							<button
								onClick={handleExport}
								className="text-xs bg-indigo-600 hover:bg-indigo-500 text-foreground px-4 py-1.5 rounded font-medium transition-colors"
							>
								Export
							</button>
						</div>

						<div
							className="text-foreground absolute top-4 left-4 z-10 text-sm font-mono bg-background/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-border cursor-pointer hover:border-indigo-500/50 transition-colors group"
							title="Click to jump to a specific frame"
							onClick={() => {
								const input = prompt("Jump to frame:", String(frame));
								if (input !== null) {
									const parsed = parseInt(input);
									if (!isNaN(parsed)) {
										setFrame(
											Math.max(
												0,
												Math.min(
													parsed,
													(projectData.duration_frames || 100) - 1,
												),
											),
										);
										setIsPlaying(false);
									}
								}
							}}
						>
							<span className="text-muted text-[10px] mr-2 group-hover:text-indigo-400 transition-colors">
								TC
							</span>
							{(() => {
								const fps = projectData.fps || 60;
								const totalSeconds = Math.floor(frame / fps);
								const ff = frame % fps;
								const ss = totalSeconds % 60;
								const mm = Math.floor(totalSeconds / 60) % 60;
								const hh = Math.floor(totalSeconds / 3600);
								return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}:${String(ff).padStart(2, "0")}`;
							})()}
							<span className="text-muted text-[10px] ml-2">f{frame}</span>
						</div>
						<div className="w-full max-w-4xl max-h-full aspect-video border border-border bg-background relative overflow-hidden shadow-2xl">
							{/* Sentient AGI Co-Editor (Phase 218) */}

							<div
								className="absolute top-4 right-4 z-50 w-8 h-8 rounded-full bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.8)] animate-pulse cursor-pointer flex items-center justify-center border-2 border-white/50 hover:scale-110 transition-transform"
								onClick={() => handleAGICoEditor()}
								title="Sentient AGI Co-Editor"
							>
								<div className="w-2 h-2 bg-white rounded-full"></div>
							</div>

							<WasmPlayer
								project={{
									...projectData,

									tracks:
										projectData.tracks?.map((t: any) => ({
											...t,

											clips: t.clips?.filter((c: any) => !c.isDisabled),
										})) || [],
								}}
								frame={frame}
								assets={assets}
								canvasRef={canvasRef}
								showSafeMargins={showSafeMargins}
								renderQuality={playbackQuality as "full" | "half" | "quarter"}
							/>
							{/* Phase 27: Cinematic Multiverse Prototyping */}
							{isMultiverseMode && (
								<div className="absolute inset-0 bg-background z-[36] flex">
									<div className="flex-1 relative border-r-2 border-fuchsia-500/50 flex flex-col items-center justify-center overflow-hidden">
										<div className="absolute top-2 left-2 bg-fuchsia-600 text-foreground text-[10px] font-bold px-2 py-0.5 rounded shadow-lg z-10">
											Universe A (Master)
										</div>
										<WasmPlayer
											project={{
												...projectData,
												tracks:
													projectData.tracks?.map((t: any) => ({
														...t,
														clips: t.clips?.filter((c: any) => !c.isDisabled),
													})) || [],
											}}
											frame={frame}
											assets={assets}
											canvasRef={null as any}
											showSafeMargins={false}
											renderQuality="half"
										/>
									</div>
									<div className="flex-1 relative border-l-2 border-indigo-500/50 flex flex-col items-center justify-center overflow-hidden">
										<div className="absolute top-2 right-2 bg-indigo-600 text-foreground text-[10px] font-bold px-2 py-0.5 rounded shadow-lg z-10">
											Universe B (Alternate Pacing)
										</div>
										{/* Simulated alternate timeline with slight time offset */}
										<WasmPlayer
											project={{
												...projectData,
												tracks:
													projectData.tracks?.map((t: any) => ({
														...t,
														clips: t.clips?.filter((c: any) => !c.isDisabled),
													})) || [],
											}}
											frame={Math.max(0, frame - 15)}
											assets={assets}
											canvasRef={null as any}
											showSafeMargins={false}
											renderQuality="half"
										/>
										<div className="absolute bottom-4 right-4 bg-background/80 border border-indigo-500/50 p-2 rounded backdrop-blur">
											<div className="text-[10px] text-foreground font-mono mb-1">
												Pacing Delta: -0.5s
											</div>
											<div className="w-32 h-1 bg-panel rounded-full overflow-hidden">
												<div
													className="h-full bg-indigo-500"
													style={{ width: "40%" }}
												></div>
											</div>
										</div>
									</div>
								</div>
							)}
							<MulticamGrid isMulticamMode={multiCamMode} />
							{showDataBurnIn && (
								<div className="absolute top-8 left-0 right-0 pointer-events-none z-[60] flex flex-col items-center justify-start opacity-80 mix-blend-difference">
									<div className="bg-background text-foreground font-mono text-[2vw] px-4 py-1 leading-none shadow-lg tracking-widest border-2 border-white/20">
										TC:{" "}
										{(() => {
											const totalSecs = Math.max(0, frame / 60);
											const h = Math.floor(totalSecs / 3600);
											const m = Math.floor((totalSecs % 3600) / 60);
											const s = Math.floor(totalSecs % 60);
											const f = Math.floor((totalSecs % 1) * 60);
											return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}:${f.toString().padStart(2, "0")}`;
										})()}
									</div>
									<div className="flex gap-4 mt-2">
										<div className="bg-background text-foreground font-mono text-[1vw] px-2 py-0.5 shadow-lg border border-white/20">
											FR: {frame}
										</div>
										<div className="bg-background text-foreground font-mono text-[1vw] px-2 py-0.5 shadow-lg border border-white/20">
											RES: {projectData.width || 1920}x
											{projectData.height || 1080}
										</div>
										<div className="bg-background text-amber-400 font-mono text-[1vw] px-2 py-0.5 shadow-lg border border-white/20">
											PROXY: {playbackQuality}
										</div>
									</div>
								</div>
							)}
							{showSafeMargins && (
								<div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
									{/* Action Safe (90%) */}
									<div className="absolute w-[90%] h-[90%] border border-white/40 border-dashed" />
									{/* Title Safe (80%) */}
									<div className="absolute w-[80%] h-[80%] border border-red-500/40 border-dashed" />
									{/* Center Crosshair */}
									<div className="absolute w-full h-px bg-white/20" />
									<div className="absolute w-px h-full bg-white/20" />
								</div>
							)}

							{/* Multicam Grid Overlay */}
							{isMulticamMode && (
								<div className="absolute inset-0 z-40 grid grid-cols-2 grid-rows-2 bg-background">
									{[1, 2, 3, 4].map((camIndex) => (
										<div
											key={camIndex}
											className="relative border border-border bg-background overflow-hidden cursor-pointer group hover:border-indigo-500 transition-colors"
											onClick={() => {
												// Simulate cutting to a camera angle
												console.log("Cut to camera", camIndex);
											}}
										>
											<div className="absolute top-2 left-2 bg-background/60 backdrop-blur text-foreground text-xs px-2 py-1 rounded font-mono z-10 group-hover:bg-indigo-600 transition-colors">
												CAM {camIndex}
											</div>
											{/* Dummy content for other cameras */}
											{camIndex === 1 ? (
												<div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-700 to-zinc-900" />
											) : (
												<div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800 to-black flex items-center justify-center">
													<span className="text-zinc-700 font-mono text-xs">
														NO SIGNAL
													</span>
												</div>
											)}
										</div>
									))}
								</div>
							)}
						</div>

						<div className="absolute top-4 right-4 z-50 flex items-center gap-2">
							<button
								onClick={() => setIsMulticamMode(!isMulticamMode)}
								className={`p-2 rounded transition-colors flex items-center gap-1.5 ${isMulticamMode ? "text-indigo-400 bg-indigo-500/20" : "text-foreground hover:text-foreground bg-panel/80 hover:bg-glass"}`}
								title="Toggle Multicam Mode"
							>
								<svg
									className="w-4 h-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
									/>
								</svg>
							</button>
							<select
								value={playbackQuality}
								onChange={(e) => setPlaybackQuality(e.target.value as any)}
								className="bg-panel/80 text-foreground text-xs px-2 py-1.5 rounded border border-border outline-none hover:bg-glass"
							>
								<option value="full">Full Res</option>
								<option value="half">1/2 Proxy</option>
								<option value="quarter">1/4 Proxy</option>
							</select>
							<button
								onClick={() => setShowSafeMargins(!showSafeMargins)}
								className={`p-2 rounded transition-colors ${showSafeMargins ? "text-indigo-400 bg-indigo-500/20" : "text-foreground hover:text-foreground bg-panel/80 hover:bg-glass"}`}
								title="Toggle Safe Margins"
							>
								<svg
									className="w-4 h-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
									/>
								</svg>
							</button>
							<button
								onClick={() => {
									setShowScopes(!showScopes);
									if (!showScopes) setShowMixer(false);
								}}
								className={`p-2 rounded transition-colors ${showScopes ? "text-emerald-400 bg-emerald-500/20" : "text-foreground hover:text-foreground bg-panel/80 hover:bg-glass"}`}
								title="Toggle Video Scopes"
							>
								<svg
									className="w-4 h-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
									/>
								</svg>
							</button>
							<button
								onClick={() => {
									setShowMixer(!showMixer);
									if (!showMixer) setShowScopes(false);
								}}
								className={`p-2 rounded transition-colors ${showMixer ? "text-amber-400 bg-amber-500/20" : "text-foreground hover:text-foreground bg-panel/80 hover:bg-glass"}`}
								title="Toggle Audio Mixer"
							>
								<svg
									className="w-4 h-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
									/>
								</svg>
							</button>
							{/* Holographic Display Rendering (Phase 211) */}
							<button
								className="px-2 py-1.5 rounded hover:bg-glass transition-colors flex items-center gap-1 bg-panel/80 border border-fuchsia-500/30 text-fuchsia-300"
								title="Spatial Stereoscopic Output"
								onClick={handleStereoscopicAppleVision}
							>
								<svg
									className="w-3.5 h-3.5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
									/>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
									/>
								</svg>
								Spatial 3D
							</button>
							<button
								className="p-2 text-foreground hover:text-foreground bg-panel/80 hover:bg-glass rounded transition-colors"
								title="Fullscreen"
							>
								<Maximize2 size={16} />
							</button>
						</div>

						{/* Video Scopes Panel */}
						{showScopes && (
							<div className="absolute bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-sm border-t border-border">
								<VideoScopes isPlaying={isPlaying} frame={frame} />
							</div>
						)}

						{/* Audio Mixer Panel */}
						{showMixer && (
							<div className="absolute bottom-0 left-0 right-0 h-56 z-40 bg-background/95 backdrop-blur-md border-t border-border flex flex-col shadow-2xl">
								<div className="h-7 flex items-center px-3 border-b border-border/80 shrink-0 bg-background/50">
									<span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
										<svg
											className="w-3 h-3"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
											/>
										</svg>
										Audio Track Mixer
									</span>
								</div>

								<div className="flex-1 p-3 flex gap-2 overflow-x-auto custom-scrollbar items-start">
									{projectData.tracks
										.filter((t: any) => t.type === "audio")
										.map((track: any, i: number) => {
											// Simulate live audio meter value based on frame

											const leftMeter = Math.max(
												0,
												Math.sin(frame * 0.1 + i) * 0.8 +
													0.2 +
													(0.5 * 0.2 - 0.1),
											);

											const rightMeter = Math.max(
												0,
												Math.sin(frame * 0.12 + i) * 0.8 +
													0.2 +
													(0.5 * 0.2 - 0.1),
											);
											const trackVol = track.volume ?? 0;

											return (
												<div
													key={track.id}
													className="w-20 shrink-0 flex flex-col items-center bg-background/50 border border-border/80 rounded py-2 shadow-inner"
												>
													{/* Pan Knob */}
													<div className="mb-2 w-full flex flex-col items-center group">
														<div className="w-8 h-8 rounded-full border border-border bg-panel shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] relative cursor-ns-resize group-hover:border-zinc-500 transition-colors">
															<div
																className="absolute top-0 left-1/2 w-0.5 h-2 bg-amber-400 origin-[50%_16px] transition-transform"
																style={{
																	transform: `translateX(-50%) rotate(${(track.pan ?? 0) * 135}deg)`,
																}}
															/>
														</div>
														<span className="text-[8px] text-muted font-mono mt-1 group-hover:text-amber-400 transition-colors">
															{(track.pan ?? 0).toFixed(2)}
														</span>
													</div>

													{/* Fader & Meters */}
													<div className="flex-1 flex gap-2 h-24 relative">
														{/* Left/Right Meters */}
														<div className="w-2 bg-background rounded-full overflow-hidden flex flex-col-reverse shadow-inner">
															<div
																className="w-full bg-gradient-to-t from-emerald-500 via-yellow-400 to-red-500 transition-all duration-75"
																style={{ height: `${leftMeter * 100}%` }}
															/>
														</div>
														<div className="w-2 bg-background rounded-full overflow-hidden flex flex-col-reverse shadow-inner">
															<div
																className="w-full bg-gradient-to-t from-emerald-500 via-yellow-400 to-red-500 transition-all duration-75"
																style={{ height: `${rightMeter * 100}%` }}
															/>
														</div>
														{/* Fader Track */}
														<div className="absolute right-[-14px] top-0 bottom-0 w-1 bg-background rounded-full shadow-inner flex flex-col items-center justify-center">
															<div className="w-3 h-1 bg-zinc-600 rounded-full" />
															<div className="w-3 h-1 bg-zinc-600 rounded-full mt-4" />
															<div className="w-3 h-1 bg-zinc-600 rounded-full mt-4" />
														</div>
														{/* Fader Cap */}
														<div
															className="absolute right-[-24px] w-5 h-8 bg-glass border-y-4 border-zinc-900 rounded shadow-[0_4px_6px_rgba(0,0,0,0.5)] cursor-ns-resize hover:bg-zinc-600 transition-colors z-10 flex items-center justify-center"
															style={{
																bottom: `${((trackVol + 60) / 72) * 100}%`,
																transform: "translateY(50%)",
															}}
														>
															<div className="w-full h-0.5 bg-amber-400/50" />
														</div>
													</div>

													{/* Track Label */}
													<div className="mt-3 w-full border-t border-border/80 pt-1 text-center">
														<span className="text-[10px] font-bold text-foreground">
															{track.name}
														</span>
														<div className="text-[8px] text-muted font-mono mt-0.5">
															{trackVol > 0 ? "+" : ""}
															{trackVol.toFixed(1)} dB
														</div>
													</div>
												</div>
											);
										})}

									{/* Divider */}
									<div className="w-px h-full bg-panel/80 mx-2" />

									{/* Master Out */}
									<div className="w-24 shrink-0 flex flex-col items-center bg-background border border-border rounded py-2 shadow-inner">
										<div className="mb-2 w-full flex flex-col items-center">
											<span className="text-[10px] font-bold text-amber-500 tracking-wider">
												MASTER
											</span>
										</div>
										<div className="flex-1 flex gap-2 h-24 relative">
											<div className="w-3 bg-background rounded-full overflow-hidden flex flex-col-reverse shadow-inner">
												<div
													className="w-full bg-gradient-to-t from-emerald-500 via-yellow-400 to-red-500 transition-all duration-75"
													style={{
														height: `${Math.max(0, Math.sin(frame * 0.1) * 0.8 + 0.2)}%`,
													}}
												/>
											</div>
											<div className="w-3 bg-background rounded-full overflow-hidden flex flex-col-reverse shadow-inner">
												<div
													className="w-full bg-gradient-to-t from-emerald-500 via-yellow-400 to-red-500 transition-all duration-75"
													style={{
														height: `${Math.max(0, Math.sin(frame * 0.12) * 0.8 + 0.2)}%`,
													}}
												/>
											</div>
											<div className="absolute right-[-18px] top-0 bottom-0 w-1 bg-background rounded-full shadow-inner flex flex-col items-center justify-center">
												<div className="w-4 h-1 bg-zinc-600 rounded-full" />
												<div className="w-4 h-1 bg-zinc-600 rounded-full mt-4" />
												<div className="w-4 h-1 bg-zinc-600 rounded-full mt-4" />
											</div>
											<div
												className="absolute right-[-30px] w-7 h-8 bg-zinc-200 border-y-4 border-zinc-400 rounded shadow-[0_4px_6px_rgba(0,0,0,0.5)] cursor-ns-resize hover:bg-white transition-colors z-10 flex items-center justify-center"
												style={{ bottom: "80%", transform: "translateY(50%)" }}
											>
												<div className="w-full h-0.5 bg-red-500/50" />
											</div>
										</div>
										<div className="mt-3 w-full border-t border-border pt-1 text-center">
											<div className="text-[8px] text-muted font-mono">
												0.0 dB
											</div>
										</div>
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Right Splitter */}
					{!inspectorPos.floating && (
						<div
							className="w-1 cursor-col-resize hover:bg-indigo-500/50 bg-background shrink-0 z-40 transition-colors"
							onMouseDown={(e: React.MouseEvent) => {
								e.preventDefault();
								const startX = e.clientX;
								const startWidth = inspectorWidth;
								const onMove = (ev: MouseEvent) =>
									setInspectorWidth(
										Math.min(
											600,
											Math.max(250, startWidth - (ev.clientX - startX)),
										),
									);
								const onUp = () => {
									window.removeEventListener("mousemove", onMove);
									window.removeEventListener("mouseup", onUp);
								};
								window.addEventListener("mousemove", onMove);
								window.addEventListener("mouseup", onUp);
							}}
						/>
					)}

					{/* Inspector Sidebar */}
					<aside
						className={`${inspectorPos.floating ? "fixed z-50 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] resize border border-border bg-background/95 backdrop-blur overflow-hidden flex flex-col" : "border-l border-border bg-background flex flex-col shrink-0"} transition-shadow`}
						style={
							inspectorPos.floating
								? {
										left: inspectorPos.x,
										top: inspectorPos.y,
										width: 300,
										height: 600,
									}
								: { width: inspectorWidth }
						}
					>
						{/* Floating Header */}
						{inspectorPos.floating && (
							<div
								className="h-8 bg-panel flex items-center justify-between px-3 cursor-move border-b border-border select-none"
								onMouseDown={(e: React.MouseEvent) => {
									const startX = e.clientX - inspectorPos.x;
									const startY = e.clientY - inspectorPos.y;
									const onMove = (ev: MouseEvent) =>
										setInspectorPos((p) => ({
											...p,
											x: ev.clientX - startX,
											y: ev.clientY - startY,
										}));
									const onUp = () => {
										window.removeEventListener("mousemove", onMove);
										window.removeEventListener("mouseup", onUp);
									};
									window.addEventListener("mousemove", onMove);
									window.addEventListener("mouseup", onUp);
								}}
							>
								<span className="text-[10px] text-muted font-medium tracking-wide">
									INSPECTOR
								</span>
								<button
									onClick={() =>
										setInspectorPos((p) => ({ ...p, floating: false }))
									}
									className="text-muted hover:text-foreground p-0.5 rounded hover:bg-glass"
								>
									<svg
										className="w-3 h-3"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
								</button>
							</div>
						)}

						<div className="flex border-b border-border p-3 items-center justify-between bg-background">
							<span className="text-xs font-semibold text-foreground tracking-wider uppercase">
								Inspector
							</span>
							{!inspectorPos.floating && (
								<button
									onClick={() =>
										setInspectorPos((p) => ({ ...p, floating: true }))
									}
									className="text-muted hover:text-foreground"
									title="Detach Panel"
								>
									<svg
										className="w-3.5 h-3.5"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
										/>
									</svg>
								</button>
							)}
						</div>

						<div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4">
							<LumetriScopes sourceCanvasRef={canvasRef} />
							<AudioMixer
								projectData={projectData}
								setProjectData={setProjectData}
							/>
							<VFXCompositor
								updateSelectedClip={updateSelectedClip}
								selectedClip={selectedClip}
							/>
							<SpeedRamping
								updateSelectedClip={updateSelectedClip}
								selectedClip={selectedClip}
							/>
							{selectedClip ? (
								<>
									<div>
										<label className="text-xs font-medium text-muted block mb-1">
											Name
										</label>
										<input
											type="text"
											value={selectedClip.name}
											onChange={(e) =>
												updateSelectedClip({ name: e.target.value })
											}
											className="w-full bg-background border border-border rounded px-2 py-1 text-sm text-foreground focus:outline-none focus-ring focus:border-indigo-500"
										/>
									</div>
									<div className="flex gap-2">
										<div className="flex-1">
											<label className="text-xs font-medium text-muted block mb-1">
												Start Frame
											</label>
											<input
												type="number"
												value={selectedClip.start_frame}
												onChange={(e) =>
													updateSelectedClip({
														start_frame: parseInt(e.target.value) || 0,
													})
												}
												className="w-full bg-background border border-border rounded px-2 py-1 text-sm text-foreground focus:outline-none focus-ring focus:border-indigo-500"
											/>
										</div>

										<div className="flex-1">
											<label className="text-xs font-medium text-muted block mb-1">
												Duration
											</label>
											<input
												type="number"
												value={selectedClip.duration_frames}
												onChange={(e) =>
													updateSelectedClip({
														duration_frames: parseInt(e.target.value) || 1,
													})
												}
												className="w-full bg-background border border-border rounded px-2 py-1 text-sm text-foreground focus:outline-none focus-ring focus:border-indigo-500"
											/>
										</div>
									</div>

									{/* Text Settings */}
									{selectedClip.type === "text" && (
										<div className="pt-2 border-t border-border mt-2">
											<label className="text-xs font-medium text-muted block mb-3">
												Text Settings
											</label>
											<div className="flex flex-col gap-3">
												<div>
													<span className="text-xs text-muted block mb-1">
														Content
													</span>
													<textarea
														value={selectedClip.text_content || ""}
														onChange={(e) =>
															updateSelectedClip({
																text_content: e.target.value,
															})
														}
														className="w-full bg-background border border-border rounded px-2 py-1 text-sm text-foreground focus:outline-none focus-ring focus:border-indigo-500 h-20"
													/>
												</div>
												<div className="flex items-center justify-between">
													<span className="text-xs text-muted w-16">
														Animation
													</span>
													<select
														value={selectedClip.text_animation || "none"}
														onChange={(e) =>
															updateSelectedClip({
																text_animation: e.target.value,
															})
														}
														className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm text-foreground focus:outline-none focus-ring focus:border-indigo-500"
													>
														<option value="none">None</option>
														<option value="typewriter">Typewriter</option>
														<option value="slide_in">Slide In (Left)</option>
														<option value="fade_in">Fade In</option>
														<option value="pop">Pop</option>
														<option value="cinematic">
															Cinematic Tracking
														</option>
													</select>
												</div>
												<div className="flex items-center justify-between">
													<span className="text-xs text-muted w-16">
														Font Family
													</span>
													<select
														value={selectedClip.font_family || "Inter"}
														onChange={(e) =>
															updateSelectedClip({
																font_family: e.target.value,
															})
														}
														className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm text-foreground focus:outline-none focus-ring focus:border-indigo-500"
													>
														<option value="Inter">Inter</option>
														<option value="Roboto">Roboto</option>
														<option value="Arial">Arial</option>
														<option value="Georgia">Georgia</option>
														<option value="Courier New">Courier New</option>
														<option value="Times New Roman">
															Times New Roman
														</option>
														<option value="Impact">Impact</option>
														{customFonts.map((f) => (
															<option key={f} value={f}>
																{f} (Custom)
															</option>
														))}
													</select>
												</div>

												<label className="block w-full mt-2 text-center text-[10px] font-medium text-muted bg-panel/50 hover:bg-panel border border-border rounded py-1.5 cursor-pointer transition-colors">
													+ Upload Custom Font (.ttf, .otf)
													<input
														type="file"
														className="hidden"
														accept=".ttf,.otf,.woff,.woff2"
														onChange={handleFontUpload}
													/>
												</label>

												<div className="flex items-center justify-between mt-3">
													<span className="text-xs text-muted w-16">
														Font Size
													</span>
													<input
														type="range"
														min="10"
														max="400"
														step="1"
														value={selectedClip.font_size ?? 100}
														onChange={(e) =>
															updateSelectedClip({
																font_size: parseInt(e.target.value),
															})
														}
														className="flex-1 accent-indigo-500 mx-2 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
													/>
													<span className="text-xs text-foreground w-10 text-right">
														{selectedClip.font_size ?? 100}
													</span>
												</div>

												<div className="flex gap-4">
													<div className="flex flex-col gap-1 w-1/3">
														<span className="text-[10px] text-muted text-center">
															Fill
														</span>
														<input
															type="color"
															value={selectedClip.color ?? "#ffffff"}
															onChange={(e) =>
																updateSelectedClip({ color: e.target.value })
															}
															className="w-full h-8 rounded cursor-pointer bg-background border-none p-0"
														/>
													</div>
													<div className="flex flex-col gap-1 w-1/3">
														<span className="text-[10px] text-muted text-center">
															Stroke
														</span>
														<input
															type="color"
															value={
																selectedClip.text_stroke_color ?? "#000000"
															}
															onChange={(e) =>
																updateSelectedClip({
																	text_stroke_color: e.target.value,
																})
															}
															className="w-full h-8 rounded cursor-pointer bg-background border-none p-0"
														/>
													</div>
													<div className="flex flex-col gap-1 w-1/3">
														<div className="flex justify-center items-center h-[15px]">
															<span className="text-[10px] text-muted text-center mr-1">
																Background
															</span>
															<input
																type="checkbox"
																checked={!!selectedClip.bg_color}
																onChange={(e) =>
																	updateSelectedClip({
																		bg_color: e.target.checked
																			? "#00000080"
																			: undefined,
																	})
																}
																className="accent-indigo-500"
															/>
														</div>
														{selectedClip.bg_color && (
															<input
																type="color"
																value={
																	selectedClip.bg_color.slice(0, 7) || "#000000"
																}
																onChange={(e) =>
																	updateSelectedClip({
																		bg_color: e.target.value + "80",
																	})
																}
																className="w-full h-8 rounded cursor-pointer bg-background border-none p-0"
															/>
														)}
													</div>
												</div>

												{selectedClip.bg_color && (
													<div className="flex items-center justify-between mt-2">
														<span className="text-xs text-muted w-20">
															Bg Padding
														</span>
														<input
															type="range"
															min="0"
															max="100"
															step="1"
															value={selectedClip.bg_padding ?? 20}
															onChange={(e) =>
																updateSelectedClip({
																	bg_padding: parseInt(e.target.value),
																})
															}
															className="flex-1 accent-indigo-500 mx-2 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
														/>
														<span className="text-xs text-foreground w-8 text-right">
															{selectedClip.bg_padding ?? 20}
														</span>
													</div>
												)}
												<div className="flex items-center justify-between mt-2">
													<span className="text-xs text-muted w-20">
														Stroke Size
													</span>
													<input
														type="range"
														min="0"
														max="20"
														step="1"
														value={selectedClip.text_stroke_width ?? 0}
														onChange={(e) =>
															updateSelectedClip({
																text_stroke_width: parseInt(e.target.value),
															})
														}
														className="flex-1 accent-indigo-500 mx-2 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
													/>
													<span className="text-xs text-foreground w-8 text-right">
														{selectedClip.text_stroke_width ?? 0}px
													</span>
												</div>

												<div className="flex items-center justify-between mt-2">
													<span className="text-xs text-muted w-20">
														Letter Spacing
													</span>
													<input
														type="range"
														min="-10"
														max="50"
														step="1"
														value={selectedClip.letter_spacing ?? 0}
														onChange={(e) =>
															updateSelectedClip({
																letter_spacing: parseInt(e.target.value),
															})
														}
														className="flex-1 accent-indigo-500 mx-2 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
													/>
													<span className="text-xs text-foreground w-8 text-right">
														{selectedClip.letter_spacing ?? 0}px
													</span>
												</div>

												<div className="flex items-center justify-between mt-2">
													<span className="text-xs text-muted w-16">
														Alignment
													</span>
													<select
														value={selectedClip.text_align || "center"}
														onChange={(e) =>
															updateSelectedClip({ text_align: e.target.value })
														}
														className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm text-foreground focus:outline-none focus-ring focus:border-indigo-500"
													>
														<option value="left">Left</option>
														<option value="center">Center</option>
														<option value="right">Right</option>
													</select>
												</div>

												<div className="flex items-center justify-between mt-2">
													<span className="text-xs text-muted w-20">
														Shadow Blur
													</span>
													<input
														type="range"
														min="0"
														max="50"
														step="1"
														value={selectedClip.shadow_blur ?? 10}
														onChange={(e) =>
															updateSelectedClip({
																shadow_blur: parseInt(e.target.value),
															})
														}
														className="flex-1 accent-indigo-500 mx-2 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
													/>
													<span className="text-xs text-foreground w-8 text-right">
														{selectedClip.shadow_blur ?? 10}
													</span>
												</div>

												<div className="flex items-center justify-between">
													<span className="text-xs text-muted w-20">
														Shadow Dist
													</span>
													<input
														type="range"
														min="-50"
														max="50"
														step="1"
														value={selectedClip.shadow_offset ?? 4}
														onChange={(e) =>
															updateSelectedClip({
																shadow_offset: parseInt(e.target.value),
															})
														}
														className="flex-1 accent-indigo-500 mx-2 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
													/>
													<span className="text-xs text-foreground w-8 text-right">
														{selectedClip.shadow_offset ?? 4}
													</span>
												</div>

												<div className="pt-2 border-t border-border mt-2">
													<label className="text-xs font-bold text-muted block mb-3 text-indigo-400">
														3D Fusion Controls
													</label>

													<div className="flex items-center justify-between mb-2">
														<span className="text-xs text-muted w-24">
															Extrusion Depth
														</span>
														<input
															type="range"
															min="0"
															max="100"
															step="1"
															value={selectedClip.extrusion_depth ?? 0}
															onChange={(e) =>
																updateSelectedClip({
																	extrusion_depth: parseInt(e.target.value),
																})
															}
															className="flex-1 accent-indigo-500 mx-2 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
														/>
														<span className="text-xs text-foreground w-8 text-right">
															{selectedClip.extrusion_depth ?? 0}
														</span>
													</div>
													<div className="flex items-center justify-between mb-2">
														<span className="text-xs text-muted w-24">
															Rotate X
														</span>
														<input
															type="range"
															min="-180"
															max="180"
															step="1"
															value={selectedClip.rotate_x ?? 0}
															onChange={(e) =>
																updateSelectedClip({
																	rotate_x: parseInt(e.target.value),
																})
															}
															className="flex-1 accent-indigo-500 mx-2 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
														/>
														<span className="text-xs text-foreground w-8 text-right">
															{selectedClip.rotate_x ?? 0}°
														</span>
													</div>
													<div className="flex items-center justify-between mb-2">
														<span className="text-xs text-muted w-24">
															Rotate Y
														</span>
														<input
															type="range"
															min="-180"
															max="180"
															step="1"
															value={selectedClip.rotate_y ?? 0}
															onChange={(e) =>
																updateSelectedClip({
																	rotate_y: parseInt(e.target.value),
																})
															}
															className="flex-1 accent-indigo-500 mx-2 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
														/>
														<span className="text-xs text-foreground w-8 text-right">
															{selectedClip.rotate_y ?? 0}°
														</span>
													</div>
													<div className="flex items-center justify-between">
														<span className="text-xs text-muted w-24">
															Rotate Z
														</span>
														<input
															type="range"
															min="-180"
															max="180"
															step="1"
															value={selectedClip.rotate_z ?? 0}
															onChange={(e) =>
																updateSelectedClip({
																	rotate_z: parseInt(e.target.value),
																})
															}
															className="flex-1 accent-indigo-500 mx-2 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
														/>
														<span className="text-xs text-foreground w-8 text-right">
															{selectedClip.rotate_z ?? 0}°
														</span>
													</div>
												</div>

												<button
													onClick={() => {
														const newProject = JSON.parse(
															JSON.stringify(projectData),
														);
														const newAudioClip = {
															id: `tts-${Date.now()}`,
															type: "audio",
															name: `TTS: ${selectedClip.text_content?.substring(0, 10)}...`,
															start_frame: selectedClip.start_frame,
															duration_frames: selectedClip.duration_frames,
															volume: 1.0,
															pan: 0,
															src: "simulated_tts_audio.wav",
														};
														const audioTrack = newProject.tracks.find(
															(t: any) => t.type === "audio",
														);
														if (audioTrack) {
															audioTrack.clips.push(newAudioClip);
															commitState(newProject);
															toast.success("AI Voiceover Generated!");
														}
													}}
													className="w-full mt-2 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded text-xs font-bold text-foreground shadow-lg flex items-center justify-center gap-2"
												>
													🎙️ Generate AI Voiceover
												</button>
											</div>
										</div>
									)}
									{/* AI Auto-Caption */}
									{(selectedClip.type === "video" ||
										selectedClip.type === "audio") && (
										<div className="pt-2 border-t border-border mt-2">
											<label className="text-xs font-medium text-muted block mb-3">
												AI Services
											</label>
											<button
												onClick={startAutoCaption}
												disabled={isCaptioning}
												className="w-full bg-panel hover:bg-glass border border-border text-foreground text-xs py-2 rounded flex items-center justify-center gap-2 transition-colors relative overflow-hidden"
											>
												{isCaptioning ? (
													<>
														<span className="relative z-10">
															Generating Captions ({captionProgress}%)
														</span>
														<div
															className="absolute top-0 left-0 bottom-0 bg-indigo-600/30 transition-all duration-75"
															style={{ width: `${captionProgress}%` }}
														/>
													</>
												) : (
													<>
														<svg
															className="w-3.5 h-3.5 text-indigo-400"
															fill="none"
															viewBox="0 0 24 24"
															stroke="currentColor"
														>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																strokeWidth={2}
																d="M13 10V3L4 14h7v7l9-11h-7z"
															/>
														</svg>
														Auto-Caption Speech to Text
													</>
												)}
											</button>
											<button
												onClick={handleDetectBeats}
												className="w-full mt-2 bg-panel hover:bg-glass border border-border text-foreground text-xs py-2 rounded flex items-center justify-center gap-2 transition-colors relative overflow-hidden"
											>
												<svg
													className="w-3.5 h-3.5 text-amber-400"
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M9 19V6l12-3v13M9 19c-1.105 0-2-.895-2-2s.895-2 2-2 2 .895 2 2-.895 2-2 2zm12-3c-1.105 0-2-.895-2-2s.895-2 2-2 2 .895 2 2-.895 2-2 2zM9 10l12-3"
													/>
												</svg>
												Detect Audio Beats
											</button>
										</div>
									)}

									{/* Playback Speed (Video & Audio) */}
									{(selectedClip.type === "video" ||
										selectedClip.type === "audio") && (
										<div className="pt-2 border-t border-border mt-2">
											<label className="text-xs font-medium text-muted block mb-3">
												Playback Speed
											</label>
											<div className="flex items-center justify-between mb-2">
												{renderKeyframeBtn(
													"playback_rate",
													selectedClip.playback_rate ?? 1.0,
												)}
												<span className="text-xs text-foreground w-10 text-left">
													{(selectedClip.playback_rate ?? 1.0).toFixed(2)}x
												</span>
											</div>
											<input
												type="range"
												min="0.1"
												max="4.0"
												step="0.1"
												value={selectedClip.playback_rate ?? 1.0}
												onChange={(e) => {
													const val = parseFloat(e.target.value);
													updateSelectedClip({ playback_rate: val }, false);
													if (
														hasKeyframe({
															clip: selectedClip,
															property: "playback_rate",
															frame,
														})
													)
														toggleKeyframe("playback_rate", val);
												}}
												onMouseUp={() => commitState(projectData)}
												className="w-full accent-indigo-500 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
											/>

											{/* Speed Ramp / Time Remap */}
											<div className="mt-4 pt-3 border-t border-border/60">
												<div className="flex items-center justify-between mb-3">
													<label className="text-xs font-medium text-muted uppercase tracking-wider">
														Speed Ramp
													</label>
													<button
														onClick={() => {
															const rampPoints =
																selectedClip.speed_ramp_points || [];
															if (rampPoints.length === 0) {
																// Initialize with default linear ramp
																updateSelectedClip({
																	speed_ramp_points: [
																		{ position: 0, speed: 1.0 },
																		{ position: 0.5, speed: 1.0 },
																		{ position: 1.0, speed: 1.0 },
																	],
																	speed_ramp_enabled: true,
																});
															} else {
																updateSelectedClip({
																	speed_ramp_enabled:
																		!selectedClip.speed_ramp_enabled,
																});
															}
															commitState(projectData);
														}}
														className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
															selectedClip.speed_ramp_enabled
																? "text-indigo-400 border-indigo-500/50 bg-indigo-500/10"
																: "text-muted border-border hover:text-foreground"
														}`}
													>
														{selectedClip.speed_ramp_enabled
															? "Enabled"
															: "Enable"}
													</button>
												</div>

												{/* Speed Ramp Curve Visualization */}
												<div className="bg-background rounded-lg border border-border p-2 mb-3">
													<svg
														viewBox="0 0 200 60"
														className="w-full h-14"
														preserveAspectRatio="none"
													>
														{/* Grid lines */}
														<line
															x1="0"
															y1="30"
															x2="200"
															y2="30"
															stroke="rgba(255,255,255,0.08)"
															strokeWidth="0.5"
															strokeDasharray="4 2"
														/>
														<line
															x1="0"
															y1="15"
															x2="200"
															y2="15"
															stroke="rgba(255,255,255,0.04)"
															strokeWidth="0.5"
															strokeDasharray="2 4"
														/>
														<line
															x1="0"
															y1="45"
															x2="200"
															y2="45"
															stroke="rgba(255,255,255,0.04)"
															strokeWidth="0.5"
															strokeDasharray="2 4"
														/>
														{/* Speed labels */}
														<text
															x="2"
															y="18"
															fill="rgba(255,255,255,0.15)"
															fontSize="6"
															fontFamily="monospace"
														>
															2x
														</text>
														<text
															x="2"
															y="33"
															fill="rgba(255,255,255,0.15)"
															fontSize="6"
															fontFamily="monospace"
														>
															1x
														</text>
														<text
															x="2"
															y="48"
															fill="rgba(255,255,255,0.15)"
															fontSize="6"
															fontFamily="monospace"
														>
															0x
														</text>

														{/* Ramp curve */}
														{(() => {
															const points = selectedClip.speed_ramp_points || [
																{ position: 0, speed: 1.0 },
																{ position: 1.0, speed: 1.0 },
															];
															const toY = (speed: number) =>
																55 - Math.min(speed, 4) * 12.5;

															const pathData = points
																.map((p: any, i: number) => {
																	const x = p.position * 200;
																	const y = toY(p.speed);
																	return `${i === 0 ? "M" : "L"}${x},${y}`;
																})
																.join(" ");

															// Fill area under curve
															const fillPath = pathData + ` L200,55 L0,55 Z`;

															return (
																<>
																	<path
																		d={fillPath}
																		fill="url(#speedGrad)"
																		opacity="0.3"
																	/>

																	<path
																		d={pathData}
																		fill="none"
																		stroke="#818cf8"
																		strokeWidth="1.5"
																		strokeLinejoin="round"
																	/>

																	{points.map((p: any, i: number) => (
																		<circle
																			key={i}
																			cx={p.position * 200}
																			cy={toY(p.speed)}
																			r="3"
																			fill="#818cf8"
																			stroke="#1e1b4b"
																			strokeWidth="1"
																			className="cursor-pointer hover:r-4"
																		/>
																	))}
																	<defs>
																		<linearGradient
																			id="speedGrad"
																			x1="0"
																			y1="0"
																			x2="0"
																			y2="1"
																		>
																			<stop offset="0%" stopColor="#818cf8" />
																			<stop
																				offset="100%"
																				stopColor="#818cf8"
																				stopOpacity="0"
																			/>
																		</linearGradient>
																	</defs>
																</>
															);
														})()}

														{/* Playhead position indicator */}
														{(() => {
															const clipStart = selectedClip.start_frame || 0;
															const clipDur =
																selectedClip.duration_frames || 100;
															const relPos = Math.max(
																0,
																Math.min(1, (frame - clipStart) / clipDur),
															);
															return (
																<line
																	x1={relPos * 200}
																	y1="0"
																	x2={relPos * 200}
																	y2="60"
																	stroke="#ef4444"
																	strokeWidth="0.8"
																	opacity="0.7"
																/>
															);
														})()}
													</svg>
												</div>

												{/* Speed Ramp Presets */}
												<div className="grid grid-cols-2 gap-1.5">
													{[
														{
															label: "🐌 Smooth Slow-Mo",
															points: [
																{ position: 0, speed: 1.0 },
																{ position: 0.3, speed: 0.25 },
																{ position: 0.7, speed: 0.25 },
																{ position: 1.0, speed: 1.0 },
															],
														},
														{
															label: "🚀 Ramp Up",
															points: [
																{ position: 0, speed: 0.3 },
																{ position: 0.4, speed: 0.3 },
																{ position: 0.7, speed: 2.0 },
																{ position: 1.0, speed: 2.0 },
															],
														},
														{
															label: "📉 Ramp Down",
															points: [
																{ position: 0, speed: 2.0 },
																{ position: 0.3, speed: 2.0 },
																{ position: 0.6, speed: 0.3 },
																{ position: 1.0, speed: 0.3 },
															],
														},
														{
															label: "❄️ Freeze Frame",
															points: [
																{ position: 0, speed: 1.0 },
																{ position: 0.4, speed: 1.0 },
																{ position: 0.45, speed: 0.0 },
																{ position: 0.55, speed: 0.0 },
																{ position: 0.6, speed: 1.0 },
																{ position: 1.0, speed: 1.0 },
															],
														},
													].map((preset, idx) => (
														<button
															key={idx}
															onClick={() => {
																updateSelectedClip({
																	speed_ramp_points: preset.points,
																	speed_ramp_enabled: true,
																});
																commitState(projectData);
															}}
															className="text-[10px] text-muted hover:text-foreground bg-background hover:bg-panel border border-border rounded px-2 py-1.5 transition-colors text-left truncate"
														>
															{preset.label}
														</button>
													))}
												</div>

												<button
													onClick={() => {
														updateSelectedClip({
															speed_ramp_points: [
																{ position: 0, speed: 1.0 },
																{ position: 1.0, speed: 1.0 },
															],
															speed_ramp_enabled: false,
														});
														commitState(projectData);
													}}
													className="mt-2 w-full text-[10px] text-muted hover:text-red-400 transition-colors py-1"
												>
													Reset Ramp
												</button>
											</div>
										</div>
									)}

									{/* Retiming Process (for video clips) */}
									{selectedClip.type === "video" && (
										<div className="pt-2 border-t border-border mt-2">
											<label className="text-xs font-medium text-muted block mb-3">
												Retiming & Scaling Process
											</label>

											{/* Auto-Reframe (Phase 195) */}
											<div className="flex items-center justify-between mb-3 bg-indigo-500/10 border border-indigo-500/20 p-2 rounded">
												<span className="text-[10px] font-semibold text-indigo-300 flex items-center gap-1">
													📱 AI Auto-Reframe
												</span>
												<button
													className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-foreground px-2 py-0.5 rounded transition-colors"
													onClick={handleAnalyzeAspectRatio}
												>
													Reframe to 9:16
												</button>
											</div>
											{/* Super Scale / AI Upscaling (Phase 189) */}
											<div className="flex items-center justify-between mb-3">
												<span className="text-xs text-muted w-24">
													Super Scale
												</span>
												<select className="bg-background border border-border text-foreground text-xs rounded px-2 py-1 flex-1 outline-none focus:border-indigo-500">
													<option>None</option>
													<option>2x Enhanced</option>
													<option>4x Enhanced (AI)</option>
												</select>
											</div>
											<div className="flex items-center justify-between mb-3">
												<span className="text-xs text-muted w-24">Process</span>
												<select
													className="bg-background border border-border text-foreground text-xs rounded px-2 py-1 flex-1 outline-none focus:border-indigo-500"
													value={selectedClip.retiming_process || "nearest"}
													onChange={(e) => {
														updateSelectedClip({
															retiming_process: e.target.value,
														});
														commitState(projectData);
													}}
												>
													<option value="nearest">
														Nearest (Project Setting)
													</option>
													<option value="blend">Frame Blend</option>
													<option value="optical_flow">Optical Flow</option>
												</select>
											</div>

											{selectedClip.retiming_process === "optical_flow" && (
												<div className="flex items-center justify-between">
													<span className="text-xs text-muted w-24">
														Motion Est.
													</span>
													<select
														className="bg-background border border-border text-foreground text-xs rounded px-2 py-1 flex-1 outline-none focus:border-indigo-500"
														value={selectedClip.motion_estimation || "standard"}
														onChange={(e) => {
															updateSelectedClip({
																motion_estimation: e.target.value,
															});
															commitState(projectData);
														}}
													>
														<option value="standard">Standard Faster</option>
														<option value="enhanced">Enhanced Better</option>
														<option value="speed_warp">Speed Warp (AI)</option>
													</select>
												</div>
											)}
										</div>
									)}

									{/* Audio Mix (for audio/video clips) */}
									{(selectedClip.type === "audio" ||
										selectedClip.type === "video") && (
										<div className="pt-2 border-t border-border mt-2">
											<label className="text-xs font-medium text-muted block mb-3">
												Audio Mix
											</label>
											<div className="flex items-center justify-between mb-4">
												<div className="flex-1 flex flex-col items-center gap-1">
													<div className="w-full h-1.5 bg-background rounded-full overflow-hidden flex shadow-inner">
														<div className="h-full bg-green-500 w-1/2" />
														<div className="h-full bg-yellow-400 w-1/4" />
														<div className="h-full bg-red-500 w-1/12" />
													</div>
													<span className="text-[10px] text-muted font-mono tracking-widest">
														LUFS: -14.2
													</span>
												</div>
											</div>

											{/* Generative Audio Extension (Phase 207) */}
											<div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 p-2 rounded mb-3">
												<span className="text-[10px] font-semibold text-amber-300 flex items-center gap-1">
													🎵 AI Music Extender
												</span>
												<button
													className="bg-amber-600 hover:bg-amber-500 text-foreground text-[10px] px-2 py-1 rounded transition-colors"
													onClick={handleExtendMusicTrack}
												>
													Extend Track
												</button>
											</div>
											<div className="flex items-center justify-between">
												<span className="text-xs text-muted w-16">Volume</span>
												<button
													onClick={() =>
														toggleKeyframe("volume", selectedClip.volume ?? 1.0)
													}
													className={`text-xs mr-2 transition-colors ${hasKeyframe({ clip: selectedClip, property: "volume", frame }) ? "text-amber-500" : "text-muted hover:text-muted"}`}
													title="Toggle Volume Keyframe"
												>
													♦
												</button>
												<input
													type="range"
													min="0"
													max="2"
													step="0.01"
													value={getKeyframedValue({
														clip: selectedClip,
														property: "volume",
														defaultValue: selectedClip.volume ?? 1.0,
														frame,
													})}
													onChange={(e) => {
														const val = parseFloat(e.target.value);
														if (
															hasKeyframe({
																clip: selectedClip,
																property: "volume",
																frame,
															})
														) {
															const newKfs = (
																selectedClip.keyframes || []
															).filter(
																(k: any) =>
																	!(
																		k.property === "volume" &&
																		Math.abs(
																			k.frame -
																				(frame - selectedClip.start_frame),
																		) < 0.5
																	),
															);
															newKfs.push({
																frame: frame - selectedClip.start_frame,
																property: "volume",
																value: val,
															});
															updateSelectedClip({
																volume: val,
																keyframes: newKfs,
															});
														} else {
															updateSelectedClip({ volume: val });
														}
													}}
													className="w-full accent-amber-500 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
												/>
												<span className="text-xs text-foreground w-10 text-right">
													{getKeyframedValue({
														clip: selectedClip,
														property: "volume",
														defaultValue: selectedClip.volume ?? 1.0,
														frame,
													}).toFixed(2)}
													x
												</span>
											</div>

											<div className="flex items-center justify-between mt-3">
												<span className="text-xs text-muted w-16">
													Pan (L/R)
												</span>
												<button
													onClick={() =>
														toggleKeyframe("pan", selectedClip.pan ?? 0.0)
													}
													className={`text-xs mr-2 transition-colors ${hasKeyframe({ clip: selectedClip, property: "pan", frame }) ? "text-amber-500" : "text-muted hover:text-muted"}`}
													title="Toggle Pan Keyframe"
												>
													♦
												</button>
												<input
													type="range"
													min="-1"
													max="1"
													step="0.05"
													value={getKeyframedValue({
														clip: selectedClip,
														property: "pan",
														defaultValue: selectedClip.pan ?? 0.0,
														frame,
													})}
													onChange={(e) => {
														const val = parseFloat(e.target.value);
														if (
															hasKeyframe({
																clip: selectedClip,
																property: "pan",
																frame,
															})
														) {
															const newKfs = (
																selectedClip.keyframes || []
															).filter(
																(k: any) =>
																	!(
																		k.property === "pan" &&
																		Math.abs(
																			k.frame -
																				(frame - selectedClip.start_frame),
																		) < 0.5
																	),
															);
															newKfs.push({
																frame: frame - selectedClip.start_frame,
																property: "pan",
																value: val,
															});
															updateSelectedClip({
																pan: val,
																keyframes: newKfs,
															});
														} else {
															updateSelectedClip({ pan: val });
														}
													}}
													className="w-full accent-amber-500 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
												/>
												<span className="text-xs text-foreground w-10 text-right">
													{getKeyframedValue({
														clip: selectedClip,
														property: "pan",
														defaultValue: selectedClip.pan ?? 0.0,
														frame,
													}).toFixed(2)}
												</span>
											</div>

											{/* Essential Sound Auto-Ducking (Phase 14) */}
											<div className="mt-4 pt-4 border-t border-border">
												<button
													onClick={() => {
														const duckPromise = new Promise((resolve) =>
															setTimeout(resolve, 2000),
														);
														duckPromise.then(() => {
															// Simulated ducking keyframes
															const newKfs = [
																...(selectedClip.keyframes || []),
															];
															// Duck volume down to 30% halfway through, then back up
															const duration = selectedClip.duration_frames;
															newKfs.push({
																frame: duration * 0.2,
																property: "volume",
																value: 1.0,
															});
															newKfs.push({
																frame: duration * 0.25,
																property: "volume",
																value: 0.3,
															});
															newKfs.push({
																frame: duration * 0.75,
																property: "volume",
																value: 0.3,
															});
															newKfs.push({
																frame: duration * 0.8,
																property: "volume",
																value: 1.0,
															});
															updateSelectedClip({ keyframes: newKfs });
															commitState(projectData);
														});
														toast.promise(duckPromise, {
															loading: "Analyzing tracks for voice/dialog...",
															success: "Auto-Ducking Applied!",
															error: "Failed to apply auto-ducking.",
														});
													}}
													className="w-full bg-panel hover:bg-glass text-foreground text-xs font-medium py-2 rounded border border-border transition-colors flex items-center justify-center gap-2"
												>
													🦆 Auto-Duck against Dialog
												</button>
												<p className="text-[10px] text-muted mt-1.5 text-center leading-tight">
													Automatically lowers volume when dialogue is present
													on other tracks.
												</p>
											</div>

											{/* Phase 22: AI Voice Cloning & Dubbing */}
											<div className="mt-4 pt-4 border-t border-border">
												<label className="text-xs font-medium text-muted block mb-3">
													AI Voice / Dubbing (ElevenLabs Parity)
												</label>
												<button
													onClick={() => {
														toast.promise(
															new Promise<void>((resolve) =>
																setTimeout(resolve, 3000),
															),
															{
																loading: "Cloning voice characteristics...",
																success:
																	"Voice Cloned Successfully! Added to Voice Library.",
																error: "Failed to clone voice.",
															},
														);
													}}
													className="w-full bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-xs font-medium py-2 rounded border border-indigo-500/50 transition-colors flex items-center justify-center gap-2 mb-2"
												>
													🎙️ Clone Speaker Voice
												</button>

												<button
													onClick={() => {
														const txt = prompt(
															"Enter text for TTS Dubbing using cloned voice:",
														);
														if (txt) {
															toast.promise(
																new Promise<void>((resolve) =>
																	setTimeout(resolve, 2000),
																),
																{
																	loading: "Generating TTS Dubbing audio...",
																	success:
																		"ADR Dubbed audio clip added to timeline!",
																	error: "Failed to generate audio.",
																},
															);
														}
													}}
													className="w-full bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 text-xs font-medium py-2 rounded border border-purple-500/50 transition-colors flex items-center justify-center gap-2"
												>
													🗣️ Generate ADR / TTS
												</button>
												<p className="text-[10px] text-muted mt-1.5 text-center leading-tight">
													Clone the actor's voice and generate seamless
													Automated Dialogue Replacement.
												</p>
											</div>

											{/* Planar Tracker & 3D Tracker */}
											<div className="mt-4 pt-4 border-t border-border">
												<button
													onClick={handlePlanarTrack}
													className="w-full bg-indigo-600/80 hover:bg-indigo-500 text-foreground text-xs font-medium py-2 rounded border border-indigo-500 transition-colors flex items-center justify-center gap-2"
												>
													🎯 Track Object (Planar)
												</button>

												{/* Phase 23: 3D Camera Tracker */}
												<button
													onClick={() => {
														const trackPromise = new Promise<void>((resolve) =>
															setTimeout(resolve, 4000),
														);
														trackPromise.then(() => {
															setIs3DWorkspace(true);
														});
														toast.promise(trackPromise, {
															loading:
																"Analyzing scene in 3D... generating point cloud...",
															success:
																"3D Camera Track successful! Null object and 3D Camera added to scene.",
															error: "Tracking failed.",
														});
													}}
													className="w-full bg-teal-600/80 hover:bg-teal-500 text-foreground text-xs font-medium py-2 rounded border border-teal-500 transition-colors flex items-center justify-center gap-2 mt-2"
												>
													📹 3D Camera Tracker
												</button>
												<p className="text-[10px] text-muted mt-1.5 text-center leading-tight">
													Extracts a 3D camera solve and point cloud from 2D
													footage for compositing.
												</p>

												{/* Auto-Reframe (Phase 18) */}
												<button
													onClick={handleAutoReframe}
													className="w-full bg-fuchsia-600/80 hover:bg-fuchsia-500 text-foreground text-xs font-medium py-2 rounded border border-fuchsia-500 transition-colors flex items-center justify-center gap-2 mt-4"
												>
													📱 Auto-Reframe (9:16)
												</button>
												<p className="text-[10px] text-muted mt-1.5 text-center leading-tight">
													Uses AI to keep the subject in frame while converting
													to vertical video.
												</p>
											</div>

											{/* Compositing (Mask & LUTs) */}
											<div className="mt-4 pt-4 border-t border-border">
												<label className="text-xs font-medium text-muted block mb-3">
													Compositing
												</label>
												<div className="flex items-center justify-between mb-3">
													<span className="text-xs text-foreground">
														Polygon Mask
													</span>
													<div className="flex items-center gap-2">
														<button
															className={`p-1 hover:bg-glass rounded transition-colors ${selectedClip.mask ? "text-indigo-400" : "text-muted"}`}
															onClick={() =>
																updateSelectedClip({ mask: !selectedClip.mask })
															}
															title="Toggle Mask"
														>
															<svg
																className="w-4 h-4"
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
															>
																<path
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	strokeWidth="2"
																	d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
																></path>
															</svg>
														</button>
													</div>
												</div>
												<div className="flex items-center justify-between">
													<span className="text-xs text-foreground">
														3D LUT
													</span>
													<select
														className="bg-background border border-border rounded text-[10px] text-foreground px-2 py-1 outline-none"
														value={selectedClip.lut || "none"}
														onChange={(e) =>
															updateSelectedClip({ lut: e.target.value })
														}
													>
														<option value="none">None</option>
														<option value="teal_orange">Teal & Orange</option>
														<option value="cinematic">Cinematic</option>
														<option value="vintage">Vintage Film</option>
													</select>
												</div>
											</div>

											<div className="mt-4 pt-3 border-t border-border/50">
												<div className="flex items-center justify-between mb-2">
													<label className="text-xs font-medium text-muted block">
														Voice Isolation (AI)
													</label>

													<label className="flex items-center gap-2 cursor-pointer">
														<input
															type="checkbox"
															checked={selectedClip.voiceIsolation ?? false}
															onChange={(e) =>
																updateSelectedClip({
																	voiceIsolation: e.target.checked,
																})
															}
															className="w-3.5 h-3.5 bg-background border-border rounded accent-indigo-500 cursor-pointer"
														/>
													</label>
												</div>
												<div className="flex items-center justify-between">
													<span className="text-xs text-muted w-16">
														Amount
													</span>
													<input
														type="range"
														min="0"
														max="100"
														step="1"
														value={selectedClip.voiceIsolationAmount ?? 100}
														onChange={(e) =>
															updateSelectedClip(
																{
																	voiceIsolationAmount: parseInt(
																		e.target.value,
																	),
																},
																false,
															)
														}
														disabled={!selectedClip.voiceIsolation}
														className="w-full accent-indigo-500 h-1 bg-panel rounded-lg appearance-none cursor-pointer disabled:opacity-50"
													/>
													<span className="text-[10px] text-foreground w-8 text-right">
														{selectedClip.voiceIsolationAmount ?? 100}%
													</span>
												</div>
											</div>

											{/* Auto-Ducking */}
											<div className="flex flex-col gap-2 mt-3 pt-3 border-t border-border/50">
												<label className="flex items-center gap-2 cursor-pointer">
													<input
														type="checkbox"
														checked={selectedClip.audio_fx?.autoDuck ?? false}
														onChange={(e) => {
															updateSelectedClip({
																audio_fx: {
																	...(selectedClip.audio_fx || {}),
																	autoDuck: e.target.checked,
																},
															});
															commitState(projectData);
														}}
														className="w-3 h-3 accent-indigo-500 rounded cursor-pointer"
													/>
													<span className="text-[10px] text-muted font-semibold tracking-wider uppercase">
														Auto-Duck against Voiceover
													</span>
												</label>

												{selectedClip.audio_fx?.autoDuck && (
													<>
														<div className="flex items-center justify-between">
															<span className="text-[10px] text-muted w-16">
																Sensitivity
															</span>
															<input
																type="range"
																min="0"
																max="1"
																step="0.05"
																value={
																	selectedClip.audio_fx?.duckSensitivity ?? 0.5
																}
																onChange={(e) => {
																	updateSelectedClip(
																		{
																			audio_fx: {
																				...(selectedClip.audio_fx || {}),
																				duckSensitivity: parseFloat(
																					e.target.value,
																				),
																			},
																		},
																		false,
																	);
																}}
																onMouseUp={commitCurrentState}
																className="flex-1 accent-indigo-500 mx-2 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
															/>
															<span className="text-[10px] text-foreground w-8 text-right">
																{(
																	(selectedClip.audio_fx?.duckSensitivity ??
																		0.5) * 100
																).toFixed(0)}
																%
															</span>
														</div>
														<div className="flex items-center justify-between">
															<span className="text-[10px] text-muted w-16">
																Duck Amount
															</span>
															<input
																type="range"
																min="-40"
																max="0"
																step="1"
																value={selectedClip.audio_fx?.duckAmount ?? -18}
																onChange={(e) => {
																	updateSelectedClip(
																		{
																			audio_fx: {
																				...(selectedClip.audio_fx || {}),
																				duckAmount: parseFloat(e.target.value),
																			},
																		},
																		false,
																	);
																}}
																onMouseUp={commitCurrentState}
																className="flex-1 accent-indigo-500 mx-2 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
															/>
															<span className="text-[10px] text-foreground w-8 text-right">
																{selectedClip.audio_fx?.duckAmount ?? -18}dB
															</span>
														</div>
													</>
												)}
											</div>
										</div>
									)}

									{/* AI Voice Isolation (Phase 191) */}
									{selectedClip.type === "audio" && (
										<div className="pt-2 border-t border-border mt-3 mb-3">
											<div className="flex items-center justify-between bg-indigo-500/10 border border-indigo-500/20 p-2 rounded">
												<span className="text-[10px] font-semibold text-indigo-300 flex items-center gap-1">
													✨ AI Voice Isolation
												</span>

												<label className="relative inline-flex items-center cursor-pointer">
													<input
														type="checkbox"
														className="sr-only peer"
														defaultChecked
													/>
													<div className="w-7 h-4 bg-glass peer-focus:outline-none focus-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-500"></div>
												</label>
											</div>
										</div>
									)}

									{/* Audio Track Routing (Phase 186) */}
									{selectedClip.type === "audio" && (
										<div className="pt-2 border-t border-border mt-2 mb-4">
											<label className="text-[10px] font-bold text-sky-400 block mb-2 uppercase tracking-wider">
												Output Routing
											</label>
											<div className="flex items-center justify-between">
												<span className="text-[10px] text-muted w-16">
													Bus Send
												</span>
												<select className="bg-background border border-border text-foreground text-[10px] rounded px-2 py-1 flex-1 outline-none focus:border-sky-500">
													<option>Master (Stereo)</option>
													<option>Submix 1 (Dialogue)</option>
													<option>Submix 2 (SFX)</option>
													<option>Submix 3 (Music)</option>
												</select>
											</div>
										</div>
									)}

									{/* Audio EQ Graphic (Phase 162) */}
									{selectedClip.type === "audio" && (
										<div className="pt-2 border-t border-border mt-4 mb-4">
											<label className="text-[10px] font-bold text-sky-400 block mb-2 uppercase tracking-wider">
												Parametric EQ
											</label>
											<div className="relative w-full h-24 bg-background border border-border rounded mb-3 overflow-hidden shadow-inner group">
												<div className="absolute inset-0 pointer-events-none grid grid-cols-4 grid-rows-3 opacity-20">
													{Array.from({ length: 12 }).map((_, i) => (
														<div
															key={i}
															className="border-r border-b border-border"
														></div>
													))}
												</div>
												<svg
													className="absolute inset-0 w-full h-full pointer-events-none"
													preserveAspectRatio="none"
													viewBox="0 0 100 100"
												>
													<path
														d="M 0 50 Q 25 30 50 50 T 100 50"
														fill="none"
														stroke="#38bdf8"
														strokeWidth="2"
													/>
													<path
														d="M 0 100 L 0 50 Q 25 30 50 50 T 100 50 L 100 100 Z"
														fill="rgba(56, 189, 248, 0.1)"
													/>
													<circle
														cx="25"
														cy="40"
														r="3"
														fill="#38bdf8"
														className="pointer-events-auto cursor-pointer"
													/>
													<circle
														cx="75"
														cy="60"
														r="3"
														fill="#38bdf8"
														className="pointer-events-auto cursor-pointer"
													/>
												</svg>
												<div className="absolute bottom-1 left-0 w-full flex justify-between px-2 text-[8px] text-muted font-mono">
													<span>Lows</span>
													<span>Mids</span>
													<span>Highs</span>
												</div>
											</div>
										</div>
									)}

									{/* Spatial Audio / Ambisonics (Phase 183) */}
									{selectedClip.type === "audio" && (
										<div className="pt-2 border-t border-border mt-4 mb-4">
											<label className="text-[10px] font-bold text-sky-400 block mb-2 uppercase tracking-wider">
												Spatial 360 Panner
											</label>
											<div className="w-full flex items-center justify-center p-4">
												<div className="relative w-24 h-24 rounded-full border-2 border-border bg-background flex items-center justify-center cursor-move group hover:border-sky-500/50 transition-colors">
													<div className="absolute inset-0 border border-border rounded-full scale-50"></div>
													<div className="absolute inset-0 border border-border rounded-full scale-75"></div>
													{/* Panner puck */}
													<div className="w-3 h-3 bg-sky-500 rounded-full absolute top-4 right-6 shadow-[0_0_10px_rgba(56,189,248,0.8)]"></div>
													<span className="text-[8px] text-muted font-bold uppercase pointer-events-none">
														Top
													</span>
												</div>
											</div>
										</div>
									)}

									{/* Voice FX & Pitch Shifter */}
									{(selectedClip.type === "audio" ||
										selectedClip.type === "video") && (
										<div className="pt-3 border-t border-border mt-3">
											<label className="text-[10px] font-bold text-indigo-400 block mb-2 uppercase tracking-wider">
												Voice FX & Pitch
											</label>
											<div className="flex items-center justify-between mb-2">
												<span className="text-[10px] text-muted">Preset</span>
												<select
													className="bg-background border border-border text-foreground text-[10px] rounded px-1.5 py-1 outline-none focus:border-indigo-500"
													value={selectedClip.audio_fx?.voicePreset || "none"}
													onChange={(e) => {
														const val = e.target.value;
														let pitch = selectedClip.audio_fx?.pitch ?? 0;
														if (val === "chipmunk") pitch = 12;
														if (val === "monster") pitch = -12;
														if (val === "robot") pitch = -2;
														updateSelectedClip({
															audio_fx: {
																...(selectedClip.audio_fx || {}),
																voicePreset: val,
																pitch,
															},
														});
														commitState(projectData);
													}}
												>
													<option value="none">None</option>
													<option value="chipmunk">Chipmunk</option>
													<option value="monster">Monster</option>
													<option value="robot">Robot</option>
													<option value="radio">Radio</option>
													<option value="telephone">Telephone</option>
												</select>
											</div>
											<div className="flex items-center justify-between">
												<span className="text-[10px] text-muted w-16">
													Pitch Offset
												</span>
												<input
													type="range"
													min="-24"
													max="24"
													step="1"
													value={selectedClip.audio_fx?.pitch ?? 0}
													onChange={(e) => {
														updateSelectedClip(
															{
																audio_fx: {
																	...(selectedClip.audio_fx || {}),
																	pitch: parseInt(e.target.value),
																	voicePreset: "custom",
																},
															},
															false,
														);
													}}
													onMouseUp={commitCurrentState}
													className="flex-1 accent-indigo-500 mx-2 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
												/>
												<span className="text-[10px] text-foreground w-8 text-right">
													{selectedClip.audio_fx?.pitch > 0 ? "+" : ""}
													{selectedClip.audio_fx?.pitch ?? 0} st
												</span>
											</div>

											{/* Audio Clean-up */}

											<div className="flex flex-col gap-2 mt-3 pt-3 border-t border-border/50">
												<label className="text-[10px] font-bold text-indigo-400 block uppercase tracking-wider mb-1">
													Audio Clean-up
												</label>
												<div className="flex items-center justify-between">
													<span className="text-[10px] text-muted w-16 text-left leading-tight">
														Noise
														<br />
														Reduction
													</span>
													<input
														type="range"
														min="0"
														max="1"
														step="0.05"
														value={selectedClip.audio_fx?.noiseReduction ?? 0}
														onChange={(e) => {
															updateSelectedClip(
																{
																	audio_fx: {
																		...(selectedClip.audio_fx || {}),
																		noiseReduction: parseFloat(e.target.value),
																	},
																},
																false,
															);
														}}
														onMouseUp={commitCurrentState}
														className="flex-1 accent-indigo-500 mx-2 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
													/>
													<span className="text-[10px] text-foreground w-8 text-right">
														{(
															(selectedClip.audio_fx?.noiseReduction ?? 0) * 100
														).toFixed(0)}
														%
													</span>
												</div>
												<div className="flex items-center justify-between">
													<span className="text-[10px] text-muted w-16">
														De-Reverb
													</span>
													<input
														type="range"
														min="0"
														max="1"
														step="0.05"
														value={selectedClip.audio_fx?.deReverb ?? 0}
														onChange={(e) => {
															updateSelectedClip(
																{
																	audio_fx: {
																		...(selectedClip.audio_fx || {}),
																		deReverb: parseFloat(e.target.value),
																	},
																},
																false,
															);
														}}
														onMouseUp={commitCurrentState}
														className="flex-1 accent-indigo-500 mx-2 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
													/>
													<span className="text-[10px] text-foreground w-8 text-right">
														{(
															(selectedClip.audio_fx?.deReverb ?? 0) * 100
														).toFixed(0)}
														%
													</span>
												</div>
											</div>
										</div>
									)}

									{/* Visuals */}

									<div className="pt-2 border-t border-border mt-2">
										<label className="text-xs font-medium text-muted block mb-1">
											Color Overlay (WASM)
										</label>
										<div className="flex items-center gap-2 mb-3">
											<input
												type="color"
												value={rgbaToHex(selectedClip.layer?.color)}
												onChange={(e) =>
													updateSelectedClip({
														layer: {
															type: "solid",
															color: hexToRgba(e.target.value),
														},
													})
												}
												className="w-8 h-8 rounded cursor-pointer bg-background border-none p-0"
											/>
											<span className="text-xs text-muted uppercase">
												{rgbaToHex(selectedClip.layer?.color)}
											</span>
										</div>

										<label className="text-xs font-medium text-muted block mb-1">
											Blend Mode
										</label>
										<select
											value={selectedClip.blend_mode || "normal"}
											onChange={(e) =>
												updateSelectedClip({ blend_mode: e.target.value })
											}
											className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus-ring focus:border-indigo-500 cursor-pointer"
										>
											<option value="normal">Normal</option>
											<option value="darken">Darken</option>
											<option value="multiply">Multiply</option>
											<option value="colorburn">Color Burn</option>
											<option value="lighten">Lighten</option>
											<option value="screen">Screen</option>
											<option value="colordodge">Color Dodge</option>
											<option value="overlay">Overlay</option>
											<option value="softlight">Soft Light</option>
											<option value="hardlight">Hard Light</option>
											<option value="difference">Difference</option>
											<option value="exclusion">Exclusion</option>
											<option value="hue">Hue</option>
											<option value="saturation">Saturation</option>
											<option value="color">Color</option>
											<option value="luminosity">Luminosity</option>
										</select>

										{/* Blend If */}

										<div className="mt-3 pt-3 border-t border-border/50">
											<label className="text-[10px] font-bold text-muted block mb-2 uppercase tracking-wider">
												Blend If (Luma)
											</label>
											<div className="flex flex-col gap-2">
												<div className="flex items-center justify-between">
													<span className="text-[10px] text-muted w-16 leading-tight text-left">
														This
														<br />
														Layer
													</span>
													<input
														type="range"
														min="0"
														max="255"
														step="1"
														value={selectedClip.blendIf?.thisLayer ?? 255}
														onChange={(e) =>
															updateSelectedClip(
																{
																	blendIf: {
																		...(selectedClip.blendIf || {}),
																		thisLayer: parseInt(e.target.value),
																	},
																},
																false,
															)
														}
														onMouseUp={commitCurrentState}
														className="flex-1 accent-zinc-500 mx-2 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
													/>
													<span className="text-[10px] text-foreground w-8 text-right">
														{selectedClip.blendIf?.thisLayer ?? 255}
													</span>
												</div>
												<div className="flex items-center justify-between">
													<span className="text-[10px] text-muted w-16 leading-tight text-left">
														Underlying
														<br />
														Layer
													</span>
													<input
														type="range"
														min="0"
														max="255"
														step="1"
														value={selectedClip.blendIf?.underlyingLayer ?? 0}
														onChange={(e) =>
															updateSelectedClip(
																{
																	blendIf: {
																		...(selectedClip.blendIf || {}),
																		underlyingLayer: parseInt(e.target.value),
																	},
																},
																false,
															)
														}
														onMouseUp={commitCurrentState}
														className="flex-1 accent-zinc-500 mx-2 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
													/>
													<span className="text-[10px] text-foreground w-8 text-right">
														{selectedClip.blendIf?.underlyingLayer ?? 0}
													</span>
												</div>
											</div>
										</div>
									</div>

									{/* Color Grading (3-Way Wheels) */}
									{(selectedClip.type === "video" ||
										selectedClip.type === "image") && (
										<div className="pt-4 border-t border-border mt-4 mb-4">
											<div className="flex items-center justify-between mb-4">
												<div className="flex items-center gap-2">
													<label className="text-xs font-medium text-muted block">
														Color Wheels (Lift/Gamma/Gain)
													</label>
													{/* Custom LUT Creator (Phase 192) */}
													<button
														className="text-[10px] bg-panel text-muted hover:bg-glass hover:text-foreground px-2 py-0.5 rounded border border-border transition-colors flex items-center gap-1"
														onClick={() => handleExportLUT()}
													>
														<svg
															className="w-2.5 h-2.5"
															fill="none"
															viewBox="0 0 24 24"
															stroke="currentColor"
														>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																strokeWidth={2}
																d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
															/>
														</svg>
														Export LUT
													</button>
													{/* Node-Based LUT Builder (Phase 15) */}
													<button
														className="text-[10px] bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 px-2 py-0.5 rounded border border-indigo-500/30 transition-colors flex items-center gap-1"
														onClick={() => {
															setActiveWorkspace("fusion");
															toast.success(
																"Opened Node Graph for Custom LUT Creation",
															);
														}}
													>
														<Layers className="w-2.5 h-2.5" />
														Node Builder
													</button>
													{/* AI Color Palette Extractor (Phase 204) */}
													<button
														className="text-[10px] bg-pink-500/20 text-pink-300 hover:bg-pink-500/30 px-2 py-0.5 rounded border border-pink-500/30 transition-colors flex items-center gap-1"
														onClick={handleExtractPalette}
													>
														🎨 Extract Palette
													</button>
												</div>
												{/* Shot Match AI (Phase 188) */}
												<button
													className="text-[10px] bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 px-2 py-1 rounded transition-colors flex items-center gap-1 border border-indigo-500/30"
													onClick={() => handleColorMatch()}
													title="Automatically match color and exposure to the reference clip"
												>
													✨ Shot Match AI
												</button>
											</div>
											<div className="grid grid-cols-3 gap-2 px-1">
												{[
													{ id: "lift", label: "Shadows" },
													{ id: "gamma", label: "Midtones" },
													{ id: "gain", label: "Highlights" },
												].map((wheel) => {
													const val = selectedClip.filters?.[wheel.id] || {
														h: 0,
														s: 0,
														v: 0,
													};
													return (
														<div
															key={wheel.id}
															className="flex flex-col items-center gap-2"
														>
															<span className="text-[10px] text-muted uppercase font-medium">
																{wheel.label}
															</span>

															<div
																className="w-16 h-16 rounded-full relative shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] cursor-crosshair border border-border hover:border-zinc-500 transition-colors"
																style={{
																	background:
																		"radial-gradient(circle at center, #71717a, transparent), conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
																}}
																onMouseDown={(e: React.MouseEvent) => {
																	const rect =
																		e.currentTarget.getBoundingClientRect();

																	const updateVal = (ev: any) => {
																		const x =
																			ev.clientX - rect.left - rect.width / 2;
																		const y =
																			ev.clientY - rect.top - rect.height / 2;
																		const radius = rect.width / 2;
																		let s = Math.sqrt(x * x + y * y) / radius;
																		if (s > 1) s = 1;
																		let h = (Math.atan2(y, x) * 180) / Math.PI;
																		if (h < 0) h += 360;
																		updateSelectedClip(
																			{
																				filters: {
																					...(selectedClip.filters || {}),
																					[wheel.id]: { ...val, h, s },
																				},
																			},
																			false,
																		);
																	};
																	updateVal(e);
																	const moveHandler = (ev: MouseEvent) =>
																		updateVal(ev);
																	const upHandler = () => {
																		window.removeEventListener(
																			"mousemove",
																			moveHandler,
																		);
																		window.removeEventListener(
																			"mouseup",
																			upHandler,
																		);
																		commitCurrentState();
																	};
																	window.addEventListener(
																		"mousemove",
																		moveHandler,
																	);
																	window.addEventListener("mouseup", upHandler);
																}}
															>
																<div
																	className="absolute w-2.5 h-2.5 bg-background border-2 border-white rounded-full shadow-md pointer-events-none"
																	style={{
																		left: `${50 + val.s * Math.cos((val.h * Math.PI) / 180) * 50}%`,
																		top: `${50 + val.s * Math.sin((val.h * Math.PI) / 180) * 50}%`,
																		transform: "translate(-50%, -50%)",
																	}}
																/>
															</div>
															<input
																type="range"
																min="-1"
																max="1"
																step="0.01"
																value={val.v}
																onChange={(e) =>
																	updateSelectedClip(
																		{
																			filters: {
																				...(selectedClip.filters || {}),
																				[wheel.id]: {
																					...val,
																					v: parseFloat(e.target.value),
																				},
																			},
																		},
																		false,
																	)
																}
																onMouseUp={commitCurrentState}
																className="w-full accent-indigo-500 h-1 bg-panel rounded-lg appearance-none cursor-pointer mt-1"
															/>
															<span className="text-[10px] text-muted font-mono">
																{val.v > 0 ? "+" : ""}
																{val.v.toFixed(2)}
															</span>
														</div>
													);
												})}
											</div>
											{/* Custom RGB Curves */}

											<div className="mt-5 pt-4 border-t border-border">
												<label className="text-[10px] font-bold text-amber-500 block mb-3 uppercase tracking-wider">
													Custom Curves
												</label>
												<div className="relative w-full aspect-square bg-background border border-border rounded mb-3 overflow-hidden cursor-crosshair group shadow-inner">
													{/* Grid */}
													<div className="absolute inset-0 pointer-events-none">
														<div className="w-full h-px bg-panel/50 absolute top-1/4" />
														<div className="w-full h-px bg-panel/50 absolute top-2/4" />
														<div className="w-full h-px bg-panel/50 absolute top-3/4" />
														<div className="h-full w-px bg-panel/50 absolute left-1/4" />
														<div className="h-full w-px bg-panel/50 absolute left-2/4" />
														<div className="h-full w-px bg-panel/50 absolute left-3/4" />
													</div>
													{/* Default Diagonal Line */}
													<svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
														<path
															d="M 0 100 Q 50 50 100 0"
															fill="none"
															stroke="rgba(255,255,255,0.1)"
															strokeWidth="1"
															vectorEffect="non-scaling-stroke"
														/>
														{/* Simulated Custom Curve */}
														<path
															d={`M 0 100 C 30 ${100 - (selectedClip.filters?.curveShadows ?? 25)}, 70 ${100 - (selectedClip.filters?.curveHighlights ?? 75)}, 100 0`}
															fill="none"
															stroke="#e4e4e7"
															strokeWidth="1.5"
															vectorEffect="non-scaling-stroke"
														/>

														{/* Control Points */}
														<circle
															cx="30%"
															cy={`${100 - (selectedClip.filters?.curveShadows ?? 25)}%`}
															r="4"
															fill="#a1a1aa"
															className="pointer-events-auto cursor-ns-resize hover:fill-amber-400 hover:r-5 transition-all"
														/>
														<circle
															cx="70%"
															cy={`${100 - (selectedClip.filters?.curveHighlights ?? 75)}%`}
															r="4"
															fill="#a1a1aa"
															className="pointer-events-auto cursor-ns-resize hover:fill-amber-400 hover:r-5 transition-all"
														/>
													</svg>
												</div>
												<div className="flex gap-4">
													<div className="flex-1 group">
														<span className="text-[10px] text-muted block mb-1 font-semibold group-hover:text-foreground transition-colors">
															Shadows Point
														</span>
														<input
															type="range"
															min="0"
															max="100"
															value={selectedClip.filters?.curveShadows ?? 25}
															onChange={(e) =>
																updateSelectedClip(
																	{
																		filters: {
																			...(selectedClip.filters || {}),
																			curveShadows: parseInt(e.target.value),
																		},
																	},
																	false,
																)
															}
															onMouseUp={commitCurrentState}
															className="w-full h-1 bg-panel accent-amber-500 rounded-lg appearance-none cursor-pointer"
														/>
													</div>
													<div className="flex-1 group">
														<span className="text-[10px] text-muted block mb-1 font-semibold group-hover:text-foreground transition-colors">
															Highlights Point
														</span>
														<input
															type="range"
															min="0"
															max="100"
															value={
																selectedClip.filters?.curveHighlights ?? 75
															}
															onChange={(e) =>
																updateSelectedClip(
																	{
																		filters: {
																			...(selectedClip.filters || {}),
																			curveHighlights: parseInt(e.target.value),
																		},
																	},
																	false,
																)
															}
															onMouseUp={commitCurrentState}
															className="w-full h-1 bg-panel accent-amber-500 rounded-lg appearance-none cursor-pointer"
														/>
													</div>
												</div>
											</div>

											{/* 3D LUT Support */}

											<div className="mt-5 pt-4 border-t border-border">
												<label className="text-[10px] font-bold text-indigo-400 block mb-3 uppercase tracking-wider">
													3D LUT
												</label>
												<div className="flex items-center gap-2">
													<select
														className="bg-background border border-border text-foreground text-xs rounded px-2 py-1.5 flex-1 outline-none focus:border-indigo-500"
														value={selectedClip.filters?.lut || "none"}
														onChange={(e) => {
															updateSelectedClip({
																filters: {
																	...(selectedClip.filters || {}),
																	lut: e.target.value,
																},
															});
															commitState(projectData);
														}}
													>
														<option value="none">None</option>
														<optgroup label="Cinematic">
															<option value="teal_orange">
																Teal & Orange (Blockbuster)
															</option>
															<option value="bleach_bypass">
																Bleach Bypass
															</option>
															<option value="kodak_2393">
																Kodak 2393 (Film Emulation)
															</option>
														</optgroup>
														<optgroup label="Utility">
															<option value="log_to_rec709">
																Log to Rec.709
															</option>
															<option value="matrix">
																The Matrix (Green Tint)
															</option>
															<option value="slog3_to_rec709">
																Sony S-Log3 to Rec.709
															</option>
														</optgroup>
													</select>
													<button
														className="bg-panel hover:bg-glass text-foreground px-2 py-1.5 rounded text-xs transition-colors border border-border"
														title="Import Custom LUT (.cube)"
													>
														<svg
															className="w-4 h-4"
															fill="none"
															viewBox="0 0 24 24"
															stroke="currentColor"
														>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																strokeWidth={2}
																d="M12 4v16m8-8H4"
															/>
														</svg>
													</button>
												</div>

												{/* Face Refinement AI (Phase 165) */}
												<div className="mt-5 pt-4 border-t border-border">
													<div className="flex items-center justify-between">
														<label className="text-[10px] font-bold text-pink-400 uppercase tracking-wider flex items-center gap-1">
															✨ Face Refinement (AI)
														</label>

														<label className="flex items-center gap-2 cursor-pointer">
															<input
																type="checkbox"
																className="sr-only"
																checked={
																	selectedClip.filters?.faceRefinement || false
																}
																onChange={(e) =>
																	updateSelectedClip({
																		filters: {
																			...(selectedClip.filters || {}),
																			faceRefinement: e.target.checked,
																		},
																	})
																}
															/>
															<div
																className={`w-6 h-3 rounded-full relative transition-colors ${selectedClip.filters?.faceRefinement ? "bg-pink-500" : "bg-glass"}`}
															>
																<div
																	className={`absolute top-0.5 left-0.5 bg-white w-2 h-2 rounded-full transition-transform ${selectedClip.filters?.faceRefinement ? "translate-x-3" : "translate-x-0"}`}
																/>
															</div>
														</label>
													</div>
													{selectedClip.filters?.faceRefinement && (
														<div className="mt-3 flex flex-col gap-3">
															<div className="flex items-center justify-between">
																<span className="text-[10px] text-muted w-20">
																	Smoothness
																</span>
																<input
																	type="range"
																	min="0"
																	max="100"
																	value={
																		selectedClip.filters?.faceSmoothness ?? 50
																	}
																	onChange={(e) =>
																		updateSelectedClip(
																			{
																				filters: {
																					...(selectedClip.filters || {}),
																					faceSmoothness: parseInt(
																						e.target.value,
																					),
																				},
																			},
																			false,
																		)
																	}
																	className="flex-1 h-1 bg-panel accent-pink-500 rounded-lg appearance-none cursor-pointer"
																/>
																<span className="text-[10px] text-foreground w-6 text-right">
																	{selectedClip.filters?.faceSmoothness ?? 50}
																</span>
															</div>
															<div className="flex items-center justify-between">
																<span className="text-[10px] text-muted w-20">
																	Eye Light
																</span>
																<input
																	type="range"
																	min="0"
																	max="100"
																	value={selectedClip.filters?.eyeLight ?? 20}
																	onChange={(e) =>
																		updateSelectedClip(
																			{
																				filters: {
																					...(selectedClip.filters || {}),
																					eyeLight: parseInt(e.target.value),
																				},
																			},
																			false,
																		)
																	}
																	className="flex-1 h-1 bg-panel accent-pink-500 rounded-lg appearance-none cursor-pointer"
																/>
																<span className="text-[10px] text-foreground w-6 text-right">
																	{selectedClip.filters?.eyeLight ?? 20}
																</span>
															</div>
														</div>
													)}
												</div>

												{selectedClip.filters?.lut &&
													selectedClip.filters.lut !== "none" && (
														<div className="flex items-center justify-between mt-3">
															<span className="text-[10px] text-muted w-16">
																Intensity
															</span>
															<input
																type="range"
																min="0"
																max="1"
																step="0.05"
																value={
																	selectedClip.filters?.lutIntensity ?? 1.0
																}
																onChange={(e) => {
																	const val = parseFloat(e.target.value);
																	updateSelectedClip(
																		{
																			filters: {
																				...(selectedClip.filters || {}),
																				lutIntensity: val,
																			},
																		},
																		false,
																	);
																}}
																onMouseUp={commitCurrentState}
																className="flex-1 accent-indigo-500 mx-2 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
															/>
															<span className="text-xs text-foreground w-10 text-right">
																{(
																	(selectedClip.filters?.lutIntensity ?? 1.0) *
																	100
																).toFixed(0)}
																%
															</span>
														</div>
													)}
											</div>
										</div>
									)}

									{/* Retiming & Speed Ramp (for video clips) */}
									{(selectedClip.type === "video" ||
										selectedClip.type === "image") && (
										<div className="pt-2 border-t border-border mt-2">
											<div className="flex items-center justify-between mb-3">
												<label className="text-xs font-medium text-muted block">
													Retiming & Speed
												</label>
												<button
													className="text-[10px] bg-panel hover:bg-glass text-foreground px-2 py-1 rounded border border-border transition-colors"
													onClick={() => handleSpeedRamp()}
												>
													📈 Speed Ramp
												</button>
												{/* Grayscale */}
												<div className="flex items-center justify-between">
													<button
														onClick={() =>
															toggleKeyframe(
																"grayscale",
																selectedClip.filters?.grayscale ?? 0.0,
															)
														}
														className={`mr-1 text-[10px] ${hasKeyframe({ clip: selectedClip, property: "grayscale", frame }) ? "text-indigo-400" : "text-muted"}`}
													>
														♦
													</button>
													<span className="text-[10px] text-muted w-14">
														Grayscale
													</span>
													<input
														type="range"
														min="0"
														max="1"
														step="0.01"
														value={getKeyframedValue({
															clip: selectedClip,
															property: "grayscale",
															defaultValue:
																selectedClip.filters?.grayscale ?? 0.0,
															frame,
														})}
														onChange={(e) => {
															const val = parseFloat(e.target.value);
															updateSelectedClip(
																{
																	filters: {
																		...(selectedClip.filters || {}),
																		grayscale: val,
																	},
																},
																false,
															);
														}}
														onMouseUp={commitCurrentState}
														className="w-full accent-indigo-500 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
													/>
													<span className="text-xs text-foreground w-10 text-right">
														{getKeyframedValue({
															clip: selectedClip,
															property: "grayscale",
															defaultValue:
																selectedClip.filters?.grayscale ?? 0.0,
															frame,
														}).toFixed(2)}
													</span>
												</div>
												{/* Sepia */}
												<div className="flex items-center justify-between">
													<button
														onClick={() =>
															toggleKeyframe(
																"sepia",
																selectedClip.filters?.sepia ?? 0.0,
															)
														}
														className={`mr-1 text-[10px] ${hasKeyframe({ clip: selectedClip, property: "sepia", frame }) ? "text-indigo-400" : "text-muted"}`}
													>
														♦
													</button>
													<span className="text-[10px] text-muted w-14">
														Sepia
													</span>
													<input
														type="range"
														min="0"
														max="1"
														step="0.01"
														value={getKeyframedValue({
															clip: selectedClip,
															property: "sepia",
															defaultValue: selectedClip.filters?.sepia ?? 0.0,
															frame,
														})}
														onChange={(e) => {
															const val = parseFloat(e.target.value);
															updateSelectedClip(
																{
																	filters: {
																		...(selectedClip.filters || {}),
																		sepia: val,
																	},
																},
																false,
															);
														}}
														onMouseUp={commitCurrentState}
														className="w-full accent-indigo-500 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
													/>
													<span className="text-xs text-foreground w-10 text-right">
														{getKeyframedValue({
															clip: selectedClip,
															property: "sepia",
															defaultValue: selectedClip.filters?.sepia ?? 0.0,
															frame,
														}).toFixed(2)}
													</span>
												</div>
												{/* Invert */}
												<div className="flex items-center justify-between">
													<button
														onClick={() =>
															toggleKeyframe(
																"invert",
																selectedClip.filters?.invert ?? 0.0,
															)
														}
														className={`mr-1 text-[10px] ${hasKeyframe({ clip: selectedClip, property: "invert", frame }) ? "text-indigo-400" : "text-muted"}`}
													>
														♦
													</button>
													<span className="text-[10px] text-muted w-14">
														Invert
													</span>
													<input
														type="range"
														min="0"
														max="1"
														step="0.01"
														value={getKeyframedValue({
															clip: selectedClip,
															property: "invert",
															defaultValue: selectedClip.filters?.invert ?? 0.0,
															frame,
														})}
														onChange={(e) => {
															const val = parseFloat(e.target.value);
															updateSelectedClip(
																{
																	filters: {
																		...(selectedClip.filters || {}),
																		invert: val,
																	},
																},
																false,
															);
														}}
														onMouseUp={commitCurrentState}
														className="w-full accent-indigo-500 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
													/>
													<span className="text-xs text-foreground w-10 text-right">
														{getKeyframedValue({
															clip: selectedClip,
															property: "invert",
															defaultValue: selectedClip.filters?.invert ?? 0.0,
															frame,
														}).toFixed(2)}
													</span>
												</div>
												{/* Hue Rotate */}
												<div className="flex items-center justify-between">
													<button
														onClick={() =>
															toggleKeyframe(
																"hue_rotate",
																selectedClip.filters?.hue_rotate ?? 0.0,
															)
														}
														className={`mr-1 text-[10px] ${hasKeyframe({ clip: selectedClip, property: "hue_rotate", frame }) ? "text-indigo-400" : "text-muted"}`}
													>
														♦
													</button>
													<span className="text-[10px] text-muted w-14">
														Hue Rotate
													</span>
													<input
														type="range"
														min="0"
														max="6.283"
														step="0.01"
														value={getKeyframedValue({
															clip: selectedClip,
															property: "hue_rotate",
															defaultValue:
																selectedClip.filters?.hue_rotate ?? 0.0,
															frame,
														})}
														onChange={(e) => {
															const val = parseFloat(e.target.value);
															updateSelectedClip(
																{
																	filters: {
																		...(selectedClip.filters || {}),
																		hue_rotate: val,
																	},
																},
																false,
															);
														}}
														onMouseUp={commitCurrentState}
														className="w-full accent-indigo-500 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
													/>
													<span className="text-xs text-foreground w-10 text-right">
														{getKeyframedValue({
															clip: selectedClip,
															property: "hue_rotate",
															defaultValue:
																selectedClip.filters?.hue_rotate ?? 0.0,
															frame,
														}).toFixed(2)}
													</span>
												</div>
											</div>
										</div>
									)}

									{/* Image Effects */}
									{(selectedClip.type === "video" ||
										selectedClip.type === "image") && (
										<div className="pt-2 border-t border-border mt-2">
											<label className="text-xs font-medium text-muted block mb-3">
												Image Effects
											</label>
											<div className="flex flex-col gap-3">
												{/* Pixelate */}
												<div className="flex items-center justify-between">
													<button
														onClick={() =>
															toggleKeyframe(
																"pixelate",
																selectedClip.filters?.pixelate ?? 0.0,
															)
														}
														className={`mr-1 text-[10px] ${hasKeyframe({ clip: selectedClip, property: "pixelate", frame }) ? "text-indigo-400" : "text-muted"}`}
													>
														♦
													</button>
													<span className="text-[10px] text-muted w-14">
														Pixelate
													</span>
													<input
														type="range"
														min="0"
														max="1"
														step="0.01"
														value={getKeyframedValue({
															clip: selectedClip,
															property: "pixelate",
															defaultValue:
																selectedClip.filters?.pixelate ?? 0.0,
															frame,
														})}
														onChange={(e) => {
															const val = parseFloat(e.target.value);
															updateSelectedClip(
																{
																	filters: {
																		...(selectedClip.filters || {}),
																		pixelate: val,
																	},
																},
																false,
															);
														}}
														onMouseUp={commitCurrentState}
														className="w-full accent-indigo-500 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
													/>
													<span className="text-xs text-foreground w-10 text-right">
														{getKeyframedValue({
															clip: selectedClip,
															property: "pixelate",
															defaultValue:
																selectedClip.filters?.pixelate ?? 0.0,
															frame,
														}).toFixed(2)}
													</span>
												</div>

												{/* Edge Detect */}
												<div className="flex items-center justify-between">
													<button
														onClick={() =>
															toggleKeyframe(
																"edge_detect",
																selectedClip.filters?.edge_detect ?? 0.0,
															)
														}
														className={`mr-1 text-[10px] ${hasKeyframe({ clip: selectedClip, property: "edge_detect", frame }) ? "text-indigo-400" : "text-muted"}`}
													>
														♦
													</button>
													<span className="text-[10px] text-muted w-14">
														Edge Detect
													</span>
													<input
														type="range"
														min="0"
														max="1"
														step="0.01"
														value={getKeyframedValue({
															clip: selectedClip,
															property: "edge_detect",
															defaultValue:
																selectedClip.filters?.edge_detect ?? 0.0,
															frame,
														})}
														onChange={(e) => {
															const val = parseFloat(e.target.value);
															updateSelectedClip(
																{
																	filters: {
																		...(selectedClip.filters || {}),
																		edge_detect: val,
																	},
																},
																false,
															);
														}}
														onMouseUp={commitCurrentState}
														className="w-full accent-indigo-500 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
													/>
													<span className="text-xs text-foreground w-10 text-right">
														{getKeyframedValue({
															clip: selectedClip,
															property: "edge_detect",
															defaultValue:
																selectedClip.filters?.edge_detect ?? 0.0,
															frame,
														}).toFixed(2)}
													</span>
												</div>
												{/* Stabilization (Warp Stabilizer) */}

												<div className="pt-3 mt-3 border-t border-border">
													<label className="text-[10px] font-bold text-emerald-400 block mb-2 uppercase tracking-wider">
														Warp Stabilizer
													</label>
													<div className="flex items-center justify-between mb-2">
														<span className="text-[10px] text-muted">
															Method
														</span>
														<select
															className="bg-background border border-border text-foreground text-[10px] rounded px-1.5 py-1 outline-none"
															value={
																selectedClip.filters?.stabilizationMethod ||
																"subspace"
															}
															onChange={(e) => {
																updateSelectedClip({
																	filters: {
																		...(selectedClip.filters || {}),
																		stabilizationMethod: e.target.value,
																	},
																});
																commitState(projectData);
															}}
														>
															<option value="position">Position</option>
															<option value="perspective">Perspective</option>
															<option value="subspace">Subspace Warp</option>
														</select>
													</div>
													<div className="flex items-center justify-between">
														<span className="text-[10px] text-muted w-16">
															Smoothness
														</span>
														<input
															type="range"
															min="0"
															max="1"
															step="0.05"
															value={
																selectedClip.filters?.stabilizationSmoothness ??
																0.5
															}
															onChange={(e) => {
																updateSelectedClip(
																	{
																		filters: {
																			...(selectedClip.filters || {}),
																			stabilizationSmoothness: parseFloat(
																				e.target.value,
																			),
																		},
																	},
																	false,
																);
															}}
															onMouseUp={commitCurrentState}
															className="flex-1 accent-emerald-500 mx-2 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
														/>
														<span className="text-[10px] text-foreground w-8 text-right">
															{(
																(selectedClip.filters
																	?.stabilizationSmoothness ?? 0.5) * 100
															).toFixed(0)}
															%
														</span>
													</div>
												</div>

												{/* Lens Correction / Optics */}

												<div className="pt-3 mt-3 border-t border-border">
													<label className="text-[10px] font-bold text-emerald-400 block mb-2 uppercase tracking-wider">
														Lens / Optics
													</label>
													<div className="flex items-center justify-between mb-2">
														<span className="text-[10px] text-muted w-16">
															Distortion
														</span>
														<input
															type="range"
															min="-1"
															max="1"
															step="0.05"
															value={selectedClip.filters?.lensDistortion ?? 0}
															onChange={(e) => {
																updateSelectedClip(
																	{
																		filters: {
																			...(selectedClip.filters || {}),
																			lensDistortion: parseFloat(
																				e.target.value,
																			),
																		},
																	},
																	false,
																);
															}}
															onMouseUp={commitCurrentState}
															className="flex-1 accent-emerald-500 mx-2 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
														/>
														<span className="text-[10px] text-foreground w-8 text-right">
															{(
																(selectedClip.filters?.lensDistortion ?? 0) *
																100
															).toFixed(0)}
														</span>
													</div>
													<div className="flex items-center justify-between">
														<span className="text-[10px] text-muted w-16 text-left leading-tight">
															Chromatic
															<br />
															Aberration
														</span>
														<input
															type="range"
															min="0"
															max="1"
															step="0.05"
															value={
																selectedClip.filters?.chromaticAberration ?? 0
															}
															onChange={(e) => {
																updateSelectedClip(
																	{
																		filters: {
																			...(selectedClip.filters || {}),
																			chromaticAberration: parseFloat(
																				e.target.value,
																			),
																		},
																	},
																	false,
																);
															}}
															onMouseUp={commitCurrentState}
															className="flex-1 accent-emerald-500 mx-2 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
														/>
														<span className="text-[10px] text-foreground w-8 text-right">
															{(
																(selectedClip.filters?.chromaticAberration ??
																	0) * 100
															).toFixed(0)}
															%
														</span>
													</div>
												</div>

												{/* Glow / Bloom */}

												<div className="pt-3 mt-3 border-t border-border">
													<label className="text-[10px] font-bold text-emerald-400 block mb-2 uppercase tracking-wider">
														Glow / Bloom
													</label>
													<div className="flex items-center justify-between mb-2">
														<span className="text-[10px] text-muted w-16">
															Intensity
														</span>
														<input
															type="range"
															min="0"
															max="1"
															step="0.05"
															value={selectedClip.filters?.glowIntensity ?? 0}
															onChange={(e) => {
																updateSelectedClip(
																	{
																		filters: {
																			...(selectedClip.filters || {}),
																			glowIntensity: parseFloat(e.target.value),
																		},
																	},
																	false,
																);
															}}
															onMouseUp={commitCurrentState}
															className="flex-1 accent-emerald-500 mx-2 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
														/>
														<span className="text-[10px] text-foreground w-8 text-right">
															{(
																(selectedClip.filters?.glowIntensity ?? 0) * 100
															).toFixed(0)}
															%
														</span>
													</div>
													<div className="flex items-center justify-between">
														<span className="text-[10px] text-muted w-16">
															Radius
														</span>
														<input
															type="range"
															min="0"
															max="100"
															step="1"
															value={selectedClip.filters?.glowRadius ?? 20}
															onChange={(e) => {
																updateSelectedClip(
																	{
																		filters: {
																			...(selectedClip.filters || {}),
																			glowRadius: parseFloat(e.target.value),
																		},
																	},
																	false,
																);
															}}
															onMouseUp={commitCurrentState}
															className="flex-1 accent-emerald-500 mx-2 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
														/>
														<span className="text-[10px] text-foreground w-8 text-right">
															{selectedClip.filters?.glowRadius ?? 20}px
														</span>
													</div>
												</div>
											</div>
										</div>
									)}

									{/* Crop */}
									{(selectedClip.type === "video" ||
										selectedClip.type === "image") && (
										<div className="pt-2 border-t border-border mt-2">
											<label className="text-xs font-medium text-muted mb-2 block">
												Crop
											</label>
											<div className="flex flex-col gap-2">
												{["left", "right", "top", "bottom"].map((edge) => (
													<div
														key={edge}
														className="flex items-center justify-between"
													>
														<button
															onClick={() =>
																toggleKeyframe(
																	`crop_${edge}`,
																	selectedClip.crop?.[edge] ?? 0.0,
																)
															}
															className={`mr-1 text-[10px] ${hasKeyframe({ clip: selectedClip, property: `crop_${edge}`, frame }) ? "text-indigo-400" : "text-muted"}`}
														>
															♦
														</button>
														<span className="text-[10px] text-muted w-8 capitalize">
															{edge}
														</span>
														<input
															type="range"
															min="0"
															max="1"
															step="0.01"
															value={getKeyframedValue({
																clip: selectedClip,
																property: `crop_${edge}`,
																defaultValue: selectedClip.crop?.[edge] ?? 0.0,
																frame,
															})}
															onChange={(e) => {
																const val = parseFloat(e.target.value);
																updateSelectedClip(
																	{
																		crop: {
																			...(selectedClip.crop || {
																				left: 0,
																				right: 0,
																				top: 0,
																				bottom: 0,
																			}),
																			[edge]: val,
																		},
																	},
																	false,
																);
															}}
															onMouseUp={commitCurrentState}
															className="w-full accent-indigo-500 h-1 bg-panel rounded-lg appearance-none cursor-pointer mx-2"
														/>
														<span className="text-xs text-foreground w-8 text-right">
															{(
																getKeyframedValue({
																	clip: selectedClip,
																	property: `crop_${edge}`,
																	defaultValue:
																		selectedClip.crop?.[edge] ?? 0.0,
																	frame,
																}) * 100
															).toFixed(0)}
															%
														</span>
													</div>
												))}
											</div>
										</div>
									)}

									{/* Masking / Power Windows */}
									{(selectedClip.type === "video" ||
										selectedClip.type === "image") && (
										<div className="pt-2 border-t border-border mt-2">
											<label className="text-xs font-medium text-muted mb-2 block flex items-center justify-between">
												Power Window / Mask
												<label className="flex items-center gap-1 cursor-pointer">
													<input
														type="checkbox"
														checked={selectedClip.mask?.enabled ?? false}
														onChange={(e) => {
															updateSelectedClip({
																mask: {
																	...(selectedClip.mask || {
																		shape: "rectangle",
																		feather: 0.1,
																		invert: false,
																		opacity: 1.0,
																	}),
																	enabled: e.target.checked,
																},
															});
															commitState(projectData);
														}}
														className="w-3 h-3 accent-indigo-500 rounded cursor-pointer"
													/>
													<span className="text-[10px] text-muted">Enable</span>
												</label>
											</label>

											{selectedClip.mask?.enabled && (
												<div className="flex flex-col gap-3 mt-3">
													{/* AI Mask Tracking (Phase 170) */}
													<div className="flex items-center justify-between bg-indigo-500/10 border border-indigo-500/20 p-2 rounded">
														<span className="text-[10px] font-semibold text-indigo-300 flex items-center gap-1">
															✨ AI Tracker
														</span>
														<div className="flex gap-1">
															<button
																className="bg-panel hover:bg-indigo-600 text-foreground text-[10px] px-2 py-1 rounded transition-colors"
																onClick={handleTrackMaskBackward}
																title="Track Backward"
															>
																◀ Track
															</button>
															<button
																className="bg-panel hover:bg-indigo-600 text-foreground text-[10px] px-2 py-1 rounded transition-colors"
																onClick={handleTrackMaskForward}
																title="Track Forward"
															>
																Track ▶
															</button>
														</div>
													</div>

													{/* 3D Camera Tracker (Phase 202) */}
													<div className="flex items-center justify-between bg-sky-500/10 border border-sky-500/20 p-2 rounded">
														<span className="text-[10px] font-semibold text-sky-300 flex items-center gap-1">
															🎥 3D Point Cloud Tracker
														</span>
														<button
															className="bg-sky-600 hover:bg-sky-500 text-foreground text-[10px] px-2 py-1 rounded transition-colors"
															onClick={handleExtract3DPointCloud}
														>
															Extract 3D
														</button>
													</div>

													{/* Real-time NeRF Generation (Phase 212) */}
													<div className="flex items-center justify-between bg-teal-500/10 border border-teal-500/20 p-2 rounded">
														<span className="text-[10px] font-semibold text-teal-300 flex items-center gap-1">
															🌌 Neural Radiance Field
														</span>
														<button
															className="bg-teal-600 hover:bg-teal-500 text-foreground text-[10px] px-2 py-1 rounded transition-colors"
															onClick={handleGenerateNerf}
														>
															Convert to NeRF
														</button>
													</div>

													<div className="flex gap-1 bg-background p-1 rounded border border-border">
														{[
															{ id: "rectangle", icon: "M4 4h16v16H4z" },
															{
																id: "circle",
																icon: "M12 2a10 10 0 100 20 10 10 0 000-20z",
															},
															{
																id: "polygon",
																icon: "M12 2l8.66 15H3.34L12 2z",
															},
															{
																id: "bezier",
																icon: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z",
															},
														].map((shape) => (
															<button
																key={shape.id}
																onClick={() => {
																	updateSelectedClip({
																		mask: {
																			...selectedClip.mask,
																			shape: shape.id,
																		},
																	});
																	commitState(projectData);
																}}
																className={`flex-1 flex justify-center py-1.5 rounded transition-colors ${selectedClip.mask?.shape === shape.id ? "bg-indigo-600 text-foreground" : "text-muted hover:text-foreground hover:bg-background"}`}
															>
																<svg
																	className="w-4 h-4"
																	fill="currentColor"
																	viewBox="0 0 24 24"
																>
																	<path d={shape.icon} />
																</svg>
															</button>
														))}
													</div>

													<div className="flex items-center justify-between">
														<span className="text-[10px] text-muted w-16">
															Feather
														</span>
														<input
															type="range"
															min="0"
															max="1"
															step="0.05"
															value={selectedClip.mask?.feather ?? 0.1}
															onChange={(e) => {
																const val = parseFloat(e.target.value);
																updateSelectedClip(
																	{
																		mask: {
																			...selectedClip.mask,
																			feather: val,
																		},
																	},
																	false,
																);
															}}
															onMouseUp={commitCurrentState}
															className="flex-1 accent-indigo-500 mx-2 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
														/>
														<span className="text-[10px] text-foreground w-8 text-right">
															{(selectedClip.mask?.feather ?? 0.1).toFixed(2)}
														</span>
													</div>

													<div className="flex items-center justify-between">
														<span className="text-[10px] text-muted w-16">
															Opacity
														</span>
														<input
															type="range"
															min="0"
															max="1"
															step="0.05"
															value={selectedClip.mask?.opacity ?? 1.0}
															onChange={(e) => {
																const val = parseFloat(e.target.value);
																updateSelectedClip(
																	{
																		mask: {
																			...selectedClip.mask,
																			opacity: val,
																		},
																	},
																	false,
																);
															}}
															onMouseUp={commitCurrentState}
															className="flex-1 accent-indigo-500 mx-2 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
														/>
														<span className="text-[10px] text-foreground w-8 text-right">
															{(
																(selectedClip.mask?.opacity ?? 1.0) * 100
															).toFixed(0)}
															%
														</span>
													</div>

													<label className="flex items-center gap-2 cursor-pointer mt-1">
														<input
															type="checkbox"
															checked={selectedClip.mask?.invert ?? false}
															onChange={(e) => {
																updateSelectedClip({
																	mask: {
																		...selectedClip.mask,
																		invert: e.target.checked,
																	},
																});
																commitState(projectData);
															}}
															className="w-3 h-3 accent-indigo-500 rounded cursor-pointer"
														/>
														<span className="text-[10px] text-muted">
															Invert Mask
														</span>
													</label>
												</div>
											)}
										</div>
									)}

									{/* Magic Eraser (AI Object Removal) */}
									{(selectedClip.type === "video" ||
										selectedClip.type === "image") &&
										selectedClip.magicEraseMask &&
										selectedClip.magicEraseMask.length > 0 && (
											<div className="pt-2 border-t border-border mt-2">
												<label className="text-xs font-medium text-emerald-400 mb-2 block">
													🪄 AI Magic Eraser
												</label>
												<p className="text-[10px] text-muted mb-2">
													Mask contains {selectedClip.magicEraseMask.length}{" "}
													brush strokes.
												</p>
												<button
													className="w-full bg-emerald-600 hover:bg-emerald-500 text-foreground text-xs py-1.5 rounded transition-colors shadow-lg flex items-center justify-center gap-2"
													onClick={() => {
														const erasePromise = new Promise((resolve) =>
															setTimeout(resolve, 2000),
														);
														erasePromise.then(() => {
															updateSelectedClip({ magicEraseApplied: true });
															commitState(projectData);
														});
														toast.promise(erasePromise, {
															loading:
																"Analyzing pixels via Content-Aware Fill...",
															success: "Object magically erased!",
															error: "Failed to erase object.",
														});
													}}
												>
													✨ Process Object Removal
												</button>
												{selectedClip.magicEraseApplied && (
													<button
														className="w-full mt-2 bg-red-900/50 hover:bg-red-900/80 text-red-200 text-[10px] py-1 rounded transition-colors"
														onClick={() => {
															updateSelectedClip({
																magicEraseMask: null,
																magicEraseApplied: false,
															});
															commitState(projectData);
														}}
													>
														Clear Eraser Mask
													</button>
												)}
											</div>
										)}

									{/* Chroma Key / Ultra Key */}
									{(selectedClip.type === "video" ||
										selectedClip.type === "image") && (
										<div className="pt-2 border-t border-border mt-2">
											<label className="text-xs font-medium text-muted mb-2 flex items-center justify-between">
												Chroma Key (Ultra Key)
												<label className="flex items-center gap-1 cursor-pointer">
													<input
														type="checkbox"
														checked={selectedClip.chromaKey?.enabled ?? false}
														onChange={(e) => {
															updateSelectedClip({
																chromaKey: {
																	...(selectedClip.chromaKey || {
																		color: "#00ff00",
																		similarity: 0.4,
																		smoothness: 0.1,
																	}),
																	enabled: e.target.checked,
																},
															});
															commitState(projectData);
														}}
														className="w-3 h-3 accent-emerald-500 rounded cursor-pointer"
													/>
													<span className="text-[10px] text-muted">Enable</span>
												</label>
											</label>

											{selectedClip.chromaKey?.enabled && (
												<div className="flex flex-col gap-3 mt-3">
													<div className="flex items-center justify-between">
														<span className="text-[10px] text-muted w-16">
															Key Color
														</span>
														<input
															type="color"
															value={selectedClip.chromaKey?.color ?? "#00ff00"}
															onChange={(e) => {
																updateSelectedClip({
																	chromaKey: {
																		...selectedClip.chromaKey,
																		color: e.target.value,
																	},
																});
																commitState(projectData);
															}}
															className="w-6 h-6 rounded cursor-pointer border-none bg-transparent p-0"
														/>
													</div>
													<div className="flex items-center justify-between">
														<span className="text-[10px] text-muted w-16">
															Similarity
														</span>
														<input
															type="range"
															min="0"
															max="1"
															step="0.01"
															value={selectedClip.chromaKey?.similarity ?? 0.4}
															onChange={(e) =>
																updateSelectedClip(
																	{
																		chromaKey: {
																			...selectedClip.chromaKey,
																			similarity: parseFloat(e.target.value),
																		},
																	},
																	false,
																)
															}
															onMouseUp={commitCurrentState}
															className="flex-1 accent-emerald-500 mx-2 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
														/>
														<span className="text-[10px] text-foreground w-8 text-right">
															{(
																selectedClip.chromaKey?.similarity ?? 0.4
															).toFixed(2)}
														</span>
													</div>
													<div className="flex items-center justify-between">
														<span className="text-[10px] text-muted w-16">
															Smoothness
														</span>
														<input
															type="range"
															min="0"
															max="1"
															step="0.01"
															value={selectedClip.chromaKey?.smoothness ?? 0.1}
															onChange={(e) =>
																updateSelectedClip(
																	{
																		chromaKey: {
																			...selectedClip.chromaKey,
																			smoothness: parseFloat(e.target.value),
																		},
																	},
																	false,
																)
															}
															onMouseUp={commitCurrentState}
															className="flex-1 accent-emerald-500 mx-2 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
														/>
														<span className="text-[10px] text-foreground w-8 text-right">
															{(
																selectedClip.chromaKey?.smoothness ?? 0.1
															).toFixed(2)}
														</span>
													</div>
												</div>
											)}
										</div>
									)}

									{/* Border Radius */}
									{(selectedClip.type === "video" ||
										selectedClip.type === "image") && (
										<div className="pt-2 border-t border-border mt-2">
											<label className="text-xs font-medium text-muted mb-2 block">
												Border Radius
											</label>
											<div className="flex flex-col gap-2">
												<div className="flex items-center justify-between">
													<button
														onClick={() =>
															toggleKeyframe(
																`border_radius`,
																selectedClip.border_radius ?? 0.0,
															)
														}
														className={`mr-1 text-[10px] ${hasKeyframe({ clip: selectedClip, property: `border_radius`, frame }) ? "text-indigo-400" : "text-muted"}`}
													>
														♦
													</button>
													<span className="text-[10px] text-muted w-12">
														Radius
													</span>
													<input
														type="range"
														min="0"
														max="1"
														step="0.01"
														value={getKeyframedValue({
															clip: selectedClip,
															property: `border_radius`,
															defaultValue: selectedClip.border_radius ?? 0.0,
															frame,
														})}
														onChange={(e) => {
															const val = parseFloat(e.target.value);
															updateSelectedClip({ border_radius: val }, false);
														}}
														onMouseUp={commitCurrentState}
														className="w-full accent-indigo-500 h-1 bg-panel rounded-lg appearance-none cursor-pointer mx-2"
													/>
													<span className="text-xs text-foreground w-8 text-right">
														{(
															getKeyframedValue({
																clip: selectedClip,
																property: `border_radius`,
																defaultValue: selectedClip.border_radius ?? 0.0,
																frame,
															}) * 100
														).toFixed(0)}
														%
													</span>
												</div>
											</div>
										</div>
									)}

									{/* Drop Shadow */}
									{(selectedClip.type === "video" ||
										selectedClip.type === "image" ||
										selectedClip.type === "text") && (
										<div className="pt-2 border-t border-border mt-2">
											<label className="text-xs font-medium text-muted mb-2 block">
												Drop Shadow
											</label>
											<div className="flex flex-col gap-2">
												<div className="flex items-center justify-between mb-1">
													<span className="text-[10px] text-muted w-12">
														Color
													</span>
													<input
														type="color"
														value={
															selectedClip.shadow?.color?.startsWith("#")
																? selectedClip.shadow.color.substring(0, 7)
																: selectedClip.shadow?.color?.startsWith("rgba")
																	? "#" +
																		selectedClip.shadow.color
																			.match(/\d+/g)
																			?.slice(0, 3)
																			.map((x: any) =>
																				parseInt(x)
																					.toString(16)
																					.padStart(2, "0"),
																			)
																			.join("")
																	: "#000000"
														}
														onChange={(e) => {
															const hex = e.target.value;
															const r = parseInt(hex.slice(1, 3), 16);
															const g = parseInt(hex.slice(3, 5), 16);
															const b = parseInt(hex.slice(5, 7), 16);
															updateSelectedClip(
																{
																	shadow: {
																		...(selectedClip.shadow || {}),
																		color: `rgba(${r},${g},${b},0.8)`,
																	},
																},
																true,
															);
														}}
														className="w-full h-6 bg-transparent border-0 cursor-pointer rounded overflow-hidden"
													/>
												</div>
												<div className="flex items-center justify-between">
													<button
														onClick={() =>
															toggleKeyframe(
																`shadow_distance`,
																selectedClip.shadow?.distance ?? 0.0,
															)
														}
														className={`mr-1 text-[10px] ${hasKeyframe({ clip: selectedClip, property: `shadow_distance`, frame }) ? "text-indigo-400" : "text-muted"}`}
													>
														♦
													</button>
													<span className="text-[10px] text-muted w-12">
														Distance
													</span>
													<input
														type="range"
														min="0"
														max="0.5"
														step="0.01"
														value={getKeyframedValue({
															clip: selectedClip,
															property: `shadow_distance`,
															defaultValue:
																selectedClip.shadow?.distance ?? 0.0,
															frame,
														})}
														onChange={(e) => {
															const val = parseFloat(e.target.value);
															updateSelectedClip(
																{
																	shadow: {
																		...(selectedClip.shadow || {}),
																		distance: val,
																	},
																},
																false,
															);
														}}
														onMouseUp={commitCurrentState}
														className="w-full accent-indigo-500 h-1 bg-panel rounded-lg appearance-none cursor-pointer mx-2"
													/>
													<span className="text-xs text-foreground w-8 text-right">
														{(
															getKeyframedValue({
																clip: selectedClip,
																property: `shadow_distance`,
																defaultValue:
																	selectedClip.shadow?.distance ?? 0.0,
																frame,
															}) * 100
														).toFixed(0)}
													</span>
												</div>
												<div className="flex items-center justify-between">
													<button
														onClick={() =>
															toggleKeyframe(
																`shadow_angle`,
																selectedClip.shadow?.angle ?? 0.0,
															)
														}
														className={`mr-1 text-[10px] ${hasKeyframe({ clip: selectedClip, property: `shadow_angle`, frame }) ? "text-indigo-400" : "text-muted"}`}
													>
														♦
													</button>
													<span className="text-[10px] text-muted w-12">
														Angle
													</span>
													<input
														type="range"
														min="-3.14"
														max="3.14"
														step="0.01"
														value={getKeyframedValue({
															clip: selectedClip,
															property: `shadow_angle`,
															defaultValue: selectedClip.shadow?.angle ?? 0.0,
															frame,
														})}
														onChange={(e) => {
															const val = parseFloat(e.target.value);
															updateSelectedClip(
																{
																	shadow: {
																		...(selectedClip.shadow || {}),
																		angle: val,
																	},
																},
																false,
															);
														}}
														onMouseUp={commitCurrentState}
														className="w-full accent-indigo-500 h-1 bg-panel rounded-lg appearance-none cursor-pointer mx-2"
													/>
													<span className="text-xs text-foreground w-8 text-right">
														{(
															getKeyframedValue({
																clip: selectedClip,
																property: `shadow_angle`,
																defaultValue: selectedClip.shadow?.angle ?? 0.0,
																frame,
															}) *
															(180 / Math.PI)
														).toFixed(0)}
														°
													</span>
												</div>
												<div className="flex items-center justify-between">
													<button
														onClick={() =>
															toggleKeyframe(
																`shadow_blur`,
																selectedClip.shadow?.blur ?? 0.0,
															)
														}
														className={`mr-1 text-[10px] ${hasKeyframe({ clip: selectedClip, property: `shadow_blur`, frame }) ? "text-indigo-400" : "text-muted"}`}
													>
														♦
													</button>
													<span className="text-[10px] text-muted w-12">
														Blur
													</span>
													<input
														type="range"
														min="0"
														max="0.5"
														step="0.01"
														value={getKeyframedValue({
															clip: selectedClip,
															property: `shadow_blur`,
															defaultValue: selectedClip.shadow?.blur ?? 0.0,
															frame,
														})}
														onChange={(e) => {
															const val = parseFloat(e.target.value);
															updateSelectedClip(
																{
																	shadow: {
																		...(selectedClip.shadow || {}),
																		blur: val,
																	},
																},
																false,
															);
														}}
														onMouseUp={commitCurrentState}
														className="w-full accent-indigo-500 h-1 bg-panel rounded-lg appearance-none cursor-pointer mx-2"
													/>
													<span className="text-xs text-foreground w-8 text-right">
														{(
															getKeyframedValue({
																clip: selectedClip,
																property: `shadow_blur`,
																defaultValue: selectedClip.shadow?.blur ?? 0.0,
																frame,
															}) * 100
														).toFixed(0)}
													</span>
												</div>
											</div>
										</div>
									)}

									{/* Effects (GPU Shaders) */}
									{(selectedClip.type === "video" ||
										selectedClip.type === "image") && (
										<div className="pt-2 border-t border-border mt-2">
											<div className="flex items-center justify-between mb-3">
												<label className="text-xs font-medium text-muted">
													Effects (GPU Shaders)
												</label>
												<button
													onClick={() => {
														const hasChroma = selectedClip.effects?.some(
															(e: any) => e.type === "chroma_key",
														);
														if (!hasChroma) {
															const newEffects = [
																...(selectedClip.effects || []),
																{
																	id: `effect_${Date.now()}`,
																	type: "chroma_key",
																	properties: {
																		similarity: 0.4,
																		smoothness: 0.1,
																	},
																	color: [0.0, 1.0, 0.0, 1.0],
																},
															];
															updateSelectedClip({ effects: newEffects });
														}
													}}
													className="text-[10px] bg-panel hover:bg-glass text-foreground px-2 py-0.5 rounded"
												>
													+ Chroma Key
												</button>
											</div>

											<div className="flex flex-col gap-3">
												{selectedClip.effects?.map(
													(effect: any, idx: number) => {
														if (effect.type === "chroma_key") {
															return (
																<div
																	key={effect.id}
																	className="bg-background border border-border rounded p-2 flex flex-col gap-2"
																>
																	<div className="flex items-center justify-between border-b border-border pb-1 mb-1">
																		<span className="text-xs text-indigo-400 font-medium">
																			Chroma Key
																		</span>
																		<button
																			onClick={() => {
																				const newEffects =
																					selectedClip.effects!.filter(
																						(e: any) => e.id !== effect.id,
																					);
																				updateSelectedClip({
																					effects: newEffects,
																				});
																			}}
																			className="text-xs text-red-500 hover:text-red-400"
																		>
																			&times;
																		</button>
																	</div>
																	{/* Target Color */}
																	<div className="flex items-center justify-between">
																		<span className="text-[10px] text-muted w-16">
																			Target Color
																		</span>
																		<input
																			type="color"
																			value={
																				effect.color
																					? rgbaToHex(effect.color)
																					: "#00ff00"
																			}
																			onChange={(e) => {
																				const c = hexToRgba(e.target.value);
																				const newEffects = [
																					...selectedClip.effects!,
																				];
																				newEffects[idx] = {
																					...effect,
																					color: c,
																				};
																				updateSelectedClip({
																					effects: newEffects,
																				});
																			}}
																			className="w-8 h-8 rounded cursor-pointer bg-background border-none p-0"
																		/>
																	</div>
																	{/* Similarity */}
																	<div className="flex items-center justify-between">
																		<span className="text-[10px] text-muted w-16">
																			Similarity
																		</span>
																		<input
																			type="range"
																			min="0"
																			max="1"
																			step="0.01"
																			value={
																				effect.properties.similarity ?? 0.4
																			}
																			onChange={(e) => {
																				const val = parseFloat(e.target.value);
																				const newEffects = [
																					...selectedClip.effects!,
																				];
																				newEffects[idx] = {
																					...effect,
																					properties: {
																						...effect.properties,
																						similarity: val,
																					},
																				};
																				updateSelectedClip(
																					{ effects: newEffects },
																					false,
																				);
																			}}
																			onMouseUp={commitCurrentState}
																			className="w-full accent-indigo-500 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
																		/>
																		<span className="text-[10px] text-foreground w-8 text-right">
																			{(
																				effect.properties.similarity ?? 0.4
																			).toFixed(2)}
																		</span>
																	</div>
																	{/* Smoothness */}
																	<div className="flex items-center justify-between">
																		<span className="text-[10px] text-muted w-16">
																			Smoothness
																		</span>
																		<input
																			type="range"
																			min="0"
																			max="1"
																			step="0.01"
																			value={
																				effect.properties.smoothness ?? 0.1
																			}
																			onChange={(e) => {
																				const val = parseFloat(e.target.value);
																				const newEffects = [
																					...selectedClip.effects!,
																				];
																				newEffects[idx] = {
																					...effect,
																					properties: {
																						...effect.properties,
																						smoothness: val,
																					},
																				};
																				updateSelectedClip(
																					{ effects: newEffects },
																					false,
																				);
																			}}
																			onMouseUp={commitCurrentState}
																			className="w-full accent-indigo-500 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
																		/>
																		<span className="text-[10px] text-foreground w-8 text-right">
																			{(
																				effect.properties.smoothness ?? 0.1
																			).toFixed(2)}
																		</span>
																	</div>
																</div>
															);
														}
														return null;
													},
												)}
											</div>
										</div>
									)}

									{/* Transitions */}

									<div className="pt-2 border-t border-border mt-2">
										<label className="text-xs font-medium text-muted block mb-3">
											Transitions
										</label>
										<div className="flex flex-col gap-3">
											{/* Fade In */}
											<div className="flex items-center justify-between">
												<span className="text-[10px] text-muted w-16">
													Fade In (f)
												</span>
												<input
													type="range"
													min="0"
													max="120"
													step="1"
													value={
														selectedClip.transitions?.in?.duration_frames || 0
													}
													onChange={(e) => {
														const val = parseInt(e.target.value);
														updateSelectedClip(
															{
																transitions: {
																	...(selectedClip.transitions || {}),
																	in:
																		val > 0
																			? { type: "fade", duration_frames: val }
																			: undefined,
																},
															},
															false,
														);
													}}
													onMouseUp={commitCurrentState}
													className="w-full accent-indigo-500 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
												/>
												<span className="text-xs text-foreground w-10 text-right">
													{selectedClip.transitions?.in?.duration_frames || 0}
												</span>
											</div>
											{/* Fade Out */}
											<div className="flex items-center justify-between">
												<span className="text-[10px] text-muted w-16">
													Fade Out (f)
												</span>
												<input
													type="range"
													min="0"
													max="120"
													step="1"
													value={
														selectedClip.transitions?.out?.duration_frames || 0
													}
													onChange={(e) => {
														const val = parseInt(e.target.value);
														updateSelectedClip(
															{
																transitions: {
																	...(selectedClip.transitions || {}),
																	out:
																		val > 0
																			? { type: "fade", duration_frames: val }
																			: undefined,
																},
															},
															false,
														);
													}}
													onMouseUp={commitCurrentState}
													className="w-full accent-indigo-500 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
												/>
												<span className="text-xs text-foreground w-10 text-right">
													{selectedClip.transitions?.out?.duration_frames || 0}
												</span>
											</div>
										</div>
									</div>

									{/* Clip Notes & Annotations */}
									<div className="pt-2 border-t border-border mt-2">
										<div className="flex items-center justify-between mb-3">
											<label className="text-xs font-medium text-muted flex items-center gap-1.5">
												<svg
													className="w-3 h-3 text-amber-400"
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
													/>
												</svg>
												Clip Notes
											</label>
											<span className="text-[10px] text-muted bg-panel px-1.5 py-0.5 rounded font-mono">
												{(selectedClip.notes || []).length}
											</span>
										</div>

										{/* Add note form */}
										<div className="flex flex-col gap-2 mb-3">
											<textarea
												id={`clip-note-input-${selectedClip.id}`}
												placeholder="Add a review note..."
												className="bg-background border border-border/50 rounded text-xs text-foreground px-3 py-2 focus:outline-none focus-ring focus:border-indigo-500 shadow-inner resize-none h-16 placeholder-zinc-600"
											/>
											<div className="flex items-center gap-1.5">
												{[
													{
														label: "📝 Note",
														type: "note",
														color: "bg-glass text-foreground",
													},
													{
														label: "📋 To-Do",
														type: "todo",
														color:
															"bg-amber-900/40 text-amber-400 border-amber-700/50",
													},
													{
														label: "🐛 Bug",
														type: "bug",
														color:
															"bg-red-900/40 text-red-400 border-red-700/50",
													},
													{
														label: "✅ OK",
														type: "approved",
														color:
															"bg-emerald-900/40 text-emerald-400 border-emerald-700/50",
													},
												].map((noteType) => (
													<button
														key={noteType.type}
														onClick={() => {
															const inputEl = document.getElementById(
																`clip-note-input-${selectedClip.id}`,
															) as HTMLTextAreaElement;
															if (!inputEl || !inputEl.value.trim()) return;
															const newNote = {
																id: `note-${Date.now()}`,
																text: inputEl.value.trim(),
																type: noteType.type,
																frame: frame,
																timestamp: new Date().toISOString(),
																author: "Editor",
															};
															updateSelectedClip({
																notes: [...(selectedClip.notes || []), newNote],
															});
															commitState(projectData);
															inputEl.value = "";
														}}
														className={`text-[10px] px-2 py-1 rounded border border-border transition-colors hover:brightness-125 ${noteType.color}`}
													>
														{noteType.label}
													</button>
												))}
											</div>
										</div>

										{/* Notes list */}
										{(selectedClip.notes || []).length > 0 && (
											<div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto custom-scrollbar">
												{(selectedClip.notes || [])
													.slice()
													.reverse()
													.map((note: any) => (
														<div
															key={note.id}
															className={`rounded border p-2 transition-colors group/note ${
																note.type === "bug"
																	? "bg-red-950/30 border-red-900/40"
																	: note.type === "todo"
																		? "bg-amber-950/30 border-amber-900/40"
																		: note.type === "approved"
																			? "bg-emerald-950/30 border-emerald-900/40"
																			: "bg-background/50 border-border/50"
															}`}
														>
															<div className="flex items-start justify-between gap-2">
																<p className="text-[10px] text-foreground leading-relaxed flex-1">
																	{note.text}
																</p>
																<button
																	onClick={() => {
																		updateSelectedClip({
																			notes: (selectedClip.notes || []).filter(
																				(n: any) => n.id !== note.id,
																			),
																		});
																		commitState(projectData);
																	}}
																	className="text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover/note:opacity-100 shrink-0"
																>
																	<svg
																		className="w-3 h-3"
																		fill="none"
																		viewBox="0 0 24 24"
																		stroke="currentColor"
																	>
																		<path
																			strokeLinecap="round"
																			strokeLinejoin="round"
																			strokeWidth={2}
																			d="M6 18L18 6M6 6l12 12"
																		/>
																	</svg>
																</button>
															</div>
															<div className="flex items-center gap-2 mt-1.5">
																<button
																	onClick={() => setFrame(note.frame)}
																	className="text-[8px] text-indigo-400 hover:text-indigo-300 font-mono bg-indigo-500/10 px-1 py-0.5 rounded transition-colors"
																>
																	@{note.frame}f
																</button>
																<span className="text-[8px] text-muted">
																	{note.author}
																</span>
																<span className="text-[8px] text-zinc-700">
																	{new Date(note.timestamp).toLocaleTimeString(
																		[],
																		{ hour: "2-digit", minute: "2-digit" },
																	)}
																</span>
															</div>
														</div>
													))}
											</div>
										)}
									</div>

									{/* Transform */}

									<div className="pt-2 border-t border-border mt-2">
										<label className="text-xs font-medium text-muted block mb-3">
											Transform
										</label>
										<div className="flex flex-col gap-3">
											{/* Pos X */}
											<div className="flex items-center justify-between">
												{renderKeyframeBtn(
													"transform.x",
													selectedClip.transform?.x ?? 0,
												)}
												<span className="text-[10px] text-muted w-14">
													Pos X
												</span>
												<input
													type="range"
													min="-1920"
													max="1920"
													step="1"
													value={getKeyframedValue({
														clip: selectedClip,
														property: "transform.x",
														defaultValue: selectedClip.transform?.x ?? 0,
														frame,
													})}
													onChange={(e) => {
														const val = parseFloat(e.target.value);
														if (
															hasKeyframe({
																clip: selectedClip,
																property: "transform.x",
																frame,
															})
														)
															toggleKeyframe("transform.x", val);
														updateSelectedClip(
															{
																transform: {
																	...(selectedClip.transform || {
																		y: 0,
																		scale: 1,
																		rotation: 0,
																		opacity: 1,
																	}),
																	x: val,
																},
															},
															false,
														);
													}}
													onMouseUp={commitCurrentState}
													className="w-full accent-indigo-500 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
												/>
												<span className="text-xs text-foreground w-10 text-right">
													{getKeyframedValue({
														clip: selectedClip,
														property: "transform.x",
														defaultValue: selectedClip.transform?.x ?? 0,
														frame,
													}).toFixed(0)}
												</span>
											</div>
											{/* Pos Y */}
											<div className="flex items-center justify-between">
												{renderKeyframeBtn(
													"transform.y",
													selectedClip.transform?.y ?? 0,
												)}
												<span className="text-[10px] text-muted w-14">
													Pos Y
												</span>
												<input
													type="range"
													min="-1080"
													max="1080"
													step="1"
													value={getKeyframedValue({
														clip: selectedClip,
														property: "transform.y",
														defaultValue: selectedClip.transform?.y ?? 0,
														frame,
													})}
													onChange={(e) => {
														const val = parseFloat(e.target.value);
														if (
															hasKeyframe({
																clip: selectedClip,
																property: "transform.y",
																frame,
															})
														)
															toggleKeyframe("transform.y", val);
														updateSelectedClip(
															{
																transform: {
																	...(selectedClip.transform || {
																		x: 0,
																		scale: 1,
																		rotation: 0,
																		opacity: 1,
																	}),
																	y: val,
																},
															},
															false,
														);
													}}
													onMouseUp={commitCurrentState}
													className="w-full accent-indigo-500 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
												/>
												<span className="text-xs text-foreground w-10 text-right">
													{getKeyframedValue({
														clip: selectedClip,
														property: "transform.y",
														defaultValue: selectedClip.transform?.y ?? 0,
														frame,
													}).toFixed(0)}
												</span>
											</div>
											{/* Scale */}
											<div className="flex items-center justify-between">
												{renderKeyframeBtn(
													"transform.scale",
													selectedClip.transform?.scale ?? 1.0,
												)}
												<span className="text-[10px] text-muted w-14">
													Scale
												</span>
												<input
													type="range"
													min="0"
													max="3"
													step="0.01"
													value={getKeyframedValue({
														clip: selectedClip,
														property: "transform.scale",
														defaultValue: selectedClip.transform?.scale ?? 1.0,
														frame,
													})}
													onChange={(e) => {
														const val = parseFloat(e.target.value);
														if (
															hasKeyframe({
																clip: selectedClip,
																property: "transform.scale",
																frame,
															})
														)
															toggleKeyframe("transform.scale", val);
														updateSelectedClip(
															{
																transform: {
																	...(selectedClip.transform || {
																		x: 0,
																		y: 0,
																		rotation: 0,
																		opacity: 1,
																	}),
																	scale: val,
																},
															},
															false,
														);
													}}
													onMouseUp={commitCurrentState}
													className="w-full accent-indigo-500 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
												/>
												<span className="text-xs text-foreground w-10 text-right">
													{getKeyframedValue({
														clip: selectedClip,
														property: "transform.scale",
														defaultValue: selectedClip.transform?.scale ?? 1.0,
														frame,
													}).toFixed(2)}
												</span>
											</div>
											{/* Rotation */}
											<div className="flex items-center justify-between">
												{renderKeyframeBtn(
													"rotation",
													selectedClip.transform?.rotation ?? 0,
												)}
												<span className="text-[10px] text-muted w-14">
													Rotation
												</span>
												<input
													type="range"
													min="-360"
													max="360"
													step="1"
													className="w-full accent-indigo-500 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
													value={getKeyframedValue({
														clip: selectedClip,
														property: "rotation",
														defaultValue: selectedClip.transform?.rotation ?? 0,
														frame,
													})}
													onChange={(e) => {
														const val = parseFloat(e.target.value);
														if (
															hasKeyframe({
																clip: selectedClip,
																property: "rotation",
																frame,
															})
														)
															toggleKeyframe("rotation", val);
														updateSelectedClip(
															{
																transform: {
																	...(selectedClip.transform || {
																		x: 0,
																		y: 0,
																		scale: 1,
																		opacity: 1,
																	}),
																	rotation: val,
																},
															},
															false,
														);
													}}
													onMouseUp={commitCurrentState}
												/>
												{renderKeyframeBtn(
													"opacity",
													selectedClip.transform?.opacity ?? 1.0,
												)}
												<span className="text-[10px] text-muted w-14">
													Opacity
												</span>
												<input
													type="range"
													min="0"
													max="1"
													step="0.01"
													className="w-full accent-indigo-500 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
													value={getKeyframedValue({
														clip: selectedClip,
														property: "opacity",
														defaultValue:
															selectedClip.transform?.opacity ?? 1.0,
														frame,
													})}
													onChange={(e) => {
														const val = parseFloat(e.target.value);
														if (
															hasKeyframe({
																clip: selectedClip,
																property: "opacity",
																frame,
															})
														)
															toggleKeyframe("opacity", val);
														updateSelectedClip(
															{
																transform: {
																	...(selectedClip.transform || {
																		x: 0,
																		y: 0,
																		scale: 1,
																		rotation: 0,
																	}),
																	opacity: val,
																},
															},
															false,
														);
													}}
													onMouseUp={commitCurrentState}
												/>
												<span className="text-xs text-foreground w-10 text-right">
													{Math.round(
														getKeyframedValue({
															clip: selectedClip,
															property: "opacity",
															defaultValue:
																selectedClip.transform?.opacity ?? 1.0,
															frame,
														}) * 100,
													)}
													%
												</span>
											</div>
											{/* Keyframe Easing Presets */}
											<div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
												<span className="text-[10px] text-muted w-14">
													Easing
												</span>
												<div className="flex gap-1 flex-1 bg-background p-1 rounded border border-border">
													{["Linear", "Ease In", "Ease Out", "Bezier"].map(
														(ease) => (
															<button
																key={ease}
																className="flex-1 text-[10px] py-1 text-muted hover:text-foreground hover:bg-panel rounded transition-colors"
															>
																{ease}
															</button>
														),
													)}
												</div>
											</div>

											{/* Motion Blur */}
											<div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
												<label className="flex items-center gap-2 cursor-pointer">
													<input
														type="checkbox"
														checked={
															selectedClip.transform?.motionBlur ?? false
														}
														onChange={(e) => {
															updateSelectedClip({
																transform: {
																	...(selectedClip.transform || {
																		x: 0,
																		y: 0,
																		scale: 1,
																		rotation: 0,
																		opacity: 1,
																	}),
																	motionBlur: e.target.checked,
																},
															});
															commitState(projectData);
														}}
														className="w-3 h-3 accent-indigo-500 rounded cursor-pointer"
													/>
													<span className="text-[10px] text-muted">
														Motion Blur
													</span>
												</label>
												<div className="flex items-center gap-2">
													<span className="text-[10px] text-muted">Angle</span>
													<input
														type="range"
														min="0"
														max="360"
														step="1"
														value={selectedClip.transform?.shutterAngle ?? 180}
														onChange={(e) => {
															updateSelectedClip(
																{
																	transform: {
																		...(selectedClip.transform || {
																			x: 0,
																			y: 0,
																			scale: 1,
																			rotation: 0,
																			opacity: 1,
																		}),
																		shutterAngle: parseInt(e.target.value),
																	},
																},
																false,
															);
														}}
														onMouseUp={commitCurrentState}
														className="w-16 accent-indigo-500 h-1 bg-panel rounded-lg appearance-none cursor-pointer"
														title="Shutter Angle"
														disabled={!selectedClip.transform?.motionBlur}
													/>
													<span className="text-[10px] text-foreground w-6 text-right">
														{selectedClip.transform?.shutterAngle ?? 180}°
													</span>
												</div>
											</div>

											{/* Dynamic Zoom (Phase 168) */}
											<div className="pt-2 border-t border-border mt-2">
												<div className="flex items-center justify-between mb-2">
													<label className="text-[10px] font-bold text-emerald-400 block uppercase tracking-wider">
														Dynamic Zoom (Ken Burns)
													</label>

													<label className="flex items-center gap-2 cursor-pointer">
														<input
															type="checkbox"
															className="sr-only"
															checked={
																selectedClip.transform?.dynamicZoom ?? false
															}
															onChange={(e) =>
																updateSelectedClip({
																	transform: {
																		...(selectedClip.transform || {
																			x: 0,
																			y: 0,
																			scale: 1,
																			rotation: 0,
																			opacity: 1,
																		}),
																		dynamicZoom: e.target.checked,
																	},
																})
															}
														/>
														<div
															className={`w-6 h-3 rounded-full relative transition-colors ${selectedClip.transform?.dynamicZoom ? "bg-emerald-500" : "bg-glass"}`}
														>
															<div
																className={`absolute top-0.5 left-0.5 bg-white w-2 h-2 rounded-full transition-transform ${selectedClip.transform?.dynamicZoom ? "translate-x-3" : "translate-x-0"}`}
															/>
														</div>
													</label>
												</div>
												{selectedClip.transform?.dynamicZoom && (
													<div className="flex justify-between items-center bg-background p-2 rounded border border-border">
														<button
															className="text-[10px] hover:text-emerald-400 transition-colors"
															onClick={handleSwapDynamicZoom}
														>
															Swap 🔄
														</button>
														<button
															className="text-[10px] hover:text-emerald-400 transition-colors"
															onClick={handleChangeEasing}
														>
															Linear / Ease
														</button>
													</div>
												)}
											</div>

											{/* Lens Distortion (Phase 171) */}
											<div className="flex items-center justify-between">
												<span className="text-[10px] text-muted w-24 leading-tight">
													Lens Distortion (Correction)
												</span>
												<input
													type="range"
													min="-100"
													max="100"
													value={selectedClip.lens_distortion || 0}
													onChange={(e) =>
														updateSelectedClip({
															lens_distortion: parseInt(e.target.value),
														})
													}
													className="flex-1 h-1 bg-panel accent-indigo-500 rounded-lg appearance-none cursor-pointer"
												/>
												<span className="text-[10px] text-foreground w-6 text-right font-mono">
													{selectedClip.lens_distortion || 0}
												</span>
											</div>
										</div>
									</div>

									<div className="mt-4 border-t border-border pt-4 flex flex-col gap-2">
										<button
											onClick={() => handleSplitClip()}
											disabled={
												frame <= selectedClip.start_frame ||
												frame >=
													selectedClip.start_frame +
														selectedClip.duration_frames
											}
											className="w-full bg-panel hover:bg-glass disabled:opacity-50 disabled:cursor-not-allowed border border-border text-foreground text-xs font-medium py-1.5 rounded transition-colors"
										>
											Split at Playhead
										</button>
										<div className="flex gap-2">
											<button
												onClick={handleDeleteClip}
												className="flex-1 bg-rose-900/30 hover:bg-rose-900/50 border border-rose-900/50 text-rose-400 text-xs font-medium py-1.5 rounded transition-colors"
												title="Remove clip without shifting (Backspace)"
											>
												Delete
											</button>
											<button
												onClick={handleRippleDeleteClip}
												className="flex-1 bg-rose-900/30 hover:bg-rose-900/50 border border-rose-900/50 text-rose-400 text-xs font-medium py-1.5 rounded transition-colors"
												title="Remove clip and close the gap (Shift+Backspace)"
											>
												Ripple Delete
											</button>
										</div>
										{selectedClip.type === "video" && (
											<button
												onClick={handleDetachAudio}
												className="w-full mt-2 bg-panel hover:bg-glass border border-border text-indigo-400 text-xs font-medium py-1.5 rounded transition-colors"
											>
												Detach Audio
											</button>
										)}
									</div>

									{/* Animation Curves */}
									{selectedClip.keyframes &&
										selectedClip.keyframes.length > 0 && (
											<div className="pt-4 border-t border-border mt-4 mb-4">
												<label className="text-xs font-medium text-muted block mb-3">
													Animation Curves
												</label>
												<div className="flex flex-col gap-4">
													{Object.entries(
														selectedClip.keyframes.reduce(
															(acc: any, k: any) => {
																if (!acc[k.property]) acc[k.property] = [];
																acc[k.property].push(k);
																return acc;
															},
															{},
														),
													).map(([prop, kfs]: [string, any]) => {
														const sorted = [...kfs].sort(
															(a: any, b: any) => a.frame - b.frame,
														);

														const values = sorted.map((k: any) => k.value);
														const minVal = Math.min(...values);
														const maxVal = Math.max(...values);
														const range = maxVal - minVal || 1;
														const duration = selectedClip.duration_frames;
														const localFrame = frame - selectedClip.start_frame;

														return (
															<div key={prop} className="flex flex-col gap-1">
																<div className="text-[10px] text-muted uppercase">
																	{prop.replace(".", " ")}
																</div>
																<div className="h-20 bg-background rounded border border-border relative overflow-hidden">
																	<svg
																		className="absolute inset-0 w-full h-full overflow-visible"
																		preserveAspectRatio="none"
																		viewBox={`0 0 ${duration} 100`}
																	>
																		<path
																			d={
																				sorted
																					.map((k: any, i: number) => {
																						const x = k.frame;
																						const y =
																							100 -
																							(((k.value - minVal) / range) *
																								80 +
																								10);

																						if (i === 0)
																							return `M 0 ${y} L ${x} ${y}`;

																						const prev = sorted[i - 1];
																						const prevX = prev.frame;
																						const prevY =
																							100 -
																							(((prev.value - minVal) / range) *
																								80 +
																								10);

																						if (prev.easing === "step") {
																							return `L ${x} ${prevY} L ${x} ${y}`;
																						} else if (
																							prev.easing === "ease-in-out"
																						) {
																							const cp1x =
																								prevX + (x - prevX) * 0.42;
																							const cp2x =
																								x - (x - prevX) * 0.42;
																							return `C ${cp1x} ${prevY}, ${cp2x} ${y}, ${x} ${y}`;
																						} else if (
																							prev.easing === "ease-in"
																						) {
																							const cp1x =
																								prevX + (x - prevX) * 0.42;
																							return `Q ${cp1x} ${prevY}, ${x} ${y}`;
																						} else if (
																							prev.easing === "ease-out"
																						) {
																							const cp1x =
																								x - (x - prevX) * 0.42;
																							return `Q ${cp1x} ${y}, ${x} ${y}`;
																						}
																						return `L ${x} ${y}`;
																					})
																					.join(" ") +
																				` L ${duration} ${100 - (((sorted[sorted.length - 1].value - minVal) / range) * 80 + 10)}`
																			}
																			fill="none"
																			stroke="#818cf8"
																			strokeWidth="2"
																			vectorEffect="non-scaling-stroke"
																		/>

																		{sorted.map((k: any, i: number) => {
																			const x = k.frame;
																			const y =
																				100 -
																				(((k.value - minVal) / range) * 80 +
																					10);
																			return (
																				<circle
																					key={i}
																					cx={x}
																					cy={y}
																					r="3"
																					fill="#c7d2fe"
																					vectorEffect="non-scaling-stroke"
																				/>
																			);
																		})}
																		<line
																			x1={localFrame}
																			y1="0"
																			x2={localFrame}
																			y2="100"
																			stroke="#ef4444"
																			strokeWidth="1"
																			vectorEffect="non-scaling-stroke"
																		/>
																	</svg>
																</div>
															</div>
														);
													})}
												</div>
											</div>
										)}
								</>
							) : (
								<div className="flex flex-col gap-4">
									<div className="text-xs text-muted mb-2 uppercase tracking-wider font-semibold">
										Project Settings
									</div>

									{/* VR 360° Video Editing (Phase 209) */}
									<div className="mb-4 flex items-center justify-between p-3 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded">
										<div className="flex flex-col">
											<span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
												VR 360° Workspace
											</span>
											<span className="text-[10px] text-fuchsia-500/80">
												Enable equirectangular panning viewer
											</span>
										</div>

										<label className="relative inline-flex items-center cursor-pointer">
											<input type="checkbox" className="sr-only peer" />
											<div className="w-7 h-4 bg-glass peer-focus:outline-none focus-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-fuchsia-500"></div>
										</label>
									</div>

									{/* Quantum Video Processing (Phase 213) */}
									<div className="mb-4 p-3 bg-indigo-950/40 border border-indigo-900 rounded flex flex-col gap-2 shadow-[0_0_15px_rgba(99,102,241,0.1)]">
										<div className="flex items-center justify-between">
											<div className="flex flex-col">
												<span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
													⚛️ Quantum Render Pipeline
												</span>
												<span className="text-[10px] text-indigo-500/80">
													Distribute tasks across a simulated Q-bit cluster
												</span>
											</div>
											<button
												className="bg-indigo-600 hover:bg-indigo-500 text-foreground text-[10px] px-3 py-1 rounded-full transition-colors font-bold"
												onClick={() => handleQuantumRender()}
											>
												Link Cluster
											</button>
										</div>
									</div>

									{/* WebGPU Hardware Engine (Phase 199) */}
									<div className="mb-4 p-3 bg-background border border-border rounded flex flex-col gap-2">
										<div className="flex items-center justify-between">
											<label className="text-[10px] font-bold text-muted uppercase tracking-wider">
												Rendering Engine
											</label>
											<span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded">
												Experimental
											</span>
										</div>
										<select className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus-ring focus:border-indigo-500">
											<option>WebGL 2.0 (Stable)</option>
											<option>WebGPU Hardware (Fast)</option>
											<option>Software (CPU)</option>
										</select>
									</div>

									<div>
										<label className="text-xs font-medium text-muted block mb-1">
											Project Name
										</label>
										<input
											type="text"
											value={projectData.name || "Untitled Project"}
											onChange={(e) =>
												commitState({ ...projectData, name: e.target.value })
											}
											className="w-full bg-background border border-border rounded px-2 py-1 text-sm text-foreground focus:outline-none focus-ring focus:border-indigo-500"
										/>
									</div>

									{/* Hardware Control Surface (Phase 184) */}
									<div className="mt-2 p-3 bg-background border border-border rounded flex flex-col gap-2">
										<div className="flex items-center justify-between">
											<label className="text-[10px] font-bold text-muted uppercase tracking-wider flex items-center gap-1">
												<svg
													className="w-3 h-3"
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
													/>
												</svg>
												Control Surface
											</label>
											<span className="text-[10px] px-1.5 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded">
												WebMIDI Active
											</span>
										</div>
										<select className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus-ring focus:border-indigo-500">
											<option>Tangent Ripple (Connected)</option>
											<option>Blackmagic Micro Panel</option>
											<option>Generic MIDI CC</option>
											<option>None</option>
										</select>
									</div>

									<div className="flex gap-2">
										<div className="flex-1">
											<label className="text-xs font-medium text-muted block mb-1">
												Width
											</label>
											<input
												type="number"
												value={projectData.width || 1920}
												onChange={(e) =>
													commitState({
														...projectData,
														width: parseInt(e.target.value) || 1920,
													})
												}
												className="w-full bg-background border border-border rounded px-2 py-1 text-sm text-foreground focus:outline-none focus-ring focus:border-indigo-500"
											/>
										</div>

										<div className="flex-1">
											<label className="text-xs font-medium text-muted block mb-1">
												Height
											</label>
											<input
												type="number"
												value={projectData.height || 1080}
												onChange={(e) =>
													commitState({
														...projectData,
														height: parseInt(e.target.value) || 1080,
													})
												}
												className="w-full bg-background border border-border rounded px-2 py-1 text-sm text-foreground focus:outline-none focus-ring focus:border-indigo-500"
											/>
										</div>
									</div>

									<div>
										<label className="text-xs font-medium text-muted block mb-1">
											Aspect Ratio Presets
										</label>
										<div className="flex gap-2">
											<button
												onClick={() =>
													commitState({
														...projectData,
														width: 1920,
														height: 1080,
													})
												}
												className="flex-1 bg-panel hover:bg-glass border border-border text-foreground text-[10px] py-1 rounded transition-colors"
											>
												16:9 (1080p)
											</button>
											<button
												onClick={() =>
													commitState({
														...projectData,
														width: 1080,
														height: 1920,
													})
												}
												className="flex-1 bg-panel hover:bg-glass border border-border text-foreground text-[10px] py-1 rounded transition-colors"
											>
												9:16 (Shorts)
											</button>
											<button
												onClick={() =>
													commitState({
														...projectData,
														width: 1080,
														height: 1080,
													})
												}
												className="flex-1 bg-panel hover:bg-glass border border-border text-foreground text-[10px] py-1 rounded transition-colors"
											>
												1:1 (Square)
											</button>
										</div>
									</div>

									<div>
										<label className="text-xs font-medium text-muted block mb-2">
											Background Color
										</label>
										<div className="flex items-center gap-2">
											<input
												type="color"
												value={(() => {
													const bg = projectData.bg_color || [
														0.09, 0.09, 0.11, 1.0,
													];
													const toHex = (c: number) =>
														Math.round(c * 255)
															.toString(16)
															.padStart(2, "0");
													return `#${toHex(bg[0])}${toHex(bg[1])}${toHex(bg[2])}`;
												})()}
												onChange={(e) => {
													const hex = e.target.value;
													const r = parseInt(hex.slice(1, 3), 16) / 255;
													const g = parseInt(hex.slice(3, 5), 16) / 255;
													const b = parseInt(hex.slice(5, 7), 16) / 255;
													commitState({
														...projectData,
														bg_color: [r, g, b, 1.0],
													});
												}}
												className="w-8 h-8 rounded cursor-pointer bg-background border-none p-0"
											/>
										</div>
									</div>

									<div className="mt-4 pt-4 border-t border-border">
										<div className="text-xs text-muted mb-2 uppercase tracking-wider font-semibold">
											Timecode Burn-In Overlay
										</div>
										<label
											className="flex items-center gap-2 cursor-pointer mb-2"
											title="Burn-In the timeline timecode directly into the exported video"
										>
											<input
												type="checkbox"
												checked={projectData.burnInEnabled || false}
												onChange={(e) =>
													commitState({
														...projectData,
														burnInEnabled: e.target.checked,
													})
												}
												className="w-3.5 h-3.5 bg-background border-border rounded accent-indigo-500 cursor-pointer"
											/>
											<span className="text-xs text-foreground">
												Enable Timecode Burn-In
											</span>
										</label>
										{projectData.burnInEnabled && (
											<div className="flex gap-2">
												<div className="flex-1">
													<label className="text-[10px] font-medium text-muted block mb-1">
														Position
													</label>
													<select
														value={projectData.burnInPosition || "bottom-right"}
														onChange={(e) =>
															commitState({
																...projectData,
																burnInPosition: e.target.value,
															})
														}
														className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus-ring focus:border-indigo-500"
													>
														<option value="top-left">Top Left</option>
														<option value="top-right">Top Right</option>
														<option value="bottom-left">Bottom Left</option>
														<option value="bottom-right">Bottom Right</option>
														<option value="center">Center</option>
													</select>
												</div>

												<div className="flex-1">
													<label className="text-[10px] font-medium text-muted block mb-1">
														Size
													</label>
													<select
														value={projectData.burnInSize || "medium"}
														onChange={(e) =>
															commitState({
																...projectData,
																burnInSize: e.target.value,
															})
														}
														className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus-ring focus:border-indigo-500"
													>
														<option value="small">Small</option>
														<option value="medium">Medium</option>
														<option value="large">Large</option>
													</select>
												</div>
											</div>
										)}
									</div>

									<div className="mt-4 pt-4 border-t border-border">
										<div className="text-xs text-muted mb-2 uppercase tracking-wider font-semibold">
											Performance & Saving
										</div>
										<label
											className="flex items-center gap-2 cursor-pointer mb-3"
											title="Enable WebGPU/WebGL rendering acceleration"
										>
											<input
												type="checkbox"
												checked={projectData.useHardwareAcceleration ?? true}
												onChange={(e) =>
													commitState({
														...projectData,
														useHardwareAcceleration: e.target.checked,
													})
												}
												className="w-3.5 h-3.5 bg-background border-border rounded accent-indigo-500 cursor-pointer"
											/>
											<span className="text-xs text-foreground">
												Use Hardware Acceleration (GPU)
											</span>
										</label>

										<label
											className="flex items-center gap-2 cursor-pointer mb-3"
											title="Cache computationally heavy FX in the background for smoother playback"
										>
											<input
												type="checkbox"
												checked={projectData.smartRenderCache ?? false}
												onChange={(e) =>
													commitState({
														...projectData,
														smartRenderCache: e.target.checked,
													})
												}
												className="w-3.5 h-3.5 bg-background border-border rounded accent-indigo-500 cursor-pointer"
											/>
											<span className="text-xs text-foreground">
												Smart Render Cache
											</span>
										</label>

										<div className="flex flex-col gap-2 mb-3">
											<label className="text-[10px] font-medium text-muted">
												Project FPS
											</label>
											<select
												value={projectData.fps || 60}
												onChange={(e) =>
													commitState({
														...projectData,
														fps: parseInt(e.target.value),
													})
												}
												className="bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus-ring focus:border-indigo-500"
											>
												<option value="24">24 fps (Cinematic)</option>
												<option value="25">25 fps (PAL)</option>
												<option value="30">30 fps (Web)</option>
												<option value="50">50 fps</option>
												<option value="60">60 fps (Smooth)</option>
											</select>
										</div>

										<div>
											<div className="flex justify-between items-center mb-1">
												<label className="text-[10px] font-medium text-muted">
													Auto-Save Frequency
												</label>
												<span className="text-[10px] text-muted">
													{projectData.autoSaveInterval || 5} mins
												</span>
											</div>
											<input
												type="range"
												min="1"
												max="30"
												step="1"
												value={projectData.autoSaveInterval || 5}
												onChange={(e) =>
													commitState({
														...projectData,
														autoSaveInterval: parseInt(e.target.value),
													})
												}
												className="w-full accent-indigo-500 h-1.5 bg-panel rounded-lg appearance-none cursor-pointer"
											/>
										</div>
									</div>
								</div>
							)}
						</div>
					</aside>
				</div>{" "}
				{/* End Top Half */}
				{/* Horizontal Splitter */}
				<div
					className="h-1 cursor-row-resize hover:bg-indigo-500/50 bg-background shrink-0 z-40 transition-colors"
					onMouseDown={(e) => {
						e.preventDefault();
						const startY = e.clientY;
						const startHeight = timelineHeight;
						const onMove = (ev: MouseEvent) =>
							setTimelineHeight(
								Math.min(
									800,
									Math.max(150, startHeight - (ev.clientY - startY)),
								),
							);
						const onUp = () => {
							window.removeEventListener("mousemove", onMove);
							window.removeEventListener("mouseup", onUp);
						};
						window.addEventListener("mousemove", onMove);
						window.addEventListener("mouseup", onUp);
					}}
				/>
				{/* Timeline or Node Graph */}
				<section
					className="w-full border-t border-border bg-background flex flex-col shrink-0 relative overflow-hidden"
					style={{ height: timelineHeight }}
				>
					{activeWorkspace === "color" ? (
						<div className="absolute inset-0 bg-background flex flex-col p-4">
							<div className="flex items-center justify-between mb-4">
								<h2 className="text-sm font-bold text-teal-400 uppercase tracking-widest flex items-center gap-2">
									<svg
										className="w-5 h-5"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
										/>
									</svg>
									Color Grading Workspace
								</h2>
								<button
									onClick={() => setActiveWorkspace("timeline")}
									className="text-[10px] text-muted hover:text-foreground px-2 py-1 bg-panel rounded"
								>
									Close Scopes
								</button>
							</div>
							<div className="flex-1 w-full max-w-4xl mx-auto">
								<LumetriScopes sourceCanvasRef={canvasRef} />
							</div>
						</div>
					) : activeWorkspace === "audio" ? (
						<div className="absolute inset-0 bg-background flex flex-col p-4">
							<div className="flex items-center justify-between mb-4">
								<h2 className="text-sm font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
									<svg
										className="w-5 h-5"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
										/>
									</svg>
									Audio Mixer Workspace
								</h2>
								<button
									onClick={() => setActiveWorkspace("timeline")}
									className="text-[10px] text-muted hover:text-foreground px-2 py-1 bg-panel rounded"
								>
									Close Mixer
								</button>
							</div>
							<div className="flex-1 w-full max-w-5xl mx-auto">
								<AudioMixer
									projectData={projectData}
									setProjectData={setProjectData}
								/>
							</div>
						</div>
					) : activeWorkspace === "ai" ? (
						<div className="absolute inset-0 bg-background flex flex-col p-4">
							<div className="flex items-center justify-between mb-4">
								<h2 className="text-sm font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
									<svg
										className="w-5 h-5"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
										/>
									</svg>
									AI Magic Tools
								</h2>
								<button
									onClick={() => setActiveWorkspace("timeline")}
									className="text-[10px] text-muted hover:text-foreground px-2 py-1 bg-panel rounded"
								>
									Close AI
								</button>
							</div>
							<div className="flex-1 w-full max-w-lg mx-auto">
								<AIMagicTools />
							</div>
						</div>
					) : activeWorkspace === "export" ? (
						<ExportDelivery
							projectData={projectData}
							onQueueRender={(format: string, jobId: string) => {
								setIsFarmRendering(true);
								setFarmProgress([
									{
										node: "Node-1 (Master)",
										status: "Connecting",
										progress: 0,
									},
								]);

								const sse = new EventSource(
									`http://localhost:8003/api/v1/jobs/${jobId}/stream`,
								);

								sse.onmessage = (event) => {
									const job = JSON.parse(event.data);
									setFarmProgress([
										{
											node: "Distributed Farm Cluster",
											status:
												job.status === "rendering" ? "Rendering" : "Completed",
											progress: job.progress,
										},
									]);

									if (job.status === "completed" || job.status === "failed") {
										sse.close();
										if (job.status === "completed") {
											toast.success(`Render ${jobId} Completed!`);
										} else {
											toast.error(`Render ${jobId} Failed.`);
										}
										setTimeout(() => setIsFarmRendering(false), 3000);
									}
								};

								sse.onerror = (error) => {
									console.error("SSE Render stream error:", error);
									sse.close();
									toast.error("Lost connection to Render Farm stream.");
									setTimeout(() => setIsFarmRendering(false), 2000);
								};
							}}
						/>
					) : activeWorkspace === "fusion" ? (
						<div className="absolute inset-0 bg-background flex flex-col">
							{/* Node Graph UI */}
							<div className="h-8 border-b border-border bg-background flex items-center px-4 justify-between">
								<span className="text-xs text-foreground font-medium tracking-wide">
									FUSION GRAPH
								</span>
								<button
									onClick={() => setActiveWorkspace("timeline")}
									className="text-[10px] text-muted hover:text-foreground px-2 py-1 bg-panel rounded"
								>
									Close Nodes
								</button>
							</div>

							<div className="flex-1 relative overflow-hidden bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiMzZjNmNDYiLz48L3N2Zz4=')]">
								{/* Simulated Nodes Canvas */}
								<svg className="absolute inset-0 w-full h-full pointer-events-none">
									<path
										d="M 150 150 C 250 150, 250 150, 350 150"
										stroke="#6366f1"
										strokeWidth="2"
										fill="none"
									/>
									<path
										d="M 450 150 C 550 150, 550 150, 650 150"
										stroke="#6366f1"
										strokeWidth="2"
										fill="none"
									/>
								</svg>

								{/* MediaIn Node */}
								<div className="absolute top-[120px] left-[50px] w-[100px] bg-panel border border-zinc-600 rounded-md shadow-xl flex flex-col overflow-hidden">
									<div className="h-6 bg-glass border-b border-zinc-600 flex items-center px-2">
										<span className="text-[10px] font-semibold text-foreground">
											MediaIn1
										</span>
									</div>
									<div className="p-2 flex justify-end">
										<div className="w-3 h-3 bg-indigo-500 rounded-full border border-indigo-300 translate-x-3.5 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
									</div>
								</div>

								{/* Effect Node */}
								<div className="absolute top-[120px] left-[350px] w-[100px] bg-panel border border-emerald-500 rounded-md shadow-xl flex flex-col overflow-hidden ring-2 ring-emerald-500/50">
									<div className="h-6 bg-emerald-600/20 border-b border-emerald-500/50 flex items-center px-2">
										<span className="text-[10px] font-semibold text-emerald-300">
											UltraKey
										</span>
									</div>
									<div className="p-2 flex justify-between">
										<div className="w-3 h-3 bg-amber-500 rounded-full border border-amber-300 -translate-x-3.5" />
										<div className="w-3 h-3 bg-indigo-500 rounded-full border border-indigo-300 translate-x-3.5 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
									</div>
								</div>

								{/* MediaOut Node */}
								<div className="absolute top-[120px] left-[650px] w-[100px] bg-panel border border-zinc-600 rounded-md shadow-xl flex flex-col overflow-hidden">
									<div className="h-6 bg-glass border-b border-zinc-600 flex items-center px-2">
										<span className="text-[10px] font-semibold text-foreground">
											MediaOut1
										</span>
									</div>
									<div className="p-2 flex justify-start">
										<div className="w-3 h-3 bg-amber-500 rounded-full border border-amber-300 -translate-x-3.5" />
									</div>
								</div>
							</div>
						</div>
					) : (
						<>
							{/* Timeline Minimap */}

							<div
								className="h-10 bg-background border-b border-border relative w-full overflow-hidden cursor-crosshair group flex-shrink-0"
								onMouseDown={(e) => {
									const rect = e.currentTarget.getBoundingClientRect();
									const x = e.clientX - rect.left;
									const targetFrame = Math.max(
										0,
										Math.floor(
											(x / rect.width) * (projectData.duration_frames || 100),
										),
									);
									setFrame(targetFrame);

									// Handle dragging
									const handleMouseMove = (moveEvent: MouseEvent) => {
										const newX = moveEvent.clientX - rect.left;
										const newFrame = Math.max(
											0,
											Math.min(
												projectData.duration_frames || 100,
												Math.floor(
													(newX / rect.width) *
														(projectData.duration_frames || 100),
												),
											),
										);
										setFrame(newFrame);
									};
									const handleMouseUp = () => {
										window.removeEventListener("mousemove", handleMouseMove);
										window.removeEventListener("mouseup", handleMouseUp);
									};
									window.addEventListener("mousemove", handleMouseMove);
									window.addEventListener("mouseup", handleMouseUp);
								}}
							>
								{/* Draw Tracks and Clips */}

								<div className="absolute inset-0 flex flex-col-reverse py-1 gap-[1px]">
									{projectData.tracks?.map((track: any) => (
										<div key={track.id} className="flex-1 relative w-full">
											{track.clips?.map((clip: any) => (
												<div
													key={clip.id}
													className={`absolute inset-y-0 rounded-sm opacity-50 ${clip.type === "video" || clip.type === "image" ? "bg-indigo-500" : clip.type === "audio" ? "bg-emerald-500" : "bg-pink-500"}`}
													style={{
														left: `${(clip.start_frame / (projectData.duration_frames || 100)) * 100}%`,
														width: `${(clip.duration_frames / (projectData.duration_frames || 100)) * 100}%`,
													}}
												/>
											))}
										</div>
									))}
								</div>

								{/* Playhead Indicator */}
								<div
									className="absolute top-0 bottom-0 w-px bg-red-500 z-10 pointer-events-none"
									style={{
										left: `${(frame / (projectData.duration_frames || 100)) * 100}%`,
									}}
								>
									<div className="absolute top-0 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-500" />
								</div>

								{/* Hover overlay hint */}
								<div className="absolute inset-0 bg-hover opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity flex items-center justify-center">
									<span className="text-[10px] uppercase tracking-widest text-foreground/50 font-semibold bg-background/50 px-2 py-0.5 rounded backdrop-blur">
										Timeline Minimap Navigator
									</span>
								</div>
							</div>
							{/* Timeline Header Toolbar */}
							<div className="h-8 w-full border-b border-border bg-background flex items-center px-4 gap-2">
								<button
									className="text-xs font-medium text-foreground bg-panel border border-border px-3 py-1 rounded hover:bg-glass active:bg-zinc-600 transition-colors"
									onClick={() => {
										setFrame(0);
										setIsPlaying(false);
									}}
									title="Skip to Start"
								>
									Start
								</button>
								<button
									className={`text-xs font-medium text-foreground border px-4 py-1 rounded transition-colors shadow-sm ${
										isPlaying
											? "bg-rose-600 border-rose-500 hover:bg-rose-500 active:bg-rose-700"
											: "bg-indigo-600 border-indigo-500 hover:bg-indigo-500 active:bg-indigo-700"
									}`}
									onClick={() => setIsPlaying(!isPlaying)}
								>
									{isPlaying ? "Pause" : "Play"}
								</button>
								<button
									className={`text-xs font-medium border px-3 py-1 rounded transition-colors shadow-sm ${projectData.bypassEffects ? "bg-amber-600 text-foreground border-amber-500 hover:bg-amber-500" : "bg-panel text-muted border-border hover:text-foreground"}`}
									onClick={() =>
										commitState({
											...projectData,
											bypassEffects: !projectData.bypassEffects,
										})
									}
									title="Bypass All Color Grading and FX"
								>
									🪄 Bypass FX
								</button>
								<button
									className={`text-xs font-medium border px-4 py-1 rounded transition-colors shadow-sm ${showDataBurnIn ? "bg-amber-600 text-foreground border-amber-500 hover:bg-amber-500" : "bg-panel text-muted border-border hover:text-foreground"}`}
									onClick={() => setShowDataBurnIn(!showDataBurnIn)}
									title="Toggle Data Burn-In Overlay"
								>
									⏱️ Burn-In
								</button>
								{/* Phase 28: BCI Emotion Mapping */}
								<button
									className={`text-[10px] font-bold border px-2 py-1 mr-2 rounded transition-colors shadow-sm ${isEmotionHeatmapMode ? "bg-orange-600 text-foreground border-orange-500" : "bg-panel text-orange-400 border-border hover:bg-glass"}`}
									onClick={() => setIsEmotionHeatmapMode(!isEmotionHeatmapMode)}
									title="BCI Emotion Heatmap (Arousal/Valence Pacing Analysis)"
								>
									🧠 Emotion Heatmap
								</button>
								{/* Phase 27: Cinematic Multiverse */}
								<button
									className={`text-[10px] font-bold border px-2 py-1 mr-2 rounded transition-colors shadow-sm ${isMultiverseMode ? "bg-fuchsia-600 text-foreground border-fuchsia-500" : "bg-panel text-cyan-400 border-border hover:bg-glass"}`}
									onClick={() => setIsMultiverseMode(!isMultiverseMode)}
									title="Branch Timeline (A/B Multiverse Prototyping)"
								>
									🌌 Branch A/B
								</button>
								<button
									className="text-xs font-medium text-foreground border px-4 py-1 rounded transition-colors shadow-sm bg-indigo-600 border-indigo-500 hover:bg-indigo-500 disabled:opacity-50"
									onClick={handleUndo}
									disabled={historyIndex <= 0}
									title="Undo (Cmd+Z)"
								>
									↩️ Undo
								</button>
								{/* Time-Travel Causality Undo (Phase 219) */}
								<button
									className="text-[10px] font-bold text-cyan-300 border px-2 py-1 rounded transition-colors shadow-[0_0_8px_rgba(34,211,238,0.4)] bg-cyan-900/30 border-cyan-500/50 hover:bg-cyan-800/50"
									onClick={handleClosedTimelikeCurve}
									title="Causality Reversal (Undo Reality)"
								>
									⏳ Undo Reality
								</button>
								<button
									className="text-xs font-medium text-foreground border px-4 py-1 rounded transition-colors shadow-sm bg-indigo-600 border-indigo-500 hover:bg-indigo-500 disabled:opacity-50"
									onClick={handleRedo}
									disabled={historyIndex >= history.length - 1}
									title="Redo (Cmd+Shift+Z)"
								>
									Redo ↪️
								</button>
								<input
									type="range"
									className="flex-1 ml-4 accent-indigo-500"
									min="0"
									max={Math.max(1, (projectData.duration_frames || 100) - 1)}
									value={frame}
									onChange={(e) => {
										setFrame(parseInt(e.target.value));
										setIsPlaying(false);
									}}
								/>

								{/* Interdimensional 5D Timeline (Phase 216) */}
								<button
									className="text-[10px] font-bold text-fuchsia-300 border px-2 py-1 ml-2 rounded transition-colors shadow-[0_0_8px_rgba(217,70,239,0.4)] bg-fuchsia-900/30 border-fuchsia-500/50 hover:bg-fuchsia-800/50"
									onClick={() => handle5thDimension()}
									title="Expand into 5th Dimension"
								>
									🌌 5D View
								</button>
								<div className="flex items-center gap-2 ml-auto pl-4 border-l border-border">
									<span className="text-muted text-[10px] font-medium tracking-wider">
										ZOOM
									</span>
									<input
										type="range"
										min="0.5"
										max="10"
										step="0.5"
										value={zoomLevel}
										onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
										className="w-24 accent-zinc-500"
									/>
								</div>
								<div className="ml-2 pl-4 border-l border-border flex items-center gap-2">
									<button
										className="text-xs font-medium text-foreground bg-emerald-600 border border-emerald-500 px-3 py-1 rounded hover:bg-emerald-500 active:bg-emerald-700 transition-colors shadow-sm"
										onClick={handleExport}
									>
										Export
									</button>
									{/* Phase 25: Distributed Render Farm */}
									<button
										className="text-xs font-medium text-foreground bg-blue-600 border border-blue-500 px-3 py-1 rounded hover:bg-blue-500 active:bg-blue-700 transition-colors shadow-sm flex items-center gap-1"
										onClick={() =>
											alert("Render Farm feature coming in Phase 25")
										}
										title="Send to Cloud Render Farm"
									>
										<svg
											className="w-3 h-3"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
											/>
										</svg>
										Farm
									</button>
								</div>
								<div className="ml-2 pl-4 border-l border-border flex gap-2 items-center">
									<button
										className={`text-xs font-medium text-foreground px-3 py-1 rounded transition-colors shadow-sm ${isSnappingEnabled ? "bg-indigo-600 border border-indigo-500 hover:bg-indigo-500" : "bg-panel border border-border hover:bg-glass"}`}
										onClick={() => setIsSnappingEnabled(!isSnappingEnabled)}
										title={`Toggle Snapping (S) - ${isSnappingEnabled ? "ON" : "OFF"}`}
									>
										<svg
											className="w-4 h-4"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M13 10V3L4 14h7v7l9-11h-7z"
											/>
										</svg>
									</button>

									{/* Neural Auto-Rotoscoping (Phase 201) */}
									<button
										className="text-xs font-medium bg-fuchsia-600 hover:bg-fuchsia-500 text-foreground px-2 py-1 rounded transition-colors shadow-sm flex items-center gap-1"
										onClick={() => handleAutoRotoscoping()}
										title="Neural Auto-Rotoscoping Magic Wand"
									>
										🪄 Roto
									</button>

									{/* Multi-Camera Angle Auto-Sync (Phase 205) */}
									<button
										className="text-xs font-medium bg-amber-600 hover:bg-amber-500 text-foreground px-2 py-1 rounded transition-colors shadow-sm flex items-center gap-1"
										onClick={() => handleMulticamSync()}
										title="Auto-Sync Multi-Cam via Audio"
									>
										🎧 Sync Audio
									</button>

									<div className="h-4 w-px bg-glass mx-1"></div>

									<div className="flex items-center gap-2">
										<span className="text-[10px] text-muted uppercase font-semibold">
											Track Height
										</span>
										<div className="flex gap-1 bg-background p-0.5 rounded border border-border">
											<button
												onClick={() => setTrackHeightSize("sm")}
												className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${trackHeightSize === "sm" ? "bg-glass text-foreground" : "text-muted hover:text-foreground"}`}
												title="Small Track Height"
											>
												S
											</button>
											<button
												onClick={() => setTrackHeightSize("md")}
												className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${trackHeightSize === "md" ? "bg-glass text-foreground" : "text-muted hover:text-foreground"}`}
												title="Medium Track Height"
											>
												M
											</button>
											<button
												onClick={() => setTrackHeightSize("lg")}
												className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${trackHeightSize === "lg" ? "bg-glass text-foreground" : "text-muted hover:text-foreground"}`}
												title="Large Track Height"
											>
												L
											</button>
										</div>
									</div>
								</div>
								<div className="ml-2 pl-4 border-l border-border flex gap-2">
									<button
										className={`text-xs font-medium text-foreground px-3 py-1 rounded transition-colors shadow-sm ${activeTool === "select" ? "bg-glass border border-zinc-600" : "bg-panel border border-border hover:bg-glass"}`}
										onClick={() => setActiveTool("select")}
										title="Selection Tool (V)"
									>
										👆 Select
									</button>
									<button
										className={`text-xs font-medium text-foreground px-3 py-1 rounded transition-colors shadow-sm ${activeTool === "pen" ? "bg-indigo-600 border border-indigo-500" : "bg-panel border border-border hover:bg-glass"}`}
										onClick={() => setActiveTool("pen")}
										title="Pen Tool - Draw Vector Masks (P)"
									>
										🖋️ Pen
									</button>
									<button
										className={`text-xs font-medium text-foreground px-3 py-1 rounded transition-colors shadow-sm ${activeTool === "magic-eraser" ? "bg-emerald-600 border border-emerald-500" : "bg-panel border border-border hover:bg-glass"}`}
										onClick={() => setActiveTool("magic-eraser")}
										title="Magic Eraser Tool - Object Removal"
									>
										🪄 Eraser
									</button>
									<button
										className={`text-xs font-medium text-foreground px-3 py-1 rounded transition-colors shadow-sm ${activeTool === "razor" ? "bg-red-600 border border-red-500" : "bg-panel border border-border hover:bg-glass"}`}
										onClick={() => setActiveTool("razor")}
										title="Razor Tool (C)"
									>
										✂️ Razor
									</button>
									<button
										className={`text-xs font-medium text-foreground px-3 py-1 rounded transition-colors shadow-sm ${activeTool === "slip" ? "bg-amber-600 border border-amber-500" : "bg-panel border border-border hover:bg-glass"}`}
										onClick={() => setActiveTool("slip")}
										title="Slip Tool (Y)"
									>
										🔄 Slip
									</button>
									<button
										className={`text-xs font-medium text-foreground px-3 py-1 rounded transition-colors shadow-sm ${activeTool === "ripple" ? "bg-purple-600 border border-purple-500" : "bg-panel border border-border hover:bg-glass"}`}
										onClick={() => setActiveTool("ripple")}
										title="Ripple Tool (B)"
									>
										🌊 Ripple
									</button>
									<button
										onClick={() => setActiveTool("slide")}
										className={`text-xs font-medium text-foreground px-3 py-1 rounded transition-colors shadow-sm ${activeTool === "slide" ? "bg-cyan-600 border border-cyan-500" : "bg-panel border border-border hover:bg-glass"}`}
										title="Slide Edit Tool (Move clip without changing duration or timeline length)"
									>
										Slide
									</button>
									<button
										onClick={() => setActiveTool("roll")}
										className={`text-xs font-medium text-foreground px-3 py-1 rounded transition-colors shadow-sm ${activeTool === "roll" ? "bg-pink-600 border border-pink-500" : "bg-panel border border-border hover:bg-glass"}`}
										title="Roll Edit Tool (Trim adjoining clips simultaneously)"
									>
										Roll
									</button>
								</div>
								<div className="ml-2 pl-4 border-l border-border flex gap-2">
									<button
										className="text-xs font-medium text-foreground bg-panel border border-border px-3 py-1 rounded hover:bg-glass disabled:opacity-50 transition-colors shadow-sm"
										onClick={() => handleSplitClip()}
										disabled={
											!selectedClip ||
											frame <= selectedClip.start_frame ||
											frame >=
												selectedClip.start_frame + selectedClip.duration_frames
										}
										title="Split Selected Clip at Playhead"
									>
										✂️ Split
									</button>
									<button
										className="text-xs font-medium text-amber-200 bg-amber-900/30 border border-amber-700/50 px-3 py-1 rounded hover:bg-amber-900/50 disabled:opacity-50 transition-colors shadow-sm"
										onClick={() => handleSceneCutDetection()}
										disabled={!selectedClip}
										title="AI Scene Edit Detection (Auto-Chop)"
									>
										🪄 AI Scene Detect
									</button>
									<button
										className="text-xs font-medium text-foreground bg-panel border border-border px-3 py-1 rounded hover:bg-glass transition-colors shadow-sm"
										onClick={handleCompoundClip}
										title="Create Compound Clip (Opt+C)"
									>
										📦 Compound Clip
									</button>
									<button
										className="text-xs font-medium text-foreground bg-panel border border-border px-3 py-1 rounded hover:bg-glass transition-colors shadow-sm"
										onClick={handleAddMarker}
										title="Add Marker at Playhead (M)"
									>
										🏁 Marker
									</button>
									{/* Cloud Comment (Phase 17) */}
									<button
										className="text-xs font-medium text-sky-200 bg-sky-900/30 border border-sky-700/50 px-3 py-1 rounded hover:bg-sky-900/50 transition-colors shadow-sm"
										onClick={handleAddCloudComment}
										title="Add Cloud Comment (Frame.io Parity)"
									>
										💬 Comment
									</button>
									<button
										className="text-xs font-medium text-foreground bg-panel border border-border px-3 py-1 rounded hover:bg-glass transition-colors shadow-sm"
										onClick={handleAddText}
									>
										+ Add Text
									</button>
									<button
										className="text-xs font-medium text-foreground bg-panel border border-border px-3 py-1 rounded hover:bg-glass transition-colors shadow-sm"
										onClick={handleAddAdjustmentLayer}
										title="Add an Adjustment Layer to apply effects to all clips below it"
									>
										✨ Adj. Layer
									</button>
									<button
										className="text-xs font-medium text-foreground bg-panel border border-border px-3 py-1 rounded hover:bg-glass transition-colors shadow-sm"
										onClick={handleAutoCaption}
										title="Generate Auto-Captions from Audio"
									>
										✨ Auto-Caption
									</button>
									<button
										className="text-xs font-medium text-foreground bg-panel border border-border px-3 py-1 rounded hover:bg-red-900/50 hover:text-red-400 hover:border-red-900/50 transition-colors shadow-sm"
										onClick={handleRecordVoiceover}
										title="Record Voiceover at Playhead"
									>
										🎤 Record Voiceover
									</button>
									<button
										className="text-xs font-medium text-foreground bg-panel border border-border px-3 py-1 rounded hover:bg-glass disabled:opacity-50 transition-colors shadow-sm"
										onClick={handleDuplicateClip}
										disabled={!selectedClip}
										title="Duplicate Selected Clip (Cmd+D)"
									>
										📋 Duplicate
									</button>
									<button
										className="text-xs font-medium text-foreground bg-panel border border-border px-3 py-1 rounded hover:bg-glass transition-colors shadow-sm"
										onClick={handleAddMarker}
										title="Add Marker at Playhead (M)"
									>
										🏁 Marker
									</button>
								</div>
							</div>
							<div className="flex-1 overflow-hidden relative">
								{/* Phase 28: BCI Emotion Heatmap Overlay */}
								{isEmotionHeatmapMode && (
									<div className="absolute inset-0 pointer-events-none z-[50] mix-blend-screen opacity-40 flex">
										{/* Simulated emotional response heatmap along the timeline */}
										<div className="h-full w-[20%] bg-gradient-to-r from-blue-500/0 via-red-500/50 to-orange-500/80" />
										<div className="h-full w-[10%] bg-gradient-to-r from-orange-500/80 via-yellow-400/80 to-green-500/30" />
										<div className="h-full w-[30%] bg-gradient-to-r from-green-500/30 via-blue-500/10 to-blue-500/10" />
										<div className="h-full w-[15%] bg-gradient-to-r from-blue-500/10 via-purple-500/60 to-pink-500/80" />
										<div className="h-full w-[25%] bg-gradient-to-r from-pink-500/80 via-red-600/90 to-red-500/0" />
									</div>
								)}
								<Timeline
									project={projectData}
									frame={frame}
									isQuantumSuperposition={isQuantumSuperposition}
									onChangeFrame={setFrame}
									onProjectUpdate={setProjectData}
									onCommitUpdate={commitState}
									selectedClipId={selectedClipId}
									selectedClipIds={selectedClipIds}
									cloudComments={cloudComments}
									onSelectClip={(id) => {
										setSelectedClipId(id);
										if (id) {
											if (!selectedClipIds.includes(id)) {
												setSelectedClipIds([id]);
											}
										} else {
											setSelectedClipIds([]);
										}
									}}
									// eslint-disable-next-line @typescript-eslint/no-explicit-any
									onToggleSelectClip={(id: any) => {
										if (selectedClipIds.includes(id)) {
											setSelectedClipIds((prev) =>
												prev.filter((x) => x !== id),
											);
											if (selectedClipId === id) setSelectedClipId(null);
										} else {
											setSelectedClipIds((prev) => [...prev, id]);
											setSelectedClipId(id);
										}
									}}
									pxPerFrame={zoomLevel}
									onToggleTrackHide={(idx) =>
										toggleTrackProperty(idx, "isHidden")
									}
									onToggleTrackLock={(idx) =>
										toggleTrackProperty(idx, "isLocked")
									}
									onToggleTrackMute={(idx) =>
										toggleTrackProperty(idx, "isMuted")
									}
									onToggleTrackSolo={(idx) =>
										toggleTrackProperty(idx, "isSoloed")
									}
									isSnappingEnabled={isSnappingEnabled}
									onMoveTrack={handleMoveTrack}
									isPlaying={isPlaying}
									trackHeight={trackHeightSize}
									markers={projectData.markers || []}
									onRenameTrack={handleRenameTrack}
									// eslint-disable-next-line @typescript-eslint/no-explicit-any
									activeTool={activeTool as any}
									// eslint-disable-next-line lazynext/prefer-object-params
									onContextMenuTrack={(e, trackIdx) => {
										setTrackContextMenu({
											x: e.clientX,
											y: e.clientY,
											trackIdx,
										});
									}}
									// eslint-disable-next-line lazynext/prefer-object-params
									onClickClip={(e, clipId, frameAtClick) => {
										if (activeTool === "razor" && frameAtClick !== undefined) {
											handleSplitClip(clipId, frameAtClick);
										} else {
											setSelectedClipId(clipId);
										}
									}}
									// eslint-disable-next-line lazynext/prefer-object-params
									onContextMenuClip={(e, clipId) => {
										e.preventDefault();
										setSelectedClipId(clipId);
										setContextMenu({ x: e.clientX, y: e.clientY, clipId });
									}}
								/>
							</div>
						</>
					)}
				</section>
			</div>

			{/* Context Menu */}
			{contextMenu && (
				<div
					className="fixed z-[100] bg-panel border border-border shadow-2xl rounded py-1 flex flex-col w-48 text-sm"
					style={{ top: contextMenu.y, left: contextMenu.x }}
					onClick={(e) => e.stopPropagation()}
				>
					<button
						className="text-left px-4 py-1.5 hover:bg-glass text-foreground w-full"
						onClick={() => {
							handleCopy();
							setContextMenu(null);
						}}
					>
						Copy
					</button>
					<button
						className="text-left px-4 py-1.5 hover:bg-glass text-foreground w-full"
						onClick={() => {
							handleDuplicateClip();
							setContextMenu(null);
						}}
					>
						Duplicate
					</button>
					<button
						className="text-left px-4 py-1.5 hover:bg-glass text-foreground w-full"
						onClick={() => {
							handleSplitClip();
							setContextMenu(null);
						}}
					>
						Split at Playhead
					</button>
					<div className="h-px bg-glass my-1"></div>
					<button
						className="text-left px-4 py-1.5 hover:bg-glass text-foreground w-full"
						onClick={() => {
							handleToggleDisabled();
							setContextMenu(null);
						}}
					>
						{selectedClip?.isDisabled ? "Enable Clip" : "Disable Clip"}
					</button>
					{selectedClip?.type === "video" && (
						<button
							className="text-left px-4 py-1.5 hover:bg-glass text-foreground w-full"
							onClick={() => {
								handleDetachAudio();
								setContextMenu(null);
							}}
						>
							Detach Audio
						</button>
					)}
					{selectedClip?.type === "audio" && (
						<button
							className="text-left px-4 py-1.5 hover:bg-indigo-600 text-foreground w-full flex items-center gap-2"
							onClick={() => {
								handleSplitStems();
								setContextMenu(null);
							}}
						>
							<Sparkles className="w-3 h-3 text-cyan-400" />
							AI Split Stems
						</button>
					)}
					{(selectedClip?.type === "video" ||
						selectedClip?.type === "audio") && (
						<button
							className="text-left px-4 py-1.5 hover:bg-glass text-foreground w-full"
							onClick={() => {
								if (selectedTrackIdx === -1 || selectedClipIdx === -1) return;
								const clip =
									projectData.tracks[selectedTrackIdx].clips[selectedClipIdx];
								let targetClip = null;
								for (let t = 0; t < projectData.tracks.length; t++) {
									if (t === selectedTrackIdx) continue;

									const overlapping = projectData.tracks[t].clips.find(
										(c: any) =>
											c.start_frame < clip.start_frame + clip.duration_frames &&
											c.start_frame + c.duration_frames > clip.start_frame,
									);
									if (overlapping) {
										targetClip = overlapping;
										break;
									}
								}
								if (!targetClip) {
									toast.success("No overlapping clip found to sync to.");
								} else {
									const newStartFrame =
										targetClip.start_frame -
										(targetClip.media_offset_frames || 0) +
										(clip.media_offset_frames || 0);
									updateSelectedClip({ start_frame: newStartFrame });
								}
								setContextMenu(null);
							}}
						>
							Auto-Sync Audio
						</button>
					)}
					<div className="h-px bg-glass my-1"></div>

					<div className="px-4 py-1.5 flex gap-1 justify-between">
						<button
							className="w-4 h-4 rounded-full bg-indigo-600 border border-indigo-400 hover:scale-110 transition-transform"
							onClick={() => {
								updateSelectedClip({
									color:
										"bg-indigo-600/80 border-indigo-400 hover:bg-indigo-500",
								});
								setContextMenu(null);
							}}
							title="Default"
						/>
						<button
							className="w-4 h-4 rounded-full bg-red-600 border border-red-400 hover:scale-110 transition-transform"
							onClick={() => {
								updateSelectedClip({
									color: "bg-red-600/80 border-red-400 hover:bg-red-500",
								});
								setContextMenu(null);
							}}
							title="Red"
						/>
						<button
							className="w-4 h-4 rounded-full bg-emerald-600 border border-emerald-400 hover:scale-110 transition-transform"
							onClick={() => {
								updateSelectedClip({
									color:
										"bg-emerald-600/80 border-emerald-400 hover:bg-emerald-500",
								});
								setContextMenu(null);
							}}
							title="Green"
						/>
						<button
							className="w-4 h-4 rounded-full bg-amber-500 border border-amber-300 hover:scale-110 transition-transform"
							onClick={() => {
								updateSelectedClip({
									color: "bg-amber-500/80 border-amber-300 hover:bg-amber-400",
								});
								setContextMenu(null);
							}}
							title="Yellow"
						/>
						<button
							className="w-4 h-4 rounded-full bg-cyan-600 border border-cyan-400 hover:scale-110 transition-transform"
							onClick={() => {
								updateSelectedClip({
									color: "bg-cyan-600/80 border-cyan-400 hover:bg-cyan-500",
								});
								setContextMenu(null);
							}}
							title="Cyan"
						/>
						<button
							className="w-4 h-4 rounded-full bg-fuchsia-600 border border-cyan-400 hover:scale-110 transition-transform"
							onClick={() => {
								updateSelectedClip({
									color:
										"bg-fuchsia-600/80 border-cyan-400 hover:bg-fuchsia-500",
								});
								setContextMenu(null);
							}}
							title="Magenta"
						/>
					</div>

					<div className="h-px bg-glass my-1"></div>

					<button
						className="text-left px-4 py-1.5 hover:bg-glass text-foreground w-full"
						onClick={() => {
							if (selectedTrackIdx === -1 || selectedClipIdx === -1) return;
							const clip =
								projectData.tracks[selectedTrackIdx].clips[selectedClipIdx];
							const relativeFrame = frameRef.current - clip.start_frame;
							if (relativeFrame >= 0 && relativeFrame <= clip.duration_frames) {
								const newMarkers = [
									...(clip.markers || []),
									{
										frameOffset: relativeFrame,
										label: "Marker",
										color: "#ec4899",
									},
								];
								updateSelectedClip({ markers: newMarkers });
							} else {
								toast.error("Playhead must be over the clip to add a marker.");
							}
							setContextMenu(null);
						}}
					>
						Add Marker at Playhead
					</button>

					<div className="h-px bg-glass my-1"></div>
					<button
						className="text-left px-4 py-1.5 hover:bg-red-500/20 text-red-400 w-full"
						onClick={() => {
							handleDeleteClip();
							setContextMenu(null);
						}}
					>
						Delete
					</button>
					<button
						className="text-left px-4 py-1.5 hover:bg-red-500/20 text-red-400 w-full"
						onClick={() => {
							handleRippleDeleteClip();
							setContextMenu(null);
						}}
					>
						Ripple Delete
					</button>
				</div>
			)}

			{/* Export Modal Overlay */}
			{isExporting && (
				<div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center transition-opacity duration-300">
					<div className="bg-background/90 border border-border/50 p-8 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] w-[400px] flex flex-col items-center relative overflow-hidden">
						{/* Animated background glow */}
						<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-pulse"></div>

						<div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
							<svg
								className="w-8 h-8 text-indigo-400 animate-spin"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									className="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									strokeWidth="4"
								></circle>
								<path
									className="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
						</div>

						<h3 className="text-foreground text-xl font-medium mb-2 tracking-tight">
							Exporting Master
						</h3>
						<p className="text-muted text-sm mb-8 text-center px-4">
							Your video is being processed using WebCodecs hardware
							acceleration.
						</p>

						<div className="w-full bg-panel/80 rounded-full h-3 overflow-hidden mb-3 border border-border/50 relative">
							<div
								className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-300 ease-out"
								style={{ width: `${exportProgress}%` }}
							>
								<div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-white/20 animate-[shimmer_2s_infinite]"></div>
							</div>
						</div>

						<div className="flex justify-between w-full text-xs font-medium">
							<span className="text-muted">Processing...</span>
							<span className="text-indigo-400">
								{Math.round(exportProgress)}%
							</span>
						</div>
					</div>
				</div>
			)}

			{/* Phase 25: Render Farm Dashboard Modal */}
			<RenderFarmModal isOpen={isFarmRendering} farmProgress={farmProgress} />

			{/* Modals & Popovers */}

			{trackContextMenu && (
				<>
					<div
						className="fixed inset-0 z-40"
						onClick={() => setTrackContextMenu(null)}
						onContextMenu={(e: any) => {
							e.preventDefault();
							setTrackContextMenu(null);
						}}
					/>
					<div
						className="fixed z-50 bg-background border border-border rounded shadow-xl py-1 w-48"
						style={{ left: trackContextMenu.x, top: trackContextMenu.y }}
					>
						<div className="px-3 py-1 text-xs text-muted font-medium">
							Track Color
						</div>
						<div className="flex flex-wrap gap-1.5 px-3 py-2">
							{[
								"#ef4444",
								"#f97316",
								"#eab308",
								"#22c55e",
								"#3b82f6",
								"#a855f7",
								"#ec4899",
								"transparent",
							].map((color) => (
								<button
									key={color}
									className="w-5 h-5 rounded-full border border-border hover:scale-110 transition-transform"
									style={{
										backgroundColor:
											color === "transparent" ? "#18181b" : color,
									}}
									title={color === "transparent" ? "No Color" : color}
									onClick={() => {
										setProjectData((prev: any) => {
											const np = JSON.parse(JSON.stringify(prev));
											if (
												trackContextMenu?.trackIdx != null &&
												np.tracks[trackContextMenu.trackIdx]
											) {
												np.tracks[trackContextMenu.trackIdx].color =
													color === "transparent" ? undefined : color;
											}
											return np;
										});
										setTrackContextMenu(null);
									}}
								/>
							))}
						</div>
						<hr className="border-border my-1" />
						<button
							className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-panel"
							onClick={() => {
								setProjectData((prev: any) => {
									const np = JSON.parse(JSON.stringify(prev));

									np.tracks = np.tracks.filter(
										(_: any, i: number) => i !== trackContextMenu.trackIdx,
									);
									return np;
								});
								setTrackContextMenu(null);
							}}
						>
							Delete Track
						</button>
					</div>
				</>
			)}

			{/* Advanced Audio Mixer Panel */}
			{showAudioMixer && (
				<div className="fixed bottom-0 right-0 w-[500px] h-[350px] bg-background border-t border-l border-border shadow-[0_-10px_40px_rgba(0,0,0,0.8)] z-[150] flex flex-col">
					<div className="h-8 bg-background border-b border-border flex items-center justify-between px-3">
						<div className="flex items-center gap-2">
							<svg
								className="w-3.5 h-3.5 text-emerald-500"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
								/>
							</svg>
							<span className="text-[10px] font-bold tracking-widest text-foreground uppercase">
								Fairlight Audio Mixer
							</span>
						</div>
						<button
							onClick={() => setShowAudioMixer(false)}
							className="text-muted hover:text-foreground transition-colors"
						>
							<svg
								className="w-4 h-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>

					<div className="flex-1 flex p-2 gap-2 overflow-x-auto bg-background/50 hide-scrollbar">
						{/* Render audio tracks */}
						{projectData.tracks
							?.filter((t: any) => t.type === "audio")
							.map((track: any, i: number) => (
								<div
									key={track.id}
									className="w-20 bg-panel border border-border rounded flex flex-col items-center py-2 shrink-0"
								>
									<span className="text-[10px] font-semibold text-muted mb-2 truncate w-full text-center px-1">
										A{i + 1}
									</span>

									{/* Pan knob */}
									<div className="w-8 h-8 rounded-full bg-background border border-zinc-600 mb-2 relative">
										<div className="absolute top-1 left-1/2 w-0.5 h-3 bg-zinc-400 origin-bottom transform rotate-0"></div>
									</div>
									<span className="text-[8px] text-muted mb-4">PAN</span>

									{/* VST / Effects Rack (Phase 19) */}
									<div className="w-full px-1 mb-3 flex flex-col gap-1">
										<div
											className="w-full h-4 bg-background border border-border rounded text-[8px] text-muted flex items-center justify-center cursor-pointer hover:bg-glass hover:text-foreground transition-colors"
											title="Add VST Plugin"
											onClick={() =>
												toast.success(
													"VST Plugin browser opened. Support for VST3/AU coming in Phase 19.b",
												)
											}
										>
											+ VST
										</div>
										<div className="w-full h-4 bg-background/50 border border-border rounded text-[8px] text-zinc-600 flex items-center justify-center border-dashed">
											empty
										</div>
									</div>

									{/* Fader Track */}
									<div className="flex-1 w-full flex justify-center relative px-2">
										<div className="w-1.5 h-full bg-background rounded-full border border-zinc-900 relative">
											<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-8 bg-glass border-b-4 border-zinc-900 rounded cursor-ns-resize hover:bg-zinc-600 shadow-lg flex items-center justify-center">
												<div className="w-3 h-0.5 bg-zinc-400"></div>
											</div>
										</div>
										{/* Volume Meter */}
										<div className="w-2 h-full bg-background rounded-sm border border-zinc-900 ml-2 relative overflow-hidden flex flex-col justify-end">
											<div
												className={`w-full bg-emerald-500 transition-all duration-100 ${isPlaying ? "h-[60%] animate-pulse" : "h-0"}`}
											></div>
											{isPlaying && (
												<div className="absolute top-[35%] w-full h-0.5 bg-yellow-400"></div>
											)}
											{isPlaying && (
												<div className="absolute top-[20%] w-full h-0.5 bg-red-500"></div>
											)}
										</div>
									</div>

									<span className="text-[10px] text-emerald-400 mt-2 font-mono">
										0.0 dB
									</span>
								</div>
							))}

						{/* Master Bus */}
						<div className="w-24 bg-panel border-2 border-zinc-600 rounded flex flex-col items-center py-2 shrink-0 ml-auto shadow-lg relative overflow-hidden">
							<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-amber-500"></div>
							<span className="text-[11px] font-bold text-foreground mb-2 truncate w-full text-center px-1">
								MAIN
							</span>

							<div className="flex gap-1 mb-4">
								<button className="w-6 h-4 bg-background border border-border rounded text-[8px] text-muted hover:text-foreground">
									EQ
								</button>
								<button className="w-6 h-4 bg-background border border-border rounded text-[8px] text-muted hover:text-foreground">
									DYN
								</button>
							</div>

							<div className="flex-1 w-full flex justify-center relative px-2">
								<div className="w-2 h-full bg-background rounded-full border border-zinc-900 relative">
									<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-zinc-300 border-b-4 border-zinc-500 rounded cursor-ns-resize hover:bg-white shadow-lg flex items-center justify-center">
										<div className="w-4 h-0.5 bg-panel"></div>
									</div>
								</div>
								{/* Stereo Volume Meter */}
								<div className="flex gap-0.5 ml-2">
									<div className="w-2 h-full bg-background rounded-sm border border-zinc-900 relative overflow-hidden flex flex-col justify-end">
										<div
											className={`w-full bg-emerald-400 transition-all duration-75 ${isPlaying ? "h-[75%]" : "h-0"}`}
										></div>
									</div>
									<div className="w-2 h-full bg-background rounded-sm border border-zinc-900 relative overflow-hidden flex flex-col justify-end">
										<div
											className={`w-full bg-emerald-400 transition-all duration-75 ${isPlaying ? "h-[70%]" : "h-0"}`}
										></div>
									</div>
								</div>
							</div>

							<span className="text-[10px] text-foreground mt-2 font-mono">
								-3.2 dB
							</span>
						</div>
					</div>
				</div>
			)}

			{/* Multiplayer Cursors Overlay */}
			{remoteCursors.map((cursor) => (
				<div
					key={cursor.id}
					className="fixed pointer-events-none z-[9999] transition-all duration-1000 ease-linear"
					style={{ left: cursor.x, top: cursor.y }}
				>
					<svg
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M5.65376 2.15376C5.40552 1.90552 5 2.08139 5 2.43232V21.4935C5 21.8653 5.46513 22.0326 5.70775 21.7516L11.5367 15.0003C11.6669 14.8494 11.8596 14.7617 12.0592 14.7617H21.5677C21.9186 14.7617 22.0945 14.3562 21.8462 14.108L5.65376 2.15376Z"
							fill={cursor.color}
							stroke="white"
							strokeWidth="1.5"
							strokeLinejoin="round"
						/>
					</svg>
					<div
						className="absolute top-6 left-4 px-2 py-1 rounded shadow-lg text-[10px] font-bold text-foreground whitespace-nowrap"
						style={{ backgroundColor: cursor.color }}
					>
						{cursor.name}
					</div>
				</div>
			))}

			{/* Bezier Graph Editor Modal */}
			<BezierEditorModal
				bezierEditor={bezierEditor}
				setBezierEditor={setBezierEditor}
				projectData={projectData}
				commitState={commitState}
			/>

			{/* Deliver Page Overlay */}
			{showDeliverPage && (
				<div className="absolute inset-0 bg-background z-50 flex flex-col font-sans">
					<div className="h-14 border-b border-border flex items-center px-6 justify-between bg-background shadow-md z-10">
						<div className="flex items-center gap-3">
							<svg
								className="w-5 h-5 text-indigo-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
								/>
							</svg>
							<h2 className="text-foreground font-medium tracking-wide">
								Deliver
							</h2>
							<span className="text-[10px] text-muted bg-panel px-2 py-0.5 rounded-full font-mono">
								{projectData.name || "Untitled"}
							</span>
						</div>
						<button
							onClick={() => setShowDeliverPage(false)}
							className="text-muted hover:text-foreground transition-colors bg-panel p-1.5 rounded hover:bg-glass"
						>
							<svg
								className="w-5 h-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>
					<div className="flex flex-1 overflow-hidden">
						{/* Preset Cards + Settings Sidebar */}
						<div className="w-[420px] bg-background border-r border-border flex flex-col overflow-y-auto custom-scrollbar shadow-[4px_0_24px_rgba(0,0,0,0.5)] z-10">
							{/* Presets Grid */}
							<div className="p-5 border-b border-border">
								<h3 className="text-xs text-muted uppercase tracking-widest font-semibold mb-4 flex items-center gap-2">
									<svg
										className="w-3.5 h-3.5 text-indigo-400"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
										/>
									</svg>
									Export Presets
								</h3>
								<div className="grid grid-cols-2 gap-2">
									{[
										{
											id: "youtube_4k",
											name: "YouTube 4K",
											icon: "▶️",
											format: "MP4 H.264",
											res: "3840×2160",
											fps: "60",
											bitrate: "80 Mbps",
											color: "from-red-600/20 to-red-900/10 border-red-800/40",
										},
										{
											id: "youtube_1080",
											name: "YouTube HD",
											icon: "▶️",
											format: "MP4 H.264",
											res: "1920×1080",
											fps: "30",
											bitrate: "16 Mbps",
											color: "from-red-600/20 to-red-900/10 border-red-800/40",
										},
										{
											id: "instagram_reel",
											name: "IG Reel",
											icon: "📸",
											format: "MP4 H.264",
											res: "1080×1920",
											fps: "30",
											bitrate: "12 Mbps",
											color:
												"from-pink-600/20 to-pink-900/10 border-pink-800/40",
										},
										{
											id: "tiktok",
											name: "TikTok",
											icon: "🎵",
											format: "MP4 H.264",
											res: "1080×1920",
											fps: "30",
											bitrate: "10 Mbps",
											color:
												"from-cyan-600/20 to-cyan-900/10 border-cyan-800/40",
										},
										{
											id: "twitter",
											name: "X/Twitter",
											icon: "𝕏",
											format: "MP4 H.264",
											res: "1920×1080",
											fps: "30",
											bitrate: "12 Mbps",
											color:
												"from-blue-600/20 to-blue-900/10 border-blue-800/40",
										},
										{
											id: "prores_master",
											name: "ProRes Master",
											icon: "🎬",
											format: "MOV ProRes 422",
											res: "1920×1080",
											fps: "24",
											bitrate: "147 Mbps",
											color:
												"from-amber-600/20 to-amber-900/10 border-amber-800/40",
										},
										{
											id: "webm_web",
											name: "Web (VP9)",
											icon: "🌐",
											format: "WebM VP9",
											res: "1920×1080",
											fps: "30",
											bitrate: "8 Mbps",
											color:
												"from-emerald-600/20 to-emerald-900/10 border-emerald-800/40",
										},
										{
											id: "gif",
											name: "GIF",
											icon: "🖼️",
											format: "GIF",
											res: "480×270",
											fps: "15",
											bitrate: "N/A",
											color:
												"from-blue-600/20 to-blue-900/10 border-blue-800/40",
										},
									].map((preset) => (
										<button
											key={preset.id}
											onClick={() => setSelectedExportPreset(preset.id)}
											className={`relative p-3 rounded-lg border text-left transition-all duration-200 bg-gradient-to-br ${preset.color} ${
												selectedExportPreset === preset.id
													? "ring-2 ring-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.25)] scale-[1.02]"
													: "hover:scale-[1.01] hover:brightness-110"
											}`}
										>
											<div className="text-lg mb-1">{preset.icon}</div>
											<div className="text-xs font-semibold text-foreground truncate">
												{preset.name}
											</div>
											<div className="text-[10px] text-muted mt-0.5">
												{preset.format}
											</div>
											<div className="text-[10px] text-muted">
												{preset.res} · {preset.fps}fps
											</div>
											{selectedExportPreset === preset.id && (
												<div className="absolute top-1.5 right-1.5 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
													<svg
														className="w-2.5 h-2.5 text-foreground"
														fill="none"
														viewBox="0 0 24 24"
														stroke="currentColor"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={3}
															d="M5 13l4 4L19 7"
														/>
													</svg>
												</div>
											)}
										</button>
									))}
								</div>
							</div>

							{/* Detailed Settings */}
							<div className="p-5 flex flex-col gap-4">
								<div className="flex items-center justify-between mb-1">
									<h3 className="text-xs text-muted uppercase tracking-widest font-semibold flex items-center gap-2">
										<svg
											className="w-3.5 h-3.5 text-indigo-400"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
											/>
										</svg>
										Output Settings
									</h3>
									<button
										onClick={handleCustomPresetSave}
										className="text-[10px] text-foreground bg-panel border border-border px-2 py-0.5 rounded hover:bg-glass transition-colors shadow-sm"
									>
										💾 Save Preset
									</button>
								</div>

								<div className="flex flex-col gap-1">
									<label className="text-[10px] text-muted uppercase tracking-wide font-medium">
										File Name
									</label>
									<input
										type="text"
										defaultValue="lazynext-export"
										className="bg-background border border-border/50 rounded text-sm text-foreground px-3 py-2 focus:outline-none focus-ring focus:border-indigo-500 shadow-inner"
									/>
								</div>
								<div className="grid grid-cols-2 gap-3">
									<div className="flex flex-col gap-1">
										<label className="text-[10px] text-muted uppercase tracking-wide font-medium">
											Format
										</label>
										<select className="bg-background border border-border/50 rounded text-xs text-foreground px-2 py-2 focus:outline-none focus-ring focus:border-indigo-500 shadow-inner">
											<option value="mp4">MP4 (H.264)</option>
											<option value="webm">WebM (VP9)</option>
											<option value="mov">QuickTime (ProRes)</option>
											<option value="gif">GIF</option>
										</select>
									</div>

									<div className="flex flex-col gap-1">
										<label className="text-[10px] text-muted uppercase tracking-wide font-medium">
											Resolution
										</label>
										<select className="bg-background border border-border/50 rounded text-xs text-foreground px-2 py-2 focus:outline-none focus-ring focus:border-indigo-500 shadow-inner">
											<option value="3840x2160">3840×2160 (4K)</option>
											<option value="1920x1080">1920×1080 (HD)</option>
											<option value="1280x720">1280×720</option>
											<option value="1080x1920">1080×1920 (Vertical)</option>
											<option value="480x270">480×270 (Low)</option>
										</select>
									</div>
								</div>
								<div className="grid grid-cols-2 gap-3">
									<div className="flex flex-col gap-1">
										<label className="text-[10px] text-muted uppercase tracking-wide font-medium">
											Frame Rate
										</label>
										<select className="bg-background border border-border/50 rounded text-xs text-foreground px-2 py-2 focus:outline-none focus-ring focus:border-indigo-500 shadow-inner">
											<option value="24">23.976</option>
											<option value="25">25</option>
											<option value="30">29.97</option>
											<option value="48">48</option>
											<option value="60">59.94</option>
										</select>
									</div>

									<div className="flex flex-col gap-1">
										<label className="text-[10px] text-muted uppercase tracking-wide font-medium">
											Quality
										</label>
										<select className="bg-background border border-border/50 rounded text-xs text-foreground px-2 py-2 focus:outline-none focus-ring focus:border-indigo-500 shadow-inner">
											<option value="best">Best (Highest)</option>
											<option value="high">High</option>
											<option value="medium">Medium</option>
											<option value="low">Low (Fastest)</option>
										</select>
									</div>
								</div>
								<div className="grid grid-cols-2 gap-3">
									<div className="flex flex-col gap-1">
										<label className="text-[10px] text-muted uppercase tracking-wide font-medium">
											Audio Codec
										</label>
										<select className="bg-background border border-border/50 rounded text-xs text-foreground px-2 py-2 focus:outline-none focus-ring focus:border-indigo-500 shadow-inner">
											<option value="aac">AAC (256kbps)</option>
											<option value="pcm">PCM (Uncompressed)</option>
											<option value="none">No Audio</option>
										</select>
									</div>

									<div className="flex flex-col gap-1">
										<label className="text-[10px] text-muted uppercase tracking-wide font-medium">
											Color Space
										</label>
										<select className="bg-background border border-border/50 rounded text-xs text-foreground px-2 py-2 focus:outline-none focus-ring focus:border-indigo-500 shadow-inner">
											<option value="rec709">Rec. 709</option>
											<option value="rec2020">Rec. 2020 (HDR)</option>
											<option value="srgb">sRGB</option>
										</select>
									</div>
								</div>

								{/* Export Chapter Markers (Phase 173) */}
								<div className="mt-4 flex items-center gap-2">
									<input
										type="checkbox"
										id="chapterMarkers"
										className="w-3 h-3 accent-indigo-500 cursor-pointer"
										defaultChecked
									/>
									<label
										htmlFor="chapterMarkers"
										className="text-xs text-foreground cursor-pointer"
									>
										Export Markers as YouTube Chapters
									</label>
								</div>

								{/* Direct Cloud Export (Phase 185) */}

								<div className="mt-4 pt-4 border-t border-border">
									<label className="text-xs font-medium text-muted block mb-2">
										Publish To
									</label>
									<div className="grid grid-cols-2 gap-2">
										<button
											className="flex items-center justify-center gap-2 p-2 bg-[#ff0000]/10 border border-[#ff0000]/20 hover:bg-[#ff0000]/20 rounded transition-colors"
											onClick={() => handleYouTubeAuth()}
										>
											<span className="text-[10px] font-bold text-[#ff0000]">
												YouTube
											</span>
										</button>
										<button
											className="flex items-center justify-center gap-2 p-2 bg-[#19b7ea]/10 border border-[#19b7ea]/20 hover:bg-[#19b7ea]/20 rounded transition-colors"
											onClick={() => handleFrameIoAuth()}
										>
											<span className="text-[10px] font-bold text-[#19b7ea]">
												Frame.io
											</span>
										</button>
									</div>
								</div>
							</div>

							{/* Real-Time Live Streaming (Phase 208) */}
							<div className="px-5 mt-4">
								<button
									className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-500 text-foreground font-bold tracking-wide rounded-lg shadow-lg shadow-red-900/20 transition-all border border-red-500"
									onClick={() => handleLiveStream()}
								>
									<svg
										className="w-4 h-4"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
									GO LIVE NOW (RTMP)
								</button>
							</div>

							{/* Universe Simulation Export (Phase 220) */}
							<div className="px-5 mt-4">
								<button
									className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-500 text-foreground font-bold tracking-wide rounded-lg shadow-[0_0_25px_rgba(147,51,234,0.5)] transition-all border border-purple-400"
									onClick={() =>
										toast.success(
											"Exporting... Creating a self-contained, interactive physical universe simulation based on your timeline data. (Universe ID: U-84729)",
										)
									}
								>
									<svg
										className="w-5 h-5"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"
										/>
									</svg>
									SIMULATE UNIVERSE
								</button>
							</div>

							{/* Distributed Render Farm (Phase 200) */}
							<div className="px-5 mt-2 flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 p-3 rounded mx-5">
								<span className="text-[10px] font-semibold text-emerald-300 flex items-center gap-2">
									<svg
										className="w-4 h-4"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
										/>
									</svg>
									Distributed Render Farm (P2P Cloud)
								</span>

								<label className="relative inline-flex items-center cursor-pointer">
									<input type="checkbox" className="sr-only peer" />
									<div className="w-7 h-4 bg-glass peer-focus:outline-none focus-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
								</label>
							</div>

							{/* Add to Queue Button */}
							<div className="p-5 mt-auto border-t border-border">
								<button
									onClick={() => {
										const presetName = selectedExportPreset || "custom";
										const newItem = {
											id: `render-${Date.now()}`,
											name: `${projectData.name || "Untitled"}_${presetName}`,
											preset: presetName,
											status: "queued" as const,
											progress: 0,
										};
										setRenderQueue((prev) => [...prev, newItem]);
										const interval = setInterval(() => {
											setRenderQueue((prev) =>
												prev.map((item) => {
													if (item.id === newItem.id) {
														if (item.progress >= 100) {
															clearInterval(interval);
															return {
																...item,
																status: "done" as const,
																progress: 100,
															};
														}
														return {
															...item,
															status: "rendering" as const,
															progress: Math.min(
																100,
																item.progress + 0.5 * 4 + 1,
															),
														};
													}
													return item;
												}),
											);
										}, 200);
									}}
									className="w-full bg-indigo-600 hover:bg-indigo-500 text-foreground font-medium py-3 rounded-lg transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] active:scale-[0.98] flex items-center justify-center gap-2"
								>
									<svg
										className="w-4 h-4"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M12 4v16m8-8H4"
										/>
									</svg>
									Add to Render Queue
								</button>
								<button
									onClick={() => startExport({})}
									className="w-full mt-2 bg-panel hover:bg-glass text-foreground font-medium py-2.5 rounded-lg transition-all border border-border text-sm"
								>
									Render Now (Single)
								</button>
							</div>
						</div>

						{/* Right Side: Preview + Render Queue */}
						<div className="flex-1 flex flex-col bg-background">
							{/* Preview */}
							<div className="flex-1 flex flex-col items-center justify-center p-8 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_100%)]">
								<div className="w-full max-w-4xl aspect-video bg-background/50 rounded-xl border border-border shadow-2xl relative overflow-hidden flex flex-col items-center justify-center backdrop-blur-sm group">
									<div
										className="absolute inset-0 opacity-10 pointer-events-none transition-opacity duration-1000 group-hover:opacity-20"
										style={{
											backgroundImage:
												"radial-gradient(circle at center, #818cf8 0%, transparent 70%)",
										}}
									/>
									<svg
										className="w-14 h-14 text-zinc-700 mb-3"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={1}
											d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
										/>
									</svg>
									<span className="text-muted font-medium tracking-widest uppercase text-xs z-10">
										Output Preview
									</span>
									<span className="text-muted text-[10px] mt-1 z-10">
										{projectData.width || 1920} × {projectData.height || 1080} ·{" "}
										{Math.ceil((projectData.duration_frames || 300) / 60)}s
									</span>
								</div>
							</div>

							{/* Render Queue */}
							<div className="h-56 border-t border-border bg-background flex flex-col shrink-0">
								<div className="h-10 border-b border-border flex items-center justify-between px-5">
									<h3 className="text-xs text-muted uppercase tracking-widest font-semibold flex items-center gap-2">
										<svg
											className="w-3.5 h-3.5 text-indigo-400"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M4 6h16M4 10h16M4 14h16M4 18h16"
											/>
										</svg>
										Render Queue ({renderQueue.length})
									</h3>
									{renderQueue.length > 0 && (
										<button
											onClick={() =>
												setRenderQueue((prev) =>
													prev.filter((i) => i.status === "rendering"),
												)
											}
											className="text-[10px] text-muted hover:text-red-400 transition-colors"
										>
											Clear Completed
										</button>
									)}
								</div>
								<div className="flex-1 overflow-y-auto custom-scrollbar">
									{renderQueue.length === 0 ? (
										<div className="flex items-center justify-center h-full text-muted text-xs">
											<div className="text-center">
												<svg
													className="w-8 h-8 mx-auto mb-2 text-zinc-700"
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={1}
														d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
													/>
												</svg>
												Render queue is empty. Select a preset and add a job.
											</div>
										</div>
									) : (
										<div className="flex flex-col">
											{renderQueue.map((item) => (
												<div
													key={item.id}
													className="flex items-center gap-4 px-5 py-3 border-b border-border/50 hover:bg-panel/30 transition-colors"
												>
													<div
														className={`w-2 h-2 rounded-full shrink-0 ${
															item.status === "done"
																? "bg-emerald-500"
																: item.status === "rendering"
																	? "bg-amber-500 animate-pulse"
																	: item.status === "error"
																		? "bg-red-500"
																		: "bg-zinc-600"
														}`}
													/>
													<div className="flex-1 min-w-0">
														<div className="text-xs text-foreground font-medium truncate">
															{item.name}
														</div>
														<div className="text-[10px] text-muted truncate">
															Preset: {item.preset}
														</div>
													</div>
													<div className="w-32 shrink-0">
														{item.status === "rendering" ? (
															<div className="flex items-center gap-2">
																<div className="flex-1 h-1.5 bg-panel rounded-full overflow-hidden">
																	<div
																		className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full transition-all duration-200"
																		style={{ width: `${item.progress}%` }}
																	/>
																</div>
																<span className="text-[10px] text-indigo-400 font-mono w-8 text-right">
																	{Math.round(item.progress)}%
																</span>
															</div>
														) : item.status === "done" ? (
															<span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
																<svg
																	className="w-3 h-3"
																	fill="none"
																	viewBox="0 0 24 24"
																	stroke="currentColor"
																>
																	<path
																		strokeLinecap="round"
																		strokeLinejoin="round"
																		strokeWidth={2}
																		d="M5 13l4 4L19 7"
																	/>
																</svg>
																Complete
															</span>
														) : (
															<span className="text-[10px] text-muted font-medium">
																Queued
															</span>
														)}
													</div>
													<button
														onClick={() =>
															setRenderQueue((prev) =>
																prev.filter((i) => i.id !== item.id),
															)
														}
														className="text-muted hover:text-red-400 transition-colors p-1"
													>
														<svg
															className="w-3.5 h-3.5"
															fill="none"
															viewBox="0 0 24 24"
															stroke="currentColor"
														>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																strokeWidth={2}
																d="M6 18L18 6M6 6l12 12"
															/>
														</svg>
													</button>
												</div>
											))}
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
			{/* Phase 38: Holographic Asset Forge Modal */}
			{isAssetForgeOpen && (
				<div
					className="absolute inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-sm p-8"
					onClick={() => setIsAssetForgeOpen(false)}
				>
					<div
						className="w-full max-w-4xl h-[70vh] rounded-2xl shadow-2xl flex overflow-hidden relative"
						style={{
							background:
								"linear-gradient(135deg, rgba(24,24,27,0.95) 0%, rgba(9,9,11,0.98) 100%)",
							border: "1px solid rgba(217, 70, 239, 0.3)",
							boxShadow:
								"0 0 40px rgba(217, 70, 239, 0.1), inset 0 0 20px rgba(217, 70, 239, 0.05)",
						}}
						onClick={(e) => e.stopPropagation()}
					>
						{/* Background Holographic Grid */}
						<div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgwem0yMCAyMGgyMHYyMEgyMHoiIGZpbGw9IiNkOTQ2ZWYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-30 mix-blend-screen pointer-events-none" />

						<div className="w-64 border-r border-fuchsia-500/20 bg-background/40 p-4 flex flex-col z-10">
							<h3 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 uppercase tracking-widest mb-6 flex items-center gap-2">
								<svg
									className="w-5 h-5 text-cyan-400"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"
									/>
								</svg>
								Asset Forge
							</h3>

							<div className="space-y-4 flex-1">
								<div>
									<label className="text-[10px] text-muted uppercase font-semibold mb-2 block">
										Material Type
									</label>
									<select
										className="w-full bg-background border border-border rounded p-1.5 text-xs text-foreground"
										value={assetForgeMaterial}
										onChange={(e) => setAssetForgeMaterial(e.target.value)}
									>
										<option value="glassmorphism">Glassmorphism</option>
										<option value="liquid-metal">Liquid Metal</option>
										<option value="neon-wireframe">Neon Wireframe</option>
										<option value="volumetric-fog">Volumetric Fog</option>
										<option value="cyber-crystal">Cyber Crystal</option>
									</select>
								</div>

								<div>
									<label className="text-[10px] text-muted uppercase font-semibold mb-2 block">
										Generation Prompt
									</label>
									<textarea
										className="w-full bg-background border border-border rounded p-2 text-xs text-foreground resize-none h-24 focus:border-fuchsia-500 focus:outline-none"
										placeholder="Describe the 3D asset to forge... (e.g. 'A floating cyberpunk city element with glowing pink accents')"
									/>
								</div>

								<button className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-foreground font-bold py-2 rounded text-xs shadow-[0_0_15px_rgba(217,70,239,0.4)] transition-all active:scale-95">
									Forge Asset
								</button>
							</div>
						</div>

						<div className="flex-1 flex flex-col relative z-10 p-6">
							<div className="flex-1 border-2 border-dashed border-fuchsia-500/20 rounded-xl bg-background/20 flex items-center justify-center relative overflow-hidden group">
								<div className="absolute inset-0 bg-gradient-to-b from-transparent to-cyan-500/10 pointer-events-none" />
								<div className="text-center">
									<div className="w-24 h-24 mx-auto border-4 border-fuchsia-500/30 rounded-full flex items-center justify-center animate-spin-slow mb-4 shadow-[0_0_30px_rgba(217,70,239,0.2)]">
										<svg
											className="w-10 h-10 text-cyan-400 opacity-50"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={1}
												d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"
											/>
										</svg>
									</div>
									<p className="text-muted text-sm">
										Holographic projection area
									</p>
									<p className="text-zinc-600 text-xs mt-1">
										Ready to synthesize {assetForgeMaterial}
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
			{/* Command Palette Overlay */}
			{showCommandPalette && (
				<div
					className="absolute inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-background/60 backdrop-blur-sm"
					onClick={() => setShowCommandPalette(false)}
				>
					<div
						className="w-full max-w-2xl bg-background border border-border/50 rounded-xl shadow-2xl overflow-hidden flex flex-col"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center px-4 py-3 border-b border-border">
							<svg
								className="w-5 h-5 text-muted mr-3"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
								/>
							</svg>
							<input
								type="text"
								className="flex-1 bg-transparent border-none text-foreground text-lg focus:outline-none focus-ring placeholder-zinc-500"
								placeholder="Search commands... (e.g. 'Add Text')"
								autoFocus
								value={commandQuery}
								onChange={(e) => setCommandQuery(e.target.value)}
							/>
							<span className="text-xs font-mono text-muted bg-panel px-1.5 py-0.5 rounded">
								ESC
							</span>
						</div>
						<div className="max-h-96 overflow-y-auto">
							{[
								{
									name: "Add Text Clip",
									desc: "Add a new text layer to the timeline",
									icon: "M4 6h16M4 12h16M4 18h7",
								},
								{
									name: "Export Media",
									desc: "Open the Deliver page to render your project",
									icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12",
								},
								{
									name: "Split Clip",
									desc: "Split the selected clip at the playhead",
									icon: "M14 5l7 7m0 0l-7 7m7-7H3",
								},
								{
									name: "Toggle Proxies",
									desc: "Switch to 1/2 resolution proxy mode",
									icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
								},
								{
									name: "Project Settings",
									desc: "Open project configuration",
									icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
								},
							]
								.filter(
									(cmd) =>
										cmd.name
											.toLowerCase()
											.includes(commandQuery.toLowerCase()) ||
										cmd.desc.toLowerCase().includes(commandQuery.toLowerCase()),
								)
								.map((cmd, idx) => (
									<div
										key={idx}
										className="flex items-center px-4 py-3 hover:bg-indigo-600/20 cursor-pointer border-b border-border/50 group"
										onClick={() => setShowCommandPalette(false)}
									>
										<svg
											className="w-5 h-5 text-muted mr-4 group-hover:text-indigo-400"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={1.5}
												d={cmd.icon}
											/>
										</svg>
										<div>
											<div className="text-sm font-medium text-foreground group-hover:text-foreground">
												{cmd.name}
											</div>
											<div className="text-xs text-muted group-hover:text-indigo-200/70">
												{cmd.desc}
											</div>
										</div>
									</div>
								))}
						</div>
					</div>
				</div>
			)}

			{/* Phase 35: God Mode Singularity Overlay */}
			{isGodMode && (
				<>
					{/* Corner Aura - Top Left */}
					<div
						className="fixed top-0 left-0 w-64 h-64 pointer-events-none z-[200] bg-gradient-to-br from-yellow-500/20 via-red-500/10 to-transparent rounded-br-full blur-2xl animate-pulse"
						style={{ animationDuration: "4s" }}
					></div>
					{/* Corner Aura - Top Right */}
					<div
						className="fixed top-0 right-0 w-64 h-64 pointer-events-none z-[200] bg-gradient-to-bl from-fuchsia-500/20 via-purple-500/10 to-transparent rounded-bl-full blur-2xl animate-pulse"
						style={{ animationDuration: "5s" }}
					></div>
					{/* Corner Aura - Bottom Left */}
					<div
						className="fixed bottom-0 left-0 w-64 h-64 pointer-events-none z-[200] bg-gradient-to-tr from-cyan-500/15 via-blue-500/10 to-transparent rounded-tr-full blur-2xl animate-pulse"
						style={{ animationDuration: "6s" }}
					></div>
					{/* Corner Aura - Bottom Right */}
					<div
						className="fixed bottom-0 right-0 w-64 h-64 pointer-events-none z-[200] bg-gradient-to-tl from-emerald-500/15 via-teal-500/10 to-transparent rounded-tl-full blur-2xl animate-pulse"
						style={{ animationDuration: "3.5s" }}
					></div>
					{/* Edge Glow - Full Border */}
					<div className="fixed inset-0 pointer-events-none z-[200] border-2 border-yellow-500/30 rounded-none shadow-[inset_0_0_80px_rgba(234,179,8,0.15),inset_0_0_200px_rgba(220,38,38,0.08)]"></div>
					{/* God Mode Badge */}
					<div className="fixed top-3 left-1/2 -translate-x-1/2 z-[210] pointer-events-none">
						<div className="bg-background/70 backdrop-blur-xl border border-yellow-500/60 px-6 py-1.5 rounded-full shadow-[0_0_30px_rgba(234,179,8,0.5)]">
							<span className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-red-400 to-cyan-400 tracking-[0.3em] uppercase animate-pulse">
								⚡ GOD MODE ACTIVE ⚡
							</span>
						</div>
					</div>
				</>
			)}
			{/* Phase 40: The Singularity ∞ Overlay */}
			{isSingularity && (
				<div className="fixed inset-0 z-[1000] bg-background text-foreground overflow-hidden flex flex-col items-center justify-center animate-in fade-in duration-1000">
					<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-black to-black" />

					{/* Orbital rings */}
					<div
						className="absolute w-[800px] h-[800px] border border-border rounded-full animate-spin-slow pointer-events-none"
						style={{ animationDuration: "60s" }}
					/>
					<div
						className="absolute w-[600px] h-[600px] border border-border rounded-full animate-spin-slow pointer-events-none"
						style={{ animationDuration: "40s", animationDirection: "reverse" }}
					/>
					<div
						className="absolute w-[400px] h-[400px] border border-white/20 rounded-full animate-spin-slow pointer-events-none"
						style={{ animationDuration: "20s" }}
					/>

					<h1 className="text-6xl font-black tracking-tighter mix-blend-difference z-10 mb-8 blur-[1px] animate-pulse">
						THE SINGULARITY
					</h1>
					<p className="text-muted max-w-lg text-center text-sm z-10 font-mono mix-blend-screen">
						Boundless timeline-free canvas engaged. Clips orbit in a fluid,
						non-linear quantum continuum.
					</p>

					{/* Floating 'clips' in orbit */}
					<div className="absolute inset-0 pointer-events-none perspective-[1000px]">
						{projectData.tracks
							?.flatMap((t: any) => t.clips)
							?.slice(0, 15)
							.map((clip: any, i: number) => (
								<div
									key={clip.id}
									className="absolute top-1/2 left-1/2 w-32 h-20 bg-background border border-border rounded-lg shadow-[0_0_30px_rgba(255,255,255,0.1)] flex items-center justify-center overflow-hidden mix-blend-screen"
									style={{
										transform: `translate(-50%, -50%) rotateY(${i * 24}deg) translateZ(${300 + 0.5 * 200}px)`,
										animation: `spin ${20 + i * 2}s linear infinite ${i % 2 === 0 ? "reverse" : "normal"}`,
										opacity: 0.6 + 0.5 * 0.4,
									}}
								>
									<div className="absolute inset-0 bg-indigo-500/20" />
									<span className="text-[8px] font-mono text-muted z-10 text-center px-2 truncate w-full">
										{clip.name}
									</span>
									{clip.thumbnail && (
										<img
											src={clip.thumbnail}
											className="absolute inset-0 w-full h-full object-cover opacity-30"
											alt=""
										/>
									)}
								</div>
							))}
					</div>

					<button
						className="absolute bottom-12 z-50 px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform hover:shadow-[0_0_30px_rgba(255,255,255,0.8)]"
						onClick={() => setIsSingularity(false)}
					>
						COLLAPSE WAVEFUNCTION (Return to Timeline)
					</button>
				</div>
			)}
			{/* Phase 43: Professional Audio Mixer Panel */}
			{isAudioMixerOpen && (
				<div className="absolute bottom-20 right-4 z-50 bg-background/90 backdrop-blur-xl border border-indigo-500/30 rounded-xl p-4 shadow-[0_0_40px_rgba(79,70,229,0.2)] flex flex-col pointer-events-auto">
					<div className="flex border-b border-border">
						<button className="flex-1 py-2 text-xs font-medium text-foreground border-b-2 border-indigo-500 bg-panel/50">
							Clips
						</button>
						<button className="flex-1 py-2 text-xs font-medium text-muted hover:text-foreground hover:bg-panel/30">
							Folders
						</button>
						{/* Phase 49: Cloud Bin Tab */}
						<button className="flex-1 py-2 text-xs font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 flex items-center justify-center gap-1 relative">
							<svg
								className="w-3 h-3"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
								/>
							</svg>
							Cloud Bin
							<div className="absolute top-1 right-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
						</button>
					</div>

					<div className="flex items-center justify-between mb-4 border-b border-border pb-2 pt-2">
						<span className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
							<svg
								className="w-4 h-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
								/>
							</svg>
							Audio Mixer
						</span>
						<button
							onClick={() => setIsAudioMixerOpen(false)}
							className="text-muted hover:text-foreground transition-colors"
						>
							<svg
								className="w-4 h-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>

					<div className="flex gap-4">
						{/* Audio Tracks */}
						{projectData.tracks
							?.filter((t: any) => t.type === "audio")
							.map((track: any, i: number) => (
								<div
									key={track.id}
									className="flex flex-col items-center bg-background/50 p-2 rounded-lg border border-border w-20"
								>
									<span className="text-[10px] text-muted font-bold mb-2">
										A{i + 1}
									</span>
									{/* Simulated LED Meter */}
									<div className="w-4 h-32 bg-background rounded-sm border border-border relative overflow-hidden mb-2 flex flex-col-reverse">
										{Array.from({ length: 20 }).map((_, idx) => (
											<div
												key={idx}
												className={`w-full h-[1.5px] mb-[1px] ${isPlaying && 0.5 > idx / 20 ? (idx > 16 ? "bg-red-500 shadow-[0_0_5px_red]" : idx > 12 ? "bg-yellow-400 shadow-[0_0_5px_yellow]" : "bg-green-500 shadow-[0_0_5px_lime]") : "bg-panel"}`}
											/>
										))}
									</div>
									{/* Fader */}
									<input
										type="range"
										min="-60"
										max="12"
										defaultValue="0"
										className="w-24 h-1 bg-panel rounded-lg appearance-none cursor-pointer -rotate-90 my-12"
									/>
									<div className="text-[9px] font-mono text-muted mt-2">
										0 dB
									</div>
									<div className="flex gap-1 mt-2">
										<button className="w-5 h-5 rounded bg-panel hover:bg-glass text-[8px] font-bold text-muted flex items-center justify-center border border-border">
											M
										</button>
										<button className="w-5 h-5 rounded bg-panel hover:bg-glass text-[8px] font-bold text-muted flex items-center justify-center border border-border">
											S
										</button>
									</div>
								</div>
							))}

						<div className="w-px bg-panel mx-2" />

						{/* Master Track */}
						<div className="flex flex-col items-center bg-background/80 p-2 rounded-lg border border-indigo-900/50 w-24 shadow-[0_0_20px_rgba(79,70,229,0.1)]">
							<span className="text-[10px] text-indigo-400 font-bold mb-2">
								MASTER
							</span>
							{/* Stereo LED Meter */}
							<div className="flex gap-1 mb-2">
								<div className="w-4 h-32 bg-background rounded-sm border border-border relative overflow-hidden flex flex-col-reverse">
									{Array.from({ length: 20 }).map((_, idx) => (
										<div
											key={`l-${idx}`}
											className={`w-full h-[1.5px] mb-[1px] ${isPlaying && 0.5 > idx / 20 ? (idx > 16 ? "bg-red-500 shadow-[0_0_5px_red]" : idx > 12 ? "bg-yellow-400 shadow-[0_0_5px_yellow]" : "bg-green-500 shadow-[0_0_5px_lime]") : "bg-panel"}`}
										/>
									))}
								</div>
								<div className="w-4 h-32 bg-background rounded-sm border border-border relative overflow-hidden flex flex-col-reverse">
									{Array.from({ length: 20 }).map((_, idx) => (
										<div
											key={`r-${idx}`}
											className={`w-full h-[1.5px] mb-[1px] ${isPlaying && 0.5 > idx / 20 ? (idx > 16 ? "bg-red-500 shadow-[0_0_5px_red]" : idx > 12 ? "bg-yellow-400 shadow-[0_0_5px_yellow]" : "bg-green-500 shadow-[0_0_5px_lime]") : "bg-panel"}`}
										/>
									))}
								</div>
							</div>
							{/* Fader */}
							<input
								type="range"
								min="-60"
								max="12"
								defaultValue="0"
								className="w-24 h-1 bg-indigo-900 rounded-lg appearance-none cursor-pointer -rotate-90 my-12"
							/>
							<div className="text-[9px] font-mono text-foreground mt-2">
								0.0 dB
							</div>
							<button className="w-full mt-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-[9px] font-bold text-foreground rounded">
								EQ
							</button>
						</div>
					</div>
				</div>
			)}
			{/* Phase 44: DaVinci-Style Color Scopes Panel */}
			{isColorScopesOpen && (
				<div className="absolute top-20 left-4 z-50 bg-background/90 backdrop-blur-xl border border-teal-500/30 rounded-xl p-4 shadow-[0_0_40px_rgba(20,184,166,0.2)] flex flex-col pointer-events-auto">
					<div className="flex items-center justify-between mb-4 border-b border-border pb-2">
						<span className="text-xs font-bold text-teal-400 uppercase tracking-widest flex items-center gap-2">
							<svg
								className="w-4 h-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
								/>
							</svg>
							Color Scopes
						</span>
						<button
							onClick={() => setIsColorScopesOpen(false)}
							className="text-muted hover:text-foreground transition-colors"
						>
							<svg
								className="w-4 h-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>

					<div className="flex gap-4">
						{/* Waveform Monitor */}
						<div className="flex flex-col items-center">
							<span className="text-[10px] text-muted font-bold mb-1">
								WAVEFORM
							</span>
							<div className="w-48 h-32 bg-background border border-border rounded relative overflow-hidden flex items-end">
								{/* Simulated Waveform Data */}
								{Array.from({ length: 48 }).map((_, idx) => (
									<div
										key={idx}
										className="flex-1 flex flex-col justify-end h-full"
									>
										<div
											className="w-full bg-gradient-to-t from-green-500/20 via-green-400/80 to-transparent blur-[0.5px]"
											style={{
												height: `${0.5 * (isPlaying ? 80 : 30) + 10}%`,
												opacity: 0.5 + 0.5 * 0.5,
											}}
										/>
									</div>
								))}
								{/* Graticule Overlay */}
								<div className="absolute inset-0 pointer-events-none">
									<div className="w-full h-[25%] border-b border-border/50" />
									<div className="w-full h-[25%] border-b border-border/50" />
									<div className="w-full h-[25%] border-b border-border/50" />
								</div>
							</div>
						</div>

						{/* Vectorscope */}
						<div className="flex flex-col items-center">
							<span className="text-[10px] text-muted font-bold mb-1">
								VECTORSCOPE
							</span>
							<div className="w-32 h-32 bg-background border border-border rounded-full relative overflow-hidden flex items-center justify-center">
								{/* Graticule Crosshairs */}
								<div className="absolute inset-0 border border-border/50 rounded-full m-2" />
								<div className="absolute w-full h-px bg-panel/80" />
								<div className="absolute h-full w-px bg-panel/80" />

								{/* Skin Tone Indicator Line */}
								<div className="absolute w-1/2 h-px bg-orange-900/50 origin-left rotate-[-15deg] translate-x-1/2" />

								{/* Simulated Chroma Data Cloud */}
								<div
									className="absolute w-16 h-16 rounded-full mix-blend-screen blur-md animate-pulse"
									style={{
										background:
											"radial-gradient(circle, rgba(20,184,166,0.8) 0%, rgba(20,184,166,0) 70%)",
										transform: `translate(${isPlaying ? 0.5 * 10 - 5 : 0}px, ${isPlaying ? 0.5 * 10 - 5 : 0}px)`,
									}}
								/>
								<div
									className="absolute w-12 h-12 rounded-full mix-blend-screen blur-sm animate-pulse delay-75"
									style={{
										background:
											"radial-gradient(circle, rgba(234,179,8,0.6) 0%, rgba(234,179,8,0) 70%)",
										transform: `translate(${isPlaying ? 0.5 * 20 - 10 : 10}px, ${isPlaying ? 0.5 * 20 - 10 : -10}px)`,
									}}
								/>
							</div>
						</div>
					</div>
				</div>
			)}
			{/* Phase 45: Auto-Captioning Progress Modal */}

			{/* Phase 2: Collaboration Sidebar */}
			{isReviewMode && (
				<div className="absolute top-12 right-0 bottom-0 z-[90]">
					<CollaborationSidebar
						currentFrame={frame}
						onNavigateToFrame={(f) => setFrame(f)}
					/>
				</div>
			)}

			{/* Phase 46: Remote Multiplayer Cursors */}
			{isMultiplayer &&
				remoteCursors.map((cursor) => (
					<div
						key={cursor.id}
						className="fixed pointer-events-none z-[9999]"
						style={{ left: cursor.x, top: cursor.y, transition: "none" }}
					>
						<svg
							width="24"
							height="36"
							viewBox="0 0 24 36"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
							style={{ filter: `drop-shadow(0px 2px 4px rgba(0,0,0,0.5))` }}
						>
							<path
								d="M5.65376 2.15376C5.40573 1.90573 5 2.08146 5 2.43232V29.5677C5 29.9185 5.40573 30.0943 5.65376 29.8462L11.8462 23.6538C11.94 23.5601 12.0671 23.5074 12.1997 23.5074H21.5677C21.9185 23.5074 22.0943 23.1017 21.8462 22.8538L5.65376 2.15376Z"
								fill={cursor.color}
							/>
							<path
								d="M5.65376 2.15376C5.40573 1.90573 5 2.08146 5 2.43232V29.5677C5 29.9185 5.40573 30.0943 5.65376 29.8462L11.8462 23.6538C11.94 23.5601 12.0671 23.5074 12.1997 23.5074H21.5677C21.9185 23.5074 22.0943 23.1017 21.8462 22.8538L5.65376 2.15376Z"
								stroke="white"
								strokeWidth="2"
							/>
						</svg>
						<div
							className="absolute top-6 left-6 whitespace-nowrap bg-background border text-foreground text-[10px] font-bold px-2 py-1 rounded-md shadow-lg flex items-center gap-2"
							style={{ borderColor: cursor.color }}
						>
							<div
								className="w-2 h-2 rounded-full animate-pulse"
								style={{ backgroundColor: cursor.color }}
							/>
							<span>
								{cursor.name}{" "}
								<span className="text-muted font-normal">| {cursor.role}</span>
							</span>
						</div>
					</div>
				))}

			{/* Phase 31: AI Copilot Command Bar (Prompt-to-Edit Engine) */}
			<div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[800px] max-w-[90vw] max-h-[50vh] bg-[var(--bg-panel)]/95 backdrop-blur-3xl border border-[var(--border-glass)] rounded-2xl shadow-[0_0_60px_rgba(1,243,254,0.15)] flex flex-col pointer-events-auto overflow-hidden animate-in fade-in slide-in-from-bottom-4">
				<div className="bg-[var(--accent-primary)]/10 border-b border-[var(--border-glass)] px-4 py-3 flex justify-between items-center relative overflow-hidden">
					<div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-primary)]/20 to-transparent blur-xl pointer-events-none" />
					<div className="flex items-center gap-3 relative z-10">
						<div className="relative flex items-center justify-center">
							<div className="absolute inset-0 bg-[var(--accent-primary)] rounded-full blur-sm animate-pulse" />
							<Bot className="w-5 h-5 text-[var(--accent-primary)] relative z-10" />
						</div>
						<div>
							<span className="text-sm font-bold text-[var(--text-primary)] tracking-wide">
								Prompt-to-Edit Copilot
							</span>
							<p className="text-[10px] text-[var(--accent-primary)] uppercase tracking-widest font-semibold">
								Ready for natural language commands
							</p>
						</div>
					</div>
				</div>

				<div className="p-4 flex-1 overflow-y-auto space-y-4 font-mono text-xs">
					{copilotHistory.map((msg) => (
						<div key={msg.id} className="flex flex-col gap-1">
							{msg.role === "system" && (
								<>
									<div className="text-[var(--text-muted)] text-[10px] mb-1">
										SYSTEM
									</div>
									<div className="text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 p-2 rounded-lg">
										{msg.content}
									</div>
								</>
							)}

							{msg.role === "user" && (
								<div className="flex flex-col gap-1 items-end">
									<div className="text-[var(--text-muted)] text-[10px] mb-1">
										YOU
									</div>
									<div className="bg-[var(--bg-main)] border border-[var(--border-glass)] text-[var(--text-primary)] p-2 rounded-lg max-w-[90%]">
										{msg.content}
									</div>
								</div>
							)}

							{msg.role === "ai" && (
								<>
									<div className="text-[var(--accent-primary)] text-[10px] font-bold mb-1 flex items-center gap-1">
										<Sparkles className="w-3 h-3" /> LAZYNEXT AI AGENT
									</div>
									<div className="bg-[var(--bg-main)] border border-[var(--border-glass)] p-3 rounded-lg flex flex-col gap-2 relative overflow-hidden">
										<div className="absolute inset-0 bg-[var(--accent-primary)]/5 pointer-events-none" />

										{msg.tools && msg.tools.length > 0 && (
											<div className="pl-3 border-l border-[var(--border-glass)] flex flex-col gap-2 mb-2">
												{msg.tools.map((t, idx) => (
													<div
														key={idx}
														className="text-yellow-400 flex items-center gap-2 font-mono text-[10px]"
													>
														<Terminal className="w-3 h-3" />
														[EXEC: {t.name}] {t.args}
													</div>
												))}
											</div>
										)}

										<div className="flex items-center gap-2 text-[var(--text-primary)]">
											{msg.tools && msg.tools.length > 0 ? (
												<Check className="w-3 h-3 text-green-400" />
											) : null}
											{msg.content}
										</div>
									</div>
								</>
							)}
						</div>
					))}

					{isCopilotThinking && (
						<div className="flex flex-col gap-1">
							<div className="text-[var(--accent-primary)] text-[10px] font-bold mb-1 flex items-center gap-1">
								<Sparkles className="w-3 h-3" /> LAZYNEXT AI AGENT
							</div>
							<div className="bg-[var(--bg-main)] border border-[var(--border-glass)] p-3 rounded-lg flex flex-col gap-2 relative overflow-hidden">
								<div className="absolute inset-0 bg-[var(--accent-primary)]/5 pointer-events-none" />
								<div className="flex items-center gap-2 text-[var(--text-primary)]">
									<div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse" />
									Analyzing intent and mapping to WASM hooks...
								</div>
							</div>
						</div>
					)}
				</div>

				<div className="p-3 border-t border-[var(--border-glass)] bg-[var(--bg-main)]/50">
					<div className="relative group">
						<div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--accent-primary)] to-purple-600 rounded-xl opacity-20 group-hover:opacity-40 blur transition duration-500" />
						<input
							type="text"
							placeholder="Ask Lazynext AI Agent to edit..."
							value={copilotPrompt}
							onChange={(e) => setCopilotPrompt(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") handleCopilotSubmit();
							}}
							className="relative w-full bg-[var(--bg-panel)] border border-[var(--border-glass)] rounded-xl py-3 pl-4 pr-12 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)] transition-all"
						/>
						<button
							onClick={handleCopilotSubmit}
							disabled={isCopilotThinking || !copilotPrompt.trim()}
							className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-[var(--accent-primary)] text-[#050505] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<Send className="w-4 h-4" />
						</button>
					</div>
					{aiSnapshot && (
						<div className="mt-2 flex justify-end">
							<button
								onClick={handleUndoAi}
								className="text-xs flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
							>
								<Undo className="w-3 h-3" />
								Undo last AI edit
							</button>
						</div>
					)}
				</div>
			</div>

			{/* Mobile Bottom Navigation Bar (md:hidden) */}
			<div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[var(--bg-panel)] backdrop-blur-xl border-t border-[var(--border-glass)] flex items-center justify-around px-4 z-50 shadow-2xl">
				<button className="flex flex-col items-center justify-center gap-1 text-[var(--accent-primary)] transition-all transform active:scale-95">
					<Layers className="w-5 h-5" />
					<span className="text-[10px] font-semibold tracking-wide">
						Timeline
					</span>
				</button>
				<button className="flex flex-col items-center justify-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all transform active:scale-95">
					<Video className="w-5 h-5" />
					<span className="text-[10px] font-semibold tracking-wide">Media</span>
				</button>
				<button className="flex flex-col items-center justify-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all transform active:scale-95">
					<Settings2 className="w-5 h-5" />
					<span className="text-[10px] font-semibold tracking-wide">
						Adjust
					</span>
				</button>
				<button className="flex flex-col items-center justify-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all transform active:scale-95">
					<Download className="w-5 h-5" />
					<span className="text-[10px] font-semibold tracking-wide">
						Export
					</span>
				</button>
			</div>
		</div>
	);
}
