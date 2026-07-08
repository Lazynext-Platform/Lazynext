/** @module API route for collecting Core Web Vitals analytics (LCP, FID, CLS, INP, TTFB) */

import { NextResponse } from "next/server";

interface VitalsPayload {
	/** Metric name (e.g. LCP, CLS, INP). */
	name: string;
	/** Measured metric value. */
	value: number;
	/** Performance rating bucket. */
	rating: string;
	/** Page path the metric was recorded on. */
	page: string;
	/** Change since the last report. */
	delta?: number;
	/** Unique metric instance identifier. */
	id?: string;
}

/**
 * Core Web Vitals collector.
 *
 * Accepts LCP, FID, CLS, INP, and TTFB metrics from the browser
 * and forwards them to the configured analytics backend.
 *
 * Supports: Plausible, Google Analytics 4, or a custom database.
 */
export async function POST(request: Request) {
	try {
		const body = (await request.json()) as VitalsPayload | VitalsPayload[];

		const vitals = Array.isArray(body) ? body : [body];

		for (const vital of vitals) {
			if (!vital.name || vital.value == null) continue;

			// Log to structured logger for observability
			if (process.env.NODE_ENV === "production") {
				console.log(
					`[Vitals] ${vital.name}=${vital.value.toFixed(1)} (${vital.rating}) on ${vital.page}`,
					{ delta: vital.delta, id: vital.id },
				);
			}

			// Forward to Plausible if configured
			if (process.env.PLAUSIBLE_API_KEY && process.env.PLAUSIBLE_URL) {
				try {
					await fetch(`${process.env.PLAUSIBLE_URL}/api/event`, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${process.env.PLAUSIBLE_API_KEY}`,
						},
						body: JSON.stringify({
							name: `web-vital-${vital.name.toLowerCase()}`,
							url: vital.page,
							props: {
								value: vital.value,
								rating: vital.rating,
								delta: vital.delta,
							},
						}),
					});
				} catch {
					// Plausible is best-effort — don't block the response
				}
			}

			// Forward to Google Analytics 4 if configured
			if (process.env.GA4_MEASUREMENT_ID && process.env.GA4_API_SECRET) {
				try {
					await fetch(
						`https://www.google-analytics.com/mp/collect?measurement_id=${process.env.GA4_MEASUREMENT_ID}&api_secret=${process.env.GA4_API_SECRET}`,
						{
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								client_id: vital.id || "web-vitals",
								events: [
									{
										name: `web_vital_${vital.name.toLowerCase()}`,
										params: {
											value: vital.value,
											rating: vital.rating,
											page: vital.page,
											delta: vital.delta,
										},
									},
								],
							}),
						},
					);
				} catch {
					// GA4 is best-effort
				}
			}
		}

		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ ok: false }, { status: 400 });
	}
}
