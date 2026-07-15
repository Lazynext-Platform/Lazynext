#!/usr/bin/env node
/** @module cli CLI entry point for Lazynext with full auth support */

import { Command } from "commander";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as readline from "node:readline";

const CONFIG_DIR = path.join(os.homedir(), ".lazynext");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const AUTH_BASE_URL = process.env.LAZYNEXT_AUTH_URL || "http://localhost:3000/api/auth";

interface Config {
	token?: string;
	refreshToken?: string;
	user?: { id: string; name: string; email: string; role?: string };
	apiGatewayUrl?: string;
	provider?: string;
	mfaEnabled?: boolean;
}

function loadConfig(): Config {
	try {
		if (fs.existsSync(CONFIG_FILE)) {
			return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
		}
	} catch {
		// Ignore parse errors
	}
	return {};
}

function saveConfig(config: Config) {
	if (!fs.existsSync(CONFIG_DIR)) {
		fs.mkdirSync(CONFIG_DIR, { recursive: true });
	}
	fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
	fs.chmodSync(CONFIG_FILE, 0o600);
}

function getToken(): string | null {
	const config = loadConfig();
	return config.token || null;
}

async function authFetch(
	path: string,
	body: Record<string, unknown>,
	captchaToken?: string,
): Promise<{ data?: unknown; error?: string }> {
	try {
		const config = loadConfig();
		const headers: Record<string, string> = { "Content-Type": "application/json" };
		if (config.token) {
			headers["Authorization"] = `Bearer ${config.token}`;
		}
		if (captchaToken) {
			headers["X-Captcha-Token"] = captchaToken;
		}
		const res = await fetch(`${AUTH_BASE_URL}/${path}`, {
			method: "POST",
			headers,
			body: JSON.stringify(body),
		});
		const data = (await res.json()) as Record<string, unknown>;
		if (!res.ok) {
			return { error: (data.message as string) || `HTTP ${res.status}` };
		}
		return { data };
	} catch (err) {
		return { error: err instanceof Error ? err.message : "Network error" };
	}
}

function getApiGatewayUrl(): string {
	const config = loadConfig();
	return config.apiGatewayUrl || process.env.API_GATEWAY_URL || "http://localhost:8005";
}

// ── Proof-of-Work CAPTCHA ──────────────────────────────────────────

import * as crypto from "node:crypto";

interface PowChallenge {
	challenge_id: string;
	prefix: string;
	difficulty: number;
	expires_at: number;
}

async function getPowChallenge(): Promise<PowChallenge> {
	const apiUrl = getApiGatewayUrl();
	const res = await fetch(`${apiUrl}/api/v1/captcha/challenge`);
	if (!res.ok) throw new Error("Failed to get CAPTCHA challenge");
	return res.json() as Promise<PowChallenge>;
}

function checkDifficulty(hash: Buffer, difficulty: number): boolean {
	const fullBytes = Math.floor(difficulty / 8);
	const remainingBits = difficulty % 8;
	for (let i = 0; i < fullBytes; i++) {
		if (hash[i] !== 0) return false;
	}
	if (remainingBits > 0 && fullBytes < hash.length) {
		const mask = 0xff << (8 - remainingBits);
		if ((hash[fullBytes] & mask) !== 0) return false;
	}
	return true;
}

function solvePowChallenge(challenge: PowChallenge): number {
	const { prefix, difficulty } = challenge;
	for (let nonce = 0; nonce < 1_000_000_000; nonce++) {
		const hash = crypto.createHash("sha256").update(`${prefix}${nonce}`).digest();
		if (checkDifficulty(hash, difficulty)) {
			return nonce;
		}
	}
	throw new Error("Could not solve proof-of-work challenge");
}

async function verifyPowSolution(challengeId: string, nonce: number): Promise<boolean> {
	const apiUrl = getApiGatewayUrl();
	const res = await fetch(`${apiUrl}/api/v1/captcha/verify-pow`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ challenge_id: challengeId, nonce }),
	});
	if (!res.ok) return false;
	const data = await res.json() as { success: boolean };
	return data.success === true;
}

async function performCaptcha(): Promise<string | null> {
	try {
		console.log("🤖 Verifying you are not a robot...");
		const challenge = await getPowChallenge();
		console.log(`   Solving challenge (difficulty: ${challenge.difficulty} bits)...`);
		const nonce = solvePowChallenge(challenge);
		const verified = await verifyPowSolution(challenge.challenge_id, nonce);
		if (verified) {
			console.log("✅ Verification successful");
			return `${challenge.challenge_id}:${nonce}`;
		}
		console.error("❌ CAPTCHA verification failed");
		return null;
	} catch (err) {
		console.error(`❌ CAPTCHA error: ${err instanceof Error ? err.message : "Unknown error"}`);
		return null;
	}
}

