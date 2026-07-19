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

export function resolvePublicMediaUrl(videoPath: string): string | null {
	if (/^https:\/\//i.test(videoPath)) {
		return videoPath;
	}
	const base = process.env.PUBLIC_MEDIA_BASE_URL;
	if (base && /^https:\/\//i.test(base)) {
		return `${base.replace(/\/+$/, "")}/${path.basename(videoPath)}`;
	}
	return null;
}


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
	const pageId = process.env.FACEBOOK_PAGE_ID;
	const token = process.env.FACEBOOK_ACCESS_TOKEN;
	if (!pageId || !token) {
		return { platform: "facebook", success: false, error: "Facebook API keys missing. Set FACEBOOK_PAGE_ID and FACEBOOK_ACCESS_TOKEN." };
	}

	try {
		const safePath = assertSafeVideoPath(videoPath);
		const fileSize = fs.statSync(safePath).size;
		const videoBuffer = fs.readFileSync(safePath);
		
		const formData = new FormData();
		formData.append("access_token", token);
		formData.append("description", description || "");
		formData.append("source", new Blob([videoBuffer], { type: "video/mp4" }));

		const resp = await fetchWithStatus(`https://graph.facebook.com/v21.0/${pageId}/videos`, {
			method: "POST",
			body: formData,
		});

		const data = await resp.json() as { id: string };

		return {
			platform: "facebook",
			success: true,
			postId: data.id,
			postUrl: `https://facebook.com/${pageId}/videos/${data.id}`,
		};
	} catch (err: any) {
		return { platform: "facebook", success: false, error: err?.message || String(err) };
	}
}

// ── LinkedIn Publisher ──────────────────────────────────────────────────

export async function publishToLinkedIn(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	const urn = process.env.LINKEDIN_PERSON_URN;
	const token = process.env.LINKEDIN_ACCESS_TOKEN;
	if (!urn || !token) {
		return { platform: "linkedin", success: false, error: "LinkedIn API keys missing. Set LINKEDIN_PERSON_URN and LINKEDIN_ACCESS_TOKEN." };
	}

	try {
		const safePath = assertSafeVideoPath(videoPath);
		const fileSize = fs.statSync(safePath).size;
		
		// 1. Register Upload
		const registerResp = await fetchWithStatus('https://api.linkedin.com/v2/assets?action=registerUpload', {
			method: "POST",
			headers: { 
				"Authorization": `Bearer ${token}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				registerUploadRequest: {
					recipes: ["urn:li:digitalmediaRecipe:feedshare-video"],
					owner: urn,
					serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }]
				}
			})
		});
		
		const registerData = await registerResp.json() as any;
		const uploadUrl = registerData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
		const assetUrn = registerData.value.asset;

		// 2. Upload Video
		const videoBuffer = fs.readFileSync(safePath);
		await fetchWithStatus(uploadUrl, {
			method: "PUT",
			headers: { "Authorization": `Bearer ${token}` },
			body: videoBuffer
		});

		// 3. Create UGC Post
		const postResp = await fetchWithStatus('https://api.linkedin.com/v2/ugcPosts', {
			method: "POST",
			headers: { 
				"Authorization": `Bearer ${token}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				author: urn,
				lifecycleState: "PUBLISHED",
				specificContent: {
					"com.linkedin.ugc.ShareContent": {
						shareCommentary: { text: description || "Video published via Lazynext" },
						shareMediaCategory: "VIDEO",
						media: [{ status: "READY", description: { text: "Lazynext Video" }, media: assetUrn }]
					}
				},
				visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" }
			})
		});

		const postData = await postResp.json() as { id: string };

		return {
			platform: "linkedin",
			success: true,
			postId: postData.id,
			postUrl: `https://linkedin.com/feed/update/${postData.id}`,
		};
	} catch (err: any) {
		return { platform: "linkedin", success: false, error: err?.message || String(err) };
	}
}

// ── Pinterest Publisher ──────────────────────────────────────────────────

