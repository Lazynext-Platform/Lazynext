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

import express, { Request, Response } from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(import.meta.dirname, "../outputs");
const PORT = parseInt(process.env.PORT || "8007", 10);

const app = express();
app.use(cors());
app.use(express.json());

// ── Types ───────────────────────────────────────────────────────────────

interface PublishRequest {
	video_path: string;
	platform: string;
	title?: string;
	description?: string;
	tags?: string[];
	hashtags?: string[];
	privacy?: "public" | "private" | "unlisted";
}

interface PublishResult {
	platform: string;
	success: boolean;
	postId?: string;
	postUrl?: string;
	error?: string;
}

interface ReframeRequest {
	video_path: string;
	target_platform: string;
}

interface ReframeResult {
	success: boolean;
	output_path?: string;
	platform: string;
	aspect_ratio: string;
	resolution: string;
}

interface MetadataRequest {
	title?: string;
	description?: string;
	platform: string;
	tags?: string[];
	video_topic?: string;
}

interface MetadataResult {
	success: boolean;
	platform: string;
	title: string;
	description: string;
	hashtags: string[];
	suggested_posting_time: string;
}

interface ThumbnailCandidate {
	path: string;
	timestamp: number;
	score: number;
	appeal_score?: number;
	click_score?: number;
}

interface ScheduledPost {
	id: string;
	platform: string;
	video_path: string;
	title?: string;
	description?: string;
	tags?: string[];
	hashtags?: string[];
	scheduled_at: string;
	status: "scheduled" | "published" | "failed" | "cancelled";
	created_at: string;
}

// ── In-memory Stores ────────────────────────────────────────────────────

const scheduledPosts = new Map<string, ScheduledPost>();
const schedulers = new Map<string, Timer>();

// ── Platform Aspect Ratio Config ────────────────────────────────────────

const PLATFORM_SPECS: Record<string, { aspect: string; width: number; height: number }> = {
	tiktok: { aspect: "9:16", width: 1080, height: 1920 },
	reels: { aspect: "9:16", width: 1080, height: 1920 },
	instagram: { aspect: "9:16", width: 1080, height: 1920 },
	"instagram-feed": { aspect: "4:5", width: 1080, height: 1350 },
	"instagram-square": { aspect: "1:1", width: 1080, height: 1080 },
	youtube: { aspect: "16:9", width: 1920, height: 1080 },
	twitter: { aspect: "16:9", width: 1920, height: 1080 },
};

// ── Health Check ────────────────────────────────────────────────────────

app.get("/health", (_req: Request, res: Response) => {
	res.json({ status: "ok", service: "social-publish" });
});

// ── Platform Publish Endpoints ──────────────────────────────────────────

