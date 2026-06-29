import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "lazynext-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "autonomous_edit",
        description: "Executes an AI-powered video editing intent on the Lazynext timeline.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "The natural language instruction for the edit (e.g. 'cut silence').",
            },
          },
          required: ["prompt"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "autonomous_edit") {
    const args = request.params.arguments as { prompt?: string };
    const prompt = args.prompt || "";
    
    // Call the API Gateway
    try {
      const response = await fetch("http://localhost:8005/v1/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      
      const data = await response.json();
      return {
        content: [
          {
            type: "text",
            text: `Successfully initiated autonomous edit with Job ID: ${data.jobId}. Status: ${data.status}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to execute autonomous edit: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error("Tool not found");
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Lazynext MCP Server running on stdio");
}

run().catch(console.error);