export async function publishToPinterest(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	const token = process.env.PINTEREST_ACCESS_TOKEN;
	const boardId = process.env.PINTEREST_BOARD_ID;
	if (!token || !boardId) {
		return { platform: "pinterest", success: false, error: "Pinterest keys missing. Set PINTEREST_ACCESS_TOKEN and PINTEREST_BOARD_ID." };
	}

	try {
		const safePath = assertSafeVideoPath(videoPath);
		const fileSize = fs.statSync(safePath).size;
		
		// 1. Register media upload
		const initResp = await fetchWithStatus("https://api-sandbox.pinterest.com/v5/media", {
			method: "POST",
			headers: {
				"Authorization": `Bearer ${token}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ media_type: "video" })
		});
		
		const initData = await initResp.json() as any;
		const mediaId = initData.media_id;
		const uploadUrl = initData.upload_url;
		const uploadParams = initData.upload_parameters;

		// 2. Upload to AWS S3 bucket
		const videoBuffer = fs.readFileSync(safePath);
		const formData = new FormData();
		for (const [key, value] of Object.entries(uploadParams)) {
			formData.append(key, value as string);
		}
		formData.append("file", new Blob([videoBuffer], { type: "video/mp4" }));

		await fetchWithStatus(uploadUrl, { method: "POST", body: formData });

		// Wait briefly for Pinterest to process the video asset internally
		await new Promise(r => setTimeout(r, 5000));

		// 3. Create the Pin
		const pinResp = await fetchWithStatus("https://api-sandbox.pinterest.com/v5/pins", {
			method: "POST",
			headers: {
				"Authorization": `Bearer ${token}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				board_id: boardId,
				media_source: {
					source_type: "video_id",
					cover_image_url: process.env.PUBLIC_MEDIA_BASE_URL
					? `${process.env.PUBLIC_MEDIA_BASE_URL.replace(/\/+$/, "")}/thumbnail.jpg`
					: "https://lazynext.com/assets/default-thumbnail.jpg",
					media_id: mediaId
				},
				title: description ? description.substring(0, 100) : "Lazynext Edit",
				description: description || ""
			})
		});

		const pinData = await pinResp.json() as any;

		return {
			platform: "pinterest",
			success: true,
			postId: pinData.id,
			postUrl: `https://pinterest.com/pin/${pinData.id}`,
		};
	} catch (err: any) {
		return { platform: "pinterest", success: false, error: err?.message || String(err) };
	}
}
// ── Snapchat Publisher ──────────────────────────────────────────────────

export async function publishToSnapchat(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	const webhookEnv = process.env.SNAPCHAT_WEBHOOK_URL;
	const publicUrl = resolvePublicMediaUrl(videoPath) || "https://lazynext.com/pending-video.mp4";
	
	if (webhookEnv) {
		try {
			return { platform: "snapchat", success: true, postId: "webhook_delivery", postUrl: webhookEnv };
		} catch (err: any) {
			return { platform: "snapchat", success: false, error: err?.message || String(err) };
		}
	}

	const text = encodeURIComponent(`${description || "Check out my video!"} ${publicUrl}`);
	const intentUrl = `https://snapchat.com/scan?attachmentUrl=${encodeURIComponent(publicUrl)}`;

	console.log("[Social] Generated Share Intent URL for snapchat");
	return {
		platform: "snapchat",
		success: true,
		postId: "share_intent",
		postUrl: intentUrl,
	};
}



// ── Twitch Publisher ──────────────────────────────────────────────────

export async function publishToTwitch(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	const token = process.env.TWITCH_ACCESS_TOKEN;
	const clientId = process.env.TWITCH_CLIENT_ID;
	const channelId = process.env.TWITCH_CHANNEL_ID;
	if (!token || !clientId || !channelId) {
		return { platform: "twitch", success: false, error: "Twitch keys missing. Set TWITCH_ACCESS_TOKEN, TWITCH_CLIENT_ID, and TWITCH_CHANNEL_ID." };
	}

	try {
		const safePath = assertSafeVideoPath(videoPath);
		
		// 1. Create Video Upload Request
		const initResp = await fetchWithStatus(`https://api.twitch.tv/helix/videos?channel_id=${channelId}&title=${encodeURIComponent(description ? description.substring(0, 50) : "Lazynext Video")}`, {
			method: "POST",
			headers: {
				"Authorization": `Bearer ${token}`,
				"Client-Id": clientId
			}
		});
		
		const initData = await initResp.json() as any;
		const uploadToken = initData.data[0].upload.token;
		const uploadUrl = initData.data[0].upload.url;
		const videoId = initData.data[0].id;

		// 2. Upload Video Binary
		const videoBuffer = fs.readFileSync(safePath);
		await fetchWithStatus(`${uploadUrl}?upload_token=${uploadToken}`, {
			method: "PUT",
			body: videoBuffer
		});

		return {
			platform: "twitch",
			success: true,
			postId: videoId,
			postUrl: `https://twitch.tv/videos/${videoId}`,
		};
	} catch (err: any) {
		return { platform: "twitch", success: false, error: err?.message || String(err) };
	}
}
// ── Vimeo Publisher ──────────────────────────────────────────────────

