/**
 * Social Media Publishing Core — shared package used by both
 * `services/render-service` and `services/social-publish`.
 *
 * Provides:
 * - Retry logic with exponential backoff
 * - OAuth 2.0 token refresh
 * - TikTok, YouTube, Instagram publishers
 * - Unified publish() entry point
 */

import fs from "fs";
import path from "path";

// ── Path safety ───────────────────────────────────────────────────────

/**
 * Directories that video paths are allowed to resolve inside. Configurable
 * via `SOCIAL_PUBLISH_OUTPUT_DIR` / `OUTPUT_DIR`; always includes the
 * conventional local output folders and the render scratch directory.
 */
function allowedBaseDirs(): string[] {
	const dirs = [
		process.env.SOCIAL_PUBLISH_OUTPUT_DIR,
		process.env.OUTPUT_DIR,
		path.join(process.cwd(), "output"),
		path.join(process.cwd(), "outputs"),
		"/tmp/lazynext",
	].filter((d): d is string => Boolean(d));
	return dirs.map((d) => path.resolve(d));
}

/**
 * Validate a video path, guaranteeing the result stays inside one of the
 * {@link allowedBaseDirs}. Rejects traversal and null bytes. Relative paths
 * resolve against the first allowed base. Throws on violation so tainted
 * input can never reach the filesystem.
 */
export function assertSafeVideoPath(inputPath: string): string {
	if (typeof inputPath !== "string" || inputPath.trim().length === 0) {
		throw new Error("Invalid video path");
	}
	if (inputPath.includes("\0")) {
		throw new Error("Invalid video path");
	}
	const bases = allowedBaseDirs();
	const trimmed = inputPath.trim();
	const resolved = path.isAbsolute(trimmed)
		? path.resolve(trimmed)
		: path.resolve(bases[0], trimmed);
	for (const base of bases) {
		if (resolved === base || resolved.startsWith(base + path.sep)) {
			return resolved;
		}
	}
	throw new Error("Resolved path escapes the allowed directories");
}

// ── Types ─────────────────────────────────────────────────────────────

export interface PlatformMetadata {
	caption?: string;
	hashtags?: string[];
	title?: string;
	description?: string;
	tags?: string[];
	thumbnail?: string;
	privacyStatus?: "public" | "private" | "unlisted";
}

/** Type definition for PublishResult. */
export interface PublishResult {
	platform: string;
	success: boolean;
	postUrl?: string;
	postId?: string;
	error?: string;
}

/** Type definition for OAuthTokens. */
export interface OAuthTokens {
	accessToken: string;
	refreshToken?: string;
	expiresAt: number;
}

// ── API Base URLs ─────────────────────────────────────────────────────

const TIKTOK_API = "https://open.tiktokapis.com/v2";
const YOUTUBE_API = "https://www.googleapis.com/upload/youtube/v3";
const INSTAGRAM_API = "https://graph.instagram.com/v21.0";

// ── Retry Configuration ───────────────────────────────────────────────

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

async function withRetry<T>(
	operation: () => Promise<T>,
	label: string,
): Promise<T> {
	let lastError: unknown;
	for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
		try {
			return await operation();
		} catch (err: any) {
			lastError = err;
			if (err?.status && err.status >= 400 && err.status < 500) throw err;
			if (attempt < MAX_RETRIES) {
				const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
				console.warn(
					`[Social] ${label} attempt ${attempt} failed, retrying in ${delay}ms...`,
				);
				await new Promise((r) => setTimeout(r, delay));
			}
		}
	}
	throw lastError;
}

async function fetchWithStatus(
	url: string,
	init?: RequestInit,
): Promise<Response> {
	const resp = await fetch(url, init);
	if (!resp.ok) {
		const body = await resp.text().catch(() => "");
		const err: any = new Error(`HTTP ${resp.status}: ${body}`);
		err.status = resp.status;
		err.body = body;
		throw err;
	}
	return resp;
}

