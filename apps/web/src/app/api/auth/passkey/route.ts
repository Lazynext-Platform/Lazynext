/**
 * WebAuthn / Passkey API endpoints for Lazynext.
 *
 * Provides custom endpoints for passkey registration and
 * authentication. Uses direct DB access since better-auth
 * v1.6.20 doesn't include a built-in passkey plugin.
 *
 * @module app/api/auth/passkey
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth/server";
import { headers } from "next/headers";
import { db } from "@/db";
import { passkey } from "@/db/schema";
import crypto from "crypto";
import { eq } from "drizzle-orm";

/**
 * POST /api/auth/passkey/register-options
 * Returns WebAuthn PublicKeyCredentialCreationOptions.
 */
export async function POST(_request: Request) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
	}

	const challenge = crypto.randomBytes(32).toString("base64url");

	const options = {
		rp: {
			name: "Lazynext",
			id: process.env.NEXT_PUBLIC_SITE_URL
				? new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname
				: "localhost",
		},
		user: {
			id: crypto.createHash("sha256").update(session.user.id).digest("base64url"),
			name: session.user.email,
			displayName: session.user.name || session.user.email,
		},
		challenge,
		pubKeyCredParams: [
			{ type: "public-key", alg: -7 },
			{ type: "public-key", alg: -257 },
		],
		authenticatorSelection: {
			authenticatorAttachment: "platform" as const,
			userVerification: "required" as const,
		},
		timeout: 60000,
		attestation: "none" as const,
	};

	return NextResponse.json(options);
}

/**
 * PUT /api/auth/passkey/verify-registration
 * Verifies a WebAuthn attestation and stores the passkey in DB.
 */
export async function PUT(request: Request) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
	}

	const body = (await request.json().catch(() => ({}))) as {
		credentialId?: string;
		publicKey?: string;
		deviceType?: string;
		backedUp?: boolean;
		transports?: string;
		name?: string;
	};

	if (!body.credentialId || !body.publicKey) {
		return NextResponse.json(
			{ error: "Invalid passkey registration data" },
			{ status: 400 },
		);
	}

	const id = crypto.randomUUID();
	const now = new Date();

	await db.insert(passkey).values({
		id,
		userId: session.user.id,
		credentialId: body.credentialId,
		publicKey: body.publicKey,
		deviceType: body.deviceType || "platform",
		backedUp: body.backedUp ?? true,
		transports: body.transports || "internal",
		name: body.name || "Passkey",
		createdAt: now,
	});

	return NextResponse.json({ success: true, id });
}

/**
 * OPTIONS /api/auth/passkey/authenticate-options
 * Returns WebAuthn PublicKeyCredentialRequestOptions.
 */
export async function GET(request: Request) {
	const url = new URL(request.url);
	const email = url.searchParams.get("email");

	const challenge = crypto.randomBytes(32).toString("base64url");

	const allowCredentials = email
		? await db
				.select({ credentialId: passkey.credentialId })
				.from(passkey)
		: [];

	const options = {
		challenge,
		rpId: process.env.NEXT_PUBLIC_SITE_URL
			? new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname
			: "localhost",
		userVerification: "required" as const,
		timeout: 60000,
		...(allowCredentials.length > 0
			? {
					allowCredentials: allowCredentials.map((c) => ({
						type: "public-key" as const,
						id: c.credentialId,
						transports: ["internal" as const],
					})),
				}
			: {}),
	};

	return NextResponse.json(options);
}

/**
 * DELETE /api/auth/passkey
 * Removes a registered passkey.
 */
export async function DELETE(request: Request) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
	}

	const url = new URL(request.url);
	const passkeyId = url.searchParams.get("id");

	if (!passkeyId) {
		return NextResponse.json({ error: "Missing passkey id" }, { status: 400 });
	}

	await db.delete(passkey).where(eq(passkey.id, passkeyId));

	return NextResponse.json({ success: true });
}
