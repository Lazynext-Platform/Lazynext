/**
 * Collaboration WebSocket client stub.
 *
 * In production, this connects to a CRDT sync server that broadcasts
 * editor deltas to all peers in the same room. The current implementation
 * is a mock that logs connections and silently accepts outgoing deltas.
 *
 * TODO: Replace with real WebSocket connection to sync.lazynext.com
 * TODO: Integrate with wasm time.apply_crdt_delta for incoming deltas
 */
export class CollaborationSocket {
  private ws: WebSocket | null = null;
  private roomId: string;
  private listeners: Array<(delta: Uint8Array) => void> = [];

  constructor(roomId: string) {
    this.roomId = roomId;
  }

  /** Connect to the collaboration server for the configured room. */
  connect(): void {
    console.log(
      `[Collab] Connecting to room "${this.roomId}" (mock — no server configured)`,
    );
    // Production: this.ws = new WebSocket(`wss://sync.lazynext.com/rooms/${this.roomId}`);
    // this.ws.onmessage = (event) => {
    //   const delta = new Uint8Array(event.data);
    //   this.listeners.forEach((fn) => fn(delta));
    // };
  }

  /** Send a local CRDT delta to all connected peers. */
  broadcastEdit(delta: Uint8Array): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(delta);
    }
  }

  /** Register a listener for incoming deltas from other peers. */
  onDelta(fn: (delta: Uint8Array) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  /** Disconnect and clean up. */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners = [];
  }
}