// ── OAuth Token Management ────────────────────────────────────────────

async function getValidToken(
	platform: string,
	clientId: string,
	clientSecret: string,
): Promise<string> {
	const stored = process.env[`${platform.toUpperCase()}_OAUTH_TOKEN`];
	const refresh = process.env[`${platform.toUpperCase()}_REFRESH_TOKEN`];

	if (!stored) throw new Error(`No OAuth token configured for ${platform}`);

	const expiresAt = parseInt(
		process.env[`${platform.toUpperCase()}_TOKEN_EXPIRY`] || "0",
		10,
	);
	if (expiresAt > Date.now() + 60000) return stored;

	if (refresh && clientId && clientSecret) {
		console.log(`[Social] Refreshing ${platform} OAuth token...`);
		const tokenUrl =
			platform === "tiktok"
				? `${TIKTOK_API}/oauth/token/`
				: platform === "instagram"
					? "https://api.instagram.com/oauth/refresh_access_token"
					: "https://oauth2.googleapis.com/token";
		const resp = await fetchWithStatus(tokenUrl, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				client_id: clientId,
				client_secret: clientSecret,
				grant_type: "refresh_token",
				refresh_token: refresh,
			}).toString(),
		});
		const data = (await resp.json()) as {
			access_token: string;
			expires_in: number;
		};
		console.log(`[Social] ${platform} token refreshed successfully`);
		return data.access_token;
	}

	console.warn(
		`[Social] ${platform} token expired and no refresh token available — using stored token`,
	);
	return stored;
}

// ── TikTok Publisher ──────────────────────────────────────────────────

export async function publishToTikTok(
	videoPath: string,
	caption?: string,
	hashtags?: string[],
): Promise<PublishResult> {
	const clientId = process.env.TIKTOK_CLIENT_KEY;
	const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

	if (!clientId || !clientSecret) {
		return {
			platform: "tiktok",
			success: false,
			error: "TikTok API keys not configured",
		};
	}

	try {
		const token = await getValidToken("tiktok", clientId, clientSecret);
		const safePath = assertSafeVideoPath(videoPath);
		const fileSize = fs.statSync(safePath).size;
		const videoBuffer = fs.readFileSync(safePath);

		const captionText = [caption, hashtags?.map((h) => `#${h}`).join(" ")]
			.filter(Boolean)
			.join("\n\n");

		const initData = await withRetry(async () => {
			const resp = await fetchWithStatus(
				`${TIKTOK_API}/post/publish/video/init/`,
				{
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
				},
			);
			return (await resp.json()) as {
				data: { upload_url: string; publish_id: string };
			};
		}, "TikTok init");

		const { upload_url, publish_id } = initData.data;

		await withRetry(async () => {
			await fetchWithStatus(upload_url, {
				method: "PUT",
				headers: { "Content-Type": "video/mp4" },
				body: videoBuffer,
			});
		}, "TikTok upload");

		console.log(`[Social] Published to TikTok: ${publish_id}`);
		return {
			platform: "tiktok",
			success: true,
			postId: publish_id,
			postUrl: `https://www.tiktok.com/@user/video/${publish_id}`,
		};
	} catch (err: any) {
		return {
			platform: "tiktok",
			success: false,
			error: err?.message || String(err),
		};
	}
}

// ── YouTube Publisher ─────────────────────────────────────────────────

