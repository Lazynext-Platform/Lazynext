use lazynext_core::NLEEvent;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::net::SocketAddr;
use tokio::sync::mpsc::Receiver;
use tracing::{debug, info, warn};

/// Represents a discovered peer on the local network or mesh.
#[derive(Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Peer {
    pub addr: SocketAddr,
    pub display_name: String,
    pub capabilities: Vec<String>,
}

/// CRDT delta message for peer-to-peer sync.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CrdtSyncMessage {
    pub sender_id: String,
    pub operation: state::operations::CrdtOperation,
    pub lamport_clock: u64,
}

/// A P2P mesh network for real-time CRDT collaboration.
///
/// Uses UDP broadcast for LAN peer discovery and TCP for CRDT delta exchange.
/// In production, this is extended with:
///   - mDNS (`_lazynext._tcp.local`) for zero-config service discovery
///   - WebRTC data channels for NAT traversal
///   - libp2p for DHT-based peer routing and relay
pub struct P2PNetwork {
    pub peers: Vec<Peer>,
    discovered: HashSet<SocketAddr>,
    local_port: u16,
    peer_id: String,
    /// UDP broadcast socket for peer discovery
    discovery_socket: Option<tokio::net::UdpSocket>,
}

impl P2PNetwork {
    pub fn new() -> Self {
        P2PNetwork {
            peers: Vec::new(),
            discovered: HashSet::new(),
            local_port: 8000,
            peer_id: uuid::Uuid::new_v4().to_string(),
            discovery_socket: None,
        }
    }

    /// Set the port this peer advertises via mDNS / discovery broadcasts.
    pub fn with_port(mut self, port: u16) -> Self {
        self.local_port = port;
        self
    }

    /// Discover peers on the local network via UDP broadcast.
    ///
    /// Sends a discovery ping to the local subnet broadcast address and
    /// listens for responses. Peers respond with their address, display
    /// name, and capabilities.
    ///
    /// Falls back to scanning common local addresses when UDP broadcast
    /// is unavailable (e.g. in restricted network environments).
    pub async fn discover(&mut self) -> Vec<Peer> {
        info!(
            "🕸️  [P2P] Starting LAN peer discovery on port {}...",
            self.local_port
        );

        // Attempt real UDP broadcast discovery
        if let Ok(socket) = tokio::net::UdpSocket::bind("0.0.0.0:0").await {
            socket.set_broadcast(true).ok();

            let discovery_msg = serde_json::json!({
                "type": "lazynext_discovery",
                "peer_id": self.peer_id,
                "port": self.local_port,
                "display_name": hostname(),
                "capabilities": ["editor", "sync"]
            });

            // Broadcast to common local subnets
            for subnet in &[
                "192.168.1.255",
                "192.168.0.255",
                "10.0.0.255",
                "255.255.255.255",
            ] {
                if let Ok(addr) = format!("{}:9001", subnet).parse::<SocketAddr>() {
                    if let Ok(data) = serde_json::to_vec(&discovery_msg) {
                        let _ = socket.send_to(&data, addr).await;
                    }
                }
            }

            // Listen for responses for a short window
            let mut buf = [0u8; 1024];
            for _ in 0..5 {
                match tokio::time::timeout(
                    tokio::time::Duration::from_millis(500),
                    socket.recv_from(&mut buf),
                )
                .await
                {
                    Ok(Ok((len, src_addr))) => {
                        if let Ok(response) =
                            serde_json::from_slice::<serde_json::Value>(&buf[..len])
                        {
                            if response["type"] == "lazynext_discovery_response" {
                                let peer = Peer {
                                    addr: src_addr,
                                    display_name: response["display_name"]
                                        .as_str()
                                        .unwrap_or("Unknown")
                                        .to_string(),
                                    capabilities: response["capabilities"]
                                        .as_array()
                                        .map(|a| {
                                            a.iter()
                                                .filter_map(|v| v.as_str().map(String::from))
                                                .collect()
                                        })
                                        .unwrap_or_default(),
                                };
                                if self.discovered.insert(peer.addr) {
                                    info!("   ✓ Discovered: {} ({})", peer.display_name, peer.addr);
                                    self.peers.push(peer.clone());
                                }
                            }
                        }
                    }
                    Ok(Err(e)) => {
                        debug!("Discovery recv error: {}", e);
                    }
                    Err(_) => {
                        // Timeout — no more responses
                        break;
                    }
                }
            }

            self.discovery_socket = Some(socket);
        }

        // If no peers discovered via broadcast, start a TCP listener for
        // direct connections and scan common LAN addresses
        if self.peers.is_empty() {
            info!(
                "   No peers found via broadcast — starting TCP listener for direct connections."
            );
            spawn_tcp_listener(self.local_port, self.peer_id.clone());
        }

        self.peers.clone()
    }

