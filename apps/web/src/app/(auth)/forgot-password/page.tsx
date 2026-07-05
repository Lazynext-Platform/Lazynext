/**
 * Forgot password page — email-based password reset flow.
 *
 * @page /forgot-password
 */

"use client";

import React, { useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { toast } from "sonner";
import Link from "next/link";
import { requestPasswordReset } from "@/auth/client";

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState("");
	const [sent, setSent] = useState(false);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		try {
			const { error } = await requestPasswordReset({
				email,
				redirectTo: "/reset-password",
			});
			if (!error) {
				setSent(true);
				toast.success("Reset link sent! Check your email.");
			} else {
				toast.error(error.message || "Failed to send reset email");
			}
		} catch {
			toast.error("An error occurred. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	if (sent) {
		return (
			<AuthCard
				title="Check your email"
				subtitle="We sent a password reset link if that account exists."
			>
				<div className="text-center">
					<Link
						href="/sign-in"
						className="text-sm text-[var(--accent-secondary)] hover:underline"
					>
						Back to Sign In
					</Link>
				</div>
			</AuthCard>
		);
	}

	return (
		<AuthCard
			title="Reset your password"
			subtitle="Enter your email and we'll send you a reset link."
		>
			<form onSubmit={handleSubmit} className="space-y-4">
				<input
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
					className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-foreground placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent-secondary)] focus:ring-1 focus:ring-[var(--accent-secondary)]"
					placeholder="you@example.com"
				/>
				<button
					type="submit"
					disabled={loading}
					className="w-full rounded-lg bg-[var(--accent-secondary)] py-2.5 text-sm font-semibold text-foreground hover:bg-[var(--accent-secondary)]/80 disabled:opacity-50"
				>
					{loading ? "Sending..." : "Send Reset Link"}
				</button>
				<p className="text-center text-xs text-muted">
					<Link
						href="/sign-in"
						className="text-[var(--accent-secondary)] hover:underline"
					>
						Back to Sign In
					</Link>
				</p>
			</form>
		</AuthCard>
	);
}