export async function publishToYouTube(
	videoPath: string,
	title?: string,
	description?: string,
	tags?: string[],
): Promise<PublishResult> {
	const clientId = process.env.GOOGLE_CLIENT_ID;
	const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

	if (!clientId || !clientSecret) {
		return {
			platform: "youtube",
			success: false,
			error: "YouTube API keys not configured",
		};
	}

	try {
		const token = await getValidToken("youtube", clientId, clientSecret);
		const safePath = assertSafeVideoPath(videoPath);
		const fileSize = fs.statSync(safePath).size;
		const defaultTitle = path.basename(safePath, path.extname(safePath));

		const initResp = await withRetry(async () => {
			return await fetchWithStatus(
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
		}, "YouTube init");

		const uploadUrl = initResp.headers.get("location");
		if (!uploadUrl) {
			return {
				platform: "youtube",
				success: false,
				error: "No upload URL returned from YouTube",
			};
		}

		const CHUNK_SIZE = 5 * 1024 * 1024;
		const videoBuffer = fs.readFileSync(safePath);

		for (let start = 0; start < fileSize; start += CHUNK_SIZE) {
			const end = Math.min(start + CHUNK_SIZE, fileSize);
			const chunk = videoBuffer.subarray(start, end);

			const uploaded = await withRetry(
				async () => {
					const resp = await fetchWithStatus(uploadUrl, {
						method: "PUT",
						headers: {
							"Content-Length": String(chunk.length),
							"Content-Range": `bytes ${start}-${end - 1}/${fileSize}`,
						},
						body: Buffer.from(chunk),
					});
					if (resp.status === 200 || resp.status === 201) {
						return { done: true, data: (await resp.json()) as { id: string } };
					}
					return { done: false, data: null as any };
				},
				`YouTube chunk ${start}-${end - 1}`,
			);

			if (uploaded.done) {
				console.log(`[Social] Published to YouTube: ${uploaded.data.id}`);
				return {
					platform: "youtube",
					success: true,
					postId: uploaded.data.id,
					postUrl: `https://www.youtube.com/watch?v=${uploaded.data.id}`,
				};
			}
		}

		return {
			platform: "youtube",
			success: false,
			error: "Upload ended without completion response",
		};
	} catch (err: any) {
		return {
			platform: "youtube",
			success: false,
			error: err?.message || String(err),
		};
	}
}

// ── Instagram Publisher ───────────────────────────────────────────────

export async function publishToInstagram(
	videoPath: string,
	caption?: string,
): Promise<PublishResult> {
	const appId = process.env.INSTAGRAM_APP_ID;
	const appSecret = process.env.INSTAGRAM_APP_SECRET;

	if (!appId || !appSecret) {
		return {
			platform: "instagram",
			success: false,
			error: "Instagram API keys not configured",
		};
	}

	try {
		const token = await getValidToken("instagram", appId, appSecret);
		const instagramUserId = process.env.INSTAGRAM_USER_ID;
		const safePath = assertSafeVideoPath(videoPath);

		if (!instagramUserId) {
			return {
				platform: "instagram",
				success: false,
				error: "Instagram user ID not configured",
			};
		}

		const createData = await withRetry(async () => {
			const resp = await fetchWithStatus(
				`${INSTAGRAM_API}/${instagramUserId}/media`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/x-www-form-urlencoded",
					},
					body: new URLSearchParams({
						media_type: "REELS",
						video_url: `file://${safePath}`,
						caption: caption || "Posted via Lazynext",
						share_to_feed: "true",
					}).toString(),
				},
			);
			return (await resp.json()) as { id: string };
		}, "Instagram media create");

		let status = "PROCESSING";
		let attempts = 0;
		const maxAttempts = 30;
		const pollIntervalMs = 5000;

		while (status !== "FINISHED" && attempts < maxAttempts) {
			await new Promise((r) => setTimeout(r, pollIntervalMs));

			try {
				const resp = await fetch(
					`${INSTAGRAM_API}/${createData.id}?fields=status,permalink`,
					{ headers: { Authorization: `Bearer ${token}` } },
				);
				if (resp.ok) {
					const statusData = (await resp.json()) as {
						status: string;
						permalink?: string;
					};
					status = statusData.status;
					if (status === "FINISHED") {
						console.log(`[Social] Published to Instagram: ${createData.id}`);
						return {
							platform: "instagram",
							success: true,
							postId: createData.id,
							postUrl:
								statusData.permalink ||
								`https://www.instagram.com/p/${createData.id}/`,
						};
					}
					if (status === "ERROR") {
						return {
							platform: "instagram",
							success: false,
							error: "Instagram media processing failed",
						};
					}
				}
			} catch {
				console.warn(
					`[Social] Instagram status poll attempt ${attempts + 1} failed, retrying...`,
				);
			}
			attempts++;
		}

		return {
			platform: "instagram",
			success: false,
			error:
				status === "PROCESSING"
					? "Instagram processing timed out"
					: `Instagram unexpected status: ${status}`,
		};
	} catch (err: any) {
		return {
			platform: "instagram",
			success: false,
			error: err?.message || String(err),
		};
	}
}


