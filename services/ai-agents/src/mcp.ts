/**
 * MCP (Model Context Protocol) client manager.
 *
 * Initializes and manages connections to external MCP servers (Playwright,
 * Firecrawl, Context7) over stdio transport. Provides tool discovery and
 * execution across all connected servers for the AI orchestrator.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Keep track of active MCP clients
const mcpClients: Map<string, Client> = new Map();

/**
 * Initialize an MCP client via stdio transport
 */
async function initMcpClient(name: string, command: string, args: string[], env?: Record<string, string>) {
  console.log(`[MCP] Initializing ${name} MCP Server...`);
  
  const transport = new StdioClientTransport({
    command,
    args,
    env: { ...process.env, ...env }
  });

  const client = new Client(
    { name: "lazynext-ai-agents", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  await client.connect(transport);
  mcpClients.set(name, client);
  
  const tools = await client.listTools();
  console.log(`[MCP] ${name} connected successfully. Available tools: ${tools.tools.map(t => t.name).join(", ")}`);
  
  return client;
}

/**
 * Initialize all required MCP servers (Playwright, Firecrawl, Context7)
 */
export async function setupMcpServers() {
  try {
    // 1. Playwright MCP (for browser automation/recording)
    await initMcpClient("playwright", "npx", ["-y", "@modelcontextprotocol/server-playwright"]);

    // 2. Firecrawl MCP (for web scraping assets)
    // Note: requires FIRECRAWL_API_KEY in env
    if (process.env.FIRECRAWL_API_KEY) {
      await initMcpClient("firecrawl", "npx", ["-y", "firecrawl-mcp-server"]);
    } else {
      console.warn("[MCP] FIRECRAWL_API_KEY not found, skipping Firecrawl MCP.");
    }

    // 3. Context7 MCP (Expanded context management)
    // Placeholder command assuming context7 is available via npx or equivalent
    try {
      await initMcpClient("context7", "npx", ["-y", "context7-mcp"]);
    } catch (err) {
      console.warn("[MCP] Failed to start Context7 MCP. It might require specific setup:", err);
    }

  } catch (error) {
    console.error("[MCP] Error setting up MCP servers:", error);
  }
}

/**
 * Get an initialized MCP client by name
 */
export function getMcpClient(name: string): Client | undefined {
  return mcpClients.get(name);
}

/**
 * Execute a tool on a specific MCP server
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
 * Get all available tools across all connected MCP servers
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