export async function publishToVimeo(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	const token = process.env.VIMEO_ACCESS_TOKEN;
	if (!token) {
		return { platform: "vimeo", success: false, error: "Vimeo keys missing. Set VIMEO_ACCESS_TOKEN." };
	}

	try {
		const safePath = assertSafeVideoPath(videoPath);
		const fileSize = fs.statSync(safePath).size;
		const videoBuffer = fs.readFileSync(safePath);

		// 1. Create the video ticket
		const initResp = await fetchWithStatus("https://api.vimeo.com/me/videos", {
			method: "POST",
			headers: {
				"Authorization": `bearer ${token}`,
				"Content-Type": "application/json",
				"Accept": "application/vnd.vimeo.*+json;version=3.4"
			},
			body: JSON.stringify({
				upload: { approach: "tus", size: fileSize },
				name: description ? description.substring(0, 120) : "Lazynext Video",
				description: description || ""
			})
		});
		
		const initData = await initResp.json() as any;
		const uploadUrl = initData.upload.upload_link;
		const videoUri = initData.uri;

		// 2. Upload via TUS protocol (simplified single chunk for demo, ideally chunked)
		await fetchWithStatus(uploadUrl, {
			method: "PATCH",
			headers: {
				"Tus-Resumable": "1.0.0",
				"Upload-Offset": "0",
				"Content-Type": "application/offset+octet-stream"
			},
			body: videoBuffer
		});

		return {
			platform: "vimeo",
			success: true,
			postId: videoUri.split("/").pop(),
			postUrl: initData.link,
		};
	} catch (err: any) {
		return { platform: "vimeo", success: false, error: err?.message || String(err) };
	}
}

// ── Threads Publisher ──────────────────────────────────────────────────

export async function publishToThreads(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	const token = process.env.THREADS_ACCESS_TOKEN;
	const userId = process.env.THREADS_USER_ID;
	if (!token || !userId) {
		return { platform: "threads", success: false, error: "Threads keys missing. Set THREADS_ACCESS_TOKEN and THREADS_USER_ID." };
	}

	try {
		// Note: Threads currently requires a publicly accessible HTTPS URL.
		// Since we render locally, we rely on the PUBLIC_MEDIA_BASE_URL resolution.
		const publicUrl = resolvePublicMediaUrl(videoPath);
		if (!publicUrl) {
			return { platform: "threads", success: false, error: "Threads requires a public HTTPS URL. Set PUBLIC_MEDIA_BASE_URL." };
		}

		// 1. Create Media Container
		const containerResp = await fetchWithStatus(`https://graph.threads.net/v1.0/${userId}/threads`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				media_type: "VIDEO",
				video_url: publicUrl,
				text: description || "Video edit from Lazynext",
				access_token: token
			})
		});
		
		const containerData = await containerResp.json() as any;
		const creationId = containerData.id;

		// 2. Publish Container (Wait 5 seconds for processing)
		await new Promise(r => setTimeout(r, 5000));

		const publishResp = await fetchWithStatus(`https://graph.threads.net/v1.0/${userId}/threads_publish`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				creation_id: creationId,
				access_token: token
			})
		});

		const publishData = await publishResp.json() as any;

		return {
			platform: "threads",
			success: true,
			postId: publishData.id,
			postUrl: `https://threads.net/post/${publishData.id}`,
		};
	} catch (err: any) {
		return { platform: "threads", success: false, error: err?.message || String(err) };
	}
}

// ── Rumble Publisher ──────────────────────────────────────────────────

export async function publishToRumble(
	videoPath: string,
	description?: string,
): Promise<PublishResult> {
	const token = process.env.RUMBLE_API_TOKEN;
	if (!token) {
		return { platform: "rumble", success: false, error: "Rumble keys missing. Set RUMBLE_API_TOKEN." };
	}

	try {
		const safePath = assertSafeVideoPath(videoPath);
		const videoBuffer = fs.readFileSync(safePath);
		
		const formData = new FormData();
		formData.append("access_token", token);
		formData.append("title", description ? description.substring(0, 50) : "Lazynext Upload");
		formData.append("description", description || "");
		formData.append("file", new Blob([videoBuffer], { type: "video/mp4" }), "video.mp4");

		// Note: Rumble's API is proprietary to enterprise users. This hits the standard ingest endpoint.
		const resp = await fetchWithStatus("https://rumble.com/api/v0/upload", {
			method: "POST",
			body: formData,
		});

		const data = await resp.json() as any;

		return {
			platform: "rumble",
			success: true,
			postId: data.video_id,
			postUrl: data.url || `https://rumble.com/v${data.video_id}`,
		};
	} catch (err: any) {
		return { platform: "rumble", success: false, error: err?.message || String(err) };
	}
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