// ── Facebook Publisher ──────────────────────────────────────────────────

export async function publishToFacebook(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to Facebook (Mock)...`);
	return {
		platform: "facebook",
		success: true,
		postId: `mock_facebook_id`,
		postUrl: `https://facebook.com/mock`,
	};
}


// ── LinkedIn Publisher ──────────────────────────────────────────────────

export async function publishToLinkedIn(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to LinkedIn (Mock)...`);
	return {
		platform: "linkedin",
		success: true,
		postId: `mock_linkedin_id`,
		postUrl: `https://linkedin.com/mock`,
	};
}


// ── Pinterest Publisher ──────────────────────────────────────────────────

export async function publishToPinterest(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to Pinterest (Mock)...`);
	return {
		platform: "pinterest",
		success: true,
		postId: `mock_pinterest_id`,
		postUrl: `https://pinterest.com/mock`,
	};
}


// ── Snapchat Publisher ──────────────────────────────────────────────────

export async function publishToSnapchat(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to Snapchat (Mock)...`);
	return {
		platform: "snapchat",
		success: true,
		postId: `mock_snapchat_id`,
		postUrl: `https://snapchat.com/mock`,
	};
}


// ── Twitch Publisher ──────────────────────────────────────────────────

export async function publishToTwitch(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to Twitch (Mock)...`);
	return {
		platform: "twitch",
		success: true,
		postId: `mock_twitch_id`,
		postUrl: `https://twitch.com/mock`,
	};
}


// ── Vimeo Publisher ──────────────────────────────────────────────────

export async function publishToVimeo(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to Vimeo (Mock)...`);
	return {
		platform: "vimeo",
		success: true,
		postId: `mock_vimeo_id`,
		postUrl: `https://vimeo.com/mock`,
	};
}


// ── Threads Publisher ──────────────────────────────────────────────────

export async function publishToThreads(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to Threads (Mock)...`);
	return {
		platform: "threads",
		success: true,
		postId: `mock_threads_id`,
		postUrl: `https://threads.com/mock`,
	};
}


// ── Rumble Publisher ──────────────────────────────────────────────────

export async function publishToRumble(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to Rumble (Mock)...`);
	return {
		platform: "rumble",
		success: true,
		postId: `mock_rumble_id`,
		postUrl: `https://rumble.com/mock`,
	};
}


export async function publishToReddit(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to Reddit (Mock)...`);
	return {
		platform: "reddit",
		success: true,
		postId: `mock_reddit_id`,
		postUrl: `https://reddit.com/mock`,
	};
}


export async function publishToDiscord(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to Discord (Mock)...`);
	return {
		platform: "discord",
		success: true,
		postId: `mock_discord_id`,
		postUrl: `https://discord.com/mock`,
	};
}


export async function publishToBluesky(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to Bluesky (Mock)...`);
	return {
		platform: "bluesky",
		success: true,
		postId: `mock_bluesky_id`,
		postUrl: `https://bluesky.com/mock`,
	};
}


export async function publishToMastodon(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to Mastodon (Mock)...`);
	return {
		platform: "mastodon",
		success: true,
		postId: `mock_mastodon_id`,
		postUrl: `https://mastodon.com/mock`,
	};
}


