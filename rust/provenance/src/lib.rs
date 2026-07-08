//! Lazynext Provenance — C2PA content authenticity and integrity.
//!
//! The provenance crate provides cryptographic attestation for every
//! edit made in Lazynext. It implements content fingerprinting (SHA-256)
//! and C2PA manifest generation to create a verifiable chain of custody
//! from source media to final export.
//!
//! # C2PA (Coalition for Content Provenance and Authenticity)
//!
//! C2PA is an open technical standard (backed by Adobe, Microsoft, BBC,
//! and others) for cryptographically binding provenance metadata to
//! media files. Each C2PA manifest includes:
//!
//! - **Assertions**: What happened (e.g., "clip trimmed at frames 0-240")
//! - **Claims**: Who did it (signed with an X.509 certificate)
//! - **Ingredients**: What source media was used
//! - **Trust list**: Which certificate authorities are trusted
//!
//! # Current implementation
//!
//! The `generate_state_fingerprint` function produces SHA-256 hashes of
//! serializable state for tamper detection. Full C2PA 2.1 compliance
//! (X.509 cert chains, CBOR manifests, ingredient references) is in the
//! `c2pa` module.

pub mod c2pa;

use serde::Serialize;
use sha2::{Digest, Sha256};

/// Error type for content fingerprint operations.
#[derive(Debug)]
pub enum FingerprintError {
    /// Serialization of the input state to JSON failed.
    Serialization(String),
}

impl std::fmt::Display for FingerprintError {
    // Formats the fingerprint error as a human-readable message.
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            FingerprintError::Serialization(e) => write!(f, "Serialization failed: {}", e),
        }
    }
}

impl std::error::Error for FingerprintError {}

/// Generates a SHA-256 content fingerprint for a serializable state.
///
/// Produces a hex-encoded hash suitable for integrity verification and
/// tamper detection. This is a building block for content provenance;
/// full C2PA compliance additionally requires X.509 certificates,
/// trust lists, CBOR manifests with assertions/claims, and ingredient
/// references per the C2PA 2.1 specification.
pub fn generate_state_fingerprint<T: Serialize>(state: &T) -> Result<String, FingerprintError> {
    let json_str =
        serde_json::to_string(state).map_err(|e| FingerprintError::Serialization(e.to_string()))?;
    let mut hasher = Sha256::new();
    hasher.update(json_str.as_bytes());
    let result = hasher.finalize();
    Ok(hex::encode(result))
}
