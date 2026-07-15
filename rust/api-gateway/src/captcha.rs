//! CAPTCHA verification module for the API Gateway.
//!
//! Provides two anti-bot verification strategies:
//!
//! 1. **Cloudflare Turnstile** — invisible CAPTCHA for web/mobile/extension
//!    UIs. The client obtains a token from the Turnstile widget and sends it
//!    to the verification endpoint. The gateway validates the token against
//!    Cloudflare's siteverify API.
//!
//! 2. **Proof-of-Work (hashcash)** — for programmatic clients (CLI, desktop,
//!    MCP). The client requests a challenge, computes a SHA-256 hash with a
//!    nonce that meets the required difficulty (leading zero bits), and
//!    submits the solution. Single-use challenges expire after 5 minutes.
//!
//! ## Endpoints
//!
//! | Method | Path | Description |
//! |--------|------|-------------|
//! | POST | `/api/v1/captcha/verify-turnstile` | Verify a Turnstile token |
//! | GET  | `/api/v1/captcha/challenge` | Get a proof-of-work challenge |
//! | POST | `/api/v1/captcha/verify-pow` | Submit a proof-of-work solution |
//!
//! ## Environment Variables
//!
//! - `TURNSTILE_SECRET_KEY` — Cloudflare Turnstile secret key for server-side
//!   verification. Default: empty (Turnstile disabled, always passes).
//! - `CAPTCHA_DISABLED` — Set to "true" to bypass all CAPTCHA checks
//!   (development convenience).
//! - `POW_DIFFICULTY` — Number of leading zero bits required for PoW.
//!   Default: 20 (≈1 second on modern hardware).

use axum::{http::StatusCode, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

/// Cloudflare Turnstile verification request body.
#[derive(Deserialize)]
pub struct TurnstileVerifyRequest {
	/// The token obtained from the Turnstile widget on the client.
	pub token: String,
	/// Optional action identifier to bind verification to a specific form.
	pub action: Option<String>,
}

/// Cloudflare Turnstile verification response body.
#[derive(Serialize)]
pub struct TurnstileVerifyResponse {
	/// Whether the token was valid.
	pub success: bool,
	/// Human-readable message.
	pub message: String,
	/// Timestamps of any errors from Cloudflare.
	#[serde(skip_serializing_if = "Option::is_none")]
	pub error_codes: Option<Vec<String>>,
}

/// Proof-of-work challenge issued to the client.
#[derive(Serialize, Clone, Debug)]
pub struct PowChallenge {
	/// Unique challenge identifier.
	pub challenge_id: String,
	/// Random prefix the client must hash with a nonce.
	pub prefix: String,
	/// Number of leading zero bits required in the hash output.
	pub difficulty: u32,
	/// Unix timestamp when this challenge expires (5 minutes from issue).
	pub expires_at: u64,
}

/// Proof-of-work solution submitted by the client.
#[derive(Deserialize)]
pub struct PowSolution {
	/// The challenge ID this solution is for.
	pub challenge_id: String,
	/// The nonce the client found.
	pub nonce: u64,
}

/// Proof-of-work verification response.
#[derive(Serialize)]
pub struct PowVerifyResponse {
	/// Whether the solution was valid.
	pub success: bool,
	/// Human-readable message.
	pub message: String,
}

/// Stores active PoW challenges. Cleans up expired entries on each access.
struct ChallengeStore {
	challenges: HashMap<String, PowChallenge>,
	created_at: HashMap<String, Instant>,
}

impl ChallengeStore {
	fn new() -> Self {
		Self {
			challenges: HashMap::new(),
			created_at: HashMap::new(),
		}
	}

	fn store(&mut self, challenge: PowChallenge) {
		let id = challenge.challenge_id.clone();
		self.created_at.insert(id.clone(), Instant::now());
		self.challenges.insert(id, challenge);
	}

	fn take(&mut self, challenge_id: &str) -> Option<PowChallenge> {
		// Clean up expired challenges
		let now = Instant::now();
		let expired: Vec<String> = self
			.created_at
			.iter()
			.filter(|(_, created)| now.duration_since(**created) > Duration::from_secs(300))
			.map(|(k, _)| k.clone())
			.collect();
		for k in &expired {
			self.challenges.remove(k);
			self.created_at.remove(k);
		}

		self.challenges.remove(challenge_id)
	}
}

/// Returns the PoW difficulty from env or default (20 bits ≈ ~1s on modern CPU).
fn pow_difficulty() -> u32 {
	std::env::var("POW_DIFFICULTY")
		.ok()
		.and_then(|v| v.parse().ok())
		.unwrap_or(20)
}

/// Returns whether CAPTCHA is globally disabled (dev mode).
fn captcha_disabled() -> bool {
	std::env::var("CAPTCHA_DISABLED")
		.map(|v| v == "true" || v == "1")
		.unwrap_or(false)
}

/// Generates a random hex string using UUID v4 (16 bytes of randomness).
fn random_hex(len: usize) -> String {
	uuid::Uuid::new_v4()
		.to_string()
		.replace('-', "")
		.chars()
		.take(len)
		.collect()
}

/// Returns a reference to the global proof-of-work challenge store.
/// All handlers share the same store so challenges issued by
/// `handle_get_challenge` are available to `handle_verify_pow`.
fn challenge_store() -> &'static Mutex<ChallengeStore> {
	use std::sync::LazyLock;
	static STORE: LazyLock<Mutex<ChallengeStore>> =
		LazyLock::new(|| Mutex::new(ChallengeStore::new()));
	&STORE
}

