/**
 * Countly provider — self-hosted mobile & web analytics.
 * Docker: countly/server. Push notifications, crash reporting, events.
 *
 * @module components/providers/countly-provider
 */

"use client";

import Script from "next/script";

/** React component rendering CountlyProvider. */
export function CountlyProvider() {
	const appKey = process.env.NEXT_PUBLIC_COUNTLY_APP_KEY;
	const countlyUrl = process.env.NEXT_PUBLIC_COUNTLY_URL;

	if (!appKey || !countlyUrl) return null;

	return (
		<Script
			id="countly-analytics"
			strategy="afterInteractive"
			dangerouslySetInnerHTML={{
				__html: `var Countly=Countly||{};Countly.q=Countly.q||[];Countly.app_key="${appKey}";Countly.url="${countlyUrl}";(function(){var c=Countly,d=document,e=d.createElement("script");e.type="text/javascript";e.async=!0;e.src=c.url+"/sdk/web/countly.min.js";var f=d.getElementsByTagName("script")[0];f.parentNode.insertBefore(e,f);e.onload=function(){Countly.init()};e.onerror=function(){console.warn("Countly failed to load")}})();`,
			}}
		/>
	);
}