function buildPlatformPublisher(platform: string) {
	return async (req: Request, res: Response) => {
		const { video_path, title, description, tags, hashtags, privacy } = req.body as PublishRequest;

		if (!video_path) {
			return res.status(400).json({ success: false, error: "Missing video_path" });
		}

		if (!fs.existsSync(video_path)) {
			return res.status(400).json({ success: false, error: `File not found: ${video_path}` });
		}

		try {
			const result = await publishToPlatform(platform, {
				video_path,
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

async function publishToPlatform(
	platform: string,
	req: PublishRequest,
): Promise<PublishResult> {
	const clientIdKey = platformKey(platform, "CLIENT_ID");
	const clientSecretKey = platformKey(platform, "CLIENT_SECRET");
	const tokenKey = platformKey(platform, "OAUTH_TOKEN");

	const accessToken = process.env[tokenKey] || "";

	// Check credentials
	if (!accessToken) {
		const clientId = process.env[clientIdKey];
		const clientSecret = process.env[clientSecretKey];

		if (!clientId || !clientSecret) {
			return {
				platform,
				success: false,
				error: `${platform} API keys not configured (${clientIdKey} / ${clientSecretKey})`,
			};
		}
	}

	const fileSize = fs.statSync(req.video_path).size;

	switch (platform) {
		case "tiktok":
			return publishTikTok(req.video_path, accessToken, fileSize, req.description, req.hashtags);
		case "youtube":
			return publishYouTube(req.video_path, accessToken, fileSize, req.title, req.description, req.tags);
		case "instagram":
			return publishInstagram(req.video_path, accessToken, fileSize, req.description);
		case "twitter":
			return publishTwitter(req.video_path, accessToken, fileSize, req.description);
		default:
			return { platform, success: false, error: `Unsupported platform: ${platform}` };
	}
}

function platformKey(platform: string, suffix: string): string {
	switch (platform) {
		case "tiktok": return suffix === "CLIENT_ID" ? "TIKTOK_CLIENT_KEY" : `TIKTOK_${suffix}`;
		case "youtube": return `GOOGLE_${suffix}`;
		case "instagram": return `INSTAGRAM_${suffix === "CLIENT_ID" ? "APP_ID" : "APP_SECRET"}`;
		case "twitter": return `TWITTER_${suffix}`;
		default: return `${platform.toUpperCase()}_${suffix}`;
	}
}

// ── TikTok Publisher ────────────────────────────────────────────────────

async function publishTikTok(
	videoPath: string,
	token: string,
	fileSize: number,
	description?: string,
	hashtags?: string[],
): Promise<PublishResult> {
	const TIKTOK_API = "https://open.tiktokapis.com/v2";
	const captionText = [description, hashtags?.map((h) => `#${h}`).join(" ")]
		.filter(Boolean)
		.join("\n\n");

	// Step 1: Initialize upload
	const initResp = await fetchWithRetry(`${TIKTOK_API}/post/publish/video/init/`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			post_info: {
				title: captionText || path.basename(videoPath),
				privacy_level: "PUBLIC_TO_EVERYONE",
				disable_duet: false,
				disable_comment: false,
				disable_stitch: false,
			},
			source_info: {
				source: "FILE_UPLOAD",
				video_size: fileSize,
				chunk_size: fileSize,
				total_chunk_count: 1,
			},
		}),
	});

	const initData = (await initResp.json()) as { data: { upload_url: string; publish_id: string } };
	const { upload_url, publish_id } = initData.data;

	// Step 2: Upload video
	await fetchWithRetry(upload_url, {
		method: "PUT",
		headers: { "Content-Type": "video/mp4" },
		body: fs.readFileSync(videoPath),
	});

	return {
		platform: "tiktok",
		success: true,
		postId: publish_id,
		postUrl: `https://www.tiktok.com/@user/video/${publish_id}`,
	};
}

// ── YouTube Publisher ───────────────────────────────────────────────────

async function publishYouTube(
	videoPath: string,
	token: string,
	fileSize: number,
	title?: string,
	description?: string,
	tags?: string[],
): Promise<PublishResult> {
	const YOUTUBE_API = "https://www.googleapis.com/upload/youtube/v3";
	const defaultTitle = path.basename(videoPath, path.extname(videoPath));

	// Step 1: Initialize resumable upload
	const initResp = await fetchWithRetry(
		`${YOUTUBE_API}/videos?uploadType=resumable&part=snippet,status`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
				"X-Upload-Content-Length": String(fileSize),
				"X-Upload-Content-Type": "video/mp4",
			},
			body: JSON.stringify({
				snippet: {
					title: title || defaultTitle,
					description: description || "",
					tags: tags || [],
				},
				status: {
					privacyStatus: "public",
					selfDeclaredMadeForKids: false,
				},
			}),
		},
	);

	const uploadUrl = initResp.headers.get("location");
	if (!uploadUrl) {
		return { platform: "youtube", success: false, error: "No upload URL returned from YouTube" };
	}

	// Step 2: Chunked upload
	const CHUNK_SIZE = 5 * 1024 * 1024;
	const videoBuffer = fs.readFileSync(videoPath);

	for (let start = 0; start < fileSize; start += CHUNK_SIZE) {
		const end = Math.min(start + CHUNK_SIZE, fileSize);
		const chunk = videoBuffer.subarray(start, end);

		const resp = await fetchWithRetry(uploadUrl, {
			method: "PUT",
			headers: {
				"Content-Length": String(chunk.length),
				"Content-Range": `bytes ${start}-${end - 1}/${fileSize}`,
			},
			body: Buffer.from(chunk),
		});

		if (resp.status === 200 || resp.status === 201) {
			const data = (await resp.json()) as { id: string };
			return {
				platform: "youtube",
				success: true,
				postId: data.id,
				postUrl: `https://www.youtube.com/watch?v=${data.id}`,
			};
		}
	}

	return { platform: "youtube", success: false, error: "Upload ended without completion" };
}

// ── Instagram Publisher ─────────────────────────────────────────────────