/// Verifies a hash has at least `difficulty` leading zero bits.
fn check_difficulty(hash: &[u8; 32], difficulty: u32) -> bool {
	let full_bytes = (difficulty / 8) as usize;
	let remaining_bits = difficulty % 8;

	// Check full zero bytes
	for b in hash.iter().take(full_bytes) {
		if *b != 0 {
			return false;
		}
	}

	// Check remaining bits in the next byte
	if remaining_bits > 0 && full_bytes < 32 {
		let mask = 0xFFu8 << (8 - remaining_bits);
		if hash[full_bytes] & mask != 0 {
			return false;
		}
	}

	true
}

// ── Public Handlers ────────────────────────────────────────────────────

/// POST /api/v1/captcha/verify-turnstile
///
/// Verifies a Cloudflare Turnstile token against the Cloudflare siteverify
/// API. Used by web, mobile, and browser extension clients.
///
/// **Body**: `TurnstileVerifyRequest` (token, optional action)
/// **Returns**: `TurnstileVerifyResponse`
pub async fn handle_verify_turnstile(
	Json(payload): Json<TurnstileVerifyRequest>,
) -> (StatusCode, Json<TurnstileVerifyResponse>) {
	if captcha_disabled() {
		return (
			StatusCode::OK,
			Json(TurnstileVerifyResponse {
				success: true,
				message: "CAPTCHA disabled (dev mode)".to_string(),
				error_codes: None,
			}),
		);
	}

	let secret_key = std::env::var("TURNSTILE_SECRET_KEY").unwrap_or_default();
	if secret_key.is_empty() {
		tracing::warn!("TURNSTILE_SECRET_KEY not set — accepting all tokens");
		return (
			StatusCode::OK,
			Json(TurnstileVerifyResponse {
				success: true,
				message: "Turnstile not configured (dev mode)".to_string(),
				error_codes: None,
			}),
		);
	}

	let client = reqwest::Client::new();
	let form = [
		("secret", secret_key.as_str()),
		("response", payload.token.as_str()),
	];

	match client
		.post("https://challenges.cloudflare.com/turnstile/v0/siteverify")
		.form(&form)
		.send()
		.await
	{
		Ok(resp) => {
			#[derive(Deserialize)]
			struct CfResponse {
				success: bool,
				#[serde(default)]
				error_codes: Vec<String>,
			}

			match resp.json::<CfResponse>().await {
				Ok(cf) => {
					if cf.success {
						(
							StatusCode::OK,
							Json(TurnstileVerifyResponse {
								success: true,
								message: "Token verified".to_string(),
								error_codes: None,
							}),
						)
					} else {
						(
							StatusCode::BAD_REQUEST,
							Json(TurnstileVerifyResponse {
								success: false,
								message: "Invalid Turnstile token".to_string(),
								error_codes: Some(cf.error_codes),
							}),
						)
					}
				}
				Err(e) => {
					tracing::error!(?e, "Failed to parse Turnstile response");
					(
						StatusCode::INTERNAL_SERVER_ERROR,
						Json(TurnstileVerifyResponse {
							success: false,
							message: "Failed to verify token".to_string(),
							error_codes: None,
						}),
					)
				}
			}
		}
		Err(e) => {
			tracing::error!(?e, "Turnstile verification request failed");
			(
				StatusCode::INTERNAL_SERVER_ERROR,
				Json(TurnstileVerifyResponse {
					success: false,
					message: "Verification service unavailable".to_string(),
					error_codes: None,
				}),
			)
		}
	}
}

