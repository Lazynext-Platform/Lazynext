/** @module __tests__/social-publish Test suite for social publish service. */

import { describe, test, expect, beforeAll, afterAll, mock } from "bun:test";
import { createHmac } from "node:crypto";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { Server } from "http";

// ── Constants ────────────────────────────────────────────────────────────

const DEV_SECRET =
	"lazynext-dev-secret-key-for-auth-minimum-32-chars-better-auth";
const VALID_VIDEO = `test-video-${Date.now()}.mp4`;
const MISSING_VIDEO = `nonexistent-${Date.now()}.mp4`;

// ── Mock external dependencies BEFORE importing the app ──────────────────

mock.module("@lazynext/social-publish-core", () => ({
	publishToTikTok: mock(async () => ({
		platform: "tiktok",
		success: true,
		postId: "tik_001",
		postUrl: "https://tiktok.com/@user/video/tik_001",
	})),
	publishToYouTube: mock(async () => ({
		platform: "youtube",
		success: true,
		postId: "yt_001",
		postUrl: "https://youtube.com/watch?v=yt_001",
	})),
	publishToInstagram: mock(async () => ({
		platform: "instagram",
		success: true,
		postId: "ig_001",
		postUrl: "https://instagram.com/p/ig_001",
	})),
}));

mock.module("child_process", () => ({
	spawn(_cmd: string, _args?: string[], _opts?: any) {
		return {
			stderr: { on(_event: string, _cb: Function) {} },
			stdout: {
				on(event: string, cb: Function) {
					if (event === "data") cb(Buffer.from("30"));
				},
			},
			on(event: string, cb: Function) {
				if (event === "close") setTimeout(() => cb(0), 5);
			},
		};
	},
}));

// ── Filesystem setup — ALWAYS create files in the default OUTPUT_DIR ─────
// (ESM static imports are hoisted so process.env.OUTPUT_DIR is not read
//  by the app module in time. The app defaults to ../outputs from its src/.)

const defaultOutputsDir = join(import.meta.dirname, "..", "..", "outputs");
mkdirSync(defaultOutputsDir, { recursive: true });
writeFileSync(
	join(defaultOutputsDir, VALID_VIDEO),
	Buffer.from("fake-video-data"),
);

// Also create in a temp dir in case the env var takes effect
const testTmpDir = join(tmpdir(), `lazynext-social-publish-test-${Date.now()}`);
mkdirSync(testTmpDir, { recursive: true });
writeFileSync(join(testTmpDir, VALID_VIDEO), Buffer.from("fake-video-data"));
process.env.OUTPUT_DIR = testTmpDir;

// ── Now import the app ───────────────────────────────────────────────────

import app from "../index";

// ── Token helpers ────────────────────────────────────────────────────────

function base64urlEncode(input: string): string {
	return Buffer.from(input).toString("base64url");
}

function createToken(overrides: Record<string, any> = {}): string {
	const header = base64urlEncode(
		JSON.stringify({ alg: "HS256", typ: "JWT" }),
	);
	const payload = base64urlEncode(
		JSON.stringify({
			sub: overrides.sub ?? "usr_test123",
			email: overrides.email ?? "test@lazynext.dev",
			name: overrides.name ?? "Test User",
			role: overrides.role ?? "user",
			iat: Math.floor(Date.now() / 1000),
			exp: Math.floor(Date.now() / 1000) + 3600,
		}),
	);
	const sigInput = `${header}.${payload}`;
	const signature = createHmac("sha256", DEV_SECRET)
		.update(sigInput)
		.digest("base64url");
	return `${sigInput}.${signature}`;
}

function authHeaders(token?: string): Record<string, string> {
	return {
		Authorization: `Bearer ${token ?? createToken()}`,
		"Content-Type": "application/json",
	};
}

// ── Server lifecycle ─────────────────────────────────────────────────────

let server: Server;
let api: string;

