// @ts-nocheck
// import { useWasm } from "@/hooks/use-wasm";

export class CollaborationSocket {
    private ws: WebSocket | null = null;
    private roomId: string;
    
    constructor(roomId: string) {
        this.roomId = roomId;
    }

    public connect() {
        console.log(`Connecting to Collaboration Server for room ${this.roomId}...`);
        // MOCK: this.ws = new WebSocket(`wss://sync.lazynext.com/rooms/${this.roomId}`);
        
        // this.ws.onmessage = (event) => {
        //     const delta = new Uint8Array(event.data);
        //     useWasm().time.apply_crdt_delta(delta);
        // }
    }

    public broadcastEdit(delta: Uint8Array) {
        console.log("Broadcasting local CRDT delta to all peers...");
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(delta);
        }
    }
}
