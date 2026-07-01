/**
 * @module Projects API — fetches the authenticated user's project list from
 * the Rust API Gateway with session-based authorization.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth/server";
import { headers } from "next/headers";

const RUST_API_GATEWAY_URL = process.env.RUST_API_GATEWAY_URL || "http://127.0.0.1:8005";

/**
 * GET /api/projects
 * Returns the list of projects owned by the authenticated user, proxied
 * through the Rust API Gateway.
 */
export async function GET() {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});
		if (!session || !session.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const res = await fetch(`${RUST_API_GATEWAY_URL}/api/v1/projects`, {
			headers: {
				"X-Internal-API-Key": process.env.INTERNAL_API_KEY || "lazynext-internal-dev-key"
			}
		});

		if (!res.ok) {
			throw new Error("Failed to fetch projects from Rust Gateway");
		}

		const data = await res.json();
		return NextResponse.json(data);
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