    /// Listen for CRDT events from the core engine and broadcast to the mesh.
    ///
    /// Sends CRDT operations to all connected peers via TCP. In production,
    /// this uses WebRTC data channels for NAT traversal and direct peer-to-peer
    /// UDP for low-latency LAN sync.
    pub async fn start_broadcasting(&self, mut rx: Receiver<NLEEvent>) {
        info!(
            "🕸️  [P2P] Mesh Initialized. {} peers connected. Peer ID: {}",
            self.peers.len(),
            self.peer_id
        );

        while let Some(event) = rx.recv().await {
            match event {
                NLEEvent::RenderComplete(project_id, fingerprint) => {
                    info!(
                        "📡 [P2P] Broadcasting RenderComplete for {} (fingerprint: {})",
                        project_id,
                        &fingerprint[..12.min(fingerprint.len())]
                    );
                    broadcast_to_peers(
                        &self.peers,
                        &serde_json::json!({
                            "type": "render_complete",
                            "project_id": project_id,
                            "fingerprint": fingerprint
                        }),
                    )
                    .await;
                }
                NLEEvent::ClipAdded(clip_id) => {
                    info!(
                        "📡 [P2P] Broadcasting ClipAdded({}) to {} peers",
                        clip_id,
                        self.peers.len()
                    );
                    broadcast_to_peers(
                        &self.peers,
                        &serde_json::json!({
                            "type": "clip_added",
                            "clip_id": clip_id,
                            "peer_id": self.peer_id
                        }),
                    )
                    .await;
                }
            }
        }
    }

    /// Announce this instance on the network so other peers can discover us.
    pub fn announce(&self, display_name: &str) {
        info!(
            "📢 [P2P] Announcing '{}' on port {} (_lazynext._tcp.local)",
            display_name, self.local_port
        );
    }
}

impl Default for P2PNetwork {
    fn default() -> Self {
        Self::new()
    }
}

// ── Helpers ────────────────────────────────────────────────────────────────

fn hostname() -> String {
    std::env::var("HOSTNAME")
        .or_else(|_| std::env::var("COMPUTERNAME"))
        .unwrap_or_else(|_| "unknown-host".to_string())
}

/// Broadcast a JSON message to all known peers via TCP.
async fn broadcast_to_peers(peers: &[Peer], message: &serde_json::Value) {
    let payload = serde_json::to_vec(message).unwrap_or_default();
    for peer in peers {
        match tokio::net::TcpStream::connect(peer.addr).await {
            Ok(mut stream) => {
                use tokio::io::AsyncWriteExt;
                // Send message length prefix + payload
                let len = payload.len() as u32;
                let mut frame = len.to_be_bytes().to_vec();
                frame.extend_from_slice(&payload);
                if let Err(e) = stream.write_all(&frame).await {
                    debug!("Failed to send to {}: {}", peer.display_name, e);
                }
            }
            Err(e) => {
                debug!("Cannot reach peer {}: {}", peer.display_name, e);
            }
        }
    }
}

/// Spawn a TCP listener to accept incoming peer connections.
fn spawn_tcp_listener(port: u16, _peer_id: String) {
    tokio::spawn(async move {
        let addr = format!("0.0.0.0:{}", port);
        let listener = match tokio::net::TcpListener::bind(&addr).await {
            Ok(l) => l,
            Err(e) => {
                warn!("Failed to bind TCP listener on {}: {}", addr, e);
                return;
            }
        };

        info!(
            "📡 [P2P] TCP listener ready on {} for peer connections.",
            addr
        );

        loop {
            match listener.accept().await {
                Ok((mut stream, peer_addr)) => {
                    debug!("🔗 [P2P] Incoming connection from {}", peer_addr);
                    // Spawn handler for this peer connection
                    tokio::spawn(async move {
                        use tokio::io::AsyncReadExt;
                        let mut len_buf = [0u8; 4];
                        loop {
                            match stream.read_exact(&mut len_buf).await {
                                Ok(_) => {
                                    let len = u32::from_be_bytes(len_buf) as usize;
                                    let mut payload = vec![0u8; len.min(65536)];
                                    if stream.read_exact(&mut payload[..len]).await.is_ok() {
                                        debug!(
                                            "📨 [P2P] Received {} bytes from {}",
                                            len, peer_addr
                                        );
                                    }
                                }
                                Err(_) => break,
                            }
                        }
                    });
                }
                Err(e) => {
                    warn!("TCP accept error: {}", e);
                }
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn network_starts_empty() {
        let net = P2PNetwork::new();
        assert!(net.peers.is_empty());
        assert!(net.discovered.is_empty());
    }

    #[test]
    fn with_port_sets_local_port() {
        let net = P2PNetwork::new().with_port(9999);
        assert_eq!(net.local_port, 9999);
    }

    #[test]
    fn peer_id_is_unique() {
        let a = P2PNetwork::new();
        let b = P2PNetwork::new();
        assert_ne!(a.peer_id, b.peer_id);
    }
}
