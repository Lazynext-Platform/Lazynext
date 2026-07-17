/**
 * Reset password page — token-based password reset form.
 * Includes Cloudflare Turnstile CAPTCHA verification.
 *
 * @page /reset-password
 */

"use client";

import React, { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { toast } from "sonner";
import Link from "next/link";
import { resetPassword } from "@/auth/client";
import { friendlyAuthError } from "@/components/auth/auth-errors";
import { CaptchaWidget } from "@/components/auth/CaptchaWidget";
import { verifyCaptchaToken } from "@/components/auth/captcha-verify";

function ResetPasswordForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const token = searchParams.get("token");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const captchaToken = useRef<string>("");

	const verifyCaptcha = async (): Promise<boolean> => {
		const t = captchaToken.current;
		if (!t) {
			toast.error("Please complete the CAPTCHA verification");
			return false;
		}
		const valid = await verifyCaptchaToken(t);
		if (!valid) {
			toast.error("CAPTCHA verification failed. Please try again.");
			captchaToken.current = "";
		}
		return valid;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (password.length < 8) {
			toast.error("Password must be at least 8 characters");
			return;
		}
		if (password !== confirmPassword) {
			toast.error("Passwords do not match");
			return;
		}
		setLoading(true);
		try {
			if (!(await verifyCaptcha())) {
				setLoading(false);
				return;
			}
			const { error } = await resetPassword({
				newPassword: password,
				token: token || "",
			});
			if (!error) {
				toast.success("Password reset! You can now sign in.");
				router.push("/sign-in");
			} else {
				toast.error(friendlyAuthError(error, "Invalid or expired reset token"));
			}
		} catch (err) {
			toast.error(friendlyAuthError(err, "An error occurred. Please try again."));
		} finally {
			setLoading(false);
		}
	};

	if (!token) {
		return (
			<AuthCard
				title="Invalid reset link"
				subtitle="This password reset link is missing a token."
			>
				<div className="text-center">
					<p className="text-sm text-muted mb-4">
						Please request a new password reset link.
					</p>
					<Link
						href="/forgot-password"
						className="text-sm text-[var(--accent-secondary)] hover:underline"
					>
						Request new reset link
					</Link>
				</div>
			</AuthCard>
		);
	}

	return (
		<AuthCard title="Set new password" subtitle="Enter your new password below.">
			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label
						htmlFor="password"
						className="mb-1 block text-xs font-medium text-muted"
					>
						New Password
					</label>
					<input
						id="password"
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
						minLength={8}
						className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-foreground placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent-secondary)] focus:ring-1 focus:ring-[var(--accent-secondary)]"
						placeholder="Min. 8 characters"
					/>
				</div>
				<div>
					<label
						htmlFor="confirmPassword"
						className="mb-1 block text-xs font-medium text-muted"
					>
						Confirm Password
					</label>
					<input
						id="confirmPassword"
						type="password"
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
						required
						minLength={8}
						className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-foreground placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent-secondary)] focus:ring-1 focus:ring-[var(--accent-secondary)]"
						placeholder="Re-enter your password"
					/>
				</div>
				<CaptchaWidget
					onVerify={(t) => {
						captchaToken.current = t;
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
					{loading ? "Resetting..." : "Reset Password"}
				</button>
			</form>
		</AuthCard>
	);
}

/** React component rendering ResetPasswordPage. */
export default function ResetPasswordPage() {
	return (
		<Suspense
			fallback={
				<AuthCard
					title="Loading..."
					subtitle="Please wait a moment."
				>
					<div className="flex justify-center py-8">
						<div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-secondary)] border-t-transparent" />
					</div>
				</AuthCard>
			}
		>
			<ResetPasswordForm />
		</Suspense>
	);
}
