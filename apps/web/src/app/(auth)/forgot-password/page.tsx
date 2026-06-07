"use client";

import React, { useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { toast } from "sonner";
import Link from "next/link";

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState("");
	const [sent, setSent] = useState(false);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		try {
			const res = await fetch("/api/auth/forgot-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email }),
			});
			if (res.ok) {
				setSent(true);
				toast.success("Reset link sent! Check your email.");
			} else {
				toast.error("Failed to send reset email");
			}
		} catch {
			toast.error("An error occurred");
		} finally {
			setLoading(false);
		}
	};

	if (sent) {
		return (
			<AuthCard title="Check your email" subtitle="We sent a password reset link if that account exists.">
				<div className="text-center">
					<Link href="/sign-in" className="text-sm text-violet-400 hover:text-violet-300">Back to Sign In</Link>
				</div>
			</AuthCard>
		);
	}

	return (
		<AuthCard title="Reset your password" subtitle="Enter your email and we'll send you a reset link.">
			<form onSubmit={handleSubmit} className="space-y-4">
				<input
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
					className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500"
					placeholder="you@example.com"
				/>
				<button type="submit" disabled={loading} className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50">
					{loading ? "Sending..." : "Send Reset Link"}
				</button>
				<p className="text-center text-xs text-zinc-500">
					<Link href="/sign-in" className="text-violet-400 hover:text-violet-300">Back to Sign In</Link>
				</p>
			</form>
		</AuthCard>
	);
}