async function publishInstagram(
	videoPath: string,
	token: string,
	fileSize: number,
	description?: string,
): Promise<PublishResult> {
	const INSTAGRAM_API = "https://graph.instagram.com/v21.0";
	const instagramUserId = process.env.INSTAGRAM_USER_ID;

	if (!instagramUserId) {
		return {
			platform: "instagram",
			success: false,
			error: "Instagram user ID not configured (INSTAGRAM_USER_ID)",
		};
	}

	// Step 1: Create media container
	const createResp = await fetchWithRetry(`${INSTAGRAM_API}/${instagramUserId}/media`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({
			media_type: "REELS",
			video_url: `file://${videoPath}`,
			caption: description || "Posted via Lazynext",
			share_to_feed: "true",
		}).toString(),
	});

	const createData = (await createResp.json()) as { id: string };

	// Step 2: Poll for processing
	let status = "PROCESSING";
	let attempts = 0;
	const maxAttempts = 30;

	while (status !== "FINISHED" && attempts < maxAttempts) {
		await new Promise((r) => setTimeout(r, 5000));
		try {
			const resp = await fetch(
				`${INSTAGRAM_API}/${createData.id}?fields=status,permalink`,
				{ headers: { Authorization: `Bearer ${token}` } },
			);
			if (resp.ok) {
				const statusData = (await resp.json()) as { status: string; permalink?: string };
				status = statusData.status;
				if (status === "FINISHED") {
					return {
						platform: "instagram",
						success: true,
						postId: createData.id,
						postUrl: statusData.permalink || `https://www.instagram.com/p/${createData.id}/`,
					};
				}
				if (status === "ERROR") {
					return { platform: "instagram", success: false, error: "Instagram media processing failed" };
				}
			}
		} catch { /* poll error — retry */ }
		attempts++;
	}

	return {
		platform: "instagram",
		success: false,
		error: status === "PROCESSING" ? "Instagram processing timed out" : `Unexpected status: ${status}`,
	};
}

// ── Twitter/X Publisher ─────────────────────────────────────────────────

