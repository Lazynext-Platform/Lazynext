/**
 * @module app/api/user/credits
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth/server";
import { headers } from "next/headers";

const RUST_API_GATEWAY_URL = process.env.RUST_API_GATEWAY_URL || "http://127.0.0.1:8005";

export async function GET() {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});
		if (!session || !session.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const res = await fetch(`${RUST_API_GATEWAY_URL}/api/v1/user/credits`, {
			headers: {
				"Authorization": `Bearer ${session.user.id}`
			}
		});

		if (!res.ok) {
			throw new Error("Failed to fetch credits from Rust Gateway");
		}

		const data = await res.json();
		return NextResponse.json(data);
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
