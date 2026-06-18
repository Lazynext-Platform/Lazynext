/**
 * Collaboration WebSocket client.
 *
 * Connects to the CRDT sync server at the configured WebSocket URL
 * and bridges between network messages and the WASM CRDT engine.
 */
import type { CrdtEngine } from "lazynext-wasm";

type CrdtDeltaHandler = (delta: Uint8Array) => void;
type PresenceHandler = (presence: PresenceUpdate) => void;

export interface PresenceUpdate {
  peerId: string;
  userId: string;
  userName: string;
  color: string;
  cursorX: number;
  cursorY: number;
  viewportState?: Record<string, unknown>;
  selection?: string[];
}

const SYNC_SERVER_URL =
  process.env.NEXT_PUBLIC_SYNC_SERVER_URL || "ws://localhost:8002";

export class CollaborationSocket {
  private ws: WebSocket | null = null;
  private roomId: string;
  private deltaListeners: CrdtDeltaHandler[] = [];
  private presenceListeners: PresenceHandler[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectDelay = 30000; // 30s max backoff
  private crdtEngine: CrdtEngine | null = null;
  private peerId: string;

  constructor(roomId: string, peerId?: string) {
    this.roomId = roomId;
    this.peerId = peerId || `peer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /** Bind a WASM CRDT engine for incoming delta application. */
  setCrdtEngine(engine: CrdtEngine): void {
    this.crdtEngine = engine;
  }

  /** Connect to the sync server and join the project room. */
  connect(authToken?: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const url = new URL(SYNC_SERVER_URL);
    url.pathname = `/rooms/${this.roomId}`;
    if (authToken) url.searchParams.set("token", authToken);
    url.searchParams.set("peerId", this.peerId);

    console.log(`[Collab] Connecting to ${url.origin}${url.pathname}…`);

    this.ws = new WebSocket(url.toString());
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      console.log(`[Collab] Connected to room "${this.roomId}"`);
      this.reconnectAttempts = 0;
      this.ws?.send(
        JSON.stringify({
          type: "join",
          roomId: this.roomId,
          peerId: this.peerId,
        }),
      );
    };

    this.ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        // Binary message = CRDT delta
        const delta = new Uint8Array(event.data);
        this.deltaListeners.forEach((fn) => fn(delta));
        // Apply to WASM CRDT engine if bound
        if (this.crdtEngine) {
          try {
            const opJson = JSON.parse(
              new TextDecoder().decode(delta),
            );
            this.crdtEngine.applyOperation(opJson);
          } catch (err) {
            console.warn("[Collab] Failed to apply CRDT delta:", err);
          }
        }
      } else if (typeof event.data === "string") {
        // Text message = signaling or presence
        try {
          const msg = JSON.parse(event.data) as {
            type: string;
            [key: string]: unknown;
          };

          switch (msg.type) {
            case "presence":
              this.presenceListeners.forEach((fn) =>
                fn(msg as unknown as PresenceUpdate),
              );
              break;
            case "peer-joined":
              console.log(`[Collab] Peer joined: ${msg.peerId}`);
              break;
            case "peer-left":
              console.log(`[Collab] Peer left: ${msg.peerId}`);
              break;
            case "crdt_delta":
              // CRDT delta as JSON — apply to engine
              if (this.crdtEngine && msg.delta) {
                this.crdtEngine.applyOperation(msg.delta);
              }
              break;
            default:
              break;
          }
        } catch {
          // Non-JSON message, ignore
        }
      }
    };

    this.ws.onclose = (event) => {
      console.log(`[Collab] Disconnected (code: ${event.code})`);
      this.scheduleReconnect();
    };

    this.ws.onerror = (err) => {
      console.error("[Collab] WebSocket error:", err);
    };
  }

  /** Send a local CRDT operation to all connected peers. */
  broadcastEdit(delta: Uint8Array): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(delta.buffer as ArrayBuffer);
    } else {
      console.warn("[Collab] Cannot broadcast — not connected");
    }
  }

  /** Send a presence update (cursor position, selection, viewport). */
  sendPresence(presence: Omit<PresenceUpdate, "peerId">): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: "presence",
          ...presence,
          peerId: this.peerId,
        }),
      );
    }
  }

  /** Register a handler for incoming CRDT deltas. */
  onDelta(fn: CrdtDeltaHandler): () => void {
    this.deltaListeners.push(fn);
    return () => {
      this.deltaListeners = this.deltaListeners.filter((l) => l !== fn);
    };
  }

  /** Register a handler for presence updates from other peers. */
  onPresence(fn: PresenceHandler): () => void {
    this.presenceListeners.push(fn);
    return () => {
      this.presenceListeners = this.presenceListeners.filter((l) => l !== fn);
    };
  }

  /** Disconnect and clean up. */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null; // prevent reconnect loop
      this.ws.close();
      this.ws = null;
    }
    this.deltaListeners = [];
    this.presenceListeners = [];
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private scheduleReconnect(): void {
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay,
    );
    this.reconnectAttempts++;
    console.log(
      `[Collab] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})…`,
    );
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }
}
