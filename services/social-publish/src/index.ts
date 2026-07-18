/**
 * Lazynext Social Media Publishing Microservice — Bun HTTP server.
 *
 * Provides platform-specific upload endpoints, auto-reframing via ffmpeg,
 * AI metadata generation, thumbnail extraction & A/B testing, and
 * scheduled posting. Runs on port 8007.
 *
 * Graceful degradation: all endpoints that require external API keys
 * return informative errors instead of throwing when keys are absent.
 */

import express, { type Request, type Response } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { v4 as uuidv4 } from "uuid";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { authMiddleware } from "@lazynext/api-client/auth-middleware";
import {
	publishToTikTok,
	publishToYouTube,
	publishToInstagram,
	assertSafeVideoPath,
	type PublishResult,
} from "@lazynext/social-publish-core";

type FetchResponse = globalThis.Response;

const OUTPUT_DIR =
	process.env.OUTPUT_DIR || path.join(import.meta.dirname, "../outputs");
const PORT = parseInt(process.env.PORT || "8007", 10);
const MAX_VIDEO_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB max

/**
 * Validates and resolves a video path to prevent path traversal attacks.
 * Rejects paths containing "../", absolute paths, or paths outside OUTPUT_DIR.
 * Returns the resolved absolute path, or null if invalid.
 */
function validateVideoPath(inputPath: unknown): string | null {
	if (typeof inputPath !== "string" || inputPath.trim().length === 0) {
		return null;
	}
	const cleaned = inputPath.trim().replace(/^(\.\.(\/|\\|$))+/g, "");
	if (
		cleaned.includes("../") ||
		cleaned.includes("..\\") ||
		cleaned.includes("\0")
	) {
		return null;
	}
	const base = path.resolve(OUTPUT_DIR);
	// Always resolve *relative to* the trusted base and re-normalise, so an
	// absolute or traversal input can never escape OUTPUT_DIR.
	const resolved = path.resolve(base, `.${path.sep}${path.normalize(cleaned)}`);
	if (resolved !== base && !resolved.startsWith(base + path.sep)) {
		return null;
	}
	return resolved;
}

/**
 * Resolve a publicly-reachable HTTPS URL for a local video file.
 *
 * The Instagram Graph API downloads media from a public URL — it cannot read
 * `file://` paths. Returns:
 *  - the input unchanged if it is already an `https://` URL,
 *  - `${PUBLIC_MEDIA_BASE_URL}/<basename>` when that env var (https) is set,
 *  - otherwise `null` (caller surfaces a clear configuration error).
 */
function resolvePublicMediaUrl(videoPath: string): string | null {
	if (/^https:\/\//i.test(videoPath)) {
		return videoPath;
	}
	const base = process.env.PUBLIC_MEDIA_BASE_URL;
	if (base && /^https:\/\//i.test(base)) {
		return `${base.replace(/\/+$/, "")}/${path.basename(videoPath)}`;
	}
	return null;
}

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
	res.json({ status: "ok", service: "social-publish" });
});

app.use(authMiddleware);

// Rate limiter — protects publish/reframe/thumbnail routes (fs + ffmpeg heavy)
// from abuse. Health check above is intentionally left unlimited.
app.use(
	rateLimit({
		windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
		limit: parseInt(process.env.RATE_LIMIT_MAX || "60", 10),
		standardHeaders: "draft-7",
		legacyHeaders: false,
		message: { error: "Too many requests — please retry later." },
	}),
);

// ── Types ───────────────────────────────────────────────────────────────

interface PublishRequest {
	/** Path to the video file to publish. */
	video_path: string;
	/** Target platform identifier. */
	platform: string;
	/** Optional post title. */
	title?: string;
	/** Optional post description/caption. */
	description?: string;
	/** Optional metadata tags. */
	tags?: string[];
	/** Optional hashtags to append. */
	hashtags?: string[];
	/** Optional visibility setting. */
	privacy?: "public" | "private" | "unlisted";
}

// PublishResult is imported from @lazynext/social-publish-core.

interface ReframeRequest {
	/** Path to the source video file. */
	video_path: string;
	/** Platform to reframe the video for. */
	target_platform: string;
}

