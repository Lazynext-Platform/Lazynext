// Advanced SEO head elements (Dublin Core, verification, preconnect, etc.)

/**
 * HeadMeta — renders search-engine verification tags, Dublin Core metadata,
 * critical-origin preconnect hints, geotags, and author/generator meta.
 *
 * Also exports {@link PreloadHeroImage} for above-the-fold image preloading.
 *
 * @module seo/HeadMeta
 */

import React from "react";

export function SEOHeadTags() {
	return (
		<>
			{/* Google Search Console Verification */}
			<meta
				name="google-site-verification"
				content="D2y26t7Jjr7aHDqVUYY4q0WrR8dTn6bVez-8Bqp_P0U"
			/>

			{/* Bing / Microsoft Verification */}
			<meta name="msvalidate.01" content="1234567890ABCDEF" />

			{/* Pinterest Verification */}
			<meta name="p:domain_verify" content="lazynext" />

			{/* Yandex Verification */}
			<meta name="yandex-verification" content="lazynext" />

			{/* Dublin Core Metadata */}
			<link rel="schema.DC" href="http://purl.org/dc/elements/1.1/" />
			<meta name="DC.title" content="Lazynext — AI Video Editing Platform" />
			<meta
				name="DC.description"
				content="AI-powered video editing with natural language. Multi-model AI agents, Rust compositor, 6 platforms."
			/>
			<meta name="DC.creator" content="Lazynext" />
			<meta name="DC.publisher" content="Lazynext Corporation" />
			<meta name="DC.date" content="2026" />
			<meta name="DC.type" content="SoftwareApplication" />
			<meta name="DC.format" content="text/html" />
			<meta name="DC.language" content="en" />
			<meta name="DC.coverage" content="Global" />
			<meta
				name="DC.rights"
				content="Copyright Lazynext-Corporation. All Rights Reserved."
			/>

			{/* Performance: Preconnect to critical origins */}
			<link
				rel="preconnect"
				href="https://fonts.googleapis.com"
				crossOrigin="anonymous"
			/>
			<link
				rel="preconnect"
				href="https://fonts.gstatic.com"
				crossOrigin="anonymous"
			/>
			<link rel="dns-prefetch" href="https://api.lazynext.com" />
			<link rel="dns-prefetch" href="https://cdn.lazynext.com" />

			{/* Cache control hint */}

			{/* Geo tags */}
			<meta name="geo.region" content="US" />
			<meta name="geo.placename" content="Global" />
			<meta name="ICBM" content="40.7128, -74.0060" />

			{/* Rating */}
			<meta name="rating" content="General" />

			{/* Author */}
			<meta name="author" content="Lazynext" />

			{/* Generator */}
			<meta name="generator" content="Next.js 16 + Turbopack" />
		</>
	);
}

export function PreloadHeroImage() {
	return (
		<>
			<link rel="preload" href="/og-image.png" as="image" type="image/png" />
			<link rel="preload" href="/noise.png" as="image" type="image/png" />
		</>
	);
}
