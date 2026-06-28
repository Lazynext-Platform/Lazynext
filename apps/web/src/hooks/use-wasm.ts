import { useEffect, useState, useRef } from "react";

// We use dynamic import for WASM since it's asyncWebAssembly
let wasmPromise: Promise<typeof import("lazynext-wasm")> | null = null;
let globalNLEState: any = null;

export function useWasm() {
	const [isReady, setIsReady] = useState(!!globalNLEState);
	const [frame, setFrame] = useState(
		globalNLEState ? globalNLEState.getFrame() : 0,
	);
	const stateRef = useRef<any>(globalNLEState);

	useEffect(() => {
		if (!wasmPromise) {
			wasmPromise = import("lazynext-wasm")
				.then(async (wasm) => {
					// If init is required (depending on target), we might need to call it.
					// But Next.js asyncWebAssembly usually resolves the module directly.
					if (wasm.default && typeof wasm.default === "function") {
						// @ts-ignore
						await wasm.default();
					}

					if (!globalNLEState) {
						globalNLEState = new wasm.NLEState("proj_1", "Project 1", 30);
					}
					stateRef.current = globalNLEState;
					setIsReady(true);
					return wasm;
				})
				.catch((err) => {
					console.error("Failed to load WASM:", err);
					throw err;
				});
		} else if (!isReady) {
			wasmPromise.then(() => {
				stateRef.current = globalNLEState;
				setIsReady(true);
			});
		}
	}, [isReady]);

	// Polling loop to sync React state with Rust WASM state
	useEffect(() => {
		if (!isReady) return;

		let handle: number;
		const tick = () => {
			if (stateRef.current) {
				const currentFrame = stateRef.current.getFrame();
				if (currentFrame !== frame) {
					setFrame(currentFrame);
				}
			}
			handle = requestAnimationFrame(tick);
		};
		handle = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(handle);
	}, [isReady, frame]);

	// Provide a wrapper that matches the expected interface but calls Rust
	const time = {
		getFrame: () => stateRef.current?.getFrame() || 0,
		setFrame: (f: number) => {
			stateRef.current?.setFrame(f);
			setFrame(f);
		},
		play: () => stateRef.current?.play(),
		pause: () => stateRef.current?.pause(),
		insert_cut_from_script: (s: number, e: number) =>
			stateRef.current?.insertCutFromScript(s, e),
		delete_cut_from_script: (s: number, e: number) =>
			stateRef.current?.deleteCutFromScript(s, e),
		trigger_live_cut: (a: number, f: number) =>
			stateRef.current?.triggerLiveCut(a, f),
		getProjectData: () => stateRef.current?.getProjectData(),
		addTrack: (name: string, trackType: string) => stateRef.current?.addTrack(name, trackType),
		addClip: (trackIdx: number, id: string, clipType: string, name: string, startFrame: number, durationFrames: number) => 
			stateRef.current?.addClip(trackIdx, id, clipType, name, startFrame, durationFrames),
		trimClip: (id: string, newStart: number, newDuration: number) =>
			stateRef.current?.trimClip(id, newStart, newDuration),
		get isPlaying() {
			return stateRef.current?.getIsPlaying() || false;
		},
	};

	return {
		isReady,
		time,
		frame,
		projectData: isReady ? time.getProjectData() : null,
	};
}
