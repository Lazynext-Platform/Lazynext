/**
 * POST /api/dodo/checkout
 *
 * Creates a Dodo Payments payment link for the authenticated user.
 * Requires a valid Better Auth session.
 *
 * @module app/api/dodo/checkout/route
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth/server";
import { headers } from "next/headers";
import { dodoCheckoutSchema } from "@/lib/validation";

const DODO_API_KEY = process.env.DODO_API_KEY || "";
const DODO_API_BASE = "https://api.dodopayments.com/api/v1";

/** POST handler — creates a Dodo Payments payment link for the authed user. */
export async function POST(req: Request) {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		if (!session || !session.user) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		const rawBody = await req.json();
		const parsed = dodoCheckoutSchema.safeParse(rawBody);

		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Invalid priceId" },
				{ status: 400 },
			);
		}

		const { priceId, code, currency } = parsed.data;

		// Map price IDs to amounts (in paise/cents for default USD)
		const priceMap: Record<string, number> = {
			[process.env.NEXT_PUBLIC_DODO_PRO_PRICE_ID || "pro_monthly"]: 1900,
			[process.env.NEXT_PUBLIC_DODO_STUDIO_PRICE_ID || "studio_monthly"]: 9900,
		};

		let amount = priceMap[priceId] || 1900;

		// Use user's preferred currency from request or default to INR
		const checkoutCurrency = currency || "INR";

		// Discount via promotion code integration
		if (code) {
		  try {
		    const gatewayReq = await fetch(`${process.env.API_GATEWAY_URL || 'http://localhost:8005'}/api/v1/promotions/apply`, {
		      method: 'POST',
		      headers: {
		        'Content-Type': 'application/json',
		        'Authorization': req.headers.get("Authorization") || "",
		      },
		      body: JSON.stringify({ code, currency: checkoutCurrency })
		    });
		    const gatewayRes = await gatewayReq.json();
		    if (gatewayRes.success && gatewayRes.discount_applied) {
		       amount = Math.max(0, amount - gatewayRes.discount_applied);
		    }
		  } catch(e) {
		    console.error("Failed to apply promotion via gateway", e);
		  }
		}

		const response = await fetch(`${DODO_API_BASE}/payment_links`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${DODO_API_KEY}`,
			},
			body: JSON.stringify({
				amount,
				currency: checkoutCurrency,
				description: "Lazynext Pro",
			}),
		});

		if (!response.ok) {
			throw new Error("Failed to create Dodo payment link");
		}

		const data = await response.json();

		return NextResponse.json({ url: data.payment_link_url || data.url });
	} catch (error) {
		console.error("[DODO_CHECKOUT]", error);
		return new NextResponse("Internal Error", { status: 500 });
	}
}
