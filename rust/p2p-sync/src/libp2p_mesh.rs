//! Zero-configuration peer discovery over libp2p mDNS.
//!
//! This is the production discovery path referenced in the crate docs: instead
//! of broadcasting to hard-coded LAN subnets, it uses libp2p's mDNS behaviour
//! to find other Lazynext instances on the local network with no configuration,
//! and libp2p `ping` to keep connections alive / detect liveness.
//!
//! The transport is TCP secured with the Noise handshake and multiplexed with
//! yamux — the standard libp2p stack. Discovered peers are reported through a
//! caller-supplied callback so this module stays decoupled from the CRDT layer.

use std::error::Error;
use std::time::Duration;

use libp2p::futures::StreamExt;
use libp2p::swarm::{NetworkBehaviour, SwarmEvent};
use libp2p::{Multiaddr, PeerId, mdns, noise, ping, tcp, yamux};
use tracing::{debug, info, warn};

/// Combined network behaviour: mDNS for discovery, ping for liveness.
#[derive(NetworkBehaviour)]
pub struct MeshBehaviour {
    /// mDNS peer discovery on the local network.
    mdns: mdns::tokio::Behaviour,
    /// Liveness ping between connected peers.
    ping: ping::Behaviour,
}

/// A discovered peer: its libp2p identity and an address it can be reached at.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DiscoveredPeer {
    /// libp2p peer identity.
    pub peer_id: PeerId,
    /// A multiaddress the peer advertised via mDNS.
    pub address: Multiaddr,
}

/// Build a libp2p swarm with the mDNS + ping mesh behaviour.
///
/// Uses TCP + Noise + yamux (the canonical libp2p transport stack) and a fresh
/// identity keypair. Returns an error if the transport or behaviour cannot be
/// constructed.
pub fn build_swarm() -> Result<libp2p::Swarm<MeshBehaviour>, Box<dyn Error + Send + Sync>> {
    let swarm = libp2p::SwarmBuilder::with_new_identity()
        .with_tokio()
        .with_tcp(
            tcp::Config::default(),
            noise::Config::new,
            yamux::Config::default,
        )?
        .with_behaviour(|key| {
            let mdns =
                mdns::tokio::Behaviour::new(mdns::Config::default(), key.public().to_peer_id())?;
            Ok(MeshBehaviour {
                mdns,
                ping: ping::Behaviour::default(),
            })
        })?
        .with_swarm_config(|cfg| cfg.with_idle_connection_timeout(Duration::from_secs(60)))
        .build();
    Ok(swarm)
}

/// Run the mDNS discovery event loop, invoking `on_peer` for each newly
/// discovered peer. Runs until the swarm ends (typically for the process
/// lifetime); intended to be spawned on its own task.
pub async fn run_discovery<F>(mut on_peer: F) -> Result<(), Box<dyn Error + Send + Sync>>
where
    F: FnMut(DiscoveredPeer),
{
    let mut swarm = build_swarm()?;
    // Listen on all interfaces, OS-assigned port.
    swarm.listen_on("/ip4/0.0.0.0/tcp/0".parse()?)?;
    info!(
        "🕸️  [P2P/libp2p] mDNS discovery started as {}",
        swarm.local_peer_id()
    );

    loop {
        match swarm.select_next_some().await {
            SwarmEvent::NewListenAddr { address, .. } => {
                debug!("[P2P/libp2p] listening on {address}");
            }
            SwarmEvent::Behaviour(MeshBehaviourEvent::Mdns(mdns::Event::Discovered(list))) => {
                for (peer_id, address) in list {
                    info!("[P2P/libp2p] discovered {peer_id} at {address}");
                    swarm.add_peer_address(peer_id, address.clone());
                    on_peer(DiscoveredPeer { peer_id, address });
                }
            }
            SwarmEvent::Behaviour(MeshBehaviourEvent::Mdns(mdns::Event::Expired(list))) => {
                for (peer_id, address) in list {
                    debug!("[P2P/libp2p] peer expired: {peer_id} ({address})");
                }
            }
            SwarmEvent::Behaviour(MeshBehaviourEvent::Ping(event)) => {
                debug!("[P2P/libp2p] ping: {event:?}");
            }
            SwarmEvent::OutgoingConnectionError { peer_id, error, .. } => {
                warn!("[P2P/libp2p] outgoing connection error to {peer_id:?}: {error}");
            }
            _ => {}
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn discovered_peer_holds_identity_and_address() {
        // Pure construction, no I/O — safe in any environment.
        let peer_id = PeerId::random();
        let address: Multiaddr = "/ip4/127.0.0.1/tcp/4001"
            .parse()
            .expect("valid multiaddr");
        let peer = DiscoveredPeer {
            peer_id,
            address: address.clone(),
        };
        assert_eq!(peer.address, address);
        assert_eq!(peer.peer_id, peer_id);
    }

    #[test]
    // Ignored by default: constructing the mDNS behaviour opens a netlink
    // socket to enumerate network interfaces, which sandboxed CI runners
    // forbid (panics in netlink-sys). Run locally with `--ignored`.
    #[ignore = "requires host networking (netlink/mDNS); not available in sandboxed CI"]
    fn swarm_builds_with_mdns_and_ping() {
        let swarm = build_swarm().expect("swarm should build");
        let peer_id = swarm.local_peer_id().to_string();
        assert!(peer_id.len() > 10, "unexpected peer id: {peer_id}");
    }
}
