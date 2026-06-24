use serde::Serialize;
use sha2::{Digest, Sha256};

/// Error type for content fingerprint operations.
#[derive(Debug)]
pub enum FingerprintError {
    /// Serialization of the input state to JSON failed.
    Serialization(String),
}

impl std::fmt::Display for FingerprintError {
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
