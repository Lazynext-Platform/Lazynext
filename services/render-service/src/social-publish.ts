/**
 * Social Media Publishing Module
 *
 * Publishes rendered videos directly to TikTok, YouTube, and Instagram.
 * Each platform uses its native API with OAuth 2.0 authentication,
 * chunked upload, retry logic, and graceful degradation when API keys
 * are absent.
 *
 * Usage:
 *   import { publish } from './social-publish';
 *   const results = await publish('./output.mp4', ['tiktok', 'youtube'], {
 *     caption: 'Check out this edit!',
 *     hashtags: ['lazynext', 'edit'],
 *     title: 'My Latest Video',
 *     description: 'Edited with Lazynext',
 *     tags: ['lazynext', 'video'],
 *   });
 */

import fs from "fs";
import path from "path";

// ── Types ─────────────────────────────────────────────────────────────

/** Metadata attached to a social media post (caption, hashtags, thumbnail, etc.) */
interface PlatformMetadata {
  caption?: string;
  hashtags?: string[];
  title?: string;
  description?: string;
  tags?: string[];
  thumbnail?: string;
  privacyStatus?: "public" | "private" | "unlisted";
}

/** Result of a single platform publish attempt. */
interface PublishResult {
  platform: string;
  success: boolean;
  postUrl?: string;
  postId?: string;
  error?: string;
}

/** OAuth 2.0 token bundle stored per-platform after user authorization. */
interface OAuthTokens {
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

/**
 * Retry an async operation with exponential backoff.
 * Only retries on network/5xx errors; 4xx errors fail immediately.
 */
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

