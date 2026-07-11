/**
 * Login modal — dialog with sign-in form and social auth options.
 *
 * @module components/auth/LoginModal
 */

"use client";

import React, { useState } from "react";
import { X, Mail, Lock } from "lucide-react";
import { signIn, signUp } from "@/auth/client";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import { friendlyAuthError } from "./auth-errors";

export function LoginModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
	const [isLogin, setIsLogin] = useState(true);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [name, setName] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email || !password) return;

		setIsLoading(true);
		try {
			if (isLogin) {
				const { data, error } = await signIn.email({
					email,
					password,
					rememberMe: true,
				});
				if (error) {
					toast.error(friendlyAuthError(error, "Invalid email or password"));
					return;
				}
				if (data) {
					toast.success("Signed in successfully!");
				}
			} else {
				if (password.length < 8) {
					toast.error("Password must be at least 8 characters");
					setIsLoading(false);
					return;
				}
				const { data, error } = await signUp.email({
					email,
					password,
					name: name || email.split("@")[0],
				});
				if (error) {
					toast.error(friendlyAuthError(error, "Sign up failed"));
					return;
				}
				if (data) {
					toast.success("Account created successfully!");
				}
			}
			onClose();
		} catch (err) {
			toast.error(friendlyAuthError(err, "Authentication failed"));
		} finally {
			setIsLoading(false);
		}
	};

	const toggleMode = () => {
		setIsLogin(!isLogin);
		setIsLoading(false);
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<div className="fixed inset-0 z-[9999] flex items-center justify-center">
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={onClose}
						className="absolute inset-0 bg-black/60 backdrop-blur-sm"
					/>

					<motion.div
						initial={{ scale: 0.95, opacity: 0, y: 10 }}
						animate={{ scale: 1, opacity: 1, y: 0 }}
						exit={{ scale: 0.95, opacity: 0, y: 10 }}
						className="relative w-full max-w-md p-6 overflow-hidden border rounded-2xl bg-panel/80 border-white/10 shadow-2xl backdrop-blur-xl"
					>
						<button
							onClick={onClose}
							className="absolute top-4 right-4 p-2 text-muted hover:text-white rounded-full hover:bg-white/10 transition-colors"
						>
							<X className="w-4 h-4" />
						</button>

						<div className="text-center mb-8">
							<h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
								{isLogin ? "Welcome Back" : "Join Lazynext"}
							</h2>
							<p className="text-sm text-muted mt-2">
								{isLogin
									? "Sign in to access your projects and timeline."
									: "Create an account to start editing with AI."}
							</p>
						</div>

						<form onSubmit={handleSubmit} className="space-y-4">
							{!isLogin && (
								<div className="space-y-2">
									<label className="text-sm font-medium text-white/80">Name</label>
									<input
										type="text"
										value={name}
										onChange={(e) => setName(e.target.value)}
										required
										autoComplete="name"
										className="w-full px-4 py-2 bg-black/40 border border-white/10 rounded-lg focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 transition-all text-sm"
										placeholder="Your name"
									/>
								</div>
							)}

							<div className="space-y-2">
								<label className="text-sm font-medium text-white/80">Email</label>
								<div className="relative">
									<Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
									<input
										type="email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										required
										autoComplete="email"
										className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-lg focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 transition-all text-sm"
										placeholder="editor@lazynext.com"
									/>
								</div>
							</div>

							<div className="space-y-2">
								<label className="text-sm font-medium text-white/80">Password</label>
								<div className="relative">
									<Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
									<input
										type="password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										required
										minLength={8}
										autoComplete={isLogin ? "current-password" : "new-password"}
										className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-lg focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 transition-all text-sm"
										placeholder="••••••••"
									/>
								</div>
							</div>

							{isLogin && (
								<div className="text-right">
									<Link
										href="/forgot-password"
										onClick={onClose}
										className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
									>
										Forgot password?
									</Link>
								</div>
							)}

							<button
								type="submit"
								disabled={isLoading}
								className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white rounded-lg font-medium transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
							>
								{isLoading ? (
									<div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
								) : isLogin ? (
									"Sign In"
								) : (
									"Create Account"
								)}
							</button>
						</form>

						<div className="mt-6 text-center text-sm text-muted">
							{isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
							<button
								onClick={toggleMode}
								className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
							>
								{isLogin ? "Sign up" : "Sign in"}
							</button>
						</div>
					</motion.div>
				</div>
			)}
		</AnimatePresence>
	);
}