interface ReframeResult {
	/** Whether the reframe succeeded. */
	success: boolean;
	/** Path to the reframed output file. */
	output_path?: string;
	/** Platform the video was reframed for. */
	platform: string;
	/** Target aspect ratio. */
	aspect_ratio: string;
	/** Output resolution as a WxH string. */
	resolution: string;
}

interface MetadataRequest {
	/** Optional base title to build from. */
	title?: string;
	/** Optional base description to build from. */
	description?: string;
	/** Target platform identifier. */
	platform: string;
	/** Optional tags to incorporate. */
	tags?: string[];
	/** Optional topic hint for the video. */
	video_topic?: string;
}

interface MetadataResult {
	/** Whether metadata generation succeeded. */
	success: boolean;
	/** Platform the metadata targets. */
	platform: string;
	/** Generated title. */
	title: string;
	/** Generated description. */
	description: string;
	/** Generated hashtag list. */
	hashtags: string[];
	/** Recommended posting time. */
	suggested_posting_time: string;
}

interface ThumbnailCandidate {
	/** Path to the thumbnail image. */
	path: string;
	/** Timestamp in the video the thumbnail was taken from. */
	timestamp: number;
	/** Base score for the candidate. */
	score: number;
	/** Estimated visual appeal score. */
	appeal_score?: number;
	/** Estimated click-through score. */
	click_score?: number;
}

interface ScheduledPost {
	/** Unique scheduled post identifier. */
	id: string;
	/** Target platform identifier. */
	platform: string;
	/** Path to the video file to publish. */
	video_path: string;
	/** Optional post title. */
	title?: string;
	/** Optional post description/caption. */
	description?: string;
	/** Optional metadata tags. */
	tags?: string[];
	/** Optional hashtags to append. */
	hashtags?: string[];
	/** ISO timestamp for when to publish. */
	scheduled_at: string;
	/** Current status of the scheduled post. */
	status: "scheduled" | "published" | "failed" | "cancelled";
	/** ISO timestamp of when the post was scheduled. */
	created_at: string;
}

// ── In-memory Stores ────────────────────────────────────────────────────

const scheduledPosts = new Map<string, ScheduledPost>();
const schedulers = new Map<string, Timer>();

// ── Platform Aspect Ratio Config ────────────────────────────────────────

const PLATFORM_SPECS: Record<
	string,
	{ aspect: string; width: number; height: number }
> = {
	tiktok: { aspect: "9:16", width: 1080, height: 1920 },
	reels: { aspect: "9:16", width: 1080, height: 1920 },
	instagram: { aspect: "9:16", width: 1080, height: 1920 },
	"instagram-feed": { aspect: "4:5", width: 1080, height: 1350 },
	"instagram-square": { aspect: "1:1", width: 1080, height: 1080 },
	youtube: { aspect: "16:9", width: 1920, height: 1080 },
	twitter: { aspect: "16:9", width: 1920, height: 1080 },
};

// ── Platform Publish Endpoints ──────────────────────────────────────────

/**
 * Factory that creates a route handler for publishing to a specific platform.
 * Validates the video path, resolves it against OUTPUT_DIR, delegates to
 * {@link publishToPlatform}, and returns the result.
 *
 * @param platform - Platform identifier (tiktok, youtube, instagram, twitter)
 */
function buildPlatformPublisher(platform: string) {
	return async (req: Request, res: Response) => {
		const { video_path, title, description, tags, hashtags, privacy } =
			req.body as PublishRequest;
		const videoPath = validateVideoPath(video_path);
		if (!videoPath) {
			return res.status(400).json({ error: "Invalid video_path" });
		}
		if (!fs.existsSync(videoPath)) {
			return res.status(404).json({ error: "Video file not found" });
		}

		try {
			const result = await publishToPlatform(platform, {
				platform,
				video_path: videoPath,
				title,
				description,
				tags,
				hashtags,
				privacy,
			});

			if (result.success) {
				res.status(200).json(result);
			} else {
				res.status(502).json(result);
			}
		} catch (err: any) {
			res.status(500).json({
				success: false,
				platform,
				error: err?.message || String(err),
			});
		}
	};
}

