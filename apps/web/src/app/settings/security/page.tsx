/**
 * Security settings page — account security overview with links
 * to two-factor auth, passkeys, connected accounts, and sessions.
 *
 * @page /settings/security
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/auth/server";
import { SecuritySettingsClient } from "./client";

/** Utility representing metadata. */
export const metadata: Metadata = {
	title: "Security Settings — Lazynext",
	description:
		"Manage two-factor authentication, passkeys, connected accounts, and active sessions.",
};

export default async function SecuritySettingsPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		redirect("/sign-in?redirect=/settings/security");
	}

	return <SecuritySettingsClient user={session.user} />;
}
