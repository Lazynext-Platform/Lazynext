//! Proof-of-work CAPTCHA module for the desktop app.
//!
//! Before sending sensitive API requests (autonomous edits, agent commands),
//! the desktop app solves a hashcash challenge from the API Gateway to prove
//! it is not an automated bot.
//!
//! Flow:
//! 1. GET /api/v1/captcha/challenge → receive prefix + difficulty
//! 2. Compute nonce s.t. SHA-256(prefix + nonce) has N leading zero bits
//! 3. POST /api/v1/captcha/verify-pow → verify solution
//!
//! On success, the captcha token is included in subsequent API requests
//! via the `X-Captcha-Token` header.

use reqwest::Client;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

/// A proof-of-work challenge from the API Gateway.
#[derive(Deserialize, Debug)]
#[allow(dead_code)]
pub struct PowChallenge {
    pub challenge_id: String,
    pub prefix: String,
    pub difficulty: u32,
    pub expires_at: u64,
}

/// Solution to a proof-of-work challenge.
#[derive(Serialize)]
struct PowSolution {
    challenge_id: String,
    nonce: u64,
}

/// Response from the captcha verification endpoint.
#[derive(Deserialize)]
struct PowVerifyResponse {
    success: bool,
}

/// Fetches a fresh proof-of-work challenge from the API Gateway.
async fn get_challenge(gateway_url: &str) -> Result<PowChallenge, String> {
    let url = format!("{}/api/v1/captcha/challenge", gateway_url);
    let resp = Client::new()
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch challenge: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("Challenge request failed: {}", resp.status()));
    }

    resp.json::<PowChallenge>()
        .await
        .map_err(|e| format!("Invalid challenge response: {e}"))
}

/// Checks if a SHA-256 hash has at least `difficulty` leading zero bits.
fn check_difficulty(hash: &[u8; 32], difficulty: u32) -> bool {
    let full_bytes = (difficulty / 8) as usize;
    let remaining_bits = difficulty % 8;

    for b in hash.iter().take(full_bytes) {
        if *b != 0 {
            return false;
        }
    }

    if remaining_bits > 0 && full_bytes < 32 {
        let mask = 0xFFu8 << (8 - remaining_bits);
        if hash[full_bytes] & mask != 0 {
            return false;
        }
    }

    true
}

/// Solves a proof-of-work challenge by finding a nonce.
/// Uses all available CPU cores for parallel search.
fn solve_challenge(challenge: &PowChallenge) -> u64 {
    let prefix = challenge.prefix.clone();
    let difficulty = challenge.difficulty;

    use std::sync::Arc;
    use std::sync::atomic::{AtomicBool, Ordering};

    let found = Arc::new(AtomicBool::new(false));
    let result = Arc::new(std::sync::Mutex::new(None));

    let num_threads = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4);

    let mut handles = Vec::new();

    for t in 0..num_threads {
        let prefix = prefix.clone();
        let found = Arc::clone(&found);
        let result = Arc::clone(&result);

        handles.push(std::thread::spawn(move || {
            let mut nonce = t as u64;
            loop {
                if found.load(Ordering::Relaxed) {
                    return;
                }

                let mut hasher = Sha256::new();
                hasher.update(format!("{}{}", prefix, nonce).as_bytes());
                let hash: [u8; 32] = hasher.finalize().into();

                if check_difficulty(&hash, difficulty) {
                    let mut res = result.lock().unwrap();
                    if res.is_none() {
                        *res = Some(nonce);
                        found.store(true, Ordering::Relaxed);
                    }
                    return;
                }

                nonce += num_threads as u64;
            }
        }));
    }

    for h in handles {
        let _ = h.join();
    }

    result.lock().unwrap().unwrap_or(0)
}

/// Submits a proof-of-work solution for verification.
async fn verify_solution(
    gateway_url: &str,
    challenge_id: &str,
    nonce: u64,
) -> Result<bool, String> {
    let url = format!("{}/api/v1/captcha/verify-pow", gateway_url);
    let solution = PowSolution {
        challenge_id: challenge_id.to_string(),
        nonce,
    };

    let resp = Client::new()
        .post(&url)
        .json(&solution)
        .send()
        .await
        .map_err(|e| format!("Verification request failed: {e}"))?;

    let body: PowVerifyResponse = resp
        .json()
        .await
        .map_err(|e| format!("Invalid verification response: {e}"))?;

    Ok(body.success)
}

/// Performs a complete proof-of-work CAPTCHA verification.
///
/// Returns a token string to include as the `X-Captcha-Token` header,
/// or an error if verification failed.
pub async fn perform_captcha(gateway_url: &str) -> Result<String, String> {
    log::info!("Performing CAPTCHA verification...");

    let challenge = get_challenge(gateway_url).await?;
    log::info!(
        "Solving PoW challenge (difficulty: {} bits)...",
        challenge.difficulty
    );

    let start = std::time::Instant::now();
    let nonce = solve_challenge(&challenge);
    let elapsed = start.elapsed();

    log::info!(
        "PoW solved in {:.2}s (nonce: {})",
        elapsed.as_secs_f64(),
        nonce
    );

    let verified = verify_solution(gateway_url, &challenge.challenge_id, nonce).await?;

    if verified {
        let token = format!("{}:{}", challenge.challenge_id, nonce);
        Ok(token)
    } else {
        Err("CAPTCHA solution rejected by server".to_string())
    }
}
