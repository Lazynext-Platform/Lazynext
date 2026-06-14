import { useEffect, useState } from "react";
// Since we don't have the fully compiled lazynext-wasm yet, we'll build a mock abstraction
// that mirrors the real NLEState for our React components to consume.

export class MockNLEState {
	private frame: number = 0;
	private isPlaying: boolean = false;
	private listeners: (() => void)[] = [];

	getFrame() {
		return this.frame;
	}

	setFrame(f: number) {
		this.frame = f;
		this.notify();
	}

	play() {
		this.isPlaying = true;
		this.notify();
	}

	pause() {
		this.isPlaying = false;
		this.notify();
	}

	insert_cut_from_script(startMs: number, endMs: number) {
		console.log(
			`[WASM NLEState] insert_cut_from_script(${startMs}, ${endMs}) executed`,
		);
	}

	trigger_live_cut(angle: number, frame: number) {
		console.log(
			`[WASM NLEState] trigger_live_cut(angle=${angle}, frame=${frame}) executed`,
		);
	}

	subscribe(listener: () => void) {
		this.listeners.push(listener);
		return () => {
			this.listeners = this.listeners.filter((l) => l !== listener);
		};
	}

	private notify() {
		for (const l of this.listeners) {
			l();
		}
	}
}

// Global singleton
const globalState = new MockNLEState();

export function useWasm() {
	const [frame, setFrame] = useState(globalState.getFrame());

	useEffect(() => {
		return globalState.subscribe(() => {
			setFrame(globalState.getFrame());
		});
	}, []);

	// Also set up a mock playback loop if isPlaying is true
	useEffect(() => {
		let handle: number;
		const tick = () => {
			// @ts-ignore
			if (globalState.isPlaying) {
				globalState.setFrame(globalState.getFrame() + 1);
			}
			handle = requestAnimationFrame(tick);
		};
		handle = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(handle);
	}, []);

	return {
		time: globalState, // Matches `const { time } = useWasm()`
		frame, // For convenient re-rendering
	};
}
