/**
 * Social Media Publishing Module
 *
 * Delegates to @lazynext/social-publish-core for all publishing logic.
 * Re-exports types for backward compatibility.
 */

export {
	publish,
	publishToTikTok,
	publishToYouTube,
	publishToInstagram,
	type PlatformMetadata,
	type PublishResult,
	type OAuthTokens,
} from "@lazynext/social-publish-core";
