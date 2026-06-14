import type { Metadata } from "next";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth/server";

export const metadata: Metadata = {
	title: "Authentication — Lazynext",
	description: "Sign in or create an account to start editing videos with AI.",
};

export default async function AuthLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (session && session.user) {
		redirect("/dashboard");
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4">
			<div className="w-full max-w-md">{children}</div>
		</div>
	);
}
