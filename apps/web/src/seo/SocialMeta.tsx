// Social Media Optimization — sharing previews for all platforms

/**
 * SocialMeta — lightweight Open Graph and Twitter/X card meta tags for
 * social sharing previews (Facebook, LinkedIn, Discord, Twitter, etc.).
 *
 * @module seo/SocialMeta
 */

import React from "react";

interface SocialMetaProps {
	/** Page title for social sharing. */
	title: string;
	/** Page description for social sharing. */
	description: string;
	/** Canonical URL. */
	url?: string;
	/** Open Graph image URL. */
	image?: string;
	/** Content type. */
	type?: "website" | "article";
	/** Article publish date (ISO 8601). */
	publishedTime?: string;
	/** Article author name. */
	author?: string;
}

export function SocialMetaTags({
	title,
	description,
	url = "https://lazynext.com",
	image = "https://lazynext.com/og-image.png",
	type = "website",
	publishedTime,
	author,
}: SocialMetaProps) {
	return (
		<>
			{/* Open Graph (Facebook, LinkedIn, Discord, Slack, WhatsApp, Telegram) */}
			<meta property="og:type" content={type} />
			<meta property="og:title" content={title} />
			<meta property="og:description" content={description} />
			<meta property="og:url" content={url} />
			<meta property="og:image" content={image} />
			<meta property="og:image:width" content="1200" />
			<meta property="og:image:height" content="630" />
			<meta property="og:image:alt" content={title} />
			<meta property="og:site_name" content="Lazynext" />
			<meta property="og:locale" content="en_US" />
			{type === "article" && publishedTime && (
				<meta property="article:published_time" content={publishedTime} />
			)}
			{type === "article" && author && (
				<meta property="article:author" content={author} />
			)}

			{/* Twitter / X Card */}
			<meta name="twitter:card" content="summary_large_image" />
			<meta name="twitter:site" content="@lazynext" />
			<meta name="twitter:creator" content="@lazynext" />
			<meta name="twitter:title" content={title} />
			<meta name="twitter:description" content={description} />
			<meta name="twitter:image" content={image} />
			<meta name="twitter:image:alt" content={title} />

			{/* Pinterest Rich Pin */}
			<meta name="pinterest-rich-pin" content="true" />

			{/* Discord-specific (uses OG) */}

			{/* Apple specific */}
			<meta name="apple-mobile-web-app-title" content="Lazynext" />
			<meta name="apple-mobile-web-app-capable" content="yes" />
			<meta
				name="apple-mobile-web-app-status-bar-style"
				content="black-translucent"
			/>
		</>
	);
}
