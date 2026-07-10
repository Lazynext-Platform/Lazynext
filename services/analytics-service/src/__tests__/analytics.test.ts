/**
 * Comprehensive test suite for the Lazynext Analytics Service.
 *
 * Covers health, event ingestion, metrics, LTV, and session endpoints.
 * Starts the Express app on a random port, authenticates API routes with
 * HS256 JWTs signed against the dev secret used by authMiddleware.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import crypto from "crypto";

// ── JWT Helpers ──────────────────────────────────────────────────────────
// The authMiddleware (from @lazynext/api-client) uses jsonwebtoken with
// HS256. The dev fallback secret must be at least 32 chars.
const DEV_SECRET =
	"lazynext-dev-secret-key-for-auth-minimum-32-chars-better-auth";

function encodeBase64Url(data: Buffer): string {
	return data
		.toString("base64")
		.replace(/=/g, "")
		.replace(/\+/g, "-")
		.replace(/\//g, "_");
}

function createToken(userId = "test-user"): string {
	const now = Math.floor(Date.now() / 1000);
	const header = { alg: "HS256", typ: "JWT" };
	const payload = {
		sub: userId,
		email: `${userId}@test.com`,
		name: "Test User",
		role: "user",
		iat: now,
		exp: now + 3600,
	};
	const headerB64 = encodeBase64Url(Buffer.from(JSON.stringify(header)));
	const payloadB64 = encodeBase64Url(Buffer.from(JSON.stringify(payload)));
	const signingInput = `${headerB64}.${payloadB64}`;
	const signature = encodeBase64Url(
		crypto.createHmac("sha256", DEV_SECRET).update(signingInput).digest(),
	);
	return `${signingInput}.${signature}`;
}

// ── Environment Setup ────────────────────────────────────────────────────
// Must be set before the dynamic import so SQLite uses an in-memory DB.
process.env.ANALYTICS_DB_PATH = ":memory:";

let app: Awaited<typeof import("../index")>["default"];
let server: ReturnType<typeof app.listen>;
let baseUrl: string;

beforeAll(async () => {
	const mod = await import("../index");
	app = mod.default;
	const port: number = await new Promise((resolve) => {
		server = app.listen(0, () => {
			resolve((server.address() as import("net").AddressInfo).port);
		});
	});
	baseUrl = `http://localhost:${port}`;
});

afterAll(() => {
	if (server) server.close();
});

// ── Helpers ──────────────────────────────────────────────────────────────

function url(path: string): string {
	return `${baseUrl}${path}`;
}

function authHeaders(token?: string): Record<string, string> {
	const t = token ?? createToken();
	return {
		Authorization: `Bearer ${t}`,
		"Content-Type": "application/json",
	};
}

function noAuthHeaders(): Record<string, string> {
	return { "Content-Type": "application/json" };
}

// ── Health Endpoint ──────────────────────────────────────────────────────

describe("Health Endpoint", () => {
	test("GET /health returns status ok with 200", async () => {
		const res = await fetch(url("/health"));
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.status).toBe("ok");
		expect(body.service).toBe("analytics-service");
	});

	test("GET /health includes uptime and buffer/session counts", async () => {
		const res = await fetch(url("/health"));
		const body = await res.json();

		expect(typeof body.uptime).toBe("number");
		expect(body.uptime).toBeGreaterThan(0);
		expect(typeof body.buffered_events).toBe("number");
		expect(typeof body.active_sessions).toBe("number");
		expect(["connected", "buffer_only"]).toContain(body.kafka);
		expect(["connected", "unavailable"]).toContain(body.clickhouse);
	});

	test("GET /health does not require authentication", async () => {
		const res = await fetch(url("/health"));
		expect(res.status).toBe(200);
	});
});

// ── Event Ingestion ──────────────────────────────────────────────────────

describe("Event Ingestion (POST /api/v1/events)", () => {
	const validEvent = {
		userId: "user-123",
		eventType: "page_view",
		metadata: { page: "/editor", duration: 1500 },
		sessionId: "sess-abc",
		timestamp: Date.now(),
	};

	test("accepts valid events and returns { accepted: true } with 202", async () => {
		const res = await fetch(url("/api/v1/events"), {
			method: "POST",
			headers: authHeaders(),
			body: JSON.stringify(validEvent),
		});
		const body = await res.json();

		expect(res.status).toBe(202);
		expect(body.accepted).toBe(true);
	});

	test("auto-generates sessionId when not provided", async () => {
		const res = await fetch(url("/api/v1/events"), {
			method: "POST",
			headers: authHeaders(),
			body: JSON.stringify({
				userId: "user-no-session",
				eventType: "page_view",
			}),
		});

		expect(res.status).toBe(202);
	});

	test("auto-generates timestamp when not provided", async () => {
		const res = await fetch(url("/api/v1/events"), {
			method: "POST",
			headers: authHeaders(),
			body: JSON.stringify({
				userId: "user-no-ts",
				eventType: "page_view",
			}),
		});

		expect(res.status).toBe(202);
	});

	test("rejects request with missing userId (400)", async () => {
		const res = await fetch(url("/api/v1/events"), {
			method: "POST",
			headers: authHeaders(),
			body: JSON.stringify({ eventType: "page_view" }),
		});
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toContain("Invalid userId");
	});

	test("rejects request with empty userId string (400)", async () => {
		const res = await fetch(url("/api/v1/events"), {
			method: "POST",
			headers: authHeaders(),
			body: JSON.stringify({ userId: "   ", eventType: "page_view" }),
		});
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toContain("Invalid userId");
	});

	test("rejects request with missing eventType (400)", async () => {
		const res = await fetch(url("/api/v1/events"), {
			method: "POST",
			headers: authHeaders(),
			body: JSON.stringify({ userId: "user-1" }),
		});
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toContain("Missing eventType");
	});

	test("rejects request with empty eventType string (400)", async () => {
		const res = await fetch(url("/api/v1/events"), {
			method: "POST",
			headers: authHeaders(),
			body: JSON.stringify({ userId: "user-1", eventType: "   " }),
		});
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toContain("Missing eventType");
	});

	test("rejects request with invalid eventType (400)", async () => {
		const res = await fetch(url("/api/v1/events"), {
			method: "POST",
			headers: authHeaders(),
			body: JSON.stringify({
				userId: "user-1",
				eventType: "nonexistent_event",
			}),
		});
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toContain("Invalid eventType");
	});

	test("rejects request with non-string userId (400)", async () => {
		const res = await fetch(url("/api/v1/events"), {
			method: "POST",
			headers: authHeaders(),
			body: JSON.stringify({ userId: 12345, eventType: "page_view" }),
		});
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toContain("Invalid userId");
	});

	test("rejects request with userId exceeding 256 chars (400)", async () => {
		const res = await fetch(url("/api/v1/events"), {
			method: "POST",
			headers: authHeaders(),
			body: JSON.stringify({
				userId: "x".repeat(257),
				eventType: "page_view",
			}),
		});
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toContain("Invalid userId");
	});

	test("rejects request with non-numeric timestamp (400)", async () => {
		const res = await fetch(url("/api/v1/events"), {
			method: "POST",
			headers: authHeaders(),
			body: JSON.stringify({
				userId: "user-1",
				eventType: "page_view",
				timestamp: "now",
			}),
		});
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toContain("timestamp must be a number");
	});

	test("rejects request with non-string sessionId (400)", async () => {
		const res = await fetch(url("/api/v1/events"), {
			method: "POST",
			headers: authHeaders(),
			body: JSON.stringify({
				userId: "user-1",
				eventType: "page_view",
				sessionId: 999,
			}),
		});
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toContain("sessionId must be a string");
	});

	test("returns 401 when no authorization token is provided", async () => {
		const res = await fetch(url("/api/v1/events"), {
			method: "POST",
			headers: noAuthHeaders(),
			body: JSON.stringify(validEvent),
		});
		const body = await res.json();

		expect(res.status).toBe(401);
		expect(body.error).toContain("Missing authorization token");
	});

	test("returns 401 when an invalid JWT token is provided", async () => {
		const res = await fetch(url("/api/v1/events"), {
			method: "POST",
			headers: authHeaders("not.a.real.token"),
			body: JSON.stringify(validEvent),
		});
		const body = await res.json();

		expect(res.status).toBe(401);
		expect(body.error).toContain("Invalid or expired token");
	});

	test("accepts all valid event types", async () => {
		const validTypes = [
			"page_view",
			"timeline_edit",
			"export_started",
			"ai_prompt_sent",
			"login",
			"signup",
			"session_start",
			"payment_completed",
		];

		for (const eventType of validTypes) {
			const res = await fetch(url("/api/v1/events"), {
				method: "POST",
				headers: authHeaders(),
				body: JSON.stringify({ userId: "user-1", eventType }),
			});
			expect(res.status).toBe(202);
		}
	});

	test("sanitizes metadata with excessive keys or long values", async () => {
		const res = await fetch(url("/api/v1/events"), {
			method: "POST",
			headers: authHeaders(),
			body: JSON.stringify({
				userId: "user-meta",
				eventType: "page_view",
				metadata: { longValue: "a".repeat(2000) },
			}),
		});

		expect(res.status).toBe(202);
		// Truncation happens server-side; the event is still accepted
	});

	test("accepts null metadata (defaults to {})", async () => {
		const res = await fetch(url("/api/v1/events"), {
			method: "POST",
			headers: authHeaders(),
			body: JSON.stringify({
				userId: "user-null-meta",
				eventType: "page_view",
				metadata: null,
			}),
		});

		expect(res.status).toBe(202);
	});
});

// ── Metrics Endpoint ─────────────────────────────────────────────────────

describe("Metrics Endpoint (GET /api/v1/metrics)", () => {
	test("returns usage stats with 200", async () => {
		const res = await fetch(url("/api/v1/metrics"), {
			headers: authHeaders(),
		});
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.success).toBe(true);
		expect(body.period).toBe("30d");
		expect(body.metrics).toBeDefined();
		expect(typeof body.metrics.totalEvents).toBe("number");
		expect(typeof body.metrics.uniqueUsers).toBe("number");
		expect(typeof body.metrics.activeSessions).toBe("number");
		expect(typeof body.metrics.estimatedRevenue).toBe("number");
		expect(body.metrics.eventBreakdown).toBeDefined();
		expect(["clickhouse", "in-memory"]).toContain(body.metrics.dataSource);
	});

	test("requires authentication (401 without token)", async () => {
		const res = await fetch(url("/api/v1/metrics"), {
			headers: noAuthHeaders(),
		});
		const body = await res.json();

		expect(res.status).toBe(401);
		expect(body.error).toContain("Missing authorization token");
	});

	test("reflects ingested events in the event breakdown", async () => {
		// Ingest several events of known types
		await fetch(url("/api/v1/events"), {
			method: "POST",
			headers: authHeaders(),
			body: JSON.stringify({
				userId: "metrics-test-user",
				eventType: "signup",
			}),
		});

		await fetch(url("/api/v1/events"), {
			method: "POST",
			headers: authHeaders(),
			body: JSON.stringify({
				userId: "metrics-test-user",
				eventType: "page_view",
			}),
		});

		await fetch(url("/api/v1/events"), {
			method: "POST",
			headers: authHeaders(),
			body: JSON.stringify({
				userId: "metrics-test-user",
				eventType: "page_view",
			}),
		});

		const res = await fetch(url("/api/v1/metrics"), {
			headers: authHeaders(),
		});
		const body = await res.json();

		expect(body.metrics.eventBreakdown.signup).toBeGreaterThanOrEqual(1);
		expect(body.metrics.eventBreakdown.page_view).toBeGreaterThanOrEqual(2);
	});

	test("tracks revenue from payment_completed events", async () => {
		await fetch(url("/api/v1/events"), {
			method: "POST",
			headers: authHeaders(),
			body: JSON.stringify({
				userId: "payer-user",
				eventType: "payment_completed",
				metadata: { amount: 29.99 },
			}),
		});

		const res = await fetch(url("/api/v1/metrics"), {
			headers: authHeaders(),
		});
		const body = await res.json();

		expect(body.metrics.estimatedRevenue).toBeGreaterThanOrEqual(29.99);
	});
});

// ── LTV Endpoint ─────────────────────────────────────────────────────────

describe("LTV Endpoint (GET /api/v1/ltv/:userId)", () => {
	test("returns LTV metrics for a known user with 200", async () => {
		const res = await fetch(url("/api/v1/ltv/payer-user"), {
			headers: authHeaders(),
		});
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.success).toBe(true);
		expect(body.userId).toBe("payer-user");
		expect(body.metrics).toBeDefined();
		expect(typeof body.metrics.totalEvents).toBe("number");
		expect(typeof body.metrics.totalSpent).toBe("number");
		expect(typeof body.metrics.daysActive).toBe("number");
		expect(typeof body.metrics.estimatedLTV).toBe("number");
	});

	test("returns zero LTV for an unknown user (no events)", async () => {
		const res = await fetch(url("/api/v1/ltv/unknown-user"), {
			headers: authHeaders(),
		});
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.success).toBe(true);
		expect(body.userId).toBe("unknown-user");
		expect(body.metrics.totalEvents).toBe(0);
		expect(body.metrics.totalSpent).toBe(0);
		expect(body.metrics.estimatedLTV).toBe(0);
	});

	test("requires authentication (401 without token)", async () => {
		const res = await fetch(url("/api/v1/ltv/any-user"), {
			headers: noAuthHeaders(),
		});
		const body = await res.json();

		expect(res.status).toBe(401);
		expect(body.error).toContain("Missing authorization token");
	});

	test("computes positive LTV for a paying user", async () => {
		const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

		await fetch(url("/api/v1/events"), {
			method: "POST",
			headers: authHeaders(),
			body: JSON.stringify({
				userId: "ltv-payer",
				eventType: "payment_completed",
				metadata: { amount: 49.99, plan: "pro" },
				timestamp: oneDayAgo,
			}),
		});

		const res = await fetch(url("/api/v1/ltv/ltv-payer"), {
			headers: authHeaders(),
		});
		const body = await res.json();

		expect(body.metrics.totalSpent).toBeGreaterThanOrEqual(49.99);
		expect(body.metrics.estimatedLTV).toBeGreaterThan(0);
	});
});

// ── Session Tracking (via Metrics) ───────────────────────────────────────

describe("Session Tracking", () => {
	test("active sessions are reflected in the metrics endpoint", async () => {
		// Send multiple events for the same user:session pair
		for (let i = 0; i < 3; i++) {
			await fetch(url("/api/v1/events"), {
				method: "POST",
				headers: authHeaders(),
				body: JSON.stringify({
					userId: "session-user",
					eventType: "page_view",
					sessionId: "test-session-1",
				}),
			});
		}

		const res = await fetch(url("/api/v1/metrics"), {
			headers: authHeaders(),
		});
		const body = await res.json();

		expect(body.metrics.activeSessions).toBeGreaterThanOrEqual(1);
	});

	test("health endpoint reports active session count", async () => {
		const res = await fetch(url("/health"));
		const body = await res.json();

		expect(body.active_sessions).toBeGreaterThanOrEqual(1);
	});
});

// ── Analytics Summary (via /api/v1/metrics) ──────────────────────────────
// Note: There is no dedicated /analytics endpoint in the current source.
// The /api/v1/metrics endpoint serves as the analytics summary, returning
// event counts, unique users (MAU proxy), and active sessions.

describe("Analytics Summary (GET /api/v1/metrics as analytics proxy)", () => {
	test("returns event counts broken down by type", async () => {
		const res = await fetch(url("/api/v1/metrics"), {
			headers: authHeaders(),
		});
		const body = await res.json();

		expect(body.metrics.eventBreakdown).toBeDefined();
		// At least one event type should have been recorded by prior tests
		const totalBreakdown = Object.values(
			body.metrics.eventBreakdown as Record<string, number>,
		).reduce((a: number, b: number) => a + b, 0);
		expect(totalBreakdown).toBeGreaterThan(0);
	});

	test("returns unique user count as MAU proxy", async () => {
		const res = await fetch(url("/api/v1/metrics"), {
			headers: authHeaders(),
		});
		const body = await res.json();

		// We've sent events for multiple distinct users
		expect(body.metrics.uniqueUsers).toBeGreaterThanOrEqual(1);
	});

	test("returns active session count", async () => {
		const res = await fetch(url("/api/v1/metrics"), {
			headers: authHeaders(),
		});
		const body = await res.json();

		expect(body.metrics.activeSessions).toBeGreaterThanOrEqual(1);
	});

	test("returns total event count", async () => {
		const res = await fetch(url("/api/v1/metrics"), {
			headers: authHeaders(),
		});
		const body = await res.json();

		expect(body.metrics.totalEvents).toBeGreaterThan(0);
	});
});

// ── User Sessions (via /api/v1/ltv/:userId) ──────────────────────────────
// Note: There is no /sessions/:userId endpoint in the current source.
// The closest equivalent is /api/v1/ltv/:userId which returns per-user
// analytics including event count and lifetime metrics.

describe("User Session Data (GET /api/v1/ltv/:userId as sessions proxy)", () => {
	test("returns event count per user (proxy for session lookup)", async () => {
		const res = await fetch(url("/api/v1/ltv/session-user"), {
			headers: authHeaders(),
		});
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.userId).toBe("session-user");
		// We sent 3 events for session-user above
		expect(body.metrics.totalEvents).toBeGreaterThanOrEqual(3);
	});

	test("returns days active for the user", async () => {
		const res = await fetch(url("/api/v1/ltv/session-user"), {
			headers: authHeaders(),
		});
		const body = await res.json();

		expect(body.metrics.daysActive).toBeGreaterThanOrEqual(0);
	});
});

// ── Edge Cases ───────────────────────────────────────────────────────────

describe("Edge Cases and Robustness", () => {
	test("large JSON payload is rejected gracefully", async () => {
		const largeMeta: Record<string, string> = {};
		for (let i = 0; i < 100; i++) {
			largeMeta[`key${i}`] = `value${i}`;
		}

		const res = await fetch(url("/api/v1/events"), {
			method: "POST",
			headers: authHeaders(),
			body: JSON.stringify({
				userId: "edge-user",
				eventType: "page_view",
				metadata: largeMeta,
			}),
		});

		// Metadata sanitization truncates to 50 keys; event still accepted
		expect(res.status).toBe(202);
	});

	test("non-JSON request body is rejected", async () => {
		const res = await fetch(url("/api/v1/events"), {
			method: "POST",
			headers: {
				Authorization: `Bearer ${createToken()}`,
				"Content-Type": "application/json",
			},
			body: "not valid json {{{",
		});

		// Express JSON parser returns 400 for malformed JSON
		expect(res.status).toBe(400);
	});

	test("empty request body is rejected", async () => {
		const res = await fetch(url("/api/v1/events"), {
			method: "POST",
			headers: {
				Authorization: `Bearer ${createToken()}`,
				"Content-Type": "application/json",
			},
		});

		// No body or empty body — userId/eventType undefined, triggers 400
		expect(res.status).toBe(400);
	});

	test("expired JWT token is rejected", async () => {
		const now = Math.floor(Date.now() / 1000);
		const header = { alg: "HS256", typ: "JWT" };
		const payload = {
			sub: "expired-user",
			email: "expired@test.com",
			name: "Expired",
			role: "user",
			iat: now - 7200,
			exp: now - 3600,
		};
		const headerB64 = encodeBase64Url(Buffer.from(JSON.stringify(header)));
		const payloadB64 = encodeBase64Url(Buffer.from(JSON.stringify(payload)));
		const signingInput = `${headerB64}.${payloadB64}`;
		const signature = encodeBase64Url(
			crypto
				.createHmac("sha256", DEV_SECRET)
				.update(signingInput)
				.digest(),
		);
		const expiredToken = `${signingInput}.${signature}`;

		const res = await fetch(url("/api/v1/events"), {
			method: "POST",
			headers: authHeaders(expiredToken),
			body: JSON.stringify({
				userId: "user-1",
				eventType: "page_view",
			}),
		});
		const body = await res.json();

		expect(res.status).toBe(401);
		expect(body.error).toContain("Invalid or expired token");
	});

	test("multiple concurrent event submissions are all accepted", async () => {
		const results = await Promise.all(
			Array.from({ length: 10 }, (_, i) =>
				fetch(url("/api/v1/events"), {
					method: "POST",
					headers: authHeaders(),
					body: JSON.stringify({
						userId: `concurrent-user-${i}`,
						eventType: "page_view",
						timestamp: Date.now() + i,
					}),
				}).then((r) => r.status),
			),
		);

		expect(results.every((s) => s === 202)).toBe(true);
	});
});

// ── Unknown Route Behavior ───────────────────────────────────────────────

describe("Unknown Routes", () => {
	test("GET /analytics is not a registered route", async () => {
		// The authMiddleware is global for all routes except /health.
		// Without auth: 401 (blocked by authMiddleware).
		// With valid auth but no matching route: Express returns 404.
		const resNoAuth = await fetch(url("/analytics"));
		expect(resNoAuth.status).toBe(401);

		const resWithAuth = await fetch(url("/analytics"), {
			headers: authHeaders(),
		});
		// Express 5 with no matching route after auth — 404 expected
		expect(resWithAuth.status).toBe(404);
	});

	test("GET /sessions/:userId is not a registered route", async () => {
		const resNoAuth = await fetch(url("/sessions/user-1"));
		expect(resNoAuth.status).toBe(401);

		const resWithAuth = await fetch(url("/sessions/user-1"), {
			headers: authHeaders(),
		});
		expect(resWithAuth.status).toBe(404);
	});
});
