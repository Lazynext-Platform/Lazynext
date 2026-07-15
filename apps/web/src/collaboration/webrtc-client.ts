/**
 * WebRTC Data Channel Client for P2P Collaboration
 *
 * Establishes direct peer-to-peer connections between editors for
 * low-latency CRDT delta exchange without server hops.
 *
 * @module collaboration/webrtc-client
 *
 * Architecture:
 *   1. Peer A creates an RTCPeerConnection with a data channel
 *   2. Peer A generates an SDP offer and sends it to Peer B via the collab server
 *   3. Peer B receives the offer, creates an answer, sends it back
 *   4. Both peers exchange ICE candidates through the server
 *   5. Direct P2P data channel is established
 *   6. CRDT deltas flow directly between peers (no server relay)
 *
 * STUN/TURN Configuration:
 *   STUN_SERVER=stun:stun.l.google.com:19302
 *   TURN_SERVER=turn:turn.lazynext.ai:3478
 *   TURN_USERNAME=lazynext
 *   TURN_CREDENTIAL=your-turn-credential
 */

/**
 * WebRTC Data Channel Client for P2P Collaboration.
 *
 * Establishes direct peer-to-peer connections between editors for
 * low-latency CRDT delta exchange without server hops.
 *
 * @module collaboration/webrtc-client
 */

import type { CollaborationSocket } from "./socket";

interface WebRTCConfig {
  /** STUN server URL. */
  stunServer?: string;
  /** TURN server URL. */
  turnServer?: string;
  /** TURN authentication username. */
  turnUsername?: string;
  /** TURN authentication credential. */
  turnCredential?: string;
}

interface PeerConnection {
  /** Underlying RTC peer connection. */
  connection: RTCPeerConnection;
  /** Data channel for CRDT delta exchange. */
  dataChannel: RTCDataChannel | null;
  /** Remote peer identifier. */
  peerId: string;
  /** Current connection state. */
  state: "connecting" | "connected" | "disconnected" | "failed";
}

class WebRTCClient {
  private peers: Map<string, PeerConnection> = new Map();
  private socket: CollaborationSocket;
  private localPeerId: string;
  private config: RTCConfiguration;
  private onDeltaCallback: ((delta: ArrayBuffer, peerId: string) => void) | null = null;

  constructor(socket: CollaborationSocket, localPeerId: string, config: WebRTCConfig = {}) {
    this.socket = socket;
    this.localPeerId = localPeerId;

    this.config = {
      iceServers: [
        {
          urls: config.stunServer || "stun:stun.l.google.com:19302",
        },
        ...(config.turnServer
          ? [
              {
                urls: config.turnServer,
                username: config.turnUsername || "",
                credential: config.turnCredential || "",
              } as RTCIceServer,
            ]
          : []),
      ],
    };
  }

  /**
   * Set the callback for received CRDT deltas from P2P connections.
   */
  onDelta(callback: (delta: ArrayBuffer, peerId: string) => void): void {
    this.onDeltaCallback = callback;
  }

  /**
   * Initiate a P2P connection to a remote peer.
   */
  async connectToPeer(targetPeerId: string): Promise<void> {
    if (this.peers.has(targetPeerId)) {
      console.log(`[WebRTC] Already connected to peer ${targetPeerId}`);
      return;
    }

    const pc = new RTCPeerConnection(this.config);
    const peer: PeerConnection = {
      connection: pc,
      dataChannel: null,
      peerId: targetPeerId,
      state: "connecting",
    };

    // Create data channel (the offering peer creates the channel)
    const dataChannel = pc.createDataChannel("lazynext-crdt", {
      ordered: true, // CRDT operations must be in order
      maxRetransmits: 3,
    });
    peer.dataChannel = dataChannel;

    this.setupDataChannel(dataChannel, targetPeerId);
    this.setupConnectionHandlers(pc, targetPeerId, peer);

    // Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Send offer to target via collab server
    this.socket.sendWebRtcOffer(targetPeerId, JSON.stringify(pc.localDescription));

    this.peers.set(targetPeerId, peer);
  }