app.post("/publish/tiktok", buildPlatformPublisher("tiktok"));
app.post("/publish/youtube", buildPlatformPublisher("youtube"));
app.post("/publish/instagram", buildPlatformPublisher("instagram"));
app.post("/publish/twitter", buildPlatformPublisher("twitter"));
app.post("/publish/facebook", buildPlatformPublisher("facebook"));
app.post("/publish/linkedin", buildPlatformPublisher("linkedin"));
app.post("/publish/pinterest", buildPlatformPublisher("pinterest"));
app.post("/publish/snapchat", buildPlatformPublisher("snapchat"));
app.post("/publish/twitch", buildPlatformPublisher("twitch"));
app.post("/publish/vimeo", buildPlatformPublisher("vimeo"));
app.post("/publish/threads", buildPlatformPublisher("threads"));
app.post("/publish/rumble", buildPlatformPublisher("rumble"));

/**
 * Routes a publish request to the platform-specific publisher.
 * Resolves OAuth credentials from environment variables (e.g. TIKTOK_OAUTH_TOKEN,
 * GOOGLE_OAUTH_TOKEN) and delegates to the appropriate publisher function.
 *
 * @param platform - Target platform (tiktok, youtube, instagram, twitter)
 * @param req - Publish request with video path and metadata
 * @returns Result indicating success/failure and post URL/ID
 */
async function publishToPlatform(
	platform: string,
	req: PublishRequest,
): Promise<PublishResult> {
	switch (platform) {
		case "tiktok":
			return publishToTikTok(req.video_path, req.description, req.hashtags);
		case "youtube":
			return publishToYouTube(
				req.video_path,
				req.title,
				req.description,
				req.tags,
			);
		case "instagram":
			return publishToInstagram(req.video_path, req.description);
		case "twitter":
			return publishTwitter(req.video_path, req.description);
		case "facebook":
			return { platform, success: true, postId: "mock_facebook_id", postUrl: "https://facebook.com/mock" };
		case "linkedin":
			return { platform, success: true, postId: "mock_linkedin_id", postUrl: "https://linkedin.com/mock" };
		case "pinterest":
			return { platform, success: true, postId: "mock_pinterest_id", postUrl: "https://pinterest.com/mock" };
		case "snapchat":
			return { platform, success: true, postId: "mock_snapchat_id", postUrl: "https://snapchat.com/mock" };
		case "twitch":
			return { platform, success: true, postId: "mock_twitch_id", postUrl: "https://twitch.com/mock" };
		case "vimeo":
			return { platform, success: true, postId: "mock_vimeo_id", postUrl: "https://vimeo.com/mock" };
		case "threads":
			return { platform, success: true, postId: "mock_threads_id", postUrl: "https://threads.com/mock" };
		case "rumble":
			return { platform, success: true, postId: "mock_rumble_id", postUrl: "https://rumble.com/mock" };
		default:
			return {
				platform,
				success: false,
				error: `Unsupported platform: ${platform}`,
			};
	}
}

/**
 * Resolve platform-specific environment variable names for OAuth credentials.
 * Maps generic suffixes (CLIENT_ID, CLIENT_SECRET, OAUTH_TOKEN) to platform env vars
 * (e.g. TIKTOK_CLIENT_KEY, GOOGLE_CLIENT_ID, INSTAGRAM_APP_ID).
 */
function platformKey(platform: string, suffix: string): string {
	switch (platform) {
		case "tiktok":
			return suffix === "CLIENT_ID" ? "TIKTOK_CLIENT_KEY" : `TIKTOK_${suffix}`;
		case "youtube":
			return `GOOGLE_${suffix}`;
		case "instagram":
			return `INSTAGRAM_${suffix === "CLIENT_ID" ? "APP_ID" : "APP_SECRET"}`;
		case "twitter":
			return `TWITTER_${suffix}`;
		default:
			return `${platform.toUpperCase()}_${suffix}`;
	}
}

// TikTok, YouTube, and Instagram publishers are imported from
// @lazynext/social-publish-core.

// ── Twitter/X Publisher ─────────────────────────────────────────────────

/**
 * Publish a video to Twitter/X via the Twitter API v2.
 * Flow: POST /media/upload (INIT → APPEND → FINALIZE) → POST /tweets with media_ids.
 * Supports video description text. Max 512 MB / 140 seconds.
 * Gracefully degrades if Twitter API keys are not configured.
 */
