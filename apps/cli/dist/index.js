#!/usr/bin/env node
"use strict";
/** @module cli CLI entry point for Lazynext with auth support */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const os = __importStar(require("node:os"));
const CONFIG_DIR = path.join(os.homedir(), ".lazynext");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const AUTH_BASE_URL = process.env.LAZYNEXT_AUTH_URL || "http://localhost:3000/api/auth";
function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
        }
    }
    catch {
        // Ignore parse errors
    }
    return {};
}
function saveConfig(config) {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    fs.chmodSync(CONFIG_FILE, 0o600);
}
function getToken() {
    const config = loadConfig();
    return config.token || null;
}
async function authFetch(path, body) {
    try {
        const res = await fetch(`${AUTH_BASE_URL}/${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const data = (await res.json());
        if (!res.ok) {
            return { error: data.message || `HTTP ${res.status}` };
        }
        return { data };
    }
    catch (err) {
        return { error: err instanceof Error ? err.message : "Network error" };
    }
}
function getApiGatewayUrl() {
    const config = loadConfig();
    return config.apiGatewayUrl || process.env.API_GATEWAY_URL || "http://localhost:8005";
}
const program = new commander_1.Command();
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
    const data = result.data;
    const token = data.token;
    const user = data.user;
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
    const data = result.data;
    const token = data.token;
    const user = data.user;
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
        }
        catch {
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
    }
    else {
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
        const data = (await res.json());
        console.log(`✅ Job created successfully! Job ID: ${data.jobId}`);
        console.log(`⏳ Status: ${data.status}`);
        const poll = setInterval(async () => {
            try {
                const pollRes = await fetch(`${getApiGatewayUrl()}/v1/jobs/${data.jobId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (pollRes.ok) {
                    const jobData = (await pollRes.json());
                    if (jobData.status === "completed") {
                        console.log(`\n🎉 Job completed!`);
                        console.log(`Result: ${jobData.result}`);
                        console.log(`Video URL: ${jobData.videoUrl}`);
                        clearInterval(poll);
                    }
                    else if (jobData.status === "failed") {
                        console.error(`\n❌ Job failed: ${jobData.error}`);
                        clearInterval(poll);
                    }
                    else {
                        process.stdout.write(".");
                    }
                }
            }
            catch {
                // Ignore network errors while polling
            }
        }, 1000);
    }
    catch (error) {
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
        const data = (await res.json());
        console.log(`✅ Agentic Job created successfully! Job ID: ${data.jobId}`);
        console.log(`⏳ Status: ${data.status}`);
        const poll = setInterval(async () => {
            try {
                const pollRes = await fetch(`${getApiGatewayUrl()}/v1/jobs/${data.jobId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (pollRes.ok) {
                    const jobData = (await pollRes.json());
                    if (jobData.status === "completed") {
                        console.log(`\n🎉 Agentic Workflow completed!`);
                        console.log(`Result: ${jobData.result}`);
                        console.log(`Video URL: ${jobData.videoUrl}`);
                        clearInterval(poll);
                    }
                    else if (jobData.status === "failed") {
                        console.error(`\n❌ Job failed: ${jobData.error}`);
                        clearInterval(poll);
                    }
                    else {
                        process.stdout.write(".");
                    }
                }
            }
            catch {
                // Ignore network errors while polling
            }
        }, 1000);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`❌ Error communicating with API Gateway: ${message}`);
    }
});
program.parse(process.argv);