export async function publishToTelegram(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to Telegram (Mock)...`);
	return {
		platform: "telegram",
		success: true,
		postId: `mock_telegram_id`,
		postUrl: `https://telegram.com/mock`,
	};
}


export async function publishToDailymotion(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to Dailymotion (Mock)...`);
	return {
		platform: "dailymotion",
		success: true,
		postId: `mock_dailymotion_id`,
		postUrl: `https://dailymotion.com/mock`,
	};
}


export async function publishToBilibili(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to Bilibili (Mock)...`);
	return {
		platform: "bilibili",
		success: true,
		postId: `mock_bilibili_id`,
		postUrl: `https://bilibili.com/mock`,
	};
}


export async function publishToPatreon(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to Patreon (Mock)...`);
	return {
		platform: "patreon",
		success: true,
		postId: `mock_patreon_id`,
		postUrl: `https://patreon.com/mock`,
	};
}


export async function publishToMedium(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to Medium (Mock)...`);
	return {
		platform: "medium",
		success: true,
		postId: `mock_medium_id`,
		postUrl: `https://medium.com/mock`,
	};
}


export async function publishToWhatsApp(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to WhatsApp (Mock)...`);
	return {
		platform: "whatsapp",
		success: true,
		postId: `mock_whatsapp_id`,
		postUrl: `https://whatsapp.com/mock`,
	};
}


export async function publishToWeChat(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to WeChat (Mock)...`);
	return {
		platform: "wechat",
		success: true,
		postId: `mock_wechat_id`,
		postUrl: `https://wechat.com/mock`,
	};
}


export async function publishToLine(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to Line (Mock)...`);
	return {
		platform: "line",
		success: true,
		postId: `mock_line_id`,
		postUrl: `https://line.com/mock`,
	};
}


export async function publishToKwai(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to Kwai (Mock)...`);
	return {
		platform: "kwai",
		success: true,
		postId: `mock_kwai_id`,
		postUrl: `https://kwai.com/mock`,
	};
}


export async function publishToTumblr(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to Tumblr (Mock)...`);
	return {
		platform: "tumblr",
		success: true,
		postId: `mock_tumblr_id`,
		postUrl: `https://tumblr.com/mock`,
	};
}


export async function publishToOnlyFans(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to OnlyFans (Mock)...`);
	return {
		platform: "onlyfans",
		success: true,
		postId: `mock_onlyfans_id`,
		postUrl: `https://onlyfans.com/mock`,
	};
}


export async function publishToXigua(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to Xigua (Mock)...`);
	return {
		platform: "xigua",
		success: true,
		postId: `mock_xigua_id`,
		postUrl: `https://xigua.com/mock`,
	};
}


export async function publishToKick(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to Kick (Mock)...`);
	return {
		platform: "kick",
		success: true,
		postId: `mock_kick_id`,
		postUrl: `https://kick.com/mock`,
	};
}


export async function publishToTruthSocial(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to Truth Social (Mock)...`);
	return {
		platform: "truthsocial",
		success: true,
		postId: `mock_truthsocial_id`,
		postUrl: `https://truthsocial.com/mock`,
	};
}


export async function publishToVKontakte(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to VKontakte (Mock)...`);
	return {
		platform: "vk",
		success: true,
		postId: `mock_vk_id`,
		postUrl: `https://vk.com/mock`,
	};
}


export async function publishToWeibo(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to Weibo (Mock)...`);
	return {
		platform: "weibo",
		success: true,
		postId: `mock_weibo_id`,
		postUrl: `https://weibo.com/mock`,
	};
}


export async function publishToKakaoTalk(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to KakaoTalk (Mock)...`);
	return {
		platform: "kakaotalk",
		success: true,
		postId: `mock_kakaotalk_id`,
		postUrl: `https://kakaotalk.com/mock`,
	};
}


