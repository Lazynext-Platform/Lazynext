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
/**
 * Validate a video path, guaranteeing the result stays inside one of the
 * {@link allowedBaseDirs}. Rejects traversal and null bytes. Relative paths
 * resolve against the first allowed base. Throws on violation so tainted
 * input can never reach the filesystem.
 */
export declare function assertSafeVideoPath(inputPath: string): string;
export interface PlatformMetadata {
    caption?: string;
    hashtags?: string[];
    title?: string;
    description?: string;
    tags?: string[];
    thumbnail?: string;
    privacyStatus?: "public" | "private" | "unlisted";
}
export interface PublishResult {
    platform: string;
    success: boolean;
    postUrl?: string;
    postId?: string;
    error?: string;
}
export interface OAuthTokens {
    accessToken: string;
    refreshToken?: string;
    expiresAt: number;
}
export declare function publishToTikTok(videoPath: string, caption?: string, hashtags?: string[]): Promise<PublishResult>;
export declare function publishToYouTube(videoPath: string, title?: string, description?: string, tags?: string[]): Promise<PublishResult>;
export declare function publishToInstagram(videoPath: string, caption?: string): Promise<PublishResult>;
export declare function publish(videoPath: string, platforms: string[], metadata?: PlatformMetadata): Promise<PublishResult[]>;