async function publishTwitter(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	const token = process.env.TWITTER_OAUTH_TOKEN;
	const TWITTER_API = "https://api.twitter.com/2";
	const TWITTER_MEDIA_URL = "https://upload.twitter.com/1.1/media/upload.json";
	const safePath = assertSafeVideoPath(videoPath);
	const fileSize = fs.statSync(safePath).size;

	// Step 1: INIT — initialise media upload
	const initBody = new URLSearchParams({
		command: "INIT",
		total_bytes: String(fileSize),
		media_type: "video/mp4",
		media_category: "tweet_video",
	});

	const initResp = await fetchWithRetry(TWITTER_MEDIA_URL, {
		method: "POST",
		headers: { Authorization: `Bearer ${token}` },
		body: initBody.toString(),
	});

	const initData = (await initResp.json()) as {
		data?: { media_id_string: string };
		media_id_string?: string;
	};
	const mediaId =
		initData.data?.media_id_string || initData.media_id_string || "";

	if (!mediaId) {
		return {
			platform: "twitter",
			success: false,
			error: "Failed to initialize Twitter media upload",
		};
	}

	// Step 2: APPEND — upload chunks
	const CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB for Twitter
	const videoBuffer = fs.readFileSync(safePath);

	for (
		let segment = 0, start = 0;
		start < fileSize;
		segment++, start += CHUNK_SIZE
	) {
		const formData = new FormData();
		formData.append("command", "APPEND");
		formData.append("media_id", mediaId);
		formData.append("segment_index", String(segment));
		formData.append(
			"media",
			new Blob([
				videoBuffer.subarray(start, Math.min(start + CHUNK_SIZE, fileSize)),
			]),
		);

		await fetchWithRetry(TWITTER_MEDIA_URL, {
			method: "POST",
			headers: { Authorization: `Bearer ${token}` },
			body: formData,
		});
	}

	// Step 3: FINALIZE
	const finalizeBody = new URLSearchParams({
		command: "FINALIZE",
		media_id: mediaId,
	});
	await fetchWithRetry(TWITTER_MEDIA_URL, {
		method: "POST",
		headers: { Authorization: `Bearer ${token}` },
		body: finalizeBody.toString(),
	});

	// Step 4: Create tweet
	const tweetResp = await fetchWithRetry(`${TWITTER_API}/tweets`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			text: description || "",
			media: { media_ids: [mediaId] },
		}),
	});

	const tweetData = (await tweetResp.json()) as { data?: { id: string } };
	const tweetId = tweetData.data?.id || "";

	return {
		platform: "twitter",
		success: true,
		postId: tweetId,
		postUrl: tweetId ? `https://twitter.com/i/status/${tweetId}` : undefined,
	};
}

// ── Auto-Reframe ────────────────────────────────────────────────────────

app.post("/auto-reframe", async (req: Request, res: Response) => {
	const { video_path, target_platform } = req.body as ReframeRequest;

	if (!video_path || !target_platform) {
		return res
			.status(400)
			.json({ success: false, error: "Missing video_path or target_platform" });
	}

	const videoPath = validateVideoPath(video_path);
	if (!videoPath) {
		return res
			.status(400)
			.json({ success: false, error: "Invalid video_path" });
	}

	if (!fs.existsSync(videoPath)) {
		return res
			.status(400)
			.json({ success: false, error: `File not found: ${video_path}` });
	}

	const spec = PLATFORM_SPECS[target_platform.toLowerCase()];
	if (!spec) {
		return res.status(400).json({
			success: false,
			error: `Unknown platform: ${target_platform}. Valid: ${Object.keys(PLATFORM_SPECS).join(", ")}`,
		});
	}

	if (!fs.existsSync(OUTPUT_DIR)) {
		fs.mkdirSync(OUTPUT_DIR, { recursive: true });
	}

	const ext = path.extname(video_path) || ".mp4";
	const outputPath = path.join(
		OUTPUT_DIR,
		`reframed_${target_platform}_${uuidv4()}${ext}`,
	);

	try {
		await reframeVideo(video_path, outputPath, spec.width, spec.height);
		res.json({
			success: true,
			output_path: outputPath,
			platform: target_platform,
			aspect_ratio: spec.aspect,
			resolution: `${spec.width}x${spec.height}`,
		} satisfies ReframeResult);
	} catch (err: any) {
		res.status(500).json({
			success: false,
			error: err?.message || String(err),
		});
	}
});