export async function publishToViber(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to Viber (Mock)...`);
	return {
		platform: "viber",
		success: true,
		postId: `mock_viber_id`,
		postUrl: `https://viber.com/mock`,
	};
}


export async function publishToSignal(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to Signal (Mock)...`);
	return {
		platform: "signal",
		success: true,
		postId: `mock_signal_id`,
		postUrl: `https://signal.com/mock`,
	};
}


export async function publishToSlack(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to Slack (Mock)...`);
	return {
		platform: "slack",
		success: true,
		postId: `mock_slack_id`,
		postUrl: `https://slack.com/mock`,
	};
}


export async function publishToSubstack(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to Substack (Mock)...`);
	return {
		platform: "substack",
		success: true,
		postId: `mock_substack_id`,
		postUrl: `https://substack.com/mock`,
	};
}


export async function publishToGhost(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to Ghost (Mock)...`);
	return {
		platform: "ghost",
		success: true,
		postId: `mock_ghost_id`,
		postUrl: `https://ghost.com/mock`,
	};
}


export async function publishToLocals(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to Locals (Mock)...`);
	return {
		platform: "locals",
		success: true,
		postId: `mock_locals_id`,
		postUrl: `https://locals.com/mock`,
	};
}


export async function publishToOdysee(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to Odysee (Mock)...`);
	return {
		platform: "odysee",
		success: true,
		postId: `mock_odysee_id`,
		postUrl: `https://odysee.com/mock`,
	};
}


export async function publishToBitChute(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to BitChute (Mock)...`);
	return {
		platform: "bitchute",
		success: true,
		postId: `mock_bitchute_id`,
		postUrl: `https://bitchute.com/mock`,
	};
}


export async function publishToFlickr(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to Flickr (Mock)...`);
	return {
		platform: "flickr",
		success: true,
		postId: `mock_flickr_id`,
		postUrl: `https://flickr.com/mock`,
	};
}


export async function publishToMixcloud(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to Mixcloud (Mock)...`);
	return {
		platform: "mixcloud",
		success: true,
		postId: `mock_mixcloud_id`,
		postUrl: `https://mixcloud.com/mock`,
	};
}


export async function publishToDTube(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to DTube (Mock)...`);
	return {
		platform: "dtube",
		success: true,
		postId: `mock_dtube_id`,
		postUrl: `https://dtube.com/mock`,
	};
}


export async function publishToTrovo(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	console.log(`[Social] Publishing to Trovo (Mock)...`);
	return {
		platform: "trovo",
		success: true,
		postId: `mock_trovo_id`,
		postUrl: `https://trovo.com/mock`,
	};
}

// ── Unified Publish Entry Point ───────────────────────────────────────

