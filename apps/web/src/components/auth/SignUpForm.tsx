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
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (password.length < 8) {
			toast.error("Password must be at least 8 characters");
			return;
		}
		setLoading(true);
		try {
			const result = await signUp.email({
				name,
				email,
				password,
			});
			if (result.error) {
				toast.error(result.error.message ?? "Sign up failed");
			} else {
				toast.success("Account created! Redirecting...");
				router.push("/projects");
			}
		} catch {
			toast.error("An unexpected error occurred");
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div>
				<label htmlFor="name" className="mb-1 block text-xs font-medium text-zinc-400">
					Name
				</label>
				<input
					id="name"
					type="text"
					value={name}
					onChange={(e) => setName(e.target.value)}
					required
					className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
					placeholder="Your name"
				/>
			</div>
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
					placeholder="Min. 8 characters"
				/>
			</div>
			<button
				type="submit"
				disabled={loading}
				className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
			>
				{loading ? "Creating account..." : "Create Account"}
			</button>
			<p className="text-center text-xs text-zinc-500">
				Already have an account?{" "}
				<Link href="/sign-in" className="text-violet-400 hover:text-violet-300">
					Sign In
				</Link>
			</p>
		</form>
	);
}