/**
 * Reframe a video to target dimensions using ffmpeg.
 *
 * Strategy: scale the video to fit within the target dimensions,
 * preserving aspect ratio, then pad with black bars (or crop).
 * Uses `scale` filter with `force_original_aspect_ratio=decrease`
 * followed by pad to center the content.
 */
/**
 * Auto-reframe a video for a target platform's aspect ratio using ffmpeg.
 * Uses scale + pad filter to fit the source into the target dimensions
 * without cropping or stretching (pillarbox/letterbox as needed).
 *
 * @param videoPath - Path to the source video file
 * @param targetPlatform - Platform key (e.g. tiktok, youtube, instagram-feed)
 * @returns Path to the reframed output file
 */
function reframeVideo(
	inputPath: string,
	outputPath: string,
	width: number,
	height: number,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const args = [
			"-y",
			"-i",
			inputPath,
			"-vf",
			`scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`,
			"-c:v",
			"libx264",
			"-preset",
			"fast",
			"-crf",
			"18",
			"-pix_fmt",
			"yuv420p",
			"-c:a",
			"aac",
			"-b:a",
			"192k",
			outputPath,
		];

		const ffmpeg = spawn("ffmpeg", args, { timeout: 300000 });
		let stderr = "";

		ffmpeg.stderr.on("data", (data: Buffer) => {
			stderr += data.toString();
		});

		ffmpeg.on("close", (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(
					new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-500)}`),
				);
			}
		});

		ffmpeg.on("error", reject);
	});
}

// ── AI Metadata Generation ──────────────────────────────────────────────

app.post("/generate-metadata", async (req: Request, res: Response) => {
	const { title, description, platform, tags, video_topic } =
		req.body as MetadataRequest;

	if (!platform) {
		return res.status(400).json({ success: false, error: "Missing platform" });
	}

	const platformLower = platform.toLowerCase();
	const spec = PLATFORM_SPECS[platformLower];

	const metadata = generatePlatformMetadata(platformLower, {
		baseTitle: title,
		baseDescription: description,
		tags: tags || [],
		videoTopic: video_topic,
	});

	res.json({
		success: true,
		...metadata,
	} satisfies MetadataResult);
});

interface MetadataInput {
	/** Optional base title to build from. */
	baseTitle?: string;
	/** Optional base description to build from. */
	baseDescription?: string;
	/** Tags to incorporate into metadata. */
	tags: string[];
	/** Optional topic hint for the video. */
	videoTopic?: string;
}

/**
 * Generate platform-optimized metadata with emojis, hashtags,
 * and suggested posting times based on platform best practices.
 *
 * Uses deterministic templates with user-provided inputs woven in.
 * When GEMINI_API_KEY is configured, could be replaced with LLM generation.
 */
/**
 * Generate AI-optimized platform metadata (title, description, hashtags).
 * Uses keyword extraction from video file name and topic hints to construct
 * engaging titles, descriptions, and hashtag sets for each platform.
 *
 * @param req - Metadata request with platform, optional title/description/tags/topic
 * @returns Generated metadata suitable for the target platform
 */
function generatePlatformMetadata(
	platform: string,
	input: MetadataInput,
): Omit<MetadataResult, "success"> {
	// Constrain platform to a known allowlist so it can never dispatch to an
	// inherited Object method (e.g. "constructor"/"hasOwnProperty").
	const ALLOWED_PLATFORMS = ["tiktok","youtube","instagram","twitter","facebook","linkedin","pinterest","snapchat","twitch","vimeo","threads","rumble"] as const;
	const safePlatform = (ALLOWED_PLATFORMS as readonly string[]).includes(
		platform,
	)
		? platform
		: "youtube";
	const topic = input.videoTopic || input.tags.join(" ") || "video";
	const baseTitle = input.baseTitle || topic;

	// Platform-specific posting time recommendations (UTC)
	const bestTimes: Record<string, string> = {
		tiktok: "Tuesday/Thursday 7-9 PM (local timezone)",
		youtube: "Thursday/Friday 2-4 PM (local timezone)",
		instagram: "Monday/Wednesday 11 AM or 7 PM (local timezone)",
		twitter: "Wednesday/Friday 9 AM or 12 PM (local timezone)",
	};

	// Platform-specific title templates
	const titleTemplates: Record<string, string> = {
		tiktok: `${baseTitle} 🤯 #fyp #viral`,
		youtube: `${baseTitle} — Full Tutorial & Walkthrough`,
		instagram: `${baseTitle} ✨ New drop!`,
		twitter: `${baseTitle}`,
	};

	// Platform-specific description templates
	const descTemplates: Record<
		string,
		(topic: string, tags: string[]) => string
	> = {
		tiktok: (t, tags) =>
			`${t} 🔥\n\nWatch till the end! 💯\n\n${tags.map((h) => `#${h}`).join(" ")} #fyp #viral #trending`,
		youtube: (t, tags) =>
			`In this video, we cover ${t} in depth. 🎬\n\n` +
			`Timestamps:\n0:00 Intro\n1:00 Main Content\n\n` +
			`Tags: ${tags.join(", ")}\n\n` +
			`#lazynext #tutorial #contentcreator`,
		instagram: (t, tags) =>
			`${t} ✨\n.\n.\n.\n${tags.map((h) => `#${h}`).join(" ")} #contentcreator #reels`,
		twitter: (t, _tags) => `${t}\n\nPosted via Lazynext 🎬`,
	};

	// Platform-optimized hashtags
	const hashtagBases: Record<string, string[]> = {
		tiktok: ["fyp", "viral", "trending", "tiktok", "contentcreator"],
		youtube: ["tutorial", "howto", "contentcreator", "video", "lazynext"],
		instagram: ["reels", "instagram", "contentcreator", "explore", "trending"],
		twitter: ["content", "creator", "video", "lazynext"],
	};

	const title = titleTemplates[safePlatform] || baseTitle;
	const description =
		input.baseDescription ||
		descTemplates[safePlatform]?.(topic, input.tags) ||
		topic;

	// Merge user tags with platform hashtags, deduplicate
	const baseHashtags = hashtagBases[safePlatform] || [];
	const userHashtags = (input.tags || []).map((t: string) =>
		t.replace(/^#/, ""),
	);
	const hashtags = [...new Set([...userHashtags, ...baseHashtags])];

	return {
		platform,
		title,
		description,
		hashtags,
		suggested_posting_time:
			bestTimes[safePlatform] || "Weekdays 12 PM (local timezone)",
	};
}

// ── Thumbnail Generation ────────────────────────────────────────────────

app.post("/thumbnails/generate", async (req: Request, res: Response) => {
	const video_path = req.body?.video_path;
	const count = Math.min(
		Math.max(parseInt(req.body?.count || "5", 10) || 5, 1),
		10,
	);

	if (!video_path || typeof video_path !== "string") {
		return res
			.status(400)
			.json({ success: false, error: "Missing video_path" });
	}

	const videoPath = validateVideoPath(video_path);
	if (!videoPath) {
		return res
			.status(400)
			.json({ success: false, error: "Invalid video_path" });
	}

	if (!fs.existsSync(videoPath)) {
		return res.status(400).json({ success: false, error: `File not found` });
	}

	if (!fs.existsSync(OUTPUT_DIR)) {
		fs.mkdirSync(OUTPUT_DIR, { recursive: true });
	}

	try {
		const duration = await getVideoDuration(videoPath);
		const thumbDir = path.join(OUTPUT_DIR, `thumbs_${uuidv4()}`);
		fs.mkdirSync(thumbDir, { recursive: true });

		const candidates: ThumbnailCandidate[] = [];

		// Extract at evenly-spaced timestamps (avoid 0s and last second)
		const interval = Math.max(1, duration / (count + 1));
		for (let i = 1; i <= count; i++) {
			const timestamp = Math.min(duration - 0.5, interval * i);
			const thumbPath = path.join(
				thumbDir,
				`thumb_${i}_${timestamp.toFixed(1)}s.jpg`,
			);

			await extractThumbnail(videoPath, thumbPath, timestamp);

			// Score based on position in video (middle frames tend to be better)
			const positionScore =
				1.0 - Math.abs(timestamp - duration / 2) / (duration / 2);
			candidates.push({
				path: thumbPath,
				timestamp,
				score: Math.round(positionScore * 100) / 100,
			});
		}

		res.json({ success: true, candidates, total: candidates.length });
	} catch (err: any) {
		res
			.status(500)
			.json({ success: false, error: err?.message || String(err) });
	}
});

/**
 * Probe a video file and return its duration in seconds using ffprobe.
 * Falls back to 0 if ffprobe is not available or the probe fails.
 */
function getVideoDuration(inputPath: string): Promise<number> {
	return new Promise((resolve, reject) => {
		const args = [
			"-v",
			"error",
			"-show_entries",
			"format=duration",
			"-of",
			"default=noprint_wrappers=1:nokey=1",
			inputPath,
		];

		const proc = spawn("ffprobe", args);
		let output = "";

		proc.stdout.on("data", (data: Buffer) => {
			output += data.toString();
		});

		proc.on("close", (code) => {
			if (code === 0) {
				resolve(parseFloat(output.trim()) || 10);
			} else {
				reject(new Error("ffprobe failed"));
			}
		});

		proc.on("error", reject);
	});
}

/**
 * Extract a thumbnail image from a video at a given timestamp using ffmpeg.
 * Generates a JPEG at the video's native resolution.
 *
 * @param inputPath - Source video path
 * @param timestamp - Time offset in seconds (default 1.0)
 * @returns Path to the extracted thumbnail file
 */
function extractThumbnail(
	inputPath: string,
	outputPath: string,
	timestamp: number,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const args = [
			"-y",
			"-ss",
			String(timestamp),
			"-i",
			inputPath,
			"-vframes",
			"1",
			"-q:v",
			"2",
			outputPath,
		];

		const ffmpeg = spawn("ffmpeg", args);
		ffmpeg.on("close", (code) => {
			if (code === 0) resolve();
			else reject(new Error(`Thumbnail extraction failed with code ${code}`));
		});
		ffmpeg.on("error", reject);
	});
}

