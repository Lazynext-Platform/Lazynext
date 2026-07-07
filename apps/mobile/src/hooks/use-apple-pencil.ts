/** @module hooks/use-apple-pencil React hook for Apple Pencil state */
import { useEffect, useState, useRef } from "react";
import { NativeBridge, ApplePencilState } from "../NativeBridge";

interface UseApplePencilResult {
	pressure: number;
	tilt: { x: number; y: number };
	azimuth: number;
	altitude: number;
	isActive: boolean;
	supported: boolean;
}

/** React hook that subscribes to Apple Pencil pressure, tilt, and azimuth events via NativeBridge. */
export function useApplePencil(): UseApplePencilResult {
	const [state, setState] = useState<ApplePencilState>({
		pressure: 0,
		tilt: { x: 0, y: 0 },
		azimuth: 0,
		altitude: Math.PI / 2,
		isActive: false,
	});
	const [supported, setSupported] = useState(false);

	useEffect(() => {
		NativeBridge.getPencilCapabilities().then((caps) => {
			setSupported(caps.supported);
		});

		const unsub = NativeBridge.subscribeToPencilEvents((newState) => {
			setState(newState);
		});

		return () => {
			unsub();
		};
	}, []);

	return {
		pressure: state.pressure,
		tilt: state.tilt,
		azimuth: state.azimuth,
		altitude: state.altitude,
		isActive: state.isActive,
		supported,
	};
}
