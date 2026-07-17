/**
 * CLI Token page — displays the user's JWT token for use with
 * the Lazynext CLI (`lazynext login-token --token <TOKEN>`).
 *
 * @page /settings/token
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/auth/server";
import { TokenPageClient } from "./client";

/** Utility representing metadata. */
export const metadata: Metadata = {
	title: "CLI Token — Lazynext",
	description: "Get your authentication token for the Lazynext CLI.",
};

export default async function TokenPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		redirect("/sign-in?redirect=/settings/token");
	}

	const token = session.session?.token || "";

	return <TokenPageClient token={token} user={session.user} />;
}
