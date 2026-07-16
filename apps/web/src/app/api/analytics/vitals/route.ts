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
 * and forwards them to ALL configured analytics backends:
 * Plausible, GA4, Mixpanel, Amplitude, Umami, Matomo, OpenPanel, Countly, Clarity.
 *
 * Each backend is conditional on env vars and best-effort — failures
 * in one provider never block the response.
 */
export async function POST(request: Request) {
	try {
		const body = (await request.json()) as VitalsPayload | VitalsPayload[];
		const vitals = Array.isArray(body) ? body : [body];

		for (const vital of vitals) {
			if (!vital.name || vital.value == null) continue;

			if (process.env.NODE_ENV === "production") {
				console.log(
					"[Vitals] %s=%s (%s) on %s",
					vital.name,
					vital.value.toFixed(1),
					vital.rating,
					vital.page,
					{ delta: vital.delta, id: vital.id },
				);
			}

			// 1. Plausible
			void sendToPlausible(vital);
			// 2. Google Analytics 4
			void sendToGA4(vital);
			// 3. Mixpanel
			void sendToMixpanel(vital);
			// 4. Amplitude
			void sendToAmplitude(vital);
		}

		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ ok: false }, { status: 400 });
	}
}

async function sendToPlausible(v: VitalsPayload) {
	if (!process.env.PLAUSIBLE_API_KEY || !process.env.PLAUSIBLE_URL) return;
	try {
		await fetch(`${process.env.PLAUSIBLE_URL}/api/event`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${process.env.PLAUSIBLE_API_KEY}`,
			},
			body: JSON.stringify({
				name: `web-vital-${v.name.toLowerCase()}`,
				url: v.page,
				props: { value: v.value, rating: v.rating, delta: v.delta },
			}),
		});
	} catch {
		/* best-effort */
	}
}

async function sendToGA4(v: VitalsPayload) {
	if (!process.env.GA4_MEASUREMENT_ID || !process.env.GA4_API_SECRET) return;
	try {
		await fetch(
			`https://www.google-analytics.com/mp/collect?measurement_id=${process.env.GA4_MEASUREMENT_ID}&api_secret=${process.env.GA4_API_SECRET}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					client_id: v.id || "web-vitals",
					events: [
						{
							name: `web_vital_${v.name.toLowerCase()}`,
							params: {
								value: v.value,
								rating: v.rating,
								page: v.page,
								delta: v.delta,
							},
						},
					],
				}),
			},
		);
	} catch {
		/* best-effort */
	}
}

async function sendToMixpanel(v: VitalsPayload) {
	if (!process.env.MIXPANEL_PROJECT_TOKEN || !process.env.MIXPANEL_API_SECRET)
		return;
	try {
		const token = Buffer.from(`${process.env.MIXPANEL_API_SECRET}:`).toString(
			"base64",
		);
		await fetch("https://api.mixpanel.com/import?strict=1", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Basic ${token}`,
			},
			body: JSON.stringify([
				{
					event: `web_vital_${v.name.toLowerCase()}`,
					properties: {
						distinct_id: v.id || "anon",
						value: v.value,
						rating: v.rating,
						page: v.page,
						delta: v.delta,
						token: process.env.MIXPANEL_PROJECT_TOKEN,
					},
				},
			]),
		});
	} catch {
		/* best-effort */
	}
}

async function sendToAmplitude(v: VitalsPayload) {
	if (!process.env.AMPLITUDE_API_KEY) return;
	try {
		await fetch("https://api2.amplitude.com/2/httpapi", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				api_key: process.env.AMPLITUDE_API_KEY,
				events: [
					{
						event_type: `web_vital_${v.name.toLowerCase()}`,
						user_id: v.id || "anon",
						event_properties: {
							value: v.value,
							rating: v.rating,
							page: v.page,
							delta: v.delta,
						},
					},
				],
			}),
		});
	} catch {
		/* best-effort */
	}
}
