"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/auth/client";
import { toast } from "sonner";
import Link from "next/link";

export function SignInForm() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		try {
			const result = await signIn.email({
				email,
				password,
			});
			if (result.error) {
				toast.error(result.error.message ?? "Sign in failed");
			} else {
				toast.success("Signed in successfully!");
				router.push("/projects");
			}
		} catch (err) {
			toast.error("An unexpected error occurred");
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div>
				<label htmlFor="email" className="mb-1 block text-xs font-medium text-zinc-400">
					Email
				</label>
				<input
					id="email"
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
					className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
					placeholder="you@example.com"
				/>
			</div>
			<div>
				<label htmlFor="password" className="mb-1 block text-xs font-medium text-zinc-400">
					Password
				</label>
				<input
					id="password"
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
					minLength={8}
					className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
					placeholder="••••••••"
				/>
			</div>
			<button
				type="submit"
				disabled={loading}
				className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
			>
				{loading ? "Signing in..." : "Sign In"}
			</button>
			<p className="text-center text-xs text-zinc-500">
				Don&apos;t have an account?{" "}
				<Link href="/sign-up" className="text-violet-400 hover:text-violet-300">
					Sign Up
				</Link>
			</p>
		</form>
	);
}
