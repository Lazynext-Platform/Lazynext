/**
 * Web vitals reporting — sends Core Web Vitals metrics to analytics
 * via the Next.js web-vitals API.
 *
 * @module components/analytics/WebVitals
 */

"use client";

import { useReportWebVitals } from "next/web-vitals";

/** React component rendering WebVitals. */
export function WebVitals() {
	useReportWebVitals((metric) => {
		if (process.env.NODE_ENV !== "production") return;

		const body = {
			name: metric.name,
			value: metric.value,
			rating: metric.rating,
			delta: metric.delta,
			id: metric.id,
			page: window.location.pathname,
		};

		// Send to analytics endpoint
		navigator.sendBeacon("/api/analytics/vitals", JSON.stringify(body));
	});

	return null;
}
