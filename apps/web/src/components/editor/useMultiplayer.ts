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
		// Connect to the API Gateway WebSocket
		const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/api/ws";
		const ws = new WebSocket(wsUrl);
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
