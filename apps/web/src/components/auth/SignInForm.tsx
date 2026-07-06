/**
 * Sign-in form — email/password authentication with error display
 * and loading state.
 *
 * @module components/auth/SignInForm
 */

"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "@/auth/client";
import { toast } from "sonner";
import Link from "next/link";

export function SignInForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const redirectTo = searchParams.get("redirect") || "/dashboard";
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email || !password) {
			toast.error("Please enter your email and password");
			return;
		}
		setLoading(true);
		try {
			const result = await signIn.email({
				email,
				password,
				rememberMe: true,
			});
			if (result.error) {
				toast.error(result.error.message ?? "Invalid email or password");
			} else {
				toast.success("Signed in successfully!");
				router.push(redirectTo);
			}
		} catch (err) {
			toast.error(
				err instanceof Error
					? err.message
					: "Sign in failed — server may be unreachable",
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div>
				<label
					htmlFor="email"
					className="mb-1 block text-xs font-medium text-muted"
				>
					Email
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
						Password
					</label>
					<Link
						href="/forgot-password"
						className="text-xs text-[var(--accent-secondary)] hover:underline"
					>
						Forgot password?
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
					placeholder="••••••••"
				/>
			</div>
			<button
				type="submit"
				disabled={loading}
				className="w-full rounded-lg bg-[var(--accent-secondary)] py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-[var(--accent-secondary)]/80 disabled:opacity-50"
			>
				{loading ? "Signing in..." : "Sign In"}
			</button>
			<p className="text-center text-xs text-muted">
				Don&apos;t have an account?{" "}
				<Link href="/sign-up" className="text-[var(--accent-secondary)] hover:underline">
					Sign Up
				</Link>
			</p>
		</form>
	);
}
