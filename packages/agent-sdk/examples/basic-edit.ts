/**
 * Basic Edit — Lazynext AI Agent Agent TypeScript SDK
 *
 * Demonstrates the streaming agent loop: a natural-language prompt is
 * sent to the Lazynext AI Agent agent, which translates it into CRDT timeline
 * operations and yields events as they occur.
 *
 * ## Running the Example
 *
 * ```bash
 * cd packages/agent-sdk
 * npx tsx examples/basic-edit.ts
 * ```
 *
 * @example
 */

import { Lazynext AI AgentAgent } from "../src/index.js";

const AGENT_ENDPOINT =
	process.env.LAZYNEXT_API_URL ?? "http://localhost:8005";

async function main() {
	const agent = new Lazynext AI AgentAgent({
		apiEndpoint: AGENT_ENDPOINT,
		mode: "auto_execute",
	});

	const prompt =
		"Add auto-generated captions to the first video track, then remove any silent segments longer than 1 second.";

	console.log(`\n  Prompt: ${prompt}\n`);

	try {
		for await (const event of agent.query(prompt)) {
			const { type, data, timestamp } = event;

			switch (type) {
				case "thinking":
					console.log(
						`  [thinking] ${(data as { thought: string }).thought}`,
					);
					break;
				case "plan":
					console.log("  [plan] Generated execution plan");
					break;
				case "tool_call":
					console.log(
						`  [tool_call] ${(data as { tool: string }).tool}`,
					);
					break;
				case "tool_result":
					console.log("  [tool_result] Tool executed");
					break;
				case "edit_applied":
					console.log(
						`  [edit_applied] Mutation applied to timeline`,
					);
					break;
				case "status":
					console.log(
						`  [status] ${(data as { message: string }).message}`,
					);
					break;
				case "error":
					console.error(
						`  [error] ${(data as { message: string }).message}`,
					);
					break;
				case "done":
					console.log(
						`\n  Complete: ${(data as { summary: string }).summary}`,
					);
					break;
				default:
					console.log(`  [${type}]`, JSON.stringify(data));
			}
		}
	} catch (err) {
		console.error("Agent query failed:", err);
		process.exit(1);
	}
}

main();