/// GET /api/v1/captcha/challenge
///
/// Generates a proof-of-work challenge for programmatic clients (CLI,
/// desktop, MCP). The challenge is single-use and expires after 5 minutes.
///
/// **Returns**: `PowChallenge` (challenge_id, prefix, difficulty, expires_at)
pub async fn handle_get_challenge() -> Json<PowChallenge> {
	let difficulty = pow_difficulty();
	let challenge_id = uuid::Uuid::new_v4().to_string();
	let prefix = random_hex(32);
	let expires_at = (chrono::Utc::now() + chrono::Duration::minutes(5)).timestamp() as u64;

	let challenge = PowChallenge {
		challenge_id: challenge_id.clone(),
		prefix,
		difficulty,
		expires_at,
	};

	let mut store = challenge_store().lock().unwrap();
	store.store(challenge.clone());

	Json(challenge)
}

/// POST /api/v1/captcha/verify-pow
///
/// Verifies a proof-of-work solution. The client must find a nonce such that
/// SHA-256(challenge.prefix + nonce) has at least `difficulty` leading zero
/// bits. Challenges are single-use and expire after 5 minutes.
///
/// **Body**: `PowSolution` (challenge_id, nonce)
/// **Returns**: `PowVerifyResponse`
pub async fn handle_verify_pow(
	Json(solution): Json<PowSolution>,
) -> (StatusCode, Json<PowVerifyResponse>) {
	if captcha_disabled() {
		return (
			StatusCode::OK,
			Json(PowVerifyResponse {
				success: true,
				message: "CAPTCHA disabled (dev mode)".to_string(),
			}),
		);
	}

	let mut store = challenge_store().lock().unwrap();
	let challenge = store.take(&solution.challenge_id);

	match challenge {
		None => (
			StatusCode::BAD_REQUEST,
			Json(PowVerifyResponse {
				success: false,
				message: "Invalid or expired challenge".to_string(),
			}),
		),
		Some(ch) => {
			// Verify expiry
			let now = chrono::Utc::now().timestamp() as u64;
			if now > ch.expires_at {
				return (
					StatusCode::BAD_REQUEST,
					Json(PowVerifyResponse {
						success: false,
						message: "Challenge expired".to_string(),
					}),
				);
			}

			// Verify: SHA-256(prefix + nonce) has enough leading zeros
			let input = format!("{}{}", ch.prefix, solution.nonce);
			let hash: [u8; 32] = Sha256::digest(input.as_bytes()).into();

			if check_difficulty(&hash, ch.difficulty) {
				(
					StatusCode::OK,
					Json(PowVerifyResponse {
						success: true,
						message: "Proof-of-work verified".to_string(),
					}),
				)
			} else {
				(
					StatusCode::BAD_REQUEST,
					Json(PowVerifyResponse {
						success: false,
						message: "Invalid proof-of-work solution".to_string(),
					}),
				)
			}
		}
	}
}

