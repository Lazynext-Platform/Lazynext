/** @module Multiplayer WebSocket hook for CRDT delta broadcasting */
import { useEffect, useRef, useCallback, useState } from "react";

interface MultiplayerHookArgs {
	projectId: string;
	clientId: string;
	onDeltaReceived: (delta: any) => void;
}

export function useMultiplayer({
	projectId,
	clientId,
	onDeltaReceived,
}: MultiplayerHookArgs) {
	const wsRef = useRef<WebSocket | null>(null);
	const [connected, setConnected] = useState(false);

	useEffect(() => {
		// Skip WebSocket in test/SSR environments where no server is available
		if (
			typeof window === "undefined" ||
			typeof WebSocket === "undefined" ||
			process.env.NODE_ENV === "test"
		) {
			return;
		}

		// Connect to the API Gateway WebSocket
		const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/api/ws";
		let ws: WebSocket;
		try {
			ws = new WebSocket(wsUrl);
		} catch {
			return; // WebSocket not available (test/SSR)
		}
		wsRef.current = ws;

		ws.onopen = () => {
			console.log(`[Multiplayer] Connected to API Gateway sync server`);
			setConnected(true);
		};

		ws.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				if (data.type === "CrdtOperation") {
					// We would ideally filter by clientId here if we sent it in the payload
					onDeltaReceived(data.payload);
				}
			} catch (err) {
				console.error("[Multiplayer] Failed to parse incoming message", err);
			}
		};

		ws.onclose = () => {
			console.log(`[Multiplayer] Disconnected from API Gateway`);
			setConnected(false);
		};

		return () => {
			ws.close();
			wsRef.current = null;
			setConnected(false);
		};
	}, [projectId, clientId, onDeltaReceived]);

	const broadcastDelta = useCallback(
		(delta: any) => {
			if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
				wsRef.current.send(
					JSON.stringify({
						type: "CrdtOperation",
						payload: delta,
					})
				);
			}
		},
		[]
	);

	return { broadcastDelta, socket: wsRef.current, connected, peerCount: 1 };
}
