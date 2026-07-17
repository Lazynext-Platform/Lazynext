/**
 * Auth layout — centered card container shared by sign-in and sign-up pages.
 *
 * @layout /(auth)
 */

import type { Metadata } from "next";

/** Utility representing metadata. */
export const metadata: Metadata = {
	title: "Authentication — Lazynext",
	description: "Sign in or create an account to start editing videos with AI.",
};

/** React component rendering AuthLayout. */
export default function AuthLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4">
			<div className="w-full max-w-md">{children}</div>
		</div>
	);
}
