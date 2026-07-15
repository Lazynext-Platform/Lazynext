/**
 * Email verification page — handles the verification token
 * from the email link and verifies the user's email address.
 *
 * @page /verify-email
 */

import { headers } from "next/headers";
import { auth } from "@/auth/server";
import { VerifyEmailClient } from "./client";

interface PageProps {
	searchParams: Promise<{ token?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: PageProps) {
	const params = await searchParams;
	const token = params.token;

	if (!token) {
		return (
			<VerifyEmailClient
				status="error"
				message="Missing verification token. Check your email for a valid verification link."
			/>
		);
	}

	let status: "success" | "error" = "success";
	let message =
		"Your email has been verified! You can now sign in to your account.";

	try {
		const hdrs = await headers();
		await auth.api.verifyEmail({
			headers: hdrs,
			body: { token },
		} as any);
	} catch {
		status = "error";
		message =
			"This verification link is invalid or has expired. Request a new verification email from your account settings.";
	}

	return (
		<VerifyEmailClient status={status} message={message} />
	);
}
