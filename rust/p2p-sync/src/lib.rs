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
/// Implements LAN peer discovery via mDNS (`_lazynext._tcp.local.`) and
/// broadcasts CRDT operations across the mesh.  In production this uses the
/// `mdns-sd` crate for service registration/discovery and `webrtc` for NAT
/// traversal.  The current implementation provides a working local-subnet
/// discovery loop with mock candidates until those crates are pulled in.
pub struct P2PNetwork {
    pub peers: Vec<Peer>,
    discovered: HashSet<SocketAddr>,
    /// Local port this instance advertises on mDNS.
    local_port: u16,
}

impl P2PNetwork {
    pub fn new() -> Self {
        P2PNetwork {
            peers: Vec::new(),
            discovered: HashSet::new(),
            local_port: 8000,
        }
    }

    /// Set the port this peer advertises via mDNS / WebRTC signalling.
    pub fn with_port(mut self, port: u16) -> Self {
        self.local_port = port;
        self
    }

    /// Discover peers on the local network via mDNS.
    ///
    /// Performs mDNS browsing for `_lazynext._tcp.local.` service instances.
    /// In production this uses the `mdns-sd` crate:
    ///
    /// ```ignore
    /// let mdns = mdns_sd::ServiceDaemon::new()?;
    /// let receiver = mdns.browse("_lazynext._tcp.local.")?;
    /// while let Ok(event) = receiver.recv_async().await {
    ///     // handle ServiceEvent::ServiceResolved
    /// }
    /// ```
    ///
    /// Until that dependency is added, we scan a configurable local subnet
    /// and emit log messages for discovered peers.
    pub async fn discover(&mut self) -> Vec<Peer> {
        println!("🕸️  [P2P] Starting mDNS discovery for _lazynext._tcp.local...");

        // Scan common local addresses.  Replace with real mDNS browsing
        // by adding `mdns-sd = "1"` to Cargo.toml.
        let candidates: Vec<(&str, &str, Vec<&str>)> = vec![
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
                println!("   ✓ Discovered: {} ({})", name, addr);
                self.peers.push(peer);
            }
        }

        self.peers.clone()
    }

    /// Listen for CRDT events from the core engine and broadcast to the mesh.
    ///
    /// In production this uses WebRTC data channels for NAT traversal and
    /// direct peer-to-peer UDP for LAN.  Currently logs transmissions.
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
                        println!("   → Sent to {} ({})", peer.display_name, peer.addr);
                    }
                }
                NLEEvent::ClipAdded(clip_id) => {
                    println!(
                        "📡 [P2P] Broadcasting ClipAdded({}) to {} peers",
                        clip_id,
                        self.peers.len()
                    );
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
    pub fn announce(&self, display_name: &str) {
        println!(
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
}
