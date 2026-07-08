// Social Media Card Generators for all platforms

/**
 * SocialCards — renders Open Graph, Twitter/X, Pinterest, Apple, Android,
 * and Microsoft meta tags for rich social-media link previews across all
 * major platforms.
 *
 * @module seo/SocialCards
 */

import React from "react";

interface SocialCardProps {
	/** Page title for social sharing. */
	title: string;
	/** Page description for social sharing. */
	description: string;
	/** Canonical URL. */
	url?: string;
	/** Open Graph / card image URL. */
	image?: string;
	/** Content type. */
	type?: "website" | "article";
	/** Article publish date (ISO 8601). */
	publishedTime?: string;
	/** Article author name. */
	author?: string;
	/** Article tags. */
	tags?: string[];
}

export function UniversalSocialMeta({
	title,
	description,
	url = "https://lazynext.com",
	image = "https://lazynext.com/og-image.png",
	type = "website",
	publishedTime,
	author,
	tags,
}: SocialCardProps) {
	return (
		<>
			{/* ── Open Graph (Facebook, LinkedIn, Discord, WhatsApp, Telegram, iMessage, Slack) ── */}
			<meta property="og:type" content={type} />
			<meta property="og:site_name" content="Lazynext" />
			<meta property="og:title" content={title} />
			<meta property="og:description" content={description} />
			<meta property="og:url" content={url} />
			<meta property="og:image" content={image} />
			<meta property="og:image:width" content="1200" />
			<meta property="og:image:height" content="630" />
			<meta property="og:image:alt" content={title} />
			<meta property="og:image:type" content="image/png" />
			<meta property="og:locale" content="en_US" />
			<meta property="og:locale:alternate" content="en_GB" />
			{type === "article" && publishedTime && (
				<meta property="article:published_time" content={publishedTime} />
			)}
			{type === "article" && author && (
				<meta property="article:author" content={author} />
			)}
			{tags?.map((t) => (
				<meta key={t} property="article:tag" content={t} />
			))}

			{/* ── Twitter / X ── */}
			<meta name="twitter:card" content="summary_large_image" />
			<meta name="twitter:site" content="@lazynext" />
			<meta name="twitter:creator" content="@lazynext" />
			<meta name="twitter:title" content={title} />
			<meta name="twitter:description" content={description} />
			<meta name="twitter:image" content={image} />
			<meta name="twitter:image:alt" content={title} />
			<meta name="twitter:domain" content="lazynext.com" />

			{/* ── Pinterest Rich Pins ── */}
			<meta name="pinterest-rich-pin" content="true" />

			{/* ── Google+ / Google (deprecated but some crawlers still use) ── */}
			<meta itemProp="name" content={title} />
			<meta itemProp="description" content={description} />
			<meta itemProp="image" content={image} />

			{/* ── Microsoft / LinkedIn ── */}
			<meta name="msapplication-TileImage" content="/apple-touch-icon.png" />
			<meta name="msapplication-TileColor" content="#269bf9" />

			{/* ── Apple / iOS ── */}
			<meta name="apple-mobile-web-app-title" content="Lazynext" />
			<meta name="apple-mobile-web-app-capable" content="yes" />
			<meta
				name="apple-mobile-web-app-status-bar-style"
				content="black-translucent"
			/>
			<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
			<link rel="apple-touch-startup-image" href="/og-image.png" />

			{/* ── Android / Chrome ── */}
			<meta name="mobile-web-app-capable" content="yes" />
			<meta name="theme-color" content="#269bf9" />
			<meta name="application-name" content="Lazynext" />
			<link rel="manifest" href="/manifest.json" />
		</>
	);
}
