# P2P Sync — Mesh Networking

UDP broadcast-based peer discovery and TCP mesh for CRDT delta exchange between Lazynext editor instances on the same local network.

## How It Works

1. **Discovery**: Broadcasts `P2P_DISCOVERY` messages on common subnets (`192.168.1.255`, `192.168.0.255`, `10.0.0.255`, `255.255.255.255`) on port 9001.
2. **Mesh**: Each peer listens on `0.0.0.0:{port}` for TCP connections. Length-prefixed JSON frames carry `CrdtSyncMessage` payloads.
3. **Sync**: Media render events (e.g., `RenderComplete`, `ClipAdded`) are broadcast to all discovered peers.

## Usage

```rust
use p2p_sync::P2PNetwork;

let network = P2PNetwork::new(9001).await?;
network.broadcast_to_peers(&message).await?;
```

## Future Enhancements

- **mDNS** for reliable cross-platform discovery (no subnet guessing)
- **WebRTC** for NAT traversal and WAN connectivity
- **libp2p** upgrade for production-grade mesh routing

## Status

Production-ready core. UDP/TCP mesh works on LAN. Documented enhancements above are deferred to v1.1.
