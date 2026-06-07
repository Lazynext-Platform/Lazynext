"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { toast } from "sonner";

export default function ResetPasswordPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const token = searchParams.get("token");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (password.length < 8) { toast.error("Min 8 characters"); return; }
		setLoading(true);
		try {
			const res = await fetch("/api/auth/reset-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token, password }),
			});
			if (res.ok) {
				toast.success("Password reset! You can now sign in.");
				router.push("/sign-in");
			} else {
				toast.error("Invalid or expired reset token");
			}
		} catch {
			toast.error("An error occurred");
		} finally { setLoading(false); }
	};

	return (
		<AuthCard title="Set new password" subtitle="Enter your new password.">
			{!token ? (
				<p className="text-center text-sm text-zinc-400">Invalid reset link. Please request a new one.</p>
			) : (
				<form onSubmit={handleSubmit} className="space-y-4">
					<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
						className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500"
						placeholder="New password (min 8 chars)" />
					<button type="submit" disabled={loading}
						className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50">
						{loading ? "Resetting..." : "Reset Password"}
					</button>
				</form>
			)}
		</AuthCard>
	);
}