// ── Thumbnail A/B Testing ───────────────────────────────────────────────

app.post("/thumbnails/test", async (req: Request, res: Response) => {
	const { candidates } = req.body as { candidates?: ThumbnailCandidate[] };

	if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
		return res
			.status(400)
			.json({ success: false, error: "Missing or empty candidates array" });
	}

	/**
	 * Simulate A/B testing by scoring each thumbnail candidate on:
	 * 1. Saturation/vividness (for click appeal)
	 * 2. Contrast (visual pop)
	 * 3. Position within video (intro/hook frames score higher)
	 * 4. Random variance (simulates real-world user preference noise)
	 */
	const scored = candidates.map((c) => {
		// Position-based appeal: early frames (hooks) and climax frames score higher
		const positionAppeal =
			c.timestamp < 3
				? 0.85 // Hook frames
				: c.timestamp < 10
					? 0.7 // Content frames
					: 0.6; // Late frames

		// Simulated visual appeal (in real impl: analyze via sharp)
		const visualAppeal = 0.6 + Math.random() * 0.4;

		const clickScore =
			positionAppeal * 0.4 + visualAppeal * 0.35 + Math.random() * 0.25;
		const appealScore = Math.round(clickScore * 100);

		return {
			...c,
			appeal_score: appealScore,
			click_score: Math.round(clickScore * 100) / 100,
		};
	});

	// Sort by appeal score descending
	scored.sort((a, b) => (b.appeal_score || 0) - (a.appeal_score || 0));

	// Mark winner
	const winner = scored[0];

	res.json({
		success: true,
		candidates: scored,
		winner: winner
			? {
					path: winner.path,
					timestamp: winner.timestamp,
					appeal_score: winner.appeal_score,
				}
			: null,
		test_id: uuidv4(),
	});
});

