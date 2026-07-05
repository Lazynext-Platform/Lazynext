/** @module Core EditorCore singleton that orchestrates all editor managers (timeline, playback, media, renderer, etc.) */

import { PlaybackManager } from "./managers/playback-manager";
import { TimelineManager } from "./managers/timeline-manager";
import { ScenesManager } from "./managers/scenes-manager";
import { ProjectManager } from "./managers/project-manager";
import { MediaManager } from "./managers/media-manager";
import { RendererManager } from "./managers/renderer-manager";
import { EngineManager } from "./managers/engine-manager";
import { CommandManager } from "./managers/commands";
import { SaveManager } from "./managers/save-manager";
import { AudioManager } from "./managers/audio-manager";
import { SelectionManager } from "./managers/selection-manager";
import { ClipboardManager } from "./managers/clipboard-manager";
import { DiagnosticsManager } from "./managers/diagnostics-manager";
import { registerDefaultEffects } from "@/effects";
import { registerDefaultMasks } from "@/masks";
import { registerTranscriptionDiagnostics } from "@/transcription/diagnostics";

export class EditorCore {
	private static instance: EditorCore | null = null;
	public readonly timeline: TimelineManager;
	public readonly command: CommandManager;
	public readonly engine: EngineManager;
	public readonly playback: PlaybackManager;
	public readonly scenes: ScenesManager;
	public readonly project: ProjectManager;
	public readonly media: MediaManager;
	public readonly renderer: RendererManager;
	public readonly save: SaveManager;
	public readonly audio: AudioManager;
	public readonly selection: SelectionManager;
	public readonly clipboard: ClipboardManager;
	public readonly diagnostics: DiagnosticsManager;

	// Agent Stubs for PromptMode integration
	public isAgentThinking: boolean = false;
	public operations: any[] = [];

	public async sendIntent(prompt: string) {
		this.isAgentThinking = true;
		try {
			const aiAgentsUrl =
					process.env.NEXT_PUBLIC_AI_AGENTS_URL || "http://localhost:8002";
				const res = await fetch(`${aiAgentsUrl}/orchestrate`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ prompt }),
			});
			const data = await res.json();

			// Map the orchestrated plan into operations for the Execution Contract UI
			if (data.plan) {
				this.operations = [
					...this.operations,
					...data.plan.map((step: any, idx: number) => ({
						id: `op_${Date.now()}_${idx}`,
						type: step.tool,
						args: { desc: step.description },
						status: "verified", // In reality, we'd wait for WASM/CRDT confirmation
					})),
				];
			}

			return data;
		} catch (err) {
			console.error("Agent orchestration failed:", err);
			return null;
		} finally {
			this.isAgentThinking = false;
		}
	}

	/**
	 * Stream an AI orchestration plan's execution progress via SSE.
	 * 
	 * Connects to GET /orchestrate/stream and calls onProgress with each
	 * event (plan, step:start, step:result, step:error, done).
	 * CRDT patches are broadcast separately via WebSocket.
	 * 
	 * Returns an AbortController so the caller can cancel mid-stream.
	 */
	public sendIntentStreaming(
		prompt: string,
		onProgress: (event: { type: string; data: any }) => void,
	): AbortController {
		this.isAgentThinking = true;
		const controller = new AbortController();

		const aiAgentsUrl =
			process.env.NEXT_PUBLIC_AI_AGENTS_URL || "http://localhost:8002";
		const url = new URL(`${aiAgentsUrl}/orchestrate/stream`);
		url.searchParams.set("prompt", prompt);

		fetch(url.toString(), { signal: controller.signal })
			.then(async (res) => {
				if (!res.ok || !res.body) {
					onProgress({ type: "error", data: { error: `HTTP ${res.status}` } });
					this.isAgentThinking = false;
					return;
				}

				const reader = res.body.getReader();
				const decoder = new TextDecoder();
				let buffer = "";

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split("\n");
					buffer = lines.pop() ?? "";

					let currentType = "";
					for (const line of lines) {
						if (line.startsWith("event: ")) {
							currentType = line.slice(7);
						} else if (line.startsWith("data: ") && currentType) {
							try {
								onProgress({ type: currentType, data: JSON.parse(line.slice(6)) });
							} catch {
								onProgress({ type: currentType, data: {} });
							}
							currentType = "";
						}
					}
				}

				this.isAgentThinking = false;
			})
			.catch((err) => {
				if (err.name !== "AbortError") {
					console.error("Agent streaming failed:", err);
					onProgress({ type: "error", data: { error: String(err) } });
				}
				this.isAgentThinking = false;
			});

		return controller;
	}

	private constructor() {
		registerDefaultEffects();
		registerDefaultMasks();
		this.command = new CommandManager(this);
		this.engine = new EngineManager(this);
		this.timeline = new TimelineManager(this);
		this.playback = new PlaybackManager(this);
		this.scenes = new ScenesManager(this);
		this.project = new ProjectManager(this);
		this.media = new MediaManager(this);
		this.renderer = new RendererManager(this);
		this.save = new SaveManager({ editor: this });
		this.audio = new AudioManager(this);
		this.selection = new SelectionManager(this);
		this.clipboard = new ClipboardManager(this);
		this.diagnostics = new DiagnosticsManager(this);
		registerTranscriptionDiagnostics({ diagnostics: this.diagnostics });
		this.playback.bindTimelineScope();
		this.command.registerReactor(() => {
			const activeScene = this.scenes.getActiveSceneOrNull();
			if (!activeScene) {
				return;
			}

			const tracks = activeScene.tracks;
			const prunedTracks = {
				...tracks,
				overlay: tracks.overlay.filter((track) => track.elements.length > 0),
				audio: tracks.audio.filter((track) => track.elements.length > 0),
			};
			if (
				prunedTracks.overlay.length !== tracks.overlay.length ||
				prunedTracks.audio.length !== tracks.audio.length
			) {
				this.timeline.updateTracks(prunedTracks);
			}
		});
		// Engine subscriptions can go here if needed.
		// For now, syncTimelineFromEngine calls editor.scenes.setScenes directly.
		this.save.start();
	}

	static getInstance(): EditorCore {
		if (!EditorCore.instance) {
			EditorCore.instance = new EditorCore();
		}
		return EditorCore.instance;
	}

	static reset(): void {
		EditorCore.instance = null;
	}
}
