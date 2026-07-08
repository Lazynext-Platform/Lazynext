/** @module WebRTC hook for real-time voice chat between editor collaborators */
import { useEffect, useRef, useState } from "react";

interface UseWebRTCOptions {
	/** WebSocket connection for signalling. */
	socket: WebSocket | null;
	/** Project room identifier. */
	projectId: string;
}

export function useWebRTC({ socket, projectId }: UseWebRTCOptions) {
	const [localStream, setLocalStream] = useState<MediaStream | null>(null);
	const [peers, setPeers] = useState<{ [id: string]: MediaStream }>({});
	const peerConnections = useRef<{ [id: string]: RTCPeerConnection }>({});

	const startVoice = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: true,
				video: false,
			});
			setLocalStream(stream);

			// We already joined the project room in useMultiplayer.
			// If there are already peers, they will not automatically get our stream unless we offer.
			// But the signaling server emits 'peer-joined' when someone joins, so we can initiate offers then.
		} catch (err) {
			console.error("Failed to get local stream", err);
		}
	};

	const stopVoice = () => {
		if (localStream) {
			localStream.getTracks().forEach((track) => track.stop());
			setLocalStream(null);
		}

		// Close all peer connections
		Object.values(peerConnections.current).forEach((pc) => pc.close());
		peerConnections.current = {};
		setPeers({});
	};

	useEffect(() => {
		if (!socket || !localStream) return;

		const createPeerConnection = (targetSocketId: string) => {
			const pc = new RTCPeerConnection({
				iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
			});

			pc.onicecandidate = (event) => {
				if (event.candidate && socket && socket.readyState === WebSocket.OPEN) {
					socket.send(JSON.stringify({
						type: "webrtc-ice-candidate",
						payload: {
							target: targetSocketId,
							candidate: event.candidate,
						}
					}));
				}
			};

			pc.ontrack = (event) => {
				setPeers((prev) => ({
					...prev,
					[targetSocketId]: event.streams[0],
				}));
			};

			localStream.getTracks().forEach((track) => {
				pc.addTrack(track, localStream);
			});

			peerConnections.current[targetSocketId] = pc;
			return pc;
		};

		const handleMessage = async (event: MessageEvent) => {
			try {
				const data = JSON.parse(event.data);
				if (data.type === "peer-joined") {
					const peerId = data.payload.peerId;
					console.log("Peer joined, creating offer:", peerId);
					const pc = createPeerConnection(peerId);
					const offer = await pc.createOffer();
					await pc.setLocalDescription(offer);
					if (socket && socket.readyState === WebSocket.OPEN) {
						socket.send(JSON.stringify({
							type: "webrtc-offer",
							payload: { target: peerId, offer }
						}));
					}
				} else if (data.type === "webrtc-offer") {
					const { caller, offer } = data.payload;
					console.log("Received offer from:", caller);
					const pc = createPeerConnection(caller);
					await pc.setRemoteDescription(new RTCSessionDescription(offer));
					const answer = await pc.createAnswer();
					await pc.setLocalDescription(answer);
					if (socket && socket.readyState === WebSocket.OPEN) {
						socket.send(JSON.stringify({
							type: "webrtc-answer",
							payload: { target: caller, answer }
						}));
					}
				} else if (data.type === "webrtc-answer") {
					const { caller, answer } = data.payload;
					console.log("Received answer from:", caller);
					const pc = peerConnections.current[caller];
					if (pc) {
						await pc.setRemoteDescription(new RTCSessionDescription(answer));
					}
				} else if (data.type === "webrtc-ice-candidate") {
					const { caller, candidate } = data.payload;
					const pc = peerConnections.current[caller];
					if (pc) {
						try {
							await pc.addIceCandidate(new RTCIceCandidate(candidate));
						} catch (e) {
							console.error("Error adding received ice candidate", e);
						}
					}
				} else if (data.type === "peer-left") {
					const peerId = data.payload.peerId;
					if (peerConnections.current[peerId]) {
						peerConnections.current[peerId].close();
						delete peerConnections.current[peerId];
					}
					setPeers((prev) => {
						const newPeers = { ...prev };
						delete newPeers[peerId];
						return newPeers;
					});
				}
			} catch (err) {
				// not a JSON message or parse error
			}
		};

		socket.addEventListener("message", handleMessage);

		return () => {
			socket.removeEventListener("message", handleMessage);
		};
	}, [socket, localStream]);

	return { startVoice, stopVoice, isVoiceActive: !!localStream, peers };
}
