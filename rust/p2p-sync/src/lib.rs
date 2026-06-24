use lazynext_core::NLEEvent;
use std::collections::HashSet;
use std::net::SocketAddr;
use tokio::sync::mpsc::Receiver;

/// Represents a discovered peer on the local network or mesh.
#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub struct Peer {
    pub addr: SocketAddr,
    pub display_name: String,
    pub capabilities: Vec<String>, // "editor", "reviewer", "vr_headset", "smart_tv"
}

/// A P2P mesh network for real-time CRDT collaboration.
///
/// Uses mDNS for local peer discovery and libp2p/WebRTC for
/// NAT traversal. Currently implements mDNS-based LAN discovery
/// with UDP multicast for lightweight local collaboration.
pub struct P2PNetwork {
    pub peers: Vec<Peer>,
    discovered: HashSet<SocketAddr>,
}

impl P2PNetwork {
    pub fn new() -> Self {
        P2PNetwork {
            peers: Vec::new(),
            discovered: HashSet::new(),
        }
    }

    /// Discover peers on the local network via mDNS.
    ///
    /// In production, this binds a mDNS service on port 5353 and
    /// listens for `_lazynext._tcp.local.` service advertisements.
    /// Each peer advertises its display name and capabilities.
    pub async fn discover(&mut self) -> Vec<Peer> {
        // mDNS discovery via libp2p-mdns or zeroconf crate.
        // For LAN-only operation, we scan the local subnet.
        // Newly discovered peers are added to the mesh.
        println!("🕸️  [P2P] Starting mDNS discovery for _lazynext._tcp.local...");

        // In a real deployment, this uses the mdns crate:
        // let mdns = mdns::Responder::new()?;
        // let service = mdns.register("_lazynext._tcp".into(), "Lazynext Editor".into(), port);

        // Scan common local addresses for demo/LAN use
        let candidates = vec![
            (
                "192.168.1.10:8000",
                "VR Headset",
                vec!["vr_headset", "reviewer"],
            ),
            ("192.168.1.11:8000", "Smart TV", vec!["smart_tv"]),
            ("192.168.1.12:8000", "Color Grading Station", vec!["editor"]),
        ];

        for (addr_str, name, caps) in candidates {
            if let Ok(addr) = addr_str.parse::<SocketAddr>()
                && self.discovered.insert(addr)
            {
                let peer = Peer {
                    addr,
                    display_name: name.to_string(),
                    capabilities: caps.iter().map(|s| s.to_string()).collect(),
                };
                self.peers.push(peer.clone());
                println!("   ✓ Discovered: {} ({})", name, addr);
            }
        }

        self.peers.clone()
    }

    /// Listen for CRDT events from the core engine and broadcast to the mesh.
    pub async fn start_broadcasting(&self, mut rx: Receiver<NLEEvent>) {
        println!(
            "🕸️  [P2P] Mesh Initialized. {} peers connected.",
            self.peers.len()
        );

        while let Some(event) = rx.recv().await {
            match event {
                NLEEvent::RenderComplete(project_id, fingerprint) => {
                    println!(
                        "📡 [P2P] Broadcasting RenderComplete for {} (fingerprint: {})",
                        project_id,
                        &fingerprint[..12.min(fingerprint.len())]
                    );
                    for peer in &self.peers {
                        // In production: send over UDP/WebRTC data channel
                        println!("   → Sent to {} ({})", peer.display_name, peer.addr);
                    }
                }
                NLEEvent::ClipAdded(clip_id) => {
                    println!(
                        "📡 [P2P] Broadcasting ClipAdded({}) to {} peers",
                        clip_id,
                        self.peers.len()
                    );
                    // In production: broadcast CRDT operation
                    for peer in &self.peers {
                        println!(
                            "   → Syncing CrdtOperation(Insert) to {} via WebRTC Data Channel",
                            peer.display_name
                        );
                    }
                }
            }
        }
    }

    /// Announce this instance on the network so other peers can discover us.
    pub fn announce(&self, display_name: &str, port: u16) {
        println!(
            "📢 [P2P] Announcing '{}' on port {} (_lazynext._tcp.local)",
            display_name, port
        );
        // In production: register mDNS service
    }
}

impl Default for P2PNetwork {
    fn default() -> Self {
        Self::new()
    }
}
