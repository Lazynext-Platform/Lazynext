import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";

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
	const socketRef = useRef<Socket | null>(null);

	const [socket, setSocket] = useState<Socket | null>(null);

	useEffect(() => {
		// Connect to the AI-Agents / Sync server
		const socketUrl =
			process.env.NEXT_PUBLIC_AI_AGENTS_URL || "http://localhost:8002";

		socketRef.current = io(socketUrl);
		setSocket(socketRef.current);

		socketRef.current.on("connect", () => {
			console.log(
				`[Multiplayer] Connected to sync server as ${socketRef.current?.id}`,
			);
			socketRef.current?.emit("join_project", projectId);
		});

		socketRef.current.on(
			"crdt_delta",
			(data: { projectId: string; delta: any; clientId: string }) => {
				if (data.clientId !== clientId) {
					onDeltaReceived(data.delta);
				}
			},
		);

		return () => {
			socketRef.current?.disconnect();
			socketRef.current = null;
			setSocket(null);
		};
	}, [projectId, clientId, onDeltaReceived]);

	const broadcastDelta = useCallback(
		(delta: any) => {
			if (socketRef.current && socketRef.current.connected) {
				socketRef.current.emit("crdt_delta", {
					projectId,
					clientId,
					delta,
				});
			}
		},
		[projectId, clientId],
	);

	return { broadcastDelta, socket, connected: !!socket, peerCount: 1 };
}