function prompt(question: string): Promise<string> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	return new Promise((resolve) => {
		rl.question(question, (answer) => {
			rl.close();
			resolve(answer.trim());
		});
	});
}

const program = new Command();

program
	.name("lazynext")
	.description("CLI to orchestrate autonomous video editing with Lazynext API Gateway")
	.version("0.1.0");

// ── Email/Password Login ──────────────────────────────────────────

program
	.command("login")
	.description("Sign in to your Lazynext account")
	.requiredOption("-e, --email <string>", "Your email address")
	.requiredOption("-p, --password <string>", "Your password")
	.action(async (options) => {
		const captchaToken = await performCaptcha();
		if (!captchaToken) {
			process.exit(1);
		}
		console.log("🔐 Signing in...");
		const result = await authFetch("sign-in/email", {
			email: options.email,
			password: options.password,
			rememberMe: true,
		}, captchaToken);

		if (result.error) {
			console.error(`❌ Login failed: ${result.error}`);
			process.exit(1);
		}

		const data = result.data as Record<string, unknown>;
		const token = data.token as string;
		const user = data.user as Record<string, string> | undefined;

		if (!token) {
			// MFA may be required — the session is created but needs 2FA verification
			// via the web app. Use `lazynext login-token` after signing in via browser.
			console.error("❌ Login failed. If your account has two-factor authentication enabled,");
			console.error("   sign in at the web app and use: lazynext login-token --token <YOUR_TOKEN>");
			process.exit(1);
		}

		const mfaEnabled = !!(data.twoFactorEnabled || (data as any).twoFactorEnabled);

		const config = loadConfig();
		config.token = token;
		config.provider = "email";
		config.mfaEnabled = mfaEnabled;
		if (user) {
			config.user = { id: user.id, name: user.name, email: user.email };
		}
		saveConfig(config);

		console.log(`✅ Signed in as ${user?.email || options.email}`);
	});

// ── OAuth / Social Login (Browser + Token Paste) ────────────────

program
	.command("login-social")
	.description("Sign in with Google, Apple, or Microsoft")
	.option("-p, --provider <string>", "Provider: google, apple, microsoft", "google")
	.action(async (options) => {
		const provider = options.provider;
		if (!["google", "apple", "microsoft"].includes(provider)) {
			console.error(`❌ Unknown provider: ${provider}. Use google, apple, or microsoft.`);
			process.exit(1);
		}

		const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
		const authUrl = `${siteUrl}/sign-in?redirect=/cli-auth?provider=${provider}`;

		console.log(`🔗 Opening browser to sign in with ${provider}...`);
		console.log(`   If the browser does not open, visit: ${authUrl}`);

		const startCmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
		const { exec } = await import("node:child_process");
		exec(`${startCmd} "${authUrl}"`);

		console.log(`\n📋 After signing in, run this command to complete setup:`);
		console.log(`   lazynext login --token YOUR_TOKEN`);
		console.log(`\n   You can find your token at: ${siteUrl}/settings/token`);
	});

// ── Token-Based Login ──────────────────────────────────────────

program
	.command("login-token")
	.description("Sign in using a token from the web app")
	.requiredOption("--token <string>", "Your authentication token")
	.action(async (options) => {
		const token = options.token as string;
		const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

		console.log("🔐 Verifying token...");
		try {
			const res = await fetch(`${siteUrl}/api/auth/get-session`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) {
				console.error(`❌ Invalid or expired token. Generate a new one at ${siteUrl}/settings/token`);
				process.exit(1);
			}
			const data = (await res.json()) as Record<string, unknown>;
			const user = data.user as Record<string, string> | undefined;

			const config = loadConfig();
			config.token = token;
			config.provider = "token-based";
			config.mfaEnabled = false;
			if (user) {
				config.user = { id: user.id, name: user.name, email: user.email };
			}
			saveConfig(config);

			console.log(`✅ Signed in as ${user?.email || "unknown"}`);
		} catch {
			console.error(`❌ Could not connect to ${siteUrl}. Is the server running?`);
			process.exit(1);
		}
	});

// ── Magic Link Login ──────────────────────────────────────────────

program
	.command("login-magic")
	.description("Sign in with a magic link sent to your email")
	.requiredOption("-e, --email <string>", "Your email address")
	.action(async (options) => {
		const captchaToken = await performCaptcha();
		if (!captchaToken) {
			process.exit(1);
		}
		console.log(`📧 Sending magic link to ${options.email}...`);
		const result = await authFetch("sign-in/magic-link", {
			email: options.email,
			callbackURL: "lazynext://cli-auth",
		}, captchaToken);

		if (result.error) {
			console.error(`❌ Failed: ${result.error}`);
			process.exit(1);
		}

		console.log("✅ Magic link sent! Check your email and click the link to sign in.");
		console.log("💡 The magic link will open in your browser and redirect to the CLI.");
	});