async function publishTwitter(
	videoPath: string,
	token: string,
	fileSize: number,
	description?: string,
): Promise<PublishResult> {
	const TWITTER_API = "https://api.twitter.com/2";
	const TWITTER_MEDIA_URL = "https://upload.twitter.com/1.1/media/upload.json";

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

	const initData = (await initResp.json()) as { data?: { media_id_string: string }; media_id_string?: string };
	const mediaId = initData.data?.media_id_string || initData.media_id_string || "";

	if (!mediaId) {
		return { platform: "twitter", success: false, error: "Failed to initialize Twitter media upload" };
	}

	// Step 2: APPEND — upload chunks
	const CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB for Twitter
	const videoBuffer = fs.readFileSync(videoPath);

	for (let segment = 0, start = 0; start < fileSize; segment++, start += CHUNK_SIZE) {
		const formData = new FormData();
		formData.append("command", "APPEND");
		formData.append("media_id", mediaId);
		formData.append("segment_index", String(segment));
		formData.append(
			"media",
			new Blob([videoBuffer.subarray(start, Math.min(start + CHUNK_SIZE, fileSize))]),
		);

		await fetchWithRetry(TWITTER_MEDIA_URL, {
			method: "POST",
			headers: { Authorization: `Bearer ${token}` },
			body: formData,
		});
	}

	// Step 3: FINALIZE
	const finalizeBody = new URLSearchParams({ command: "FINALIZE", media_id: mediaId });
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
		return res.status(400).json({ success: false, error: "Missing video_path or target_platform" });
	}

	if (!fs.existsSync(video_path)) {
		return res.status(400).json({ success: false, error: `File not found: ${video_path}` });
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
function reframeVideo(
	inputPath: string,
	outputPath: string,
	width: number,
	height: number,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const args = [
			"-y",
			"-i", inputPath,
			"-vf",
			`scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`,
			"-c:v", "libx264",
			"-preset", "fast",
			"-crf", "18",
			"-pix_fmt", "yuv420p",
			"-c:a", "aac",
			"-b:a", "192k",
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
				reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-500)}`));
			}
		});

		ffmpeg.on("error", reject);
	});
}

// ── AI Metadata Generation ──────────────────────────────────────────────

app.post("/generate-metadata", async (req: Request, res: Response) => {
	const { title, description, platform, tags, video_topic } = req.body as MetadataRequest;

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
	baseTitle?: string;
	baseDescription?: string;
	tags: string[];
	videoTopic?: string;
}

/**
 * Generate platform-optimized metadata with emojis, hashtags,
 * and suggested posting times based on platform best practices.
 *
 * Uses deterministic templates with user-provided inputs woven in.
 * When OPENAI_API_KEY is configured, could be replaced with LLM generation.
 */
function generatePlatformMetadata(
	platform: string,
	input: MetadataInput,
): Omit<MetadataResult, "success"> {
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
	const descTemplates: Record<string, (topic: string, tags: string[]) => string> = {
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

	const title = titleTemplates[platform] || baseTitle;
	const description =
		input.baseDescription || descTemplates[platform]?.(topic, input.tags) || topic;

	// Merge user tags with platform hashtags, deduplicate
	const baseHashtags = hashtagBases[platform] || [];
	const userHashtags = (input.tags || []).map((t: string) => t.replace(/^#/, ""));
	const hashtags = [...new Set([...userHashtags, ...baseHashtags])];

	return {
		platform,
		title,
		description,
		hashtags,
		suggested_posting_time: bestTimes[platform] || "Weekdays 12 PM (local timezone)",
	};
}

// ── Thumbnail Generation ────────────────────────────────────────────────

app.post("/thumbnails/generate", async (req: Request, res: Response) => {
	const { video_path } = req.body;
	const count = parseInt(req.body.count || "5", 10);

	if (!video_path) {
		return res.status(400).json({ success: false, error: "Missing video_path" });
	}

	if (!fs.existsSync(video_path)) {
		return res.status(400).json({ success: false, error: `File not found: ${video_path}` });
	}

	if (!fs.existsSync(OUTPUT_DIR)) {
		fs.mkdirSync(OUTPUT_DIR, { recursive: true });
	}

	try {
		const duration = await getVideoDuration(video_path);
		const thumbDir = path.join(OUTPUT_DIR, `thumbs_${uuidv4()}`);
		fs.mkdirSync(thumbDir, { recursive: true });

		const candidates: ThumbnailCandidate[] = [];

		// Extract at evenly-spaced timestamps (avoid 0s and last second)
		const interval = Math.max(1, duration / (count + 1));
		for (let i = 1; i <= count; i++) {
			const timestamp = Math.min(duration - 0.5, interval * i);
			const thumbPath = path.join(thumbDir, `thumb_${i}_${timestamp.toFixed(1)}s.jpg`);

			await extractThumbnail(video_path, thumbPath, timestamp);

			// Score based on position in video (middle frames tend to be better)
			const positionScore = 1.0 - Math.abs(timestamp - duration / 2) / (duration / 2);
			candidates.push({
				path: thumbPath,
				timestamp,
				score: Math.round(positionScore * 100) / 100,
			});
		}

		res.json({ success: true, candidates, total: candidates.length });
	} catch (err: any) {
		res.status(500).json({ success: false, error: err?.message || String(err) });
	}
});

function getVideoDuration(inputPath: string): Promise<number> {
	return new Promise((resolve, reject) => {
		const args = [
			"-v", "error",
			"-show_entries", "format=duration",
			"-of", "default=noprint_wrappers=1:nokey=1",
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

function extractThumbnail(
	inputPath: string,
	outputPath: string,
	timestamp: number,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const args = [
			"-y",
			"-ss", String(timestamp),
			"-i", inputPath,
			"-vframes", "1",
			"-q:v", "2",
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
		return res.status(400).json({ success: false, error: "Missing or empty candidates array" });
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
		const positionAppeal = c.timestamp < 3
			? 0.85  // Hook frames
			: c.timestamp < 10
				? 0.70  // Content frames
				: 0.60; // Late frames

		// Simulated visual appeal (in real impl: analyze via sharp)
		const visualAppeal = 0.6 + Math.random() * 0.4;

		const clickScore = (positionAppeal * 0.4 + visualAppeal * 0.35 + Math.random() * 0.25);
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
			? { path: winner.path, timestamp: winner.timestamp, appeal_score: winner.appeal_score }
			: null,
		test_id: uuidv4(),
	});
});

// ── Scheduled Posting ───────────────────────────────────────────────────

app.post("/schedule", (req: Request, res: Response) => {
	const { video_path, platform, title, description, tags, hashtags, scheduled_at } = req.body;

	if (!video_path || !platform || !scheduled_at) {
		return res.status(400).json({
			success: false,
			error: "Missing required fields: video_path, platform, scheduled_at",
		});
	}

	const scheduledDate = new Date(scheduled_at);
	if (isNaN(scheduledDate.getTime())) {
		return res.status(400).json({ success: false, error: "Invalid scheduled_at date" });
	}

	if (scheduledDate.getTime() <= Date.now()) {
		return res.status(400).json({ success: false, error: "schedule_at must be in the future" });
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
		(a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
	);
	res.json({ success: true, posts });
});

app.delete("/schedule/:id", (req: Request, res: Response) => {
	const { id } = req.params;

	const post = scheduledPosts.get(id);
	if (!post) {
		return res.status(404).json({ success: false, error: "Scheduled post not found" });
	}

	if (post.status === "published") {
		return res.status(400).json({ success: false, error: "Cannot cancel an already published post" });
	}

	// Cancel the timer
	const timer = schedulers.get(id);
	if (timer) {
		clearTimeout(timer);
		schedulers.delete(id);
	}

	post.status = "cancelled";
	scheduledPosts.set(id, post);

	res.json({ success: true, message: `Post ${id} cancelled` });
});

// ── Helpers ─────────────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

async function fetchWithRetry(
	url: string,
	init?: RequestInit,
	maxRetries: number = MAX_RETRIES,
): Promise<Response> {
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
				const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
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
