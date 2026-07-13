/**
 * Umami provider — privacy-first web analytics, self-hosted.
 * Lightweight (100MB Docker, 200MB RAM). Tracks pageviews and custom events.
 *
 * @module components/providers/umami-provider
 */

"use client";

import Script from "next/script";

export function UmamiProvider() {
	const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
	const scriptUrl = process.env.NEXT_PUBLIC_UMAMI_URL;

	if (!websiteId || !scriptUrl) return null;

	return (
		<Script
			id="umami-analytics"
			strategy="afterInteractive"
			src={`${scriptUrl}/script.js`}
			data-website-id={websiteId}
			data-domains={process.env.NEXT_PUBLIC_SITE_URL?.replace("https://", "").replace("http://", "")}
			async
			defer
		/>
	);
}
