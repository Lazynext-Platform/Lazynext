/**
 * Login modal — dialog with sign-in form, magic link, and social
 * auth options. MFA/two-factor is handled by the twoFactorClient plugin.
 * Includes Cloudflare Turnstile CAPTCHA verification.
 *
 * @module components/auth/LoginModal
 */

"use client";

import React, { useState, useRef } from "react";
import { X, Mail, Lock } from "lucide-react";
import { signIn, signUp } from "@/auth/client";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import { friendlyAuthError } from "./auth-errors";
import { SocialAuthButtons } from "./SocialAuthButtons";
import { CaptchaWidget } from "./CaptchaWidget";
import { verifyCaptchaToken } from "./captcha-verify";

/** React component rendering LoginModal. */
export function LoginModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
	const [isLogin, setIsLogin] = useState(true);
	const [loginMode, setLoginMode] = useState<"password" | "magicLink">("password");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [name, setName] = useState("");
	const [isLoading, setIsLoading] = useState(false);
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
		if (!email) return;

		setIsLoading(true);
		try {
			if (!(await verifyCaptcha())) {
				setIsLoading(false);
				return;
			}

			if (isLogin && loginMode === "password") {
				if (!password) {
					toast.error("Please enter your password");
					setIsLoading(false);
					return;
				}
				const { data, error } = await signIn.email(
					{
						email,
						password,
						rememberMe: true,
					},
					captchaToken.current
						? { headers: { "X-Captcha-Token": captchaToken.current } }
						: undefined,
				);
				if (error) {
					toast.error(friendlyAuthError(error, "Invalid email or password"));
					setIsLoading(false);
					captchaToken.current = "";
					return;
				}
				if (data) {
					toast.success("Signed in successfully!");
				}
			} else if (isLogin && loginMode === "magicLink") {
				const { error } = await signIn.magicLink(
					{
						email,
						callbackURL: "/dashboard",
					},
					captchaToken.current
						? { headers: { "X-Captcha-Token": captchaToken.current } }
						: undefined,
				);
				if (error) {
					toast.error(friendlyAuthError(error, "Could not send magic link"));
					setIsLoading(false);
					captchaToken.current = "";
					return;
				}
				toast.success("Magic link sent! Check your email to sign in.");
			} else {
				if (!password || password.length < 8) {
					toast.error("Password must be at least 8 characters");
					setIsLoading(false);
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
					setIsLoading(false);
					captchaToken.current = "";
					return;
				}
				if (data) {
					toast.success("Account created successfully!");
				}
			}
			onClose();
			setEmail("");
			setPassword("");
			setName("");
		} catch (err) {
			toast.error(friendlyAuthError(err, "Authentication failed"));
			captchaToken.current = "";
		} finally {
			setIsLoading(false);
		}
	};

	const toggleMode = () => {
		setIsLogin(!isLogin);
		setLoginMode("password");
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
						className="absolute inset-0 bg-glass backdrop-blur-sm"
					/>

					<motion.div
						initial={{ scale: 0.95, opacity: 0, y: 10 }}
						animate={{ scale: 1, opacity: 1, y: 0 }}
						exit={{ scale: 0.95, opacity: 0, y: 10 }}
						className="relative w-full max-w-md p-6 overflow-hidden border rounded-2xl bg-panel border-border shadow-2xl backdrop-blur-xl"
					>
						<button
							onClick={onClose}
							className="absolute top-4 right-4 p-2 text-muted hover:text-foreground rounded-full hover:bg-hover transition-colors"
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
								<label htmlFor="login-name" className="text-sm font-medium text-foreground">Name</label>
								<input
									id="login-name"
									type="text"
									value={name}
										onChange={(e) => setName(e.target.value)}
										required
										autoComplete="name"
										className="w-full px-4 py-2 bg-glass border border-border rounded-lg focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 transition-all text-sm"
										placeholder="Your name"
									/>
								</div>
							)}

							<div className="space-y-2">
								<label htmlFor="login-email" className="text-sm font-medium text-foreground">Email</label>
								<div className="relative">
									<Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
									<input
										id="login-email"
										type="email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										required
										autoComplete="email"
										className="w-full pl-10 pr-4 py-2 bg-glass border border-border rounded-lg focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 transition-all text-sm"
										placeholder="editor@lazynext.com"
									/>
								</div>
							</div>

							{(!isLogin || loginMode === "password") && (
								<div className="space-y-2">
								<label htmlFor="login-password" className="text-sm font-medium text-foreground">Password</label>
								<div className="relative">
									<Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
									<input
										id="login-password"
										type="password"
										value={password}
											onChange={(e) => setPassword(e.target.value)}
											required
											minLength={8}
											autoComplete={isLogin ? "current-password" : "new-password"}
											className="w-full pl-10 pr-4 py-2 bg-glass border border-border rounded-lg focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 transition-all text-sm"
											placeholder="••••••••"
										/>
									</div>
								</div>
							)}

							{isLogin && loginMode === "password" && (
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

							<CaptchaWidget
								onVerify={(token) => {
									captchaToken.current = token;
								}}
								onError={() => {
									captchaToken.current = "";
								}}
								disabled={isLoading}
							/>

							<button
								type="submit"
								disabled={isLoading}
								className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-background rounded-lg font-bold font-medium transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
							>
								{isLoading ? (
									<div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
								) : isLogin
									? loginMode === "password"
										? "Sign In"
										: "Send Magic Link"
									: "Create Account"}
							</button>
						</form>

						{isLogin && (
							<button
								type="button"
								onClick={() =>
									setLoginMode(loginMode === "password" ? "magicLink" : "password")
								}
								className="w-full text-center text-sm text-cyan-400 hover:text-cyan-300 mt-3"
							>
								{loginMode === "password"
									? "Sign in with magic link instead"
									: "Sign in with password instead"}
							</button>
						)}

						<div className="mt-2">
							<SocialAuthButtons mode={isLogin ? "signIn" : "signUp"} />
						</div>

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
