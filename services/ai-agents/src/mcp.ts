/**
 * MCP (Model Context Protocol) client manager.
 *
 * Initializes and manages connections to external MCP servers (Playwright,
 * Firecrawl, Context7) over stdio transport. Provides tool discovery and
 * execution across all connected servers for the AI orchestrator.
 *
 * Security: Only explicitly whitelisted environment variables are passed
 * to MCP subprocesses. process.env is never forwarded in full.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const WHITELISTED_ENV_VARS = new Set([
	"HOME", "PATH", "USER", "LANG", "TMPDIR", "TEMP", "TMP",
	"FIRECRAWL_API_KEY",
]);

function buildSubprocessEnv(extra?: Record<string, string>): Record<string, string> {
	const env: Record<string, string> = {};
	for (const key of WHITELISTED_ENV_VARS) {
		const val = process.env[key];
		if (val !== undefined) env[key] = val;
	}
	if (extra) {
		Object.assign(env, extra);
	}
	return env;
}

const mcpClients: Map<string, Client> = new Map();

async function initMcpClient(name: string, command: string, args: string[], env?: Record<string, string>) {
	console.log(`[MCP] Initializing ${name} MCP Server...`);

	const transport = new StdioClientTransport({
		command,
		args,
		env: buildSubprocessEnv(env),
	});

	const client = new Client(
		{ name: "lazynext-ai-agents", version: "1.0.0" },
		{ capabilities: { tools: {} } } as any
	);

	await client.connect(transport);
	mcpClients.set(name, client);

	const tools = await client.listTools();
	console.log(`[MCP] ${name} connected successfully. Available tools: ${tools.tools.map(t => t.name).join(", ")}`);

	return client;
}

/**
 * Initialize all configured MCP server connections (Playwright, Firecrawl, Context7).
 * Each server is started in a try/catch block so a single failure doesn't block others.
 * FIRECRAWL_API_KEY is required for Firecrawl; skipped gracefully if absent.
 *
 * @example
 * ```ts
 * await setupMcpServers();
 * const tools = await getAllMcpTools();
 * // tools = [{ server: "playwright", name: "browser_navigate", ... }, ...]
 * ```
 */
export async function setupMcpServers() {
	try {
		await initMcpClient("playwright", "npx", ["-y", "@modelcontextprotocol/server-playwright"]);
	} catch (error) {
		console.warn("[MCP] Failed to start Playwright MCP:", error);
	}

	try {
		if (process.env.FIRECRAWL_API_KEY) {
			await initMcpClient("firecrawl", "npx", ["-y", "firecrawl-mcp-server"]);
		} else {
			console.warn("[MCP] FIRECRAWL_API_KEY not found, skipping Firecrawl MCP.");
		}
	} catch (error) {
		console.warn("[MCP] Failed to start Firecrawl MCP:", error);
	}

	try {
		await initMcpClient("context7", "npx", ["-y", "context7-mcp"]);
	} catch (err) {
		console.warn("[MCP] Failed to start Context7 MCP. It might require specific setup:", err);
	}
}

/**
 * Get a connected MCP client by name. Returns undefined if the server
 * was not initialized or failed to connect.
 *
 * @param name - Server name (e.g. "playwright", "firecrawl", "context7")
 */
export function getMcpClient(name: string): Client | undefined {
	return mcpClients.get(name);
}

/**
 * Call a tool on a specific MCP server.
 *
 * @param serverName - Registered server name (e.g. "playwright")
 * @param toolName - Tool name to invoke (e.g. "browser_navigate")
 * @param args - Tool arguments object
 * @returns The tool execution result from the MCP server
 * @throws If the server is not initialized
 */
export async function callMcpTool(serverName: string, toolName: string, args: any) {
	const client = mcpClients.get(serverName);
	if (!client) {
		throw new Error(`MCP server ${serverName} is not initialized.`);
	}

	console.log(`[MCP] Calling ${serverName}:${toolName} with args:`, args);
	const result = await client.callTool({
		name: toolName,
		arguments: args,
	});

	return result;
}

/**
 * List all available tools across all connected MCP servers.
 * Each tool is annotated with its server name for routing.
 *
 * @returns Array of { server, name, description, inputSchema } objects
 */
export async function getAllMcpTools() {
	const allTools = [];

	for (const [name, client] of mcpClients.entries()) {
		try {
			const { tools } = await client.listTools();
			allTools.push(...tools.map(t => ({ server: name, ...t })));
		} catch (err) {
			console.error(`[MCP] Failed to list tools for ${name}:`, err);
		}
	}

	return allTools;
}
