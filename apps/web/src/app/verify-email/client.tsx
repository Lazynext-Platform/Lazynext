/**
 * Email verification page client — shows success or error state.
 *
 * @module verify-email/client
 */

"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";

interface VerifyEmailClientProps {
	status: "success" | "error";
	message: string;
}

/** React component rendering VerifyEmailClient. */
export function VerifyEmailClient({ status, message }: VerifyEmailClientProps) {
	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4">
			<div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-panel/50 p-8 text-center">
				<div className="flex justify-center">
					{status === "success" ? (
						<div className="rounded-full bg-emerald-500/10 p-3">
							<Check className="h-8 w-8 text-emerald-400" />
						</div>
					) : (
						<div className="rounded-full bg-red-500/10 p-3">
							<X className="h-8 w-8 text-red-400" />
						</div>
					)}
				</div>

				<div>
					<h1 className="text-2xl font-bold text-foreground">
						{status === "success" ? "Email Verified!" : "Verification Failed"}
					</h1>
					<p className="mt-2 text-sm text-muted">{message}</p>
				</div>

				<div className="flex justify-center gap-3">
					<Link
						href="/sign-in"
						className="rounded-lg bg-[var(--accent-secondary)] px-6 py-2.5 text-sm font-semibold text-foreground hover:bg-[var(--accent-secondary)]/80"
					>
						Sign In
					</Link>
					{status === "error" && (
						<Link
							href="/settings/security"
							className="rounded-lg border border-border px-6 py-2.5 text-sm font-medium text-muted hover:bg-panel"
						>
							Account Settings
						</Link>
					)}
				</div>
			</div>
		</div>
	);
}
