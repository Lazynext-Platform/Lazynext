/**
 * Sign-up form — name, email, password registration + social
 * OAuth sign-up with error display and loading state.
 * Includes Cloudflare Turnstile CAPTCHA verification.
 *
 * @module components/auth/SignUpForm
 */

"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/auth/client";
import { toast } from "sonner";
import Link from "next/link";
import { friendlyAuthError } from "./auth-errors";
import { SocialAuthButtons } from "./SocialAuthButtons";
import { CaptchaWidget } from "./CaptchaWidget";
import { verifyCaptchaToken } from "./captcha-verify";
import { useTranslations } from "next-intl";

/** React component rendering SignUpForm. */
export function SignUpForm() {
	const t = useTranslations("Auth");
	const c = useTranslations("Common");
	const router = useRouter();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
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
			const { data, error } = await signUp.email(
				{
					email,
					password,
					name: name || email.split("@")[0],
				},
				captchaToken.current
					? { headers: { "X-Captcha-Token": captchaToken.current } }
					: undefined,
			);

			if (error) {
				toast.error(friendlyAuthError(error, "Sign up failed"));
				captchaToken.current = "";
			} else if (data) {
				toast.success("Account created successfully!");
				router.push("/dashboard");
			}
		} catch (err) {
			toast.error(friendlyAuthError(err, "Sign up failed"));
			captchaToken.current = "";
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-6">
			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label
						htmlFor="name"
						className="mb-1 block text-xs font-medium text-muted"
					>
							{t("name")}
						</label>
					<input
						id="name"
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						required
						autoComplete="name"
						className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-foreground placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent-secondary)] focus:ring-1 focus:ring-[var(--accent-secondary)]"
						placeholder="Your name"
					/>
				</div>
				<div>
					<label
						htmlFor="email"
						className="mb-1 block text-xs font-medium text-muted"
					>
							{t("email")}
						</label>
						<input
							id="email"
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
						autoComplete="email"
						className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-foreground placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent-secondary)] focus:ring-1 focus:ring-[var(--accent-secondary)]"
						placeholder="you@example.com"
					/>
				</div>
				<div>
					<label
						htmlFor="password"
						className="mb-1 block text-xs font-medium text-muted"
					>
							{t("password")}
						</label>
					<input
						id="password"
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
						minLength={8}
						autoComplete="new-password"
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
						autoComplete="new-password"
						className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-foreground placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent-secondary)] focus:ring-1 focus:ring-[var(--accent-secondary)]"
						placeholder="Re-enter your password"
					/>
				</div>
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
					className="w-full rounded-lg bg-[var(--accent-secondary)] py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-[var(--accent-secondary)]/80 disabled:opacity-50"
				>
						{loading ? c("saving") : t("create_account")}
					</button>
			</form>

			<SocialAuthButtons mode="signUp" redirectTo="/dashboard" disabled={loading} />

				<p className="text-center text-xs text-muted">
					{t("have_account")}{" "}
					<Link href="/sign-in" className="text-[var(--accent-secondary)] hover:underline">
						{t("sign_in")}
					</Link>
				</p>
		</div>
	);
}
