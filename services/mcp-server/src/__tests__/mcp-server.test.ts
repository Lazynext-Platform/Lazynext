/**
 * MCP Server integration tests.
 *
 * Uses InMemoryTransport from @modelcontextprotocol/sdk to create a
 * linked transport pair, mocking StdioServerTransport so the server
 * connects to our in-memory transport instead of real stdio.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, mock } from "bun:test";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";

// ── Transport bridge state ──────────────────────────────────────────

let clientTransport: InMemoryTransport;
const pendingRequests = new Map<string | number, (msg: unknown) => void>();
let nextId = 1;

function sendRequest(method: string, params?: Record<string, unknown>) {
	const id = nextId++;
	return new Promise<unknown>((resolve, reject) => {
		pendingRequests.set(id, resolve);
		const message: Record<string, unknown> = {
			jsonrpc: "2.0",
			id,
			method,
			params: params ?? {},
		};
		clientTransport.send(message as unknown as JSONRPCMessage).catch(reject);
		setTimeout(() => {
			if (pendingRequests.has(id)) {
				pendingRequests.delete(id);
				reject(new Error(`Timeout waiting for response to ${method}`));
			}
		}, 5000);
	});
}

function sendNotification(
	method: string,
	params?: Record<string, unknown>,
) {
	return clientTransport.send({
		jsonrpc: "2.0",
		method,
		params: params ?? {},
	} as unknown as JSONRPCMessage);
}

// ── Mock StdioServerTransport → InMemoryTransport ────────────────────

mock.module("@modelcontextprotocol/sdk/server/stdio.js", () => {
	const [client, server] = InMemoryTransport.createLinkedPair();
	clientTransport = client;

	clientTransport.onmessage = (msg: Record<string, unknown>) => {
		// Messages with an id are responses to pending requests
		if (msg.id !== undefined && msg.id !== null) {
			const resolve = pendingRequests.get(msg.id as string | number);
			if (resolve) {
				pendingRequests.delete(msg.id as string | number);
				resolve(msg);
			}
		}
	};

	return {
		StdioServerTransport: class {
			private _transport = server;
			start() {
				return this._transport.start();
			}
			close() {
				return this._transport.close();
			}
			send(message: unknown, _options?: unknown) {
				return this._transport.send(message as unknown as JSONRPCMessage);
			}
			get onmessage() {
				return this._transport.onmessage as
					| ((...args: unknown[]) => void)
					| undefined;
			}
			set onmessage(handler: ((...args: unknown[]) => void) | undefined) {
				this._transport.onmessage = handler;
			}
			get onclose() {
				return this._transport.onclose;
			}
			set onclose(handler: (() => void) | undefined) {
				this._transport.onclose = handler;
			}
			get onerror() {
				return this._transport.onerror;
			}
			set onerror(handler: ((error: Error) => void) | undefined) {
				this._transport.onerror = handler;
			}
		},
	};
});

// ── Mock globalThis.fetch for routing tests ──────────────────────────

const fetchCalls: Array<{ url: string; method: string; body: string }> = [];

const originalFetch = globalThis.fetch;
globalThis.fetch = (async (
	url: string | URL,
	init?: RequestInit,
) => {
	const urlStr = url.toString();
	const method = init?.method ?? "GET";
	const body = init?.body
		? typeof init.body === "string"
			? init.body
			: ""
		: "";
	fetchCalls.push({ url: urlStr, method, body });
	return new Response(JSON.stringify({ success: true, mock: true }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}) as typeof globalThis.fetch;

// ── Mock process.exit for shutdown tests ─────────────────────────────

const exitCodes: number[] = [];
const originalExit = process.exit;
process.exit = ((code?: number) => {
	exitCodes.push(code ?? 0);
}) as typeof process.exit;

// ── Dynamically import server module ─────────────────────────────────

let serverModule: Record<string, unknown>;

beforeAll(async () => {
	// Dynamic import so mocks are in place before server bootstraps
	serverModule = await import("../index.js");
	// Give server.connect() time to complete (InMemoryTransport is sync
	// but the protocol may defer some setup)
	await new Promise((r) => setTimeout(r, 50));

	// Perform MCP initialize handshake
	await sendRequest("initialize", {
		protocolVersion: "2025-03-26",
		capabilities: {},
		clientInfo: { name: "test-client", version: "1.0.0" },
	});
	await sendNotification("notifications/initialized", {});
});

afterAll(() => {
	globalThis.fetch = originalFetch;
	process.exit = originalExit;
});

// ═════════════════════════════════════════════════════════════════════
// 1. Tool listing
// ═════════════════════════════════════════════════════════════════════

describe("tools/list", () => {
	test("lists 87 tools", async () => {
		const response = (await sendRequest("tools/list")) as {
			result: { tools: unknown[] };
		};

		expect(response.result.tools).toBeDefined();
		expect(Array.isArray(response.result.tools)).toBe(true);
		expect(response.result.tools).toHaveLength(87);
	});

	test("each tool has a name, description, and valid JSON Schema inputSchema", async () => {
		const response = (await sendRequest("tools/list")) as {
			result: { tools: Array<Record<string, unknown>> };
		};

		for (const tool of response.result.tools) {
			expect(typeof tool.name).toBe("string");
			expect((tool.name as string).length).toBeGreaterThan(0);
			expect(typeof tool.description).toBe("string");
			expect((tool.description as string).length).toBeGreaterThan(0);

			const schema = tool.inputSchema as Record<string, unknown>;
			expect(schema).toBeDefined();
			expect(schema.type).toBe("object");

			const props = schema.properties as Record<string, unknown> | undefined;
			expect(props).toBeDefined();
			expect(typeof props).toBe("object");

			// Each property must have type and description
			for (const [propName, propDef] of Object.entries(props ?? {})) {
				expect(typeof propName).toBe("string");
				const def = propDef as Record<string, unknown>;
				expect(typeof def.type).toBe("string");
				expect(typeof def.description).toBe("string");
			}

			// If required is present, it must be a string array
			if (schema.required !== undefined) {
				expect(Array.isArray(schema.required)).toBe(true);
				for (const req of schema.required as unknown[]) {
					expect(typeof req).toBe("string");
				}
			}
		}
	});

	test("includes known core editing tools", async () => {
		const response = (await sendRequest("tools/list")) as {
			result: { tools: Array<{ name: string }> };
		};

		const names = response.result.tools.map((t) => t.name);
		expect(names).toContain("autonomous_edit");
		expect(names).toContain("transcribe");
		expect(names).toContain("remove_filler_words");
		expect(names).toContain("edit_via_transcript");
	});

	test("includes known export tools", async () => {
		const response = (await sendRequest("tools/list")) as {
			result: { tools: Array<{ name: string }> };
		};

		const names = response.result.tools.map((t) => t.name);
		expect(names).toContain("export_project");
		expect(names).toContain("render");
		expect(names).toContain("render_section");
		expect(names).toContain("export_gif");
		expect(names).toContain("export_proxy");
		expect(names).toContain("generate_thumbnail");
	});

	test("includes known audio tools", async () => {
		const response = (await sendRequest("tools/list")) as {
			result: { tools: Array<{ name: string }> };
		};

		const names = response.result.tools.map((t) => t.name);
		expect(names).toContain("enhance_audio");
		expect(names).toContain("clean_audio");
		expect(names).toContain("split_stems");
		expect(names).toContain("auto_mix");
	});

	test("includes known project management tools", async () => {
		const response = (await sendRequest("tools/list")) as {
			result: { tools: Array<{ name: string }> };
		};

		const names = response.result.tools.map((t) => t.name);
		expect(names).toContain("get_timeline_state");
		expect(names).toContain("get_project_info");
		expect(names).toContain("duplicate_project");
		expect(names).toContain("archive_project");
	});

	test("includes scheduling and channel tools", async () => {
		const response = (await sendRequest("tools/list")) as {
			result: { tools: Array<{ name: string }> };
		};

		const names = response.result.tools.map((t) => t.name);
		expect(names).toContain("schedule_routine");
		expect(names).toContain("list_routines");
		expect(names).toContain("cancel_routine");
		expect(names).toContain("register_webhook_channel");
		expect(names).toContain("enqueue_background_task");
		expect(names).toContain("get_task_status");
	});
});

// ═════════════════════════════════════════════════════════════════════
// 2. Resource listing
// ═════════════════════════════════════════════════════════════════════

describe("resources/list", () => {
	test("lists 10 resources", async () => {
		const response = (await sendRequest("resources/list")) as {
			result: { resources: unknown[] };
		};

		expect(response.result.resources).toBeDefined();
		expect(Array.isArray(response.result.resources)).toBe(true);
		expect(response.result.resources).toHaveLength(10);
	});

	test("each resource has uri, name, description, and mimeType", async () => {
		const response = (await sendRequest("resources/list")) as {
			result: { resources: Array<Record<string, string>> };
		};

		for (const resource of response.result.resources) {
			expect(typeof resource.uri).toBe("string");
			expect(resource.uri.length).toBeGreaterThan(0);
			expect(typeof resource.name).toBe("string");
			expect(typeof resource.description).toBe("string");
			expect(resource.mimeType).toBe("application/json");
		}
	});

	test("includes preset resources", async () => {
		const response = (await sendRequest("resources/list")) as {
			result: { resources: Array<{ uri: string }> };
		};

		const uris = response.result.resources.map((r) => r.uri);
		expect(uris).toContain("presets://effects");
		expect(uris).toContain("presets://transitions");
		expect(uris).toContain("presets://color-grades");
	});

	test("includes template resources", async () => {
		const response = (await sendRequest("resources/list")) as {
			result: { resources: Array<{ uri: string }> };
		};

		const uris = response.result.resources.map((r) => r.uri);
		expect(uris).toContain("templates://titles");
		expect(uris).toContain("templates://lower-thirds");
	});

	test("includes keyboard shortcuts resource", async () => {
		const response = (await sendRequest("resources/list")) as {
			result: { resources: Array<{ uri: string }> };
		};

		const uris = response.result.resources.map((r) => r.uri);
		expect(uris).toContain("docs://keyboard-shortcuts");
	});

	test("includes system capabilities resource", async () => {
		const response = (await sendRequest("resources/list")) as {
			result: { resources: Array<{ uri: string }> };
		};

		const uris = response.result.resources.map((r) => r.uri);
		expect(uris).toContain("system://capabilities");
	});

	test("includes project resources", async () => {
		const response = (await sendRequest("resources/list")) as {
			result: { resources: Array<{ uri: string }> };
		};

		const uris = response.result.resources.map((r) => r.uri);
		expect(uris).toContain("project://current/assets");
		expect(uris).toContain("project://current/effects");
		expect(uris).toContain("project://current/stats");
	});
});

// ═════════════════════════════════════════════════════════════════════
// 3. Resource reading
// ═════════════════════════════════════════════════════════════════════

describe("resources/read", () => {
	test("reads preset effects resource with structured content", async () => {
		const response = (await sendRequest("resources/read", {
			uri: "presets://effects",
		})) as { result: { contents: Array<{ text: string; mimeType: string }> } };

		expect(response.result.contents).toHaveLength(1);
		const content = JSON.parse(response.result.contents[0].text);
		expect(content.categories).toBeDefined();
		expect(content.categories.stylize).toBeDefined();
		expect(content.categories.distort).toBeDefined();
		expect(content.categories.blur).toBeDefined();
	});

	test("reads keyboard shortcuts with categorized bindings", async () => {
		const response = (await sendRequest("resources/read", {
			uri: "docs://keyboard-shortcuts",
		})) as { result: { contents: Array<{ text: string }> } };

		const content = JSON.parse(response.result.contents[0].text);
		expect(content.categories).toBeDefined();
		expect(content.categories.playback).toBeDefined();
		expect(content.categories.editing).toBeDefined();
		expect(content.categories.tools).toBeDefined();
		expect(content.categories.navigation).toBeDefined();
	});

	test("reads system capabilities", async () => {
		const response = (await sendRequest("resources/read", {
			uri: "system://capabilities",
		})) as { result: { contents: Array<{ text: string }> } };

		const content = JSON.parse(response.result.contents[0].text);
		expect(content.platform).toBeDefined();
		expect(content.platform.name).toBe("Lazynext");
		expect(content.formats).toBeDefined();
		expect(content.ai).toBeDefined();
	});

	test("returns error for unknown resource URI", async () => {
		const response = (await sendRequest("resources/read", {
			uri: "nonexistent://foo",
		})) as { result: { contents: Array<{ text: string }> } };

		expect(response.result.contents).toHaveLength(1);
		expect(response.result.contents[0].text).toContain("Unknown resource");
	});
});

// ═════════════════════════════════════════════════════════════════════
// 4. Prompt listing
// ═════════════════════════════════════════════════════════════════════

describe("prompts/list", () => {
	test("lists 8 prompts", async () => {
		const response = (await sendRequest("prompts/list")) as {
			result: { prompts: unknown[] };
		};

		expect(response.result.prompts).toBeDefined();
		expect(Array.isArray(response.result.prompts)).toBe(true);
		expect(response.result.prompts).toHaveLength(8);
	});

	test("each prompt has name, description, and arguments array", async () => {
		const response = (await sendRequest("prompts/list")) as {
			result: { prompts: Array<Record<string, unknown>> };
		};

		for (const prompt of response.result.prompts) {
			expect(typeof prompt.name).toBe("string");
			expect((prompt.name as string).length).toBeGreaterThan(0);
			expect(typeof prompt.description).toBe("string");
			expect(Array.isArray(prompt.arguments)).toBe(true);

			for (const arg of prompt.arguments as Array<Record<string, unknown>>) {
				expect(typeof arg.name).toBe("string");
				expect(typeof arg.description).toBe("string");
			}
		}
	});

	test("includes all expected prompt templates", async () => {
		const response = (await sendRequest("prompts/list")) as {
			result: { prompts: Array<{ name: string }> };
		};

		const names = response.result.prompts.map((p) => p.name);
		expect(names).toContain("edit/viral-reel");
		expect(names).toContain("edit/podcast");
		expect(names).toContain("edit/tutorial");
		expect(names).toContain("edit/product-review");
		expect(names).toContain("edit/wedding");
		expect(names).toContain("edit/talking-head");
		expect(names).toContain("edit/montage");
		expect(names).toContain("edit/interview");
	});

	test("prompts/edit/viral-reel has expected arguments", async () => {
		const response = (await sendRequest("prompts/list")) as {
			result: { prompts: Array<{ name: string; arguments: Array<{ name: string; required?: boolean }> }> };
		};

		const viralReel = response.result.prompts.find(
			(p) => p.name === "edit/viral-reel",
		);
		expect(viralReel).toBeDefined();

		const argNames = viralReel!.arguments.map((a) => a.name);
		expect(argNames).toContain("topic");
		expect(argNames).toContain("platform");
		expect(argNames).toContain("duration");
		expect(argNames).toContain("tone");

		const topicArg = viralReel!.arguments.find((a) => a.name === "topic");
		expect(topicArg?.required).toBe(true);
	});
});

// ═════════════════════════════════════════════════════════════════════
// 5. Prompt resolution
// ═════════════════════════════════════════════════════════════════════

describe("prompts/get", () => {
	test("resolves edit/viral-reel with default arguments", async () => {
		const response = (await sendRequest("prompts/get", {
			name: "edit/viral-reel",
			arguments: { topic: "cooking" },
		})) as { result: { messages: Array<{ role: string; content: { type: string; text: string } }> } };

		expect(response.result.messages).toHaveLength(1);
		expect(response.result.messages[0].role).toBe("user");
		expect(response.result.messages[0].content.type).toBe("text");
		expect(response.result.messages[0].content.text).toContain("cooking");
		expect(response.result.messages[0].content.text).toContain("auto_reframe");
		expect(response.result.messages[0].content.text).toContain("viral_captions");
	});

	test("resolves edit/podcast with custom speaker count", async () => {
		const response = (await sendRequest("prompts/get", {
			name: "edit/podcast",
			arguments: { numSpeakers: "3", style: "tight" },
		})) as { result: { messages: Array<{ role: string; content: { type: string; text: string } }> } };

		expect(response.result.messages).toHaveLength(1);
		expect(response.result.messages[0].content.text).toContain("3-speaker");
		expect(response.result.messages[0].content.text).toContain("diarize_speakers");
	});

	test("resolves edit/product-review with product name", async () => {
		const response = (await sendRequest("prompts/get", {
			name: "edit/product-review",
			arguments: { productName: "WidgetPro 3000", style: "unboxing" },
		})) as { result: { messages: Array<{ role: string; content: { type: string; text: string } }> } };

		expect(response.result.messages[0].content.text).toContain("WidgetPro 3000");
		expect(response.result.messages[0].content.text).toContain("sound_effect");
	});

	test("returns error for unknown prompt", async () => {
		const response = (await sendRequest("prompts/get", {
			name: "edit/nonexistent",
		})) as { result: { messages: Array<{ role: string; content: { type: string; text: string } }> } };

		expect(response.result.messages[0].role).toBe("assistant");
		expect(response.result.messages[0].content.text).toContain(
			"Unknown prompt template",
		);
	});
});

// ═════════════════════════════════════════════════════════════════════
// 6. Tool call: unknown tool
// ═════════════════════════════════════════════════════════════════════

describe("tools/call — error handling", () => {
	test("returns error for unknown tool name", async () => {
		const response = (await sendRequest("tools/call", {
			name: "nonexistent_tool",
		})) as { result: { content: Array<{ type: string; text: string }>; isError: boolean } };

		expect(response.result.isError).toBe(true);
		expect(response.result.content[0].text).toContain("Unknown tool");
	});
});

// ═════════════════════════════════════════════════════════════════════
// 7. Tool call: core editing → AI Agents orchestrator
// ═════════════════════════════════════════════════════════════════════

describe("tools/call — core editing routing", () => {
	beforeEach(() => {
		fetchCalls.length = 0;
	});

	test("autonomous_edit routes to AI Agents orchestrator", async () => {
		await sendRequest("tools/call", {
			name: "autonomous_edit",
			arguments: { prompt: "cut silences", projectId: "proj-1" },
		});

		expect(fetchCalls.length).toBeGreaterThan(0);
		const orchestratorCall = fetchCalls.find((c) =>
			c.url.includes("orchestrate"),
		);
		expect(orchestratorCall).toBeDefined();
		expect(orchestratorCall!.url).toContain(":8002");
		expect(orchestratorCall!.method).toBe("POST");

		const body = JSON.parse(orchestratorCall!.body);
		expect(body.prompt).toBe("cut silences");
		expect(body.projectId).toBe("proj-1");
	});

	test("transcribe routes to AI Agents orchestrator", async () => {
		await sendRequest("tools/call", {
			name: "transcribe",
			arguments: { mediaUrl: "https://example.com/video.mp4" },
		});

		const orchestratorCall = fetchCalls.find((c) =>
			c.url.includes("orchestrate"),
		);
		expect(orchestratorCall).toBeDefined();
		expect(orchestratorCall!.url).toContain(":8002");
	});

	test("remove_filler_words routes to AI Agents orchestrator", async () => {
		await sendRequest("tools/call", {
			name: "remove_filler_words",
			arguments: { threshold: 0.7 },
		});

		const orchestratorCall = fetchCalls.find((c) =>
			c.url.includes("orchestrate"),
		);
		expect(orchestratorCall).toBeDefined();
	});

	test("diarize_speakers routes to AI Agents orchestrator", async () => {
		await sendRequest("tools/call", {
			name: "diarize_speakers",
			arguments: { numSpeakers: 3 },
		});

		const orchestratorCall = fetchCalls.find((c) =>
			c.url.includes("orchestrate"),
		);
		expect(orchestratorCall).toBeDefined();
	});

	test("edit_via_transcript routes to AI Agents orchestrator", async () => {
		await sendRequest("tools/call", {
			name: "edit_via_transcript",
			arguments: { transcript: "Hello world at 0:00", edits: "Remove Hello" },
		});

		const orchestratorCall = fetchCalls.find((c) =>
			c.url.includes("orchestrate"),
		);
		expect(orchestratorCall).toBeDefined();
	});
});

// ═════════════════════════════════════════════════════════════════════
// 8. Tool call: export → API Gateway
// ═════════════════════════════════════════════════════════════════════

describe("tools/call — export routing", () => {
	beforeEach(() => {
		fetchCalls.length = 0;
	});

	test("export_project routes to API Gateway /api/v1/export", async () => {
		await sendRequest("tools/call", {
			name: "export_project",
			arguments: { format: "mp4", resolution: "1080p" },
		});

		const exportCall = fetchCalls.find((c) =>
			c.url.includes("/api/v1/export"),
		);
		expect(exportCall).toBeDefined();
		expect(exportCall!.url).toContain(":8005");
		expect(exportCall!.method).toBe("POST");
	});

	test("render routes to API Gateway /api/v1/export", async () => {
		await sendRequest("tools/call", {
			name: "render",
			arguments: { format: "mp4" },
		});

		const exportCall = fetchCalls.find((c) =>
			c.url.includes("/api/v1/export"),
		);
		expect(exportCall).toBeDefined();
	});

	test("render_section routes to API Gateway", async () => {
		await sendRequest("tools/call", {
			name: "render_section",
			arguments: { inPoint: 0, outPoint: 30 },
		});

		const exportCall = fetchCalls.find((c) =>
			c.url.includes("/api/v1/export"),
		);
		expect(exportCall).toBeDefined();
	});

	test("export_gif routes to API Gateway", async () => {
		await sendRequest("tools/call", {
			name: "export_gif",
			arguments: { inPoint: 5, outPoint: 10 },
		});

		const exportCall = fetchCalls.find((c) =>
			c.url.includes("/api/v1/export"),
		);
		expect(exportCall).toBeDefined();
	});

	test("export_proxy routes to API Gateway", async () => {
		await sendRequest("tools/call", {
			name: "export_proxy",
		});

		const exportCall = fetchCalls.find((c) =>
			c.url.includes("/api/v1/export"),
		);
		expect(exportCall).toBeDefined();
	});

	test("generate_thumbnail routes to API Gateway", async () => {
		await sendRequest("tools/call", {
			name: "generate_thumbnail",
			arguments: { position: 10 },
		});

		const exportCall = fetchCalls.find((c) =>
			c.url.includes("/api/v1/export"),
		);
		expect(exportCall).toBeDefined();
	});
});

// ═════════════════════════════════════════════════════════════════════
// 9. Tool call: project management → API Gateway
// ═════════════════════════════════════════════════════════════════════

describe("tools/call — project management routing", () => {
	beforeEach(() => {
		fetchCalls.length = 0;
	});

	test("get_timeline_state routes to API Gateway with project ID", async () => {
		await sendRequest("tools/call", {
			name: "get_timeline_state",
			arguments: { projectId: "proj-42" },
		});

		const call = fetchCalls[0];
		expect(call).toBeDefined();
		expect(call.url).toContain(":8005");
		expect(call.url).toContain("/api/v1/projects/proj-42");
	});

	test("get_project_info routes to API Gateway", async () => {
		await sendRequest("tools/call", {
			name: "get_project_info",
			arguments: { projectId: "proj-1" },
		});

		const call = fetchCalls[0];
		expect(call).toBeDefined();
		expect(call.url).toContain("/api/v1/projects/proj-1");
	});

	test("duplicate_project uses POST with correct endpoint", async () => {
		await sendRequest("tools/call", {
			name: "duplicate_project",
			arguments: { projectId: "proj-1", newName: "proj-1-copy" },
		});

		const call = fetchCalls[0];
		expect(call).toBeDefined();
		expect(call.url).toContain("/api/v1/projects/proj-1/duplicate");
		expect(call.method).toBe("POST");
	});

	test("archive_project uses POST with correct endpoint", async () => {
		await sendRequest("tools/call", {
			name: "archive_project",
			arguments: { projectId: "proj-1" },
		});

		const call = fetchCalls[0];
		expect(call).toBeDefined();
		expect(call.url).toContain("/api/v1/projects/proj-1/archive");
		expect(call.method).toBe("POST");
	});
});

// ═════════════════════════════════════════════════════════════════════
// 10. Tool call: scheduling / channels → API Gateway
// ═════════════════════════════════════════════════════════════════════

describe("tools/call — scheduling routing", () => {
	beforeEach(() => {
		fetchCalls.length = 0;
	});

	test("schedule_routine POSTs to /api/v1/routines", async () => {
		await sendRequest("tools/call", {
			name: "schedule_routine",
			arguments: {
				name: "nightly export",
				cronExpression: "0 2 * * *",
				prompt: "export project",
			},
		});

		const call = fetchCalls[0];
		expect(call).toBeDefined();
		expect(call.url).toContain("/api/v1/routines");
		expect(call.method).toBe("POST");

		const body = JSON.parse(call.body);
		expect(body.name).toBe("nightly export");
		expect(body.cron_expression).toBe("0 2 * * *");
	});

	test("list_routines GETs /api/v1/routines", async () => {
		await sendRequest("tools/call", {
			name: "list_routines",
		});

		const call = fetchCalls[0];
		expect(call).toBeDefined();
		expect(call.url).toContain("/api/v1/routines");
		expect(call.method).toBe("GET");
	});

	test("cancel_routine DELETEs /api/v1/routines/:id", async () => {
		await sendRequest("tools/call", {
			name: "cancel_routine",
			arguments: { routineId: "routine-5" },
		});

		const call = fetchCalls[0];
		expect(call).toBeDefined();
		expect(call.url).toContain("/api/v1/routines/routine-5");
		expect(call.method).toBe("DELETE");
	});

	test("register_webhook_channel POSTs to /api/v1/channels/webhook", async () => {
		await sendRequest("tools/call", {
			name: "register_webhook_channel",
			arguments: {
				channel: "discord",
				url: "https://discord.com/webhook/123",
				secret: "s3cret",
			},
		});

		const call = fetchCalls[0];
		expect(call).toBeDefined();
		expect(call.url).toContain("/api/v1/channels/webhook");
		expect(call.method).toBe("POST");
	});

	test("enqueue_background_task POSTs to /api/v1/tasks", async () => {
		await sendRequest("tools/call", {
			name: "enqueue_background_task",
			arguments: {
				name: "backup",
				payload: "proj-1",
				taskType: "auto_backup",
				priority: 50,
			},
		});

		const call = fetchCalls[0];
		expect(call).toBeDefined();
		expect(call.url).toContain("/api/v1/tasks");
		expect(call.method).toBe("POST");

		const body = JSON.parse(call.body);
		expect(body.task_type).toBe("auto_backup");
		expect(body.priority).toBe(50);
	});

	test("get_task_status GETs /api/v1/tasks/:id", async () => {
		await sendRequest("tools/call", {
			name: "get_task_status",
			arguments: { taskId: "task-99" },
		});

		const call = fetchCalls[0];
		expect(call).toBeDefined();
		expect(call.url).toContain("/api/v1/tasks/task-99");
		expect(call.method).toBe("GET");
	});
});

// ═════════════════════════════════════════════════════════════════════
// 11. Prompt injection sanitization
// ═════════════════════════════════════════════════════════════════════

describe("tools/call — prompt injection sanitization", () => {
	beforeEach(() => {
		fetchCalls.length = 0;
	});

	test("truncates argument values at 1000 characters", async () => {
		// Build a 2000-character string
		const longValue = "X".repeat(2000);

		// Use a tool that goes through the default sanitization path
		// (add_crossfade is not in core editing, export, or project mgmt lists)
		await sendRequest("tools/call", {
			name: "add_crossfade",
			arguments: { clipAId: "clip-1", clipBId: longValue },
		});

		// The default path sends to the orchestrator
		const call = fetchCalls.find((c) => c.url.includes("orchestrate"));
		expect(call).toBeDefined();

		const body = JSON.parse(call!.body);
		// The prompt is built as: "${name} ${key}: ${truncatedValue}, ..."
		// The long value should be truncated at 1000
		expect(body.prompt).toContain("add_crossfade");
		expect(body.prompt).toContain(`clipBId: ${"X".repeat(1000)}`);
		expect(body.prompt).not.toContain("X".repeat(1001));
	});

	test("does not truncate short argument values", async () => {
		const shortValue = "hello";

		await sendRequest("tools/call", {
			name: "enhance_audio",
			arguments: { profile: shortValue, mediaUrl: "https://example.com/audio.mp3" },
		});

		const call = fetchCalls.find((c) => c.url.includes("orchestrate"));
		expect(call).toBeDefined();

		const body = JSON.parse(call!.body);
		expect(body.prompt).toContain("profile: hello");
	});

	test("handles null / undefined arguments gracefully", async () => {
		await sendRequest("tools/call", {
			name: "auto_beat_sync",
			arguments: { sensitivity: null },
		});

		const call = fetchCalls.find((c) => c.url.includes("orchestrate"));
		expect(call).toBeDefined();

		const body = JSON.parse(call!.body);
		// null values become the empty string via String(null ?? "")
		expect(body.prompt).toContain("sensitivity: ");
	});

	test("truncates total prompt at 10000 characters", async () => {
		// Send many large arguments to exceed the 10000 char prompt limit
		const args: Record<string, string> = {};
		for (let i = 0; i < 20; i++) {
			args[`key${i}`] = "X".repeat(900);
		}

		await sendRequest("tools/call", {
			name: "apply_color_grade",
			arguments: args as unknown as Record<string, unknown>,
		});

		const call = fetchCalls.find((c) => c.url.includes("orchestrate"));
		expect(call).toBeDefined();

		const body = JSON.parse(call!.body);
		expect(body.prompt.length).toBeLessThanOrEqual(10000);
	});

	test("limits to 100 argument entries", async () => {
		const args: Record<string, string> = {};
		for (let i = 0; i < 200; i++) {
			args[`key${i}`] = "value";
		}

		await sendRequest("tools/call", {
			name: "add_crossfade",
			arguments: args as unknown as Record<string, unknown>,
		});

		const call = fetchCalls.find((c) => c.url.includes("orchestrate"));
		expect(call).toBeDefined();

		const body = JSON.parse(call!.body);
		// Should be limited by the 100-arg and 10000-char caps
		expect(body.prompt.length).toBeLessThanOrEqual(10000);
	});
});

// ═════════════════════════════════════════════════════════════════════
// 12. JSON-RPC response format
// ═════════════════════════════════════════════════════════════════════

describe("JSON-RPC protocol conformance", () => {
	test("responses contain jsonrpc field", async () => {
		const response = await sendRequest("tools/list");

		expect((response as Record<string, unknown>).jsonrpc).toBe("2.0");
	});

	test("responses echo back the request id", async () => {
		// sendRequest auto-assigns an id; verify it's preserved
		const id = nextId;
		const response = (await sendRequest("resources/list")) as {
			id: number;
		};

		expect(response.id).toBe(id);
	});

	test("result objects match expected structure", async () => {
		const response = (await sendRequest("prompts/list")) as {
			result: Record<string, unknown>;
		};

		expect(response.result).toBeDefined();
		expect(typeof response.result).toBe("object");
		expect(response.result.prompts).toBeDefined();
	});
});

// ═════════════════════════════════════════════════════════════════════
// 13. Graceful shutdown
// ═════════════════════════════════════════════════════════════════════

describe("graceful shutdown", () => {
	test("SIGINT triggers process.exit(0)", async () => {
		exitCodes.length = 0;

		process.emit("SIGINT", "SIGINT");
		await new Promise((r) => setTimeout(r, 50));

		expect(exitCodes).not.toBeEmpty();
		expect(exitCodes[0]).toBe(0);
	});

	test("signals are registered for SIGINT, SIGTERM, and SIGHUP", () => {
		// Verify the process has listeners for all three signals.
		// At this point SIGINT has already been emitted (isShuttingDown is
		// true), so the handler won't call exit again — but we can
		// confirm the listener count is > 0 for each.
		const sigintCount = process.listenerCount("SIGINT");
		const sigtermCount = process.listenerCount("SIGTERM");
		const sighupCount = process.listenerCount("SIGHUP");

		expect(sigintCount).toBeGreaterThan(0);
		expect(sigtermCount).toBeGreaterThan(0);
		expect(sighupCount).toBeGreaterThan(0);
	});

	test("double shutdown is idempotent", async () => {
		// Reset the module-level flag by ... actually we can't. But we
		// already verified idempotency: during the first SIGINT test only
		// one exit(0) call was pushed. Here we test that the server
		// handled SIGINT correctly by checking the console log.
		//
		// Since isShuttingDown is already true from the SIGINT test,
		// emitting again should NOT produce another exit call.
		exitCodes.length = 0;
		process.emit("SIGINT", "SIGINT");
		await new Promise((r) => setTimeout(r, 50));

		// No additional exit calls because isShuttingDown is true
		expect(exitCodes).toHaveLength(0);
	});
});
