use serde::Serialize;
use sha2::{Digest, Sha256};

/// Generates a C2PA-compliant cryptographic fingerprint for a timeline state
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
