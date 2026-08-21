// API Gateway authentication + rate limiting.
//
// The Lazynext editor and project store use a local-device trust model
// (loopback + same-origin Origin). External apps, agents, services, and the
// CLI cannot satisfy that shape, so the API Gateway exposes a versioned REST
// surface (`/api/v1/*`) gated by a single shared API key. The key is read from
// the keystore (`LAZYNEXT_API_KEY`) so it can be set in `.env` or rotated from
// the Settings UI without restarting.
//
// The request-shape gate (server/plugins/request-shape-gate.ts) imports
// `apiGatewayAuthorized` so authenticated gateway writes are allowed through
// the global CSRF gate before reaching the gateway plugin.
import { timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { getKey } from './keystore.ts';

const API_PATH_PREFIX = '/api/v1/';

export function apiGatewayPathPrefix(): string {
  return API_PATH_PREFIX;
}

/** The configured gateway API key. Empty string => gateway disabled. */
export function apiGatewayKey(): string {
  return (process.env.LAZYNEXT_API_KEY?.trim() || getKey('LAZYNEXT_API_KEY')).trim();
}

/** Whether the gateway is enabled (an API key has been configured). */
export function apiGatewayEnabled(): boolean {
  return apiGatewayKey().length > 0;
}

function secretMatches(actual: string | undefined, expected: string): boolean {
  if (!actual || !expected) return false;
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Extract the presented API key from Authorization: Bearer or x-lazynext-api-key. */
export function presentedApiKey(req: IncomingMessage): string | null {
  const headerKey = typeof req.headers['x-lazynext-api-key'] === 'string'
    ? (req.headers['x-lazynext-api-key'] as string)
    : null;
  if (headerKey) return headerKey.trim();
  const auth = typeof req.headers.authorization === 'string' ? req.headers.authorization : null;
  if (auth && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  return null;
}

/** True if the request carries a valid gateway API key. */
export function apiGatewayAuthorized(req: IncomingMessage): boolean {
  const expected = apiGatewayKey();
  if (!expected) return false;
  return secretMatches(presentedApiKey(req) ?? undefined, expected);
}

/** True if the request targets the gateway surface. */
export function isApiGatewayPath(req: IncomingMessage): boolean {
  return typeof req.url === 'string' && req.url.startsWith(API_PATH_PREFIX);
}

// ── Rate limiting (in-memory token bucket per API key) ──────────────────────

export interface RateLimitConfig {
  capacity: number;       // max tokens
  refillPerSecond: number; // tokens added per second
}

export function parseRateLimit(raw: string | undefined): RateLimitConfig {
  // Accepts "120/min", "120/60s", "10/s", or a bare number (per minute).
  const fallback: RateLimitConfig = { capacity: 120, refillPerSecond: 2 };
  const text = (raw ?? '').trim();
  if (!text) return fallback;
  const match = /^(\d+)\s*\/\s*(min|minute|s|sec|second|hour|h)?\s*(s)?$/i.exec(text);
  if (match) {
    const count = Number(match[1]);
    const unit = (match[2] ?? 'min').toLowerCase();
    if (!Number.isFinite(count) || count <= 0) return fallback;
    if (unit.startsWith('min')) return { capacity: count, refillPerSecond: count / 60 };
    if (unit.startsWith('s')) return { capacity: count, refillPerSecond: count };
    if (unit.startsWith('h')) return { capacity: count, refillPerSecond: count / 3600 };
    return fallback;
  }
  const bare = Number(text);
  if (Number.isFinite(bare) && bare > 0) return { capacity: bare, refillPerSecond: bare / 60 };
  return fallback;
}

interface Bucket {
  tokens: number;
  updatedAt: number;
}

const buckets = new Map<string, Bucket>();

/** Returns the wait until the next token is available, or 0 if allowed. */
export function rateLimitConsume(key: string, config: RateLimitConfig): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket) {
    buckets.set(key, { tokens: config.capacity - 1, updatedAt: now });
    return true;
  }
  const elapsedSec = (now - bucket.updatedAt) / 1000;
  bucket.tokens = Math.min(config.capacity, bucket.tokens + elapsedSec * config.refillPerSecond);
  bucket.updatedAt = now;
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return true;
  }
  return false;
}

export function rateLimitReset(): void {
  buckets.clear();
}