/// Axum middleware that requires a valid Turnstile token in the
/// `X-Captcha-Token` header for protected routes.
///
/// This middleware intercepts requests and verifies the captcha token
/// before allowing them to proceed. If verification fails or the header
/// is missing, a 403 Forbidden response is returned.
///
/// To skip verification for a route, set the `DisableCaptcha` extension
/// before this middleware runs.
pub async fn captcha_middleware(
	req: axum::extract::Request,
	next: axum::middleware::Next,
) -> axum::response::Response {
	// Skip if CAPTCHA is disabled globally
	if captcha_disabled() {
		return next.run(req).await;
	}

	// Skip if the route has opted out via extension
	if req.extensions().get::<DisableCaptcha>().is_some() {
		return next.run(req).await;
	}

	// Extract captcha token from X-Captcha-Token header
	let token = req
		.headers()
		.get("X-Captcha-Token")
		.and_then(|v| v.to_str().ok())
		.unwrap_or("");

	if token.is_empty() {
		return (
			StatusCode::FORBIDDEN,
			Json(serde_json::json!({
				"error": "captcha_required",
				"message": "CAPTCHA verification required. Include X-Captcha-Token header."
			})),
		)
			.into_response();
	}

	// Verify the token
	let secret_key = std::env::var("TURNSTILE_SECRET_KEY").unwrap_or_default();
	let client = reqwest::Client::new();
	let form = [("secret", secret_key.as_str()), ("response", token)];

	match client
		.post("https://challenges.cloudflare.com/turnstile/v0/siteverify")
		.form(&form)
		.send()
		.await
	{
		Ok(resp) => {
			#[derive(Deserialize)]
			struct CfResponse {
				success: bool,
			}

			match resp.json::<CfResponse>().await {
				Ok(cf) if cf.success => next.run(req).await,
				_ => (
					StatusCode::FORBIDDEN,
					Json(serde_json::json!({
						"error": "captcha_invalid",
						"message": "Invalid CAPTCHA token"
					})),
				)
					.into_response(),
			}
		}
		Err(_) => (
			StatusCode::INTERNAL_SERVER_ERROR,
			Json(serde_json::json!({
				"error": "captcha_error",
				"message": "CAPTCHA verification service unavailable"
			})),
		)
			.into_response(),
	}
}

/// Extension type to disable CAPTCHA on specific routes.
/// Insert this into request extensions before the captcha middleware runs.
#[derive(Clone)]
pub struct DisableCaptcha;

// ── Tests ──────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_check_difficulty_easy() {
		// Hash with leading zero byte
		let mut hash = [0u8; 32];
		hash[0] = 0x00;
		assert!(check_difficulty(&hash, 8));
		assert!(check_difficulty(&hash, 4));
	}

	#[test]
	fn test_check_difficulty_two_bytes() {
		let mut hash = [0u8; 32];
		hash[0] = 0x00;
		hash[1] = 0x00;
		hash[2] = 0xFF; // 3rd byte is NOT zero
		assert!(check_difficulty(&hash, 16));
		assert!(!check_difficulty(&hash, 17));
	}

	#[test]
	fn test_check_difficulty_partial_byte() {
		let mut hash = [0u8; 32];
		hash[0] = 0x00; // 8 bits zero
		hash[1] = 0x0F; // 0000 1111 — top 4 bits are zero
		assert!(check_difficulty(&hash, 12)); // 8 + 4 = 12
		assert!(!check_difficulty(&hash, 13)); // Need 5th bit zero, but 5th is 1
	}

	#[test]
	fn test_check_difficulty_fail() {
		let hash = [0xFFu8; 32];
		assert!(!check_difficulty(&hash, 1));
		assert!(!check_difficulty(&hash, 8));
	}

	#[test]
	fn test_random_hex_length() {
		let s = random_hex(16);
		assert_eq!(s.len(), 16);
		assert!(s.chars().all(|c| c.is_ascii_hexdigit()));
	}

	#[test]
	fn test_pow_solve_and_verify() {
		let difficulty = 16u32; // 2 leading zero bytes — easy enough for a unit test
		let prefix = "test-prefix-1234";
		let challenge = PowChallenge {
			challenge_id: "test-challenge".to_string(),
			prefix: prefix.to_string(),
			difficulty,
			expires_at: (chrono::Utc::now() + chrono::Duration::minutes(5)).timestamp() as u64,
		};

		// Solve locally
		let mut nonce = 0u64;
		let solution_nonce = loop {
			let input = format!("{}{}", prefix, nonce);
			let hash: [u8; 32] = Sha256::digest(input.as_bytes()).into();
			if check_difficulty(&hash, difficulty) {
				break nonce;
			}
			nonce += 1;
			if nonce > 100_000_000 {
				panic!("Could not solve PoW in 100M iterations");
			}
		};

		// Verify
		let input = format!("{}{}", prefix, solution_nonce);
		let hash: [u8; 32] = Sha256::digest(input.as_bytes()).into();
		assert!(check_difficulty(&hash, difficulty));
	}
}