// ── Registration ──────────────────────────────────────────────────

program
	.command("register")
	.description("Create a new Lazynext account")
	.requiredOption("-e, --email <string>", "Your email address")
	.requiredOption("-p, --password <string>", "Your password (min 8 chars)")
	.option("-n, --name <string>", "Your name")
	.action(async (options) => {
		const captchaToken = await performCaptcha();
		if (!captchaToken) {
			process.exit(1);
		}
		console.log("📝 Creating account...");
		const result = await authFetch("sign-up/email", {
			email: options.email,
			password: options.password,
			name: options.name || options.email.split("@")[0],
		}, captchaToken);

		if (result.error) {
			console.error(`❌ Registration failed: ${result.error}`);
			process.exit(1);
		}

		const data = result.data as Record<string, unknown>;
		const token = data.token as string;
		const user = data.user as Record<string, string> | undefined;

		const config = loadConfig();
		config.token = token;
		config.provider = "email";
		config.mfaEnabled = false;
		if (user) {
			config.user = { id: user.id, name: user.name, email: user.email };
		}
		saveConfig(config);

		console.log(`✅ Account created! Signed in as ${user?.email || options.email}`);
	});

// ── MFA / 2FA Setup ───────────────────────────────────────────────

program
	.command("mfa")
	.description("Manage two-factor authentication")
	.option("--enable", "Enable two-factor authentication")
	.option("--disable", "Disable two-factor authentication")
	.option("--verify <code>", "Verify and activate 2FA with TOTP code")
	.action(async (options) => {
		if (options.enable) {
			console.log("🔒 Setting up two-factor authentication...");
			const result = await authFetch("two-factor/enable", {});
			if (result.error) {
				console.error(`❌ Failed: ${result.error}`);
				process.exit(1);
			}
			const data = result.data as Record<string, unknown>;
			if (data.qrCode) {
				console.log("📱 Scan this QR code with your authenticator app:");
				console.log(data.qrCode);
				console.log("\nAfter scanning, run: lazynext mfa --verify <code>");
				console.log(`\n🔑 Backup codes (save these!):`);
				if (Array.isArray(data.backupCodes)) {
					data.backupCodes.forEach((code: string) => console.log(`  ${code}`));
				}
			}
		} else if (options.verify) {
			console.log("🔐 Verifying two-factor setup...");
			const result = await authFetch("two-factor/verify-setup", {
				code: options.verify,
			});
			if (result.error) {
				console.error(`❌ Verification failed: ${result.error}`);
				process.exit(1);
			}
			console.log("✅ Two-factor authentication is now active!");
			const config = loadConfig();
			config.mfaEnabled = true;
			saveConfig(config);
		} else if (options.disable) {
			console.log("🔓 Disabling two-factor authentication...");
			const result = await authFetch("two-factor/disable", {});
			if (result.error) {
				console.error(`❌ Failed: ${result.error}`);
				process.exit(1);
			}
			console.log("✅ Two-factor authentication disabled.");
			const config = loadConfig();
			config.mfaEnabled = false;
			saveConfig(config);
		} else {
			const config = loadConfig();
			if (config.mfaEnabled) {
				console.log("🔒 Two-factor authentication is ENABLED on your account.");
			} else {
				console.log("🔓 Two-factor authentication is DISABLED.");
				console.log("  Run 'lazynext mfa --enable' to set it up.");
			}
		}
	});

// ── Logout ────────────────────────────────────────────────────────

program
	.command("logout")
	.description("Sign out from your Lazynext account")
	.action(async () => {
		const config = loadConfig();
		if (config.token) {
			try {
				await fetch(`${AUTH_BASE_URL}/sign-out`, {
					method: "POST",
					headers: { Authorization: `Bearer ${config.token}` },
				});
			} catch {
				// Ignore network errors on logout
			}
		}
		config.token = undefined;
		config.refreshToken = undefined;
		config.user = undefined;
		config.provider = undefined;
		config.mfaEnabled = undefined;
		saveConfig(config);
		console.log("👋 Signed out successfully");
	});

program
	.command("whoami")
	.description("Show your currently logged-in account")
	.action(() => {
		const config = loadConfig();
		if (config.user) {
			console.log(`👤 ${config.user.name} <${config.user.email}>`);
			console.log(`   ID: ${config.user.id}`);
			if (config.user.role) console.log(`   Role: ${config.user.role}`);
			if (config.provider) console.log(`   Signed in via: ${config.provider}`);
			if (config.mfaEnabled) console.log("   MFA: Enabled 🔒");
		} else {
			console.log("❌ Not logged in. Use 'lazynext login' to sign in.");
		}
	});