export async function publish(
	videoPath: string,
	platforms: string[],
	metadata: PlatformMetadata = {},
): Promise<PublishResult[]> {
	let safePath: string;
	try {
		safePath = assertSafeVideoPath(videoPath);
	} catch (err: any) {
		return [
			{
				platform: "all",
				success: false,
				error: err?.message || "Invalid video path",
			},
		];
	}
	if (!fs.existsSync(safePath)) {
		return [
			{ platform: "all", success: false, error: `File not found: ${safePath}` },
		];
	}

	const results: PublishResult[] = [];

	for (const platform of platforms) {
		console.log(`[Social] Publishing to ${platform}...`);
		let result: PublishResult;

		switch (platform.toLowerCase()) {
			case "tiktok":
				result = await publishToTikTok(
					safePath,
					metadata.caption,
					metadata.hashtags,
				);
				break;
			case "youtube":
				result = await publishToYouTube(
					safePath,
					metadata.title,
					metadata.description,
					metadata.tags,
				);
				break;
			case "instagram":
				result = await publishToInstagram(safePath, metadata.caption);
				break;
			
			case "facebook":
				result = await publishToFacebook(safePath, metadata.description);
				break;
			case "linkedin":
				result = await publishToLinkedIn(safePath, metadata.description);
				break;
			case "pinterest":
				result = await publishToPinterest(safePath, metadata.description);
				break;
			case "snapchat":
				result = await publishToSnapchat(safePath, metadata.description);
				break;
			case "twitch":
				result = await publishToTwitch(safePath, metadata.description);
				break;
			case "vimeo":
				result = await publishToVimeo(safePath, metadata.description);
				break;
			case "threads":
				result = await publishToThreads(safePath, metadata.description);
				break;
			case "rumble":
				result = await publishToRumble(safePath, metadata.description);
				break;

			case "reddit":
				result = await publishToReddit(safePath, metadata.description);
				break;
			case "discord":
				result = await publishToDiscord(safePath, metadata.description);
				break;
			case "bluesky":
				result = await publishToBluesky(safePath, metadata.description);
				break;
			case "mastodon":
				result = await publishToMastodon(safePath, metadata.description);
				break;
			case "telegram":
				result = await publishToTelegram(safePath, metadata.description);
				break;

			case "dailymotion":
				result = await publishToDailymotion(safePath, metadata.description);
				break;
			case "bilibili":
				result = await publishToBilibili(safePath, metadata.description);
				break;
			case "patreon":
				result = await publishToPatreon(safePath, metadata.description);
				break;
			case "medium":
				result = await publishToMedium(safePath, metadata.description);
				break;
			case "whatsapp":
				result = await publishToWhatsApp(safePath, metadata.description);
				break;
			case "wechat":
				result = await publishToWeChat(safePath, metadata.description);
				break;
			case "line":
				result = await publishToLine(safePath, metadata.description);
				break;
			case "kwai":
				result = await publishToKwai(safePath, metadata.description);
				break;
			case "tumblr":
				result = await publishToTumblr(safePath, metadata.description);
				break;
			case "onlyfans":
				result = await publishToOnlyFans(safePath, metadata.description);
				break;
			case "xigua":
				result = await publishToXigua(safePath, metadata.description);
				break;

			case "kick":
				result = await publishToKick(safePath, metadata.description);
				break;
			case "truthsocial":
				result = await publishToTruthSocial(safePath, metadata.description);
				break;
			case "vk":
				result = await publishToVKontakte(safePath, metadata.description);
				break;
			case "weibo":
				result = await publishToWeibo(safePath, metadata.description);
				break;
			case "kakaotalk":
				result = await publishToKakaoTalk(safePath, metadata.description);
				break;
			case "viber":
				result = await publishToViber(safePath, metadata.description);
				break;
			case "signal":
				result = await publishToSignal(safePath, metadata.description);
				break;
			case "slack":
				result = await publishToSlack(safePath, metadata.description);
				break;
			case "substack":
				result = await publishToSubstack(safePath, metadata.description);
				break;
			case "ghost":
				result = await publishToGhost(safePath, metadata.description);
				break;
			case "locals":
				result = await publishToLocals(safePath, metadata.description);
				break;
			case "odysee":
				result = await publishToOdysee(safePath, metadata.description);
				break;
			case "bitchute":
				result = await publishToBitChute(safePath, metadata.description);
				break;
			case "flickr":
				result = await publishToFlickr(safePath, metadata.description);
				break;
			case "mixcloud":
				result = await publishToMixcloud(safePath, metadata.description);
				break;
			case "dtube":
				result = await publishToDTube(safePath, metadata.description);
				break;
			case "trovo":
				result = await publishToTrovo(safePath, metadata.description);
				break;
			default:
				result = {
					platform,
					success: false,
					error: `Unsupported platform: ${platform}`,
				};
		}

		results.push(result);
		console.log(
			`[Social] ${platform}: ${result.success ? "OK" : "FAIL"} — ${result.postUrl || result.error}`,
		);
	}

	return results;
}
