/**
 * OpenPanel provider — modern self-hosted product analytics.
 * Docker: openpanel/openpanel. Event tracking, dashboards, realtime.
 *
 * @module components/providers/openpanel-provider
 */

"use client";

import Script from "next/script";

export function OpenPanelProvider() {
	const clientId = process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID;
	const apiUrl = process.env.NEXT_PUBLIC_OPENPANEL_URL;

	if (!clientId || !apiUrl) return null;

	return (
		<Script
			id="openpanel-analytics"
			strategy="afterInteractive"
			src={`${apiUrl}/script.js`}
			data-client-id={clientId}
			data-track-attributes={false}
			data-track-outgoing-links={false}
			async
			defer
		/>
	);
}