program
	.command("forgot-password")
	.description("Request a password reset email")
	.requiredOption("-e, --email <string>", "Your email address")
	.action(async (options) => {
		const captchaToken = await performCaptcha();
		if (!captchaToken) {
			process.exit(1);
		}
		console.log("📧 Sending password reset email...");
		const result = await authFetch("request-password-reset", {
			email: options.email,
			redirectTo: "/reset-password",
		}, captchaToken);

		if (result.error) {
			console.error(`❌ Failed: ${result.error}`);
			process.exit(1);
		}

		console.log("✅ If that account exists, a reset link has been sent.");
	});

// ── Edit & Prompt Commands ─────────────────────────────────────────

program
	.command("edit")
	.description("Execute an autonomous video edit")
	.requiredOption("-p, --prompt <string>", "Natural language instruction for the edit")
	.option("-a, --analyze <string>", "Analyze media files before editing (provide path to media)")
	.action(async (options) => {
		const token = getToken();
		if (!token) {
			console.error("❌ Not logged in. Run 'lazynext login' first.");
			process.exit(1);
		}

		console.log(`🤖 Requesting autonomous edit: "${options.prompt}"`);

		try {
			const res = await fetch(`${getApiGatewayUrl()}/v1/execute`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ prompt: options.prompt }),
			});

			if (res.status === 401) {
				console.error("❌ Session expired. Run 'lazynext login' to sign in again.");
				process.exit(1);
			}

			if (!res.ok) {
				throw new Error(`API Gateway returned status: ${res.status}`);
			}

			const data = (await res.json()) as { jobId: string; status: string };
			console.log(`✅ Job created successfully! Job ID: ${data.jobId}`);
			console.log(`⏳ Status: ${data.status}`);

			const poll = setInterval(async () => {
				try {
					const pollRes = await fetch(
						`${getApiGatewayUrl()}/v1/jobs/${data.jobId}`,
						{
							headers: { Authorization: `Bearer ${token}` },
						},
					);
					if (pollRes.ok) {
						const jobData = (await pollRes.json()) as Record<string, unknown>;
						if (jobData.status === "completed") {
							console.log(`\n🎉 Job completed!`);
							console.log(`Result: ${jobData.result}`);
							console.log(`Video URL: ${jobData.videoUrl}`);
							clearInterval(poll);
						} else if (jobData.status === "failed") {
							console.error(`\n❌ Job failed: ${jobData.error}`);
							clearInterval(poll);
						} else {
							process.stdout.write(".");
						}
					}
				} catch {
					// Ignore network errors while polling
				}
			}, 1000);
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			console.error(`❌ Error communicating with API Gateway: ${message}`);
		}
	});

program
	.command("prompt <prompt-text>")
	.description("Agentic command to orchestrate a full video edit workflow")
	.action(async (promptText) => {
		const token = getToken();
		if (!token) {
			console.error("❌ Not logged in. Run 'lazynext login' first.");
			process.exit(1);
		}

		console.log(`🤖 Agentic Workflow Triggered: "${promptText}"`);
		try {
			const res = await fetch(`${getApiGatewayUrl()}/v1/execute`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ prompt: promptText, mode: "agentic" }),
			});

			if (res.status === 401) {
				console.error("❌ Session expired. Run 'lazynext login' to sign in again.");
				process.exit(1);
			}

			if (!res.ok) {
				throw new Error(`API Gateway returned status: ${res.status}`);
			}

			const data = (await res.json()) as { jobId: string; status: string };
			console.log(`✅ Agentic Job created successfully! Job ID: ${data.jobId}`);
			console.log(`⏳ Status: ${data.status}`);

			const poll = setInterval(async () => {
				try {
					const pollRes = await fetch(
						`${getApiGatewayUrl()}/v1/jobs/${data.jobId}`,
						{
							headers: { Authorization: `Bearer ${token}` },
						},
					);
					if (pollRes.ok) {
						const jobData = (await pollRes.json()) as Record<string, unknown>;
						if (jobData.status === "completed") {
							console.log(`\n🎉 Agentic Workflow completed!`);
							console.log(`Result: ${jobData.result}`);
							console.log(`Video URL: ${jobData.videoUrl}`);
							clearInterval(poll);
						} else if (jobData.status === "failed") {
							console.error(`\n❌ Job failed: ${jobData.error}`);
							clearInterval(poll);
						} else {
							process.stdout.write(".");
						}
					}
				} catch {
					// Ignore network errors while polling
				}
			}, 1000);
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			console.error(`❌ Error communicating with API Gateway: ${message}`);
		}
	});

program.parse(process.argv);
