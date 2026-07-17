/**
 * Forgot password page — email-based password reset flow.
 * Includes Cloudflare Turnstile CAPTCHA verification.
 *
 * @page /forgot-password
 */

"use client";

import React, { useState, useRef } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { toast } from "sonner";
import Link from "next/link";
import { requestPasswordReset } from "@/auth/client";
import { friendlyAuthError } from "@/components/auth/auth-errors";
import { CaptchaWidget } from "@/components/auth/CaptchaWidget";
import { verifyCaptchaToken } from "@/components/auth/captcha-verify";

/** React component rendering ForgotPasswordPage. */
export default function ForgotPasswordPage() {
	const [email, setEmail] = useState("");
	const [sent, setSent] = useState(false);
	const [loading, setLoading] = useState(false);
	const captchaToken = useRef<string>("");

	const verifyCaptcha = async (): Promise<boolean> => {
		const token = captchaToken.current;
		if (!token) {
			toast.error("Please complete the CAPTCHA verification");
			return false;
		}
		const valid = await verifyCaptchaToken(token);
		if (!valid) {
			toast.error("CAPTCHA verification failed. Please try again.");
			captchaToken.current = "";
		}
		return valid;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		try {
			if (!(await verifyCaptcha())) {
				setLoading(false);
				return;
			}
			const { error } = await requestPasswordReset(
				{
					email,
					redirectTo: "/reset-password",
				},
				captchaToken.current
					? { headers: { "X-Captcha-Token": captchaToken.current } }
					: undefined,
			);
			if (!error) {
				setSent(true);
				toast.success("Reset link sent! Check your email.");
			} else {
				toast.error(friendlyAuthError(error, "Failed to send reset email"));
			}
		} catch (err) {
			toast.error(friendlyAuthError(err, "An error occurred. Please try again."));
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
				<CaptchaWidget
					onVerify={(token) => {
						captchaToken.current = token;
					}}
					onError={() => {
						captchaToken.current = "";
					}}
					disabled={loading}
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