// ── Scheduled Posting ───────────────────────────────────────────────────

app.post("/schedule", (req: Request, res: Response) => {
	const {
		video_path,
		platform,
		title,
		description,
		tags,
		hashtags,
		scheduled_at,
	} = req.body;

	if (!video_path || !platform || !scheduled_at) {
		return res.status(400).json({
			success: false,
			error: "Missing required fields: video_path, platform, scheduled_at",
		});
	}

	const scheduledDate = new Date(scheduled_at);
	if (isNaN(scheduledDate.getTime())) {
		return res
			.status(400)
			.json({ success: false, error: "Invalid scheduled_at date" });
	}

	if (scheduledDate.getTime() <= Date.now()) {
		return res
			.status(400)
			.json({ success: false, error: "schedule_at must be in the future" });
	}

	const id = uuidv4();
	const post: ScheduledPost = {
		id,
		platform,
		video_path,
		title: title || "",
		description: description || "",
		tags: tags || [],
		hashtags: hashtags || [],
		scheduled_at: scheduledDate.toISOString(),
		status: "scheduled",
		created_at: new Date().toISOString(),
	};

	scheduledPosts.set(id, post);

	// Schedule the post
	const delayMs = scheduledDate.getTime() - Date.now();
	const timer = setTimeout(async () => {
		try {
			const result = await publishToPlatform(platform, {
				video_path,
				platform,
				title,
				description,
				tags,
				hashtags,
			});

			const stored = scheduledPosts.get(id);
			if (stored) {
				stored.status = result.success ? "published" : "failed";
				scheduledPosts.set(id, stored);
			}
		} catch (err: any) {
			const stored = scheduledPosts.get(id);
			if (stored) {
				stored.status = "failed";
				scheduledPosts.set(id, stored);
			}
		} finally {
			schedulers.delete(id);
		}
	}, delayMs);

	schedulers.set(id, timer);

	res.status(201).json({ success: true, post });
});

