import { NextResponse } from "next/server";

// Core Web Vitals collector — lightweight, no PII
export async function POST(request: Request) {
	try {
		const body = (await request.json()) as {
			name: string;
			value: number;
			rating: string;
			page: string;
		};

		// Log to console in production (connect to your analytics service here)
		if (process.env.NODE_ENV === "production") {
			console.log(
				`[Vitals] ${body.name}=${body.value} (${body.rating}) on ${body.page}`,
			);
			// TODO: Send to Google Analytics, Plausible, or custom analytics DB
		}

		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ ok: false }, { status: 400 });
	}
}
