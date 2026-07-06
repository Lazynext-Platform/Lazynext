/** @module NativeBridge Native bridge interface for mobile */
import { Platform } from "react-native";
// @ts-ignore — native module available only on device; JS fallback below
import MyModule from "../modules/lazynext-native/src/MyModule";

export interface ApplePencilState {
	pressure: number;
	tilt: { x: number; y: number };
	azimuth: number;
	altitude: number;
	isActive: boolean;
}

interface PencilCapabilities {
	supported: boolean;
	pressureSensitive: boolean;
	tiltSupported: boolean;
}

type PencilCallback = (state: ApplePencilState) => void;
type ConnectivityCallback = (isConnected: boolean) => void;

const MOCK_PROJECT = {
	name: "Demo Cut (Offline)",
	tracks: [
		{
			id: "track_1",
			name: "Video",
			trackType: "video",
			clips: [
				{ id: "clip_001", name: "Opening Shot", start: 0, duration: 150 },
				{ id: "clip_002", name: "B-Roll Montage", start: 150, duration: 210 },
				{ id: "clip_003", name: "Hero Close-up", start: 360, duration: 90 },
			],
		},
		{
			id: "track_2",
			name: "Audio",
			trackType: "audio",
			clips: [
				{ id: "clip_004", name: "Background Music", start: 0, duration: 450 },
			],
		},
	],
};

const pencilSubscribers = new Set<PencilCallback>();
const connectivitySubscribers = new Set<ConnectivityCallback>();

export const NativeBridge = {
	async fetchProject(): Promise<{
		name: string;
		tracks: Array<{
			id: string;
			name: string;
			trackType: string;
			clips: Array<{
				id: string;
				name: string;
				start: number;
				duration: number;
			}>;
		}>;
	}> {
		try {
			const dataStr = await MyModule.getProjectInfo();
			const data = JSON.parse(dataStr);

			return {
				name: data.name || "Lazynext Project",
				tracks: data.tracks || [],
			};
		} catch (e) {
			console.warn("NativeModule fetch error, falling back:", e);
			return MOCK_PROJECT;
		}
	},

	async processIntent(prompt: string): Promise<string> {
		try {
			const result = await MyModule.processIntent(prompt, false);
			return result || "Edit applied successfully.";
		} catch (e) {
			console.warn("NativeModule processIntent error:", e);
			return "Error processing intent via Native Engine.";
		}
	},

	async sendChatMessage(message: string): Promise<string> {
		const trimmed = message?.trim() || "";
		if (!trimmed) {
			return "Please enter a message to send.";
		}
		if (trimmed.length > 50000) {
			return "Message is too long. Please keep it under 50,000 characters.";
		}
		try {
			const result = await MyModule.processIntent(trimmed, true);
			return result || "I've processed your request.";
		} catch (e) {
			console.warn("NativeModule chat error:", e);
			return "Lazynext AI Agent is currently offline.";
		}
	},

	async moveClip(clipId: string, newStart: number): Promise<void> {
		try {
			if (!clipId || clipId.trim().length === 0) {
				throw new Error("clipId must not be empty");
			}
			if (newStart < 0 || !Number.isFinite(newStart)) {
				throw new Error("newStart must be a non-negative finite number");
			}
			await MyModule.moveClip(clipId, newStart);
		} catch (e) {
			console.warn("NativeModule moveClip error:", e);
			throw e; // Propagate error so callers can handle it
		}
	},

	// ── Apple Pencil Support ──

	getPencilCapabilities(): Promise<PencilCapabilities> {
		return new Promise((resolve) => {
			if (Platform.OS !== "ios") {
				resolve({
					supported: false,
					pressureSensitive: false,
					tiltSupported: false,
				});
				return;
			}
		try {
			// @ts-ignore — runtime method on native module
			const caps = MyModule.getPencilCapabilities
				? // @ts-ignore
				  JSON.parse(MyModule.getPencilCapabilities())
				: null;
				resolve(
					caps ?? {
						supported: true,
						pressureSensitive: true,
						tiltSupported: true,
					},
				);
			} catch {
				resolve({
					supported: true,
					pressureSensitive: true,
					tiltSupported: true,
				});
			}
		});
	},

	subscribeToPencilEvents(callback: PencilCallback): () => void {
		pencilSubscribers.add(callback);
		return () => {
			pencilSubscribers.delete(callback);
		};
	},

	/**
	 * Called by the app shell when a touch event with Apple Pencil data
	 * is received. Parses the native event into an ApplePencilState.
	 */
	notifyPencilTouch(touch: {
		force: number;
		altitudeAngle?: number;
		azimuthAngle?: number;
		type?: string;
	}): void {
		const isActive = touch.type === "stylus" || (touch.force ?? 0) > 0;
		const state: ApplePencilState = {
			pressure: Math.min(1, (touch.force ?? 0) / 4),
			tilt: {
				x: Math.cos(touch.azimuthAngle ?? 0) * (touch.altitudeAngle ?? Math.PI / 2),
				y: Math.sin(touch.azimuthAngle ?? 0) * (touch.altitudeAngle ?? Math.PI / 2),
			},
			azimuth: touch.azimuthAngle ?? 0,
			altitude: touch.altitudeAngle ?? Math.PI / 2,
			isActive,
		};
		for (const cb of pencilSubscribers) {
			cb(state);
		}
	},

	// ── Connectivity / Offline ──

	async isOnline(): Promise<boolean> {
		try {
			// @ts-ignore — runtime method on native module
			const module = MyModule as { isOnline?: () => Promise<boolean> };
			return module.isOnline ? await module.isOnline() : true;
		} catch {
			return true;
		}
	},

	onConnectivityChange(callback: ConnectivityCallback): () => void {
		connectivitySubscribers.add(callback);

		let netInfoUnsub: (() => void) | null = null;
		try {
			const NetInfo = require("@react-native-community/netinfo").default;
			if (NetInfo?.addEventListener) {
				const unsub = NetInfo.addEventListener(
					(state: { isConnected: boolean }) => {
						for (const cb of connectivitySubscribers) {
							cb(!!state.isConnected);
						}
					},
				);
				netInfoUnsub = unsub;
			}
		} catch {
			console.warn("NetInfo unavailable, connectivity events are mock-only.");
		}

		return () => {
			connectivitySubscribers.delete(callback);
			if (netInfoUnsub) netInfoUnsub();
		};
	},

	_notifyConnectivity(isConnected: boolean): void {
		for (const cb of connectivitySubscribers) {
			cb(isConnected);
		}
	},
};
