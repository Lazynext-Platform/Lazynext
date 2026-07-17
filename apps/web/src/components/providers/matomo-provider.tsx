/**
 * Matomo provider — full-featured self-hosted analytics.
 * Docker: matomo:5-fpm + mariadb. Supports funnels, goals, ecommerce,
 * tag manager, heatmaps, A/B testing.
 *
 * @module components/providers/matomo-provider
 */

"use client";

import Script from "next/script";

/** React component rendering MatomoProvider. */
export function MatomoProvider() {
	const siteId = process.env.NEXT_PUBLIC_MATOMO_SITE_ID;
	const matomoUrl = process.env.NEXT_PUBLIC_MATOMO_URL;

	if (!siteId || !matomoUrl) return null;

	return (
		<Script
			id="matomo-analytics"
			strategy="afterInteractive"
			dangerouslySetInnerHTML={{
				__html: `var _paq=window._paq=window._paq||[];_paq.push(["trackPageView"],["enableLinkTracking"]);(function(){var u="${matomoUrl}";_paq.push(["setTrackerUrl",u+"matomo.php"],["setSiteId","${siteId}"]);var d=document,g=d.createElement("script"),s=d.getElementsByTagName("script")[0];g.async=true;g.src=u+"matomo.js";s.parentNode.insertBefore(g,s);})();`,
			}}
		/>
	);
}