beforeAll(async () => {
	await new Promise<void>((resolve) => {
		server = app.listen(0, () => resolve());
	});
	const addr = server.address();
	if (addr && typeof addr === "object") {
		api = `http://localhost:${addr.port}`;
	} else {
		api = "http://localhost:8007";
	}
});

afterAll(() => {
	server?.close();
	// Clean up test files
	const cleanupPaths = [
		join(testTmpDir, VALID_VIDEO),
		join(defaultOutputsDir, VALID_VIDEO),
	];
	for (const p of cleanupPaths) {
		if (existsSync(p)) rmSync(p);
	}
	if (existsSync(testTmpDir)) {
		rmSync(testTmpDir, { recursive: true, force: true });
	}
});

// ── Tests ────────────────────────────────────────────────────────────────

describe("Social Publish Service", () => {
	// ── 1. Health endpoint ────────────────────────────────────────────

	describe("GET /health (no auth required)", () => {
		test("returns status ok with service name", async () => {
			const res = await fetch(`${api}/health`);
			expect(res.status).toBe(200);

			const body = await res.json() as Record<string, any>;
			expect(body.status).toBe("ok");
			expect(body.service).toBe("social-publish");
		});

		test("does not require authentication", async () => {
			const res = await fetch(`${api}/health`);
			expect(res.status).toBe(200);
		});
	});

	// ── 2. Auth required for protected endpoints ──────────────────────

	describe("Auth required", () => {
		const protectedEndpoints = [
			{ method: "POST", path: "/publish/tiktok" },
			{ method: "POST", path: "/publish/youtube" },
			{ method: "POST", path: "/publish/instagram" },
			{ method: "POST", path: "/publish/twitter" },
			{ method: "POST", path: "/auto-reframe" },
			{ method: "POST", path: "/generate-metadata" },
			{ method: "POST", path: "/thumbnails/generate" },
			{ method: "POST", path: "/thumbnails/test" },
			{ method: "POST", path: "/schedule" },
			{ method: "GET", path: "/schedule" },
		];

		for (const { method, path } of protectedEndpoints) {
			test(`${method} ${path} returns 401 without auth token`, async () => {
				const res = await fetch(`${api}${path}`, {
					method,
					headers: { "Content-Type": "application/json" },
					body: method === "GET" ? undefined : JSON.stringify({}),
				});
				expect(res.status).toBe(401);
			});

			test(`${method} ${path} returns 401 with invalid token`, async () => {
				const res = await fetch(`${api}${path}`, {
					method,
					headers: {
						Authorization: "Bearer invalid.jwt.token",
						"Content-Type": "application/json",
					},
					body: method === "GET" ? undefined : JSON.stringify({}),
				});
				expect(res.status).toBe(401);
			});
		}
	});

	// ── 3. video_path validation ──────────────────────────────────────

	describe("video_path validation (POST /publish/*)", () => {
		const platforms = ["tiktok", "youtube", "instagram", "twitter"];

		for (const platform of platforms) {
			test(`/publish/${platform} returns 400 for missing video_path`, async () => {
				const res = await fetch(`${api}/publish/${platform}`, {
					method: "POST",
					headers: authHeaders(),
					body: JSON.stringify({ platform }),
				});
				expect(res.status).toBe(400);
		const body = await res.json() as Record<string, any>;
				expect(body.error).toBe("Invalid video_path");
			});

			test(`/publish/${platform} returns 400 for empty video_path`, async () => {
				const res = await fetch(`${api}/publish/${platform}`, {
					method: "POST",
					headers: authHeaders(),
					body: JSON.stringify({ video_path: "", platform }),
				});
				expect(res.status).toBe(400);
			});

			test(`/publish/${platform} returns 400 for null video_path`, async () => {
				const res = await fetch(`${api}/publish/${platform}`, {
					method: "POST",
					headers: authHeaders(),
					body: JSON.stringify({ video_path: null, platform }),
				});
				expect(res.status).toBe(400);
			});

			test(`/publish/${platform} returns 400 for traversal with embedded ../`, async () => {
				const res = await fetch(`${api}/publish/${platform}`, {
					method: "POST",
					headers: authHeaders(),
					body: JSON.stringify({
						video_path: "foo/../etc/passwd",
						platform,
					}),
				});
				expect(res.status).toBe(400);
			});
		}
	});

	// ── 4. Non-existent video file ────────────────────────────────────

	describe("non-existent video file (POST /publish/*)", () => {
		test("/publish/tiktok returns 404 for non-existent file", async () => {
			const res = await fetch(`${api}/publish/tiktok`, {
				method: "POST",
				headers: authHeaders(),
				body: JSON.stringify({
					video_path: MISSING_VIDEO,
					platform: "tiktok",
				}),
			});
			expect(res.status).toBe(404);
			const body = await res.json() as Record<string, any>;
			expect(body.error).toBe("Video file not found");
		});

		test("/publish/youtube returns 404 for non-existent file", async () => {
			const res = await fetch(`${api}/publish/youtube`, {
				method: "POST",
				headers: authHeaders(),
				body: JSON.stringify({
					video_path: MISSING_VIDEO,
					platform: "youtube",
				}),
			});
			expect(res.status).toBe(404);
		});
	});

	// ── 5. Auto-reframe input validation ──────────────────────────────

	describe("POST /auto-reframe validation", () => {
		test("returns 400 when both video_path and target_platform are missing", async () => {
			const res = await fetch(`${api}/auto-reframe`, {
				method: "POST",
				headers: authHeaders(),
				body: JSON.stringify({}),
			});
			expect(res.status).toBe(400);
			const body = await res.json() as Record<string, any>;
			expect(body.error).toContain("Missing");
		});

		test("returns 400 when target_platform is missing", async () => {
			const res = await fetch(`${api}/auto-reframe`, {
				method: "POST",
				headers: authHeaders(),
				body: JSON.stringify({ video_path: VALID_VIDEO }),
			});
			expect(res.status).toBe(400);
		});

		test("returns 400 when video_path is missing", async () => {
			const res = await fetch(`${api}/auto-reframe`, {
				method: "POST",
				headers: authHeaders(),
				body: JSON.stringify({ target_platform: "tiktok" }),
			});
			expect(res.status).toBe(400);
		});

		test("returns 400 for invalid video_path", async () => {
			const res = await fetch(`${api}/auto-reframe`, {
				method: "POST",
				headers: authHeaders(),
				body: JSON.stringify({
					video_path: "",
					target_platform: "tiktok",
				}),
			});
			expect(res.status).toBe(400);
		});

		test("returns 400 for unknown target platform", async () => {
			const res = await fetch(`${api}/auto-reframe`, {
				method: "POST",
				headers: authHeaders(),
				body: JSON.stringify({
					video_path: VALID_VIDEO,
					target_platform: "myspace",
				}),
			});
			expect(res.status).toBe(400);
			const body = await res.json() as Record<string, any>;
			expect(body.error).toContain("Unknown platform");
		});

		test("reframes successfully for valid tiktok request", async () => {
			const res = await fetch(`${api}/auto-reframe`, {
				method: "POST",
				headers: authHeaders(),
				body: JSON.stringify({
					video_path: VALID_VIDEO,
					target_platform: "tiktok",
				}),
			});
			expect(res.status).toBe(200);
			const body = await res.json() as Record<string, any>;
			expect(body.success).toBe(true);
			expect(body.platform).toBe("tiktok");
			expect(body.aspect_ratio).toBe("9:16");
			expect(body.resolution).toBe("1080x1920");
			expect(body.output_path).toBeDefined();
		});

		test("reframes successfully for valid youtube request", async () => {
			const res = await fetch(`${api}/auto-reframe`, {
				method: "POST",
				headers: authHeaders(),
				body: JSON.stringify({
					video_path: VALID_VIDEO,
					target_platform: "youtube",
				}),
			});
			expect(res.status).toBe(200);
			const body = await res.json() as Record<string, any>;
			expect(body.success).toBe(true);
			expect(body.platform).toBe("youtube");
			expect(body.aspect_ratio).toBe("16:9");
			expect(body.resolution).toBe("1920x1080");
		});
	});

	// ── 6. Generate-metadata ──────────────────────────────────────────

	describe("POST /generate-metadata", () => {
		test("returns 400 when platform is missing", async () => {
			const res = await fetch(`${api}/generate-metadata`, {
				method: "POST",
				headers: authHeaders(),
				body: JSON.stringify({}),
			});
			expect(res.status).toBe(400);
		});

		test("generates tiktok-optimized metadata", async () => {
			const res = await fetch(`${api}/generate-metadata`, {
				method: "POST",
				headers: authHeaders(),
				body: JSON.stringify({
					platform: "tiktok",
					title: "Summer Drone Edit",
					tags: ["drone", "sunset"],
				}),
			});
			expect(res.status).toBe(200);

			const body = await res.json() as Record<string, any>;
			expect(body.success).toBe(true);
			expect(body.platform).toBe("tiktok");
			expect(body.title).toContain("#fyp");
			expect(body.hashtags).toBeArray();
			expect(body.hashtags).toContain("fyp");
			expect(body.suggested_posting_time).toBeDefined();
		});

		test("generates youtube-optimized metadata", async () => {
			const res = await fetch(`${api}/generate-metadata`, {
				method: "POST",
				headers: authHeaders(),
				body: JSON.stringify({
					platform: "youtube",
					title: "Premiere Pro Tutorial",
					tags: ["editing", "premiere"],
				}),
			});
			expect(res.status).toBe(200);

			const body = await res.json() as Record<string, any>;
			expect(body.success).toBe(true);
			expect(body.platform).toBe("youtube");
			expect(body.title).toContain("Tutorial");
			expect(body.description).toContain("Timestamps");
			expect(body.hashtags).toContain("tutorial");
			expect(body.suggested_posting_time).toBeDefined();
		});

		test("generates instagram-optimized metadata", async () => {
			const res = await fetch(`${api}/generate-metadata`, {
				method: "POST",
				headers: authHeaders(),
				body: JSON.stringify({
					platform: "instagram",
					title: "New Reel",
					tags: ["reel", "bts"],
				}),
			});
			expect(res.status).toBe(200);

			const body = await res.json() as Record<string, any>;
			expect(body.success).toBe(true);
			expect(body.platform).toBe("instagram");
			expect(body.title).toContain("New drop!");
			expect(body.hashtags).toContain("reels");
		});

		test("generates twitter-optimized metadata", async () => {
			const res = await fetch(`${api}/generate-metadata`, {
				method: "POST",
				headers: authHeaders(),
				body: JSON.stringify({
					platform: "twitter",
					title: "Announcement",
				}),
			});
			expect(res.status).toBe(200);

			const body = await res.json() as Record<string, any>;
			expect(body.success).toBe(true);
			expect(body.platform).toBe("twitter");
			expect(body.description).toContain("Lazynext");
			expect(body.hashtags).toContain("lazynext");
		});

		test("incorporates video_topic into generated content", async () => {
			const res = await fetch(`${api}/generate-metadata`, {
				method: "POST",
				headers: authHeaders(),
				body: JSON.stringify({
					platform: "tiktok",
					video_topic: "cinematic drone footage",
				}),
			});
			expect(res.status).toBe(200);

			const body = await res.json() as Record<string, any>;
			expect(body.success).toBe(true);
			expect(body.title).toContain("cinematic drone footage");
		});
	});

	// ── 7. Thumbnails generate validation ─────────────────────────────

	describe("POST /thumbnails/generate validation", () => {
		test("returns 400 when video_path is missing", async () => {
			const res = await fetch(`${api}/thumbnails/generate`, {
				method: "POST",
				headers: authHeaders(),
				body: JSON.stringify({}),
			});
			expect(res.status).toBe(400);
			const body = await res.json() as Record<string, any>;
			expect(body.error).toBe("Missing video_path");
		});

		test("returns 400 when video_path is empty string", async () => {
			const res = await fetch(`${api}/thumbnails/generate`, {
				method: "POST",
				headers: authHeaders(),
				body: JSON.stringify({ video_path: "", count: 3 }),
			});
			expect(res.status).toBe(400);
		});

		test("returns 400 when video_path is not a string", async () => {
			const res = await fetch(`${api}/thumbnails/generate`, {
				method: "POST",
				headers: authHeaders(),
				body: JSON.stringify({ video_path: 123, count: 3 }),
			});
			expect(res.status).toBe(400);
		});

		test("returns 400 for embedded ../ traversal paths", async () => {
			const res = await fetch(`${api}/thumbnails/generate`, {
				method: "POST",
				headers: authHeaders(),
				body: JSON.stringify({
					video_path: "foo/../etc/passwd",
					count: 3,
				}),
			});
			expect(res.status).toBe(400);
		});

		test("returns 400 for non-existent file", async () => {
			const res = await fetch(`${api}/thumbnails/generate`, {
				method: "POST",
				headers: authHeaders(),
				body: JSON.stringify({
					video_path: MISSING_VIDEO,
					count: 3,
				}),
			});
			expect(res.status).toBe(400);
		});
	});

	// ── 8. Schedule endpoint validation ───────────────────────────────

	describe("POST /schedule validation", () => {
		test("returns 400 when required fields are missing", async () => {
			const res = await fetch(`${api}/schedule`, {
				method: "POST",
				headers: authHeaders(),
				body: JSON.stringify({}),
			});
			expect(res.status).toBe(400);
			const body = await res.json() as Record<string, any>;
			expect(body.error).toContain("Missing required fields");
		});

		test("returns 400 for invalid scheduled_at date", async () => {
			const res = await fetch(`${api}/schedule`, {
				method: "POST",
				headers: authHeaders(),
				body: JSON.stringify({
					video_path: VALID_VIDEO,
					platform: "tiktok",
					scheduled_at: "not-a-date",
				}),
			});
			expect(res.status).toBe(400);
			const body = await res.json() as Record<string, any>;
			expect(body.error).toBe("Invalid scheduled_at date");
		});

		test("returns 400 when scheduled_at is in the past", async () => {
			const pastDate = new Date(Date.now() - 3600000).toISOString();
			const res = await fetch(`${api}/schedule`, {
				method: "POST",
				headers: authHeaders(),
				body: JSON.stringify({
					video_path: VALID_VIDEO,
					platform: "tiktok",
					scheduled_at: pastDate,
				}),
			});
			expect(res.status).toBe(400);
			const body = await res.json() as Record<string, any>;
			expect(body.error).toBe("schedule_at must be in the future");
		});

		test("schedules a post successfully with valid data", async () => {
			const futureDate = new Date(Date.now() + 86400000).toISOString();
			const res = await fetch(`${api}/schedule`, {
				method: "POST",
				headers: authHeaders(),
				body: JSON.stringify({
					video_path: VALID_VIDEO,
					platform: "tiktok",
					title: "Scheduled Post",
					description: "Test scheduled post",
					scheduled_at: futureDate,
				}),
			});
			expect(res.status).toBe(201);
			const body = await res.json() as Record<string, any>;
			expect(body.success).toBe(true);
			expect(body.post.id).toBeDefined();
			expect(body.post.platform).toBe("tiktok");
			expect(body.post.status).toBe("scheduled");
		});
	});
});
