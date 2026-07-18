/**
 * Sign-in form — email/password + magic link + social OAuth.
 * MFA/two-factor is handled automatically by the twoFactorClient plugin.
 * Includes Cloudflare Turnstile CAPTCHA verification.
 *
 * @module components/auth/SignInForm
 */

"use client";

import React, { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "@/auth/client";
import { toast } from "sonner";
import Link from "next/link";
import { friendlyAuthError } from "./auth-errors";
import { SocialAuthButtons } from "./SocialAuthButtons";
import { CaptchaWidget } from "./CaptchaWidget";
import { verifyCaptchaToken } from "./captcha-verify";
import { useTranslations } from "next-intl";

/** React component rendering SignInForm. */
export function SignInForm() {
	const t = useTranslations("Auth");
	const c = useTranslations("Common");
	const router = useRouter();
	const searchParams = useSearchParams();
	const redirectTo = searchParams.get("redirect") || "/dashboard";

	const [mode, setMode] = useState<"password" | "magicLink">("password");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
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

	const handlePasswordSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email || !password) {
			toast.error("Please enter your email and password");
			return;
		}
		setLoading(true);
		try {
			if (!(await verifyCaptcha())) {
				setLoading(false);
				return;
			}
			const result = await signIn.email(
				{
					email,
					password,
					rememberMe: true,
				},
				captchaToken.current
					? { headers: { "X-Captcha-Token": captchaToken.current } }
					: undefined,
			);
			if (result.error) {
				toast.error(friendlyAuthError(result.error, "Invalid email or password"));
				captchaToken.current = "";
			} else if (result.data) {
				toast.success("Signed in successfully!");
				router.push(redirectTo);
			}
		} catch (err) {
			toast.error(friendlyAuthError(err, "Sign in failed"));
			captchaToken.current = "";
		} finally {
			setLoading(false);
		}
	};

	const handleMagicLinkSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email) {
			toast.error("Please enter your email address");
			return;
		}
		setLoading(true);
		try {
			if (!(await verifyCaptcha())) {
				setLoading(false);
				return;
			}
			const result = await signIn.magicLink(
				{
					email,
					callbackURL: redirectTo,
				},
				captchaToken.current
					? { headers: { "X-Captcha-Token": captchaToken.current } }
					: undefined,
			);
			if (result.error) {
				toast.error(friendlyAuthError(result.error, "Could not send magic link"));
				captchaToken.current = "";
			} else {
				toast.success("Magic link sent! Check your email to sign in.");
			}
		} catch (err) {
			toast.error(friendlyAuthError(err, "Could not send magic link"));
			captchaToken.current = "";
		} finally {
			setLoading(false);
		}
	};

	if (mode === "password") {
		return (
			<div className="space-y-6">
				<form onSubmit={handlePasswordSubmit} className="space-y-4">
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
						<div className="mb-1 flex items-center justify-between">
							<label
								htmlFor="password"
								className="block text-xs font-medium text-muted"
							>
								{t("password")}
							</label>
							<Link
								href="/forgot-password"
								className="text-xs text-[var(--accent-secondary)] hover:underline"
							>
								{t("forgot_password")}
							</Link>
						</div>
						<input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							minLength={8}
							autoComplete="current-password"
							className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-foreground placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent-secondary)] focus:ring-1 focus:ring-[var(--accent-secondary)]"
							placeholder="Your password"
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
						{loading ? c("saving") : t("sign_in")}
					</button>
				</form>

				<button
					type="button"
					onClick={() => setMode("magicLink")}
					className="w-full text-center text-xs text-[var(--accent-secondary)] hover:underline"
				>
					Sign in with a magic link instead
				</button>

				<SocialAuthButtons mode="signIn" redirectTo={redirectTo} disabled={loading} />

				<p className="text-center text-xs text-muted">
					{t("no_account")}{" "}
					<Link href="/sign-up" className="text-[var(--accent-secondary)] hover:underline">
						{t("sign_up")}
					</Link>
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<form onSubmit={handleMagicLinkSubmit} className="space-y-4">
				<div>
					<label
						htmlFor="magicLinkEmail"
						className="mb-1 block text-xs font-medium text-muted"
					>
							{t("email")}
						</label>
						<input
							id="magicLinkEmail"
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
						autoComplete="email"
						className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-foreground placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent-secondary)] focus:ring-1 focus:ring-[var(--accent-secondary)]"
						placeholder="you@example.com"
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
					{loading ? "Sending..." : "Send Magic Link"}
				</button>
			</form>

			<button
				type="button"
				onClick={() => setMode("password")}
				className="w-full text-center text-xs text-[var(--accent-secondary)] hover:underline"
			>
				Sign in with password instead
			</button>

			<SocialAuthButtons mode="signIn" redirectTo={redirectTo} disabled={loading} />

			<p className="text-center text-xs text-muted">
				Don&apos;t have an account?{" "}
				<Link href="/sign-up" className="text-[var(--accent-secondary)] hover:underline">
					Sign Up
				</Link>
			</p>
		</div>
	);
}
