//! Rate limiting middleware for the API Gateway.
//!
//! Implements a token-bucket rate limiter per client IP (behind a reverse proxy,
//! reads `X-Forwarded-For` or falls back to the direct peer address).
//!
//! Default limits:
//!   - 60 requests per minute for unauthenticated endpoints
//!   - 300 requests per minute for authenticated endpoints
//!   - 30 requests per minute for AI generation endpoints (expensive)

use axum::{
    extract::{ConnectInfo, Request},
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Mutex;
use std::time::{Duration, Instant};

/// Configuration for a rate limit bucket.
#[derive(Clone, Debug)]
pub struct RateLimitConfig {
    /// Maximum number of tokens the bucket can hold (burst capacity).
    pub capacity: u32,
    /// Tokens refilled per second.
    pub refill_rate: f64,
}

impl RateLimitConfig {
    pub const fn new(capacity: u32, refill_per_second: f64) -> Self {
        Self {
            capacity,
            refill_rate: refill_per_second,
        }
    }
}

/// Default rate limit profiles.
pub mod profiles {
    use super::RateLimitConfig;

    /// 60 req/min — unauthenticated endpoints
    pub const PUBLIC: RateLimitConfig = RateLimitConfig::new(60, 1.0);
    /// 300 req/min — authenticated endpoints
    pub const AUTHENTICATED: RateLimitConfig = RateLimitConfig::new(300, 5.0);
    /// 30 req/min — AI generation (expensive)
    pub const AI_GENERATION: RateLimitConfig = RateLimitConfig::new(30, 0.5);
    /// 600 req/min — admin endpoints
    pub const ADMIN: RateLimitConfig = RateLimitConfig::new(600, 10.0);
}

/// Token bucket state for a single client.
#[derive(Debug)]
struct TokenBucket {
    tokens: f64,
    last_refill: Instant,
}

impl TokenBucket {
    fn new(capacity: u32) -> Self {
        Self {
            tokens: capacity as f64,
            last_refill: Instant::now(),
        }
    }

    /// Attempt to consume one token. Returns `true` if allowed.
    fn try_consume(&mut self, config: &RateLimitConfig) -> bool {
        let now = Instant::now();
        let elapsed = now.duration_since(self.last_refill).as_secs_f64();
        self.last_refill = now;

        // Refill tokens
        self.tokens = (self.tokens + elapsed * config.refill_rate).min(config.capacity as f64);

        if self.tokens >= 1.0 {
            self.tokens -= 1.0;
            true
        } else {
            false
        }
    }
}

/// Thread-safe rate limiter store keyed by client identifier (IP or API key).
pub struct RateLimiter {
    buckets: Mutex<HashMap<String, TokenBucket>>,
    config: RateLimitConfig,
}

impl RateLimiter {
    pub fn new(config: RateLimitConfig) -> Self {
        Self {
            buckets: Mutex::new(HashMap::new()),
            config,
        }
    }

    /// Check if a request from the given key is allowed.
    pub fn check(&self, key: &str) -> bool {
        let mut buckets = self.buckets.lock().unwrap();
        // Periodically clean up stale entries (every 1000 checks)
        if buckets.len() > 10_000 {
            buckets.retain(|_, b| b.last_refill.elapsed() < Duration::from_secs(300));
        }
        let bucket = buckets
            .entry(key.to_string())
            .or_insert_with(|| TokenBucket::new(self.config.capacity));
        bucket.try_consume(&self.config)
    }
}

/// Extract the client's real IP address, handling reverse proxies.
fn client_ip(req: &Request) -> String {
    // Check X-Forwarded-For header first (reverse proxy)
    if let Some(fwd) = req.headers().get("x-forwarded-for")
        && let Ok(val) = fwd.to_str() {
            // Take the leftmost IP (the original client)
            if let Some(ip) = val.split(',').next() {
                return ip.trim().to_string();
            }
        }
    // Fall back to X-Real-IP
    if let Some(real_ip) = req.headers().get("x-real-ip")
        && let Ok(val) = real_ip.to_str() {
            return val.trim().to_string();
        }
    // Fall back to direct peer address
    if let Some(connect_info) = req.extensions().get::<ConnectInfo<SocketAddr>>() {
        return connect_info.0.ip().to_string();
    }
    "unknown".to_string()
}

/// Axum middleware: rate limit requests based on client IP.
///
/// Returns 429 Too Many Requests when the limit is exceeded.
pub async fn rate_limit(req: Request, next: Next) -> Result<Response, StatusCode> {
    // Skip rate limiting if explicitly disabled
    if std::env::var("DISABLE_RATE_LIMITING").is_ok() {
        return Ok(next.run(req).await);
    }

    let ip = client_ip(&req);

    // Choose config based on path
    let config = if req.uri().path().starts_with("/api/v1/ai/") {
        profiles::AI_GENERATION
    } else if req.uri().path().starts_with("/api/v1/admin/") {
        profiles::ADMIN
    } else {
        profiles::PUBLIC
    };

    // Use a lazily-initialized global rate limiter per config
    // In production, this would be backed by Redis for distributed rate limiting
    let key = format!("{}:{}", config.capacity, config.refill_rate);
    let limiter = get_limiter(&config, &key);

    if limiter.check(&ip) {
        Ok(next.run(req).await)
    } else {
        let mut resp = axum::Json(serde_json::json!({
            "error": "rate_limit_exceeded",
            "message": "Too many requests. Please slow down.",
            "retry_after_seconds": 1
        }))
        .into_response();
        *resp.status_mut() = StatusCode::TOO_MANY_REQUESTS;
        resp.headers_mut()
            .insert("Retry-After", "1".parse().unwrap());
        Ok(resp)
    }
}

/// Get or create a rate limiter for the given config.
fn get_limiter(config: &RateLimitConfig, key: &str) -> &'static RateLimiter {
    use std::sync::OnceLock;
    static LIMITERS: OnceLock<Mutex<HashMap<String, RateLimiter>>> = OnceLock::new();
    let map = LIMITERS.get_or_init(|| Mutex::new(HashMap::new()));
    let mut guard = map.lock().unwrap();
    guard
        .entry(key.to_string())
        .or_insert_with(|| RateLimiter::new(config.clone()));
    // Leak the reference to keep it alive for the static lifetime
    // This is safe because rate limiters live for the duration of the process
    unsafe {
        let ptr: *const RateLimiter = guard.get(key).unwrap();
        &*ptr
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_token_bucket_allows_up_to_capacity() {
        let config = RateLimitConfig::new(5, 1.0);
        let mut bucket = TokenBucket::new(5);
        for _ in 0..5 {
            assert!(bucket.try_consume(&config), "Should allow up to capacity");
        }
        assert!(
            !bucket.try_consume(&config),
            "Should deny after capacity exhausted"
        );
    }

    #[test]
    fn test_token_bucket_refills() {
        let config = RateLimitConfig::new(10, 100.0); // 100 tokens/sec
        let mut bucket = TokenBucket::new(10);
        // Consume all tokens
        for _ in 0..10 {
            assert!(bucket.try_consume(&config));
        }
        assert!(!bucket.try_consume(&config));
        // Advance time artificially
        bucket.last_refill = Instant::now() - Duration::from_millis(100);
        // Should have refilled ~10 tokens
        assert!(
            bucket.try_consume(&config),
            "Should refill after time passes"
        );
    }
}