  /**
   * Handle an incoming WebRTC offer from a remote peer.
   */
  async handleOffer(fromPeerId: string, sdp: string): Promise<void> {
    const pc = new RTCPeerConnection(this.config);
    const peer: PeerConnection = {
      connection: pc,
      dataChannel: null,
      peerId: fromPeerId,
      state: "connecting",
    };

    // Set up handler for the data channel that the offering peer creates
    pc.ondatachannel = (event) => {
      peer.dataChannel = event.channel;
      this.setupDataChannel(event.channel, fromPeerId);
    };

    this.setupConnectionHandlers(pc, fromPeerId, peer);

    // Set remote description and create answer
    await pc.setRemoteDescription(JSON.parse(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // Send answer back
    this.socket.sendWebRtcAnswer(fromPeerId, JSON.stringify(pc.localDescription));

    this.peers.set(fromPeerId, peer);
  }

  /**
   * Handle an incoming WebRTC answer from a peer we sent an offer to.
   */
  async handleAnswer(fromPeerId: string, sdp: string): Promise<void> {
    const peer = this.peers.get(fromPeerId);
    if (!peer) return;

    await peer.connection.setRemoteDescription(JSON.parse(sdp));
  }

  /**
   * Handle an ICE candidate from a remote peer.
   */
  async handleIceCandidate(fromPeerId: string, candidate: string): Promise<void> {
    const peer = this.peers.get(fromPeerId);
    if (!peer) return;

    try {
      await peer.connection.addIceCandidate(JSON.parse(candidate));
    } catch (err) {
      console.warn(`[WebRTC] Failed to add ICE candidate from ${fromPeerId}:`, err);
    }
  }

  /**
   * Broadcast a CRDT delta to all connected P2P peers.
   */
  broadcast(delta: ArrayBuffer): void {
    for (const [_peerId, peer] of this.peers) {
      if (peer.dataChannel?.readyState === "open") {
        peer.dataChannel.send(delta);
      }
    }
  }

  /**
   * Send a CRDT delta to a specific peer.
   */
  sendToPeer(peerId: string, delta: ArrayBuffer): void {
    const peer = this.peers.get(peerId);
    if (peer?.dataChannel?.readyState === "open") {
      peer.dataChannel.send(delta);
    }
  }

  /**
   * Disconnect from a specific peer.
   */
  disconnectPeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.dataChannel?.close();
      peer.connection.close();
      this.peers.delete(peerId);
      console.log(`[WebRTC] Disconnected from peer ${peerId}`);
    }
  }

  /**
   * Disconnect all peers and clean up.
   */
  disconnect(): void {
    for (const [peerId] of this.peers) {
      this.disconnectPeer(peerId);
    }
  }

  /**
   * Get the number of connected peers.
   */
  connectedCount(): number {
    let count = 0;
    for (const peer of this.peers.values()) {
      if (peer.state === "connected") count++;
    }
    return count;
  }

  // ── Private Helpers ───────────────────────────────────────────────

  private setupDataChannel(channel: RTCDataChannel, peerId: string): void {
    channel.onopen = () => {
      console.log(`[WebRTC] Data channel opened with peer ${peerId}`);
      const peer = this.peers.get(peerId);
      if (peer) peer.state = "connected";
    };

    channel.onclose = () => {
      console.log(`[WebRTC] Data channel closed with peer ${peerId}`);
      const peer = this.peers.get(peerId);
      if (peer) peer.state = "disconnected";
    };

    channel.onerror = (event) => {
      console.error(`[WebRTC] Data channel error with peer ${peerId}:`, event);
    };

    channel.onmessage = (event) => {
      if (this.onDeltaCallback && event.data instanceof ArrayBuffer) {
        this.onDeltaCallback(event.data, peerId);
      }
    };
  }

  private setupConnectionHandlers(
    pc: RTCPeerConnection,
    peerId: string,
    peer: PeerConnection,
  ): void {
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.sendWebRtcIce(peerId, JSON.stringify(event.candidate));
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(
        `[WebRTC] Connection state with ${peerId}: ${pc.connectionState}`,
      );
      switch (pc.connectionState) {
        case "connected":
          peer.state = "connected";
          break;
        case "disconnected":
        case "failed":
          peer.state = "failed";
          this.peers.delete(peerId);
          break;
        case "closed":
          this.peers.delete(peerId);
          break;
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "failed") {
        console.warn(`[WebRTC] ICE connection failed with peer ${peerId}`);
        peer.state = "failed";
      }
    };
  }
}

export { WebRTCClient };
export type { WebRTCConfig, PeerConnection };