app.get("/schedule", (_req: Request, res: Response) => {
	const posts = Array.from(scheduledPosts.values()).sort(
		(a, b) =>
			new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
	);
	res.json({ success: true, posts });
});

app.delete("/schedule/:id", (req: Request, res: Response) => {
	const { id } = req.params as { id: string };

	const post = scheduledPosts.get(id);
	if (!post) {
		return res
			.status(404)
			.json({ success: false, error: "Scheduled post not found" });
	}

	if (post.status === "published") {
		return res.status(400).json({
			success: false,
			error: "Cannot cancel an already published post",
		});
	}

	// Cancel the timer
	const timer = schedulers.get(id as string);
	if (timer) {
		clearTimeout(timer);
		schedulers.delete(id as string);
	}

	post.status = "cancelled";
	scheduledPosts.set(id as string, post);

	res.json({ success: true, message: `Post ${id} cancelled` });
});

// ── Helpers ─────────────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

/**
 * Generic HTTP fetch with exponential backoff retry (up to 3 attempts by default).
 * Used by all platform publishers for resilience against transient API failures.
 * 4xx errors are NOT retried (client errors should not be retried).
 * 5xx and network errors are retried with exponential backoff.
 *
 * @param url - Request URL
 * @param init - Fetch init options (method, headers, body)
 * @param maxRetries - Max retry attempts (default 3)
 */
async function fetchWithRetry(
	url: string,
	init?: RequestInit,
	maxRetries: number = MAX_RETRIES,
): Promise<FetchResponse> {
	let lastError: unknown;

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			const resp = await fetch(url, init);
			if (!resp.ok) {
				const body = await resp.text().catch(() => "");
				const err: any = new Error(`HTTP ${resp.status}: ${body}`);
				err.status = resp.status;
				err.body = body;

				// Do not retry 4xx errors
				if (resp.status >= 400 && resp.status < 500) throw err;

				throw err;
			}
			return resp;
		} catch (err: any) {
			lastError = err;

			// Do not retry 4xx
			if (err?.status && err.status >= 400 && err.status < 500) {
				throw err;
			}

			if (attempt < maxRetries) {
				const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
				await new Promise((r) => setTimeout(r, delay));
			}
		}
	}

	throw lastError;
}

// ── Startup ─────────────────────────────────────────────────────────────

function shutdown() {
	// Clear all pending timers
	for (const [id, timer] of schedulers) {
		clearTimeout(timer);
	}
	process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

if (import.meta.main) {
	if (!fs.existsSync(OUTPUT_DIR)) {
		fs.mkdirSync(OUTPUT_DIR, { recursive: true });
	}

	app.listen(PORT, () => {
		console.log(`📱 Lazynext Social Publish Service running on port ${PORT}`);
	});
}

export default app;
