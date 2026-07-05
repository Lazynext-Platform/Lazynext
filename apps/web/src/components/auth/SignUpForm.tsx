/**
 * Sign-up form — name, email, password registration with error
 * display and loading state.
 *
 * @module components/auth/SignUpForm
 */

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/auth/client";
import { toast } from "sonner";
import Link from "next/link";

export function SignUpForm() {
	const router = useRouter();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);

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
			const { data, error } = await signUp.email({
				email,
				password,
				name: name || email.split("@")[0],
			});

			if (error) {
				toast.error(error.message ?? "Sign up failed");
			} else {
				toast.success("Account created successfully!");
				router.push("/dashboard");
			}
		} catch (err) {
			toast.error(
				err instanceof Error
					? err.message
					: "Signup failed — server may be unreachable",
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div>
				<label
					htmlFor="name"
					className="mb-1 block text-xs font-medium text-muted"
				>
					Name
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
				<label
					htmlFor="password"
					className="mb-1 block text-xs font-medium text-muted"
				>
					Password
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
			<button
				type="submit"
				disabled={loading}
				className="w-full rounded-lg bg-[var(--accent-secondary)] py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-[var(--accent-secondary)]/80 disabled:opacity-50"
			>
				{loading ? "Creating account..." : "Create Account"}
			</button>
			<p className="text-center text-xs text-muted">
				Already have an account?{" "}
				<Link href="/sign-in" className="text-[var(--accent-secondary)] hover:underline">
					Sign In
				</Link>
			</p>
		</form>
	);
}
