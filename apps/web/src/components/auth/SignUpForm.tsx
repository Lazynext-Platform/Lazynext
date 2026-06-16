"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/auth/client";
import { toast } from "sonner";
import Link from "next/link";
import { MailCheck } from "lucide-react";

export function SignUpForm() {
	const router = useRouter();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [emailSent, setEmailSent] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (password.length < 8) {
			toast.error("Password must be at least 8 characters");
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
				toast.success("Account created!");
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

	if (emailSent) {
		return (
			<div className="flex flex-col items-center justify-center space-y-4 py-8 text-center">
				<div className="rounded-full bg-blue-500/20 p-4 text-blue-400">
					<MailCheck className="size-10" />
				</div>
				<h3 className="text-xl font-medium text-white">Check your inbox</h3>
				<p className="text-sm text-zinc-400 max-w-[280px]">
					We just sent a verification link to{" "}
					<strong className="text-white">{email}</strong>. Please click the link
					to activate your account.
				</p>
				<button
					onClick={() => setEmailSent(false)}
					className="mt-4 text-xs text-zinc-500 hover:text-white transition-colors"
				>
					Used the wrong email? Go back
				</button>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div>
				<label
					htmlFor="name"
					className="mb-1 block text-xs font-medium text-zinc-400"
				>
					Name
				</label>
				<input
					id="name"
					type="text"
					value={name}
					onChange={(e) => setName(e.target.value)}
					required
					className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
					placeholder="Your name"
				/>
			</div>
			<div>
				<label
					htmlFor="email"
					className="mb-1 block text-xs font-medium text-zinc-400"
				>
					Email
				</label>
				<input
					id="email"
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
					className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
					placeholder="you@example.com"
				/>
			</div>
			<div>
				<label
					htmlFor="password"
					className="mb-1 block text-xs font-medium text-zinc-400"
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
					className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
					placeholder="Min. 8 characters"
				/>
			</div>
			<button
				type="submit"
				disabled={loading}
				className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
			>
				{loading ? "Creating account..." : "Create Account"}
			</button>
			<p className="text-center text-xs text-zinc-500">
				Already have an account?{" "}
				<Link href="/sign-in" className="text-blue-400 hover:text-blue-300">
					Sign In
				</Link>
			</p>
		</form>
	);
}
