use serde::Serialize;
use sha2::{Digest, Sha256};

/// Generates a SHA-256 content fingerprint for a serializable state.
///
/// Produces a hex-encoded hash suitable for integrity verification and
/// tamper detection. This is a building block for content provenance;
/// full C2PA compliance additionally requires X.509 certificates,
/// trust lists, CBOR manifests with assertions/claims, and ingredient
/// references per the C2PA 2.1 specification.
pub fn generate_state_fingerprint<T: Serialize>(state: &T) -> Result<String, String> {
    match serde_json::to_string(state) {
        Ok(json_str) => {
            let mut hasher = Sha256::new();
            hasher.update(json_str.as_bytes());
            let result = hasher.finalize();
            Ok(hex::encode(result))
        }
        Err(e) => Err(format!("Serialization failed: {}", e)),
    }
}
