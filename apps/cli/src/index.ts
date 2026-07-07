#!/usr/bin/env node
/** @module cli CLI entry point for Lazynext with auth support */

import { Command } from "commander";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const CONFIG_DIR = path.join(os.homedir(), ".lazynext");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const AUTH_BASE_URL = process.env.LAZYNEXT_AUTH_URL || "http://localhost:3000/api/auth";

interface Config {
	token?: string;
	user?: { id: string; name: string; email: string };
	apiGatewayUrl?: string;
}

/** Read the CLI config file from ~/.lazynext/config.json, returning defaults if missing. */
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

/** Write config to disk, creating the directory and setting restrictive permissions (0600). */
function saveConfig(config: Config) {
	if (!fs.existsSync(CONFIG_DIR)) {
		fs.mkdirSync(CONFIG_DIR, { recursive: true });
	}
	fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
	fs.chmodSync(CONFIG_FILE, 0o600);
}

/** Load the stored JWT token from the CLI config, or null if not authenticated. */
function getToken(): string | null {
	const config = loadConfig();
	return config.token || null;
}

/** Send a JSON POST to the auth service and return either data or an error message. */
async function authFetch(
	path: string,
	body: Record<string, unknown>,
): Promise<{ data?: unknown; error?: string }> {
	try {
		const res = await fetch(`${AUTH_BASE_URL}/${path}`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
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

const program = new Command();

program
	.name("lazynext")
	.description("CLI to orchestrate autonomous video editing with Lazynext API Gateway")
	.version("0.1.0");

program
	.command("login")
	.description("Sign in to your Lazynext account")
	.requiredOption("-e, --email <string>", "Your email address")
	.requiredOption("-p, --password <string>", "Your password")
	.action(async (options) => {
		console.log("🔐 Signing in...");
		const result = await authFetch("sign-in/email", {
			email: options.email,
			password: options.password,
			rememberMe: true,
		});

		if (result.error) {
			console.error(`❌ Login failed: ${result.error}`);
			process.exit(1);
		}

		const data = result.data as Record<string, unknown>;
		const token = data.token as string;
		const user = data.user as Record<string, string> | undefined;

		const config = loadConfig();
		config.token = token;
		if (user) {
			config.user = { id: user.id, name: user.name, email: user.email };
		}
		saveConfig(config);

		console.log(`✅ Signed in as ${user?.email || options.email}`);
	});

program
	.command("register")
	.description("Create a new Lazynext account")
	.requiredOption("-e, --email <string>", "Your email address")
	.requiredOption("-p, --password <string>", "Your password (min 8 chars)")
	.option("-n, --name <string>", "Your name")
	.action(async (options) => {
		console.log("📝 Creating account...");
		const result = await authFetch("sign-up/email", {
			email: options.email,
			password: options.password,
			name: options.name || options.email.split("@")[0],
		});

		if (result.error) {
			console.error(`❌ Registration failed: ${result.error}`);
			process.exit(1);
		}

		const data = result.data as Record<string, unknown>;
		const token = data.token as string;
		const user = data.user as Record<string, string> | undefined;

		const config = loadConfig();
		config.token = token;
		if (user) {
			config.user = { id: user.id, name: user.name, email: user.email };
		}
		saveConfig(config);

		console.log(`✅ Account created! Signed in as ${user?.email || options.email}`);
	});

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
		config.user = undefined;
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
		} else {
			console.log("❌ Not logged in. Use 'lazynext login' to sign in.");
		}
	});

program
	.command("forgot-password")
	.description("Request a password reset email")
	.requiredOption("-e, --email <string>", "Your email address")
	.action(async (options) => {
		console.log("📧 Sending password reset email...");
		const result = await authFetch("request-password-reset", {
			email: options.email,
			redirectTo: "/reset-password",
		});

		if (result.error) {
			console.error(`❌ Failed: ${result.error}`);
			process.exit(1);
		}

		console.log("✅ If that account exists, a reset link has been sent.");
	});

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