      // Do not retry on 4xx client errors (bad request, unauthorized, etc.)
      if (err?.status && err.status >= 400 && err.status < 500) {
        throw err;
      }

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(
          `[Social] ${label} attempt ${attempt} failed, retrying in ${delay}ms...`,
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Wrapper around fetch that throws on non-2xx with status info
 * so the retry logic can distinguish 4xx vs 5xx.
 */
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

/**
 * Retrieve a valid OAuth access token, refreshing if expired.
 * Falls back to the stored token when no refresh token is available.
 */
async function getValidToken(
  platform: string,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const stored =
    process.env[`${platform.toUpperCase()}_OAUTH_TOKEN`];
  const refresh =
    process.env[`${platform.toUpperCase()}_REFRESH_TOKEN`];

  if (!stored) {
    throw new Error(`No OAuth token configured for ${platform}`);
  }

  // Check if token is still valid (60s buffer)
  const expiresAt = parseInt(
    process.env[`${platform.toUpperCase()}_TOKEN_EXPIRY`] || "0",
    10,
  );
  if (expiresAt > Date.now() + 60000) {
    return stored;
  }

  // Refresh token if available
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

// ── Platform Publishers ───────────────────────────────────────────────

/**
 * Publish a video to TikTok.
 *
 * TikTok's Direct Post API flow:
 * 1. Initialize upload — get an upload URL and publish_id
 * 2. Upload video bytes (single chunk for files under 128MB)
 *
 * Graceful degradation: returns { success: false, error: "..." }
 * when TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET are not set.
 */
async function publishToTikTok(
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
      error: "TikTok API keys not configured (TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET)",
    };
  }

  try {
    const token = await getValidToken("tiktok", clientId, clientSecret);
    const fileSize = fs.statSync(videoPath).size;
    const videoBuffer = fs.readFileSync(videoPath);

    // Build caption text from caption + hashtags
    const captionText = [caption, hashtags?.map((h) => `#${h}`).join(" ")]
      .filter(Boolean)
      .join("\n\n");

    // Step 1: Initialize upload
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

    // Step 2: Upload video (with retry)
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

/**
 * Publish a video to YouTube.
 *
 * YouTube Resumable Upload flow:
 * 1. POST metadata (snippet + status) to get an upload URL
 * 2. PUT video bytes in 5MB chunks with Content-Range headers
 * 3. Resumes on failure via the upload URL
 *
 * Graceful degradation: returns { success: false, error: "..." }
 * when GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set.
 */
async function publishToYouTube(
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
      error: "YouTube API keys not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)",
    };
  }

  try {
    const token = await getValidToken("youtube", clientId, clientSecret);
    const fileSize = fs.statSync(videoPath).size;

    const defaultTitle = path.basename(videoPath, path.extname(videoPath));

    // Step 1: Initialize resumable upload
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

    // Step 2: Chunked upload with retry per chunk
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB
    const videoBuffer = fs.readFileSync(videoPath);

    for (let start = 0; start < fileSize; start += CHUNK_SIZE) {
      const end = Math.min(start + CHUNK_SIZE, fileSize);
      const chunk = videoBuffer.subarray(start, end);

      const uploaded = await withRetry(async () => {
        const resp = await fetchWithStatus(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Length": String(chunk.length),
            "Content-Range": `bytes ${start}-${end - 1}/${fileSize}`,
          },
          body: Buffer.from(chunk),
        });

        // 200 or 201 means last chunk — upload complete
        if (resp.status === 200 || resp.status === 201) {
          return { done: true, data: (await resp.json()) as { id: string } };
        }
        // 308 means more chunks to come
        return { done: false, data: null as any };
      }, `YouTube chunk ${start}-${end - 1}`);

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

/**
 * Publish a video to Instagram Reels.
 *
 * Instagram Content Publishing API flow:
 * 1. Create a media container (REELS type) with a video URL
 * 2. Poll for processing status (up to 30 attempts, 5s apart)
 *
 * Note: Instagram requires the video to be hosted at a public URL.
 * This implementation passes a local file:// path for local testing;
 * in production the video must first be uploaded to cloud storage.
 *
 * Graceful degradation: returns { success: false, error: "..." }
 * when INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET are not set.
 */
async function publishToInstagram(
  videoPath: string,
  caption?: string,
): Promise<PublishResult> {
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;

  if (!appId || !appSecret) {
    return {
      platform: "instagram",
      success: false,
      error: "Instagram API keys not configured (INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET)",
    };
  }

  try {
    const token = await getValidToken("instagram", appId, appSecret);
    const instagramUserId = process.env.INSTAGRAM_USER_ID;

    if (!instagramUserId) {
      return {
        platform: "instagram",
        success: false,
        error: "Instagram user ID not configured (INSTAGRAM_USER_ID)",
      };
    }

    // Step 1: Create media container (with retry)
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
            video_url: `file://${videoPath}`,
            caption: caption || "Posted via Lazynext",
            share_to_feed: "true",
          }).toString(),
        },
      );
      return (await resp.json()) as { id: string };
    }, "Instagram media create");

    // Step 2: Poll for processing status (with retry on transient failures)
    let status = "PROCESSING";
    let attempts = 0;
    const statusPollMaxAttempts = 30;
    const statusPollIntervalMs = 5000;

    while (status !== "FINISHED" && attempts < statusPollMaxAttempts) {
      await new Promise((r) => setTimeout(r, statusPollIntervalMs));

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
            console.log(
              `[Social] Published to Instagram: ${createData.id}`,
            );
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
        // Transient network errors during polling are not terminal
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

// ── Unified Publish Export ────────────────────────────────────────────

/**
 * Publish a rendered video to one or more social media platforms.
 *
 * Each platform call runs independently so a failure on one does not
 * block publishing to the others. Every platform gracefully degrades
 * when its API keys are absent.
 *
 * @param videoPath   Absolute or relative path to the video file.
 * @param platforms   Array of platform names: "tiktok", "youtube", "instagram".
 * @param metadata    Shared metadata mapped to each platform's native format.
 * @returns           Array of PublishResult, one per requested platform.
 *
 * Example:
 *   const results = await publish("./render.mp4", ["tiktok", "youtube"], {
 *     caption: "Check this out!",
 *     hashtags: ["lazynext", "edit"],
 *     title: "My Edit",
 *     description: "Edited with Lazynext",
 *     tags: ["lazynext", "video"],
 *   });
 */
export async function publish(
  videoPath: string,
  platforms: string[],
  metadata: PlatformMetadata = {},
): Promise<PublishResult[]> {
  if (!fs.existsSync(videoPath)) {
    return [
      {
        platform: "all",
        success: false,
        error: `File not found: ${videoPath}`,
      },
    ];
  }

  const results: PublishResult[] = [];

  for (const platform of platforms) {
    console.log(`[Social] Publishing to ${platform}...`);
    let result: PublishResult;

    switch (platform.toLowerCase()) {
      case "tiktok":
        result = await publishToTikTok(
          videoPath,
          metadata.caption,
          metadata.hashtags,
        );
        break;
      case "youtube":
        result = await publishToYouTube(
          videoPath,
          metadata.title,
          metadata.description,
          metadata.tags,
        );
        break;
      case "instagram":
        result = await publishToInstagram(videoPath, metadata.caption);
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
