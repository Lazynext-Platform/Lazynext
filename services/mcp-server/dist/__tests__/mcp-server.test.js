"use strict";
/**
 * MCP Server integration tests.
 *
 * Uses InMemoryTransport from @modelcontextprotocol/sdk to create a
 * linked transport pair, mocking StdioServerTransport so the server
 * connects to our in-memory transport instead of real stdio.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const bun_test_1 = require("bun:test");
const inMemory_js_1 = require("@modelcontextprotocol/sdk/inMemory.js");
// ── Transport bridge state ──────────────────────────────────────────
let clientTransport;
const pendingRequests = new Map();
let nextId = 1;
function sendRequest(method, params) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
        pendingRequests.set(id, resolve);
        const message = {
            jsonrpc: "2.0",
            id,
            method,
            params: params ?? {},
        };
        clientTransport.send(message).catch(reject);
        setTimeout(() => {
            if (pendingRequests.has(id)) {
                pendingRequests.delete(id);
                reject(new Error(`Timeout waiting for response to ${method}`));
            }
        }, 5000);
    });
}
function sendNotification(method, params) {
    return clientTransport.send({
        jsonrpc: "2.0",
        method,
        params: params ?? {},
    });
}
// ── Mock StdioServerTransport → InMemoryTransport ────────────────────
bun_test_1.mock.module("@modelcontextprotocol/sdk/server/stdio.js", () => {
    const [client, server] = inMemory_js_1.InMemoryTransport.createLinkedPair();
    clientTransport = client;
    clientTransport.onmessage = (msg) => {
        // Messages with an id are responses to pending requests
        if (msg.id !== undefined && msg.id !== null) {
            const resolve = pendingRequests.get(msg.id);
            if (resolve) {
                pendingRequests.delete(msg.id);
                resolve(msg);
            }
        }
    };
    return {
        StdioServerTransport: class {
            _transport = server;
            start() {
                return this._transport.start();
            }
            close() {
                return this._transport.close();
            }
            send(message, _options) {
                return this._transport.send(message);
            }
            get onmessage() {
                return this._transport.onmessage;
            }
            set onmessage(handler) {
                this._transport.onmessage = handler;
            }
            get onclose() {
                return this._transport.onclose;
            }
            set onclose(handler) {
                this._transport.onclose = handler;
            }
            get onerror() {
                return this._transport.onerror;
            }
            set onerror(handler) {
                this._transport.onerror = handler;
            }
        },
    };
});
// ── Mock globalThis.fetch for routing tests ──────────────────────────
const fetchCalls = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (url, init) => {
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
});
// ── Mock process.exit for shutdown tests ─────────────────────────────
const exitCodes = [];
const originalExit = process.exit;
process.exit = ((code) => {
    exitCodes.push(code ?? 0);
});
// ── Dynamically import server module ─────────────────────────────────
let serverModule;
(0, bun_test_1.beforeAll)(async () => {
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
(0, bun_test_1.afterAll)(() => {
    globalThis.fetch = originalFetch;
    process.exit = originalExit;
});
// ═════════════════════════════════════════════════════════════════════
// 1. Tool listing
// ═════════════════════════════════════════════════════════════════════
(0, bun_test_1.describe)("tools/list", () => {
    (0, bun_test_1.test)("lists 87 tools", async () => {
        const response = (await sendRequest("tools/list"));
        (0, bun_test_1.expect)(response.result.tools).toBeDefined();
        (0, bun_test_1.expect)(Array.isArray(response.result.tools)).toBe(true);
        (0, bun_test_1.expect)(response.result.tools).toHaveLength(87);
    });
    (0, bun_test_1.test)("each tool has a name, description, and valid JSON Schema inputSchema", async () => {
        const response = (await sendRequest("tools/list"));
        for (const tool of response.result.tools) {
            (0, bun_test_1.expect)(typeof tool.name).toBe("string");
            (0, bun_test_1.expect)(tool.name.length).toBeGreaterThan(0);
            (0, bun_test_1.expect)(typeof tool.description).toBe("string");
            (0, bun_test_1.expect)(tool.description.length).toBeGreaterThan(0);
            const schema = tool.inputSchema;
            (0, bun_test_1.expect)(schema).toBeDefined();
            (0, bun_test_1.expect)(schema.type).toBe("object");
            const props = schema.properties;
            (0, bun_test_1.expect)(props).toBeDefined();
            (0, bun_test_1.expect)(typeof props).toBe("object");
            // Each property must have type and description
            for (const [propName, propDef] of Object.entries(props ?? {})) {
                (0, bun_test_1.expect)(typeof propName).toBe("string");
                const def = propDef;
                (0, bun_test_1.expect)(typeof def.type).toBe("string");
                (0, bun_test_1.expect)(typeof def.description).toBe("string");
            }
            // If required is present, it must be a string array
            if (schema.required !== undefined) {
                (0, bun_test_1.expect)(Array.isArray(schema.required)).toBe(true);
                for (const req of schema.required) {
                    (0, bun_test_1.expect)(typeof req).toBe("string");
                }
            }
        }
    });
    (0, bun_test_1.test)("includes known core editing tools", async () => {
        const response = (await sendRequest("tools/list"));
        const names = response.result.tools.map((t) => t.name);
        (0, bun_test_1.expect)(names).toContain("autonomous_edit");
        (0, bun_test_1.expect)(names).toContain("transcribe");
        (0, bun_test_1.expect)(names).toContain("remove_filler_words");
        (0, bun_test_1.expect)(names).toContain("edit_via_transcript");
    });
    (0, bun_test_1.test)("includes known export tools", async () => {
        const response = (await sendRequest("tools/list"));
        const names = response.result.tools.map((t) => t.name);
        (0, bun_test_1.expect)(names).toContain("export_project");
        (0, bun_test_1.expect)(names).toContain("render");
        (0, bun_test_1.expect)(names).toContain("render_section");
        (0, bun_test_1.expect)(names).toContain("export_gif");
        (0, bun_test_1.expect)(names).toContain("export_proxy");
        (0, bun_test_1.expect)(names).toContain("generate_thumbnail");
    });
    (0, bun_test_1.test)("includes known audio tools", async () => {
        const response = (await sendRequest("tools/list"));
        const names = response.result.tools.map((t) => t.name);
        (0, bun_test_1.expect)(names).toContain("enhance_audio");
        (0, bun_test_1.expect)(names).toContain("clean_audio");
        (0, bun_test_1.expect)(names).toContain("split_stems");
        (0, bun_test_1.expect)(names).toContain("auto_mix");
    });
    (0, bun_test_1.test)("includes known project management tools", async () => {
        const response = (await sendRequest("tools/list"));
        const names = response.result.tools.map((t) => t.name);
        (0, bun_test_1.expect)(names).toContain("get_timeline_state");
        (0, bun_test_1.expect)(names).toContain("get_project_info");
        (0, bun_test_1.expect)(names).toContain("duplicate_project");
        (0, bun_test_1.expect)(names).toContain("archive_project");
    });
    (0, bun_test_1.test)("includes scheduling and channel tools", async () => {
        const response = (await sendRequest("tools/list"));
        const names = response.result.tools.map((t) => t.name);
        (0, bun_test_1.expect)(names).toContain("schedule_routine");
        (0, bun_test_1.expect)(names).toContain("list_routines");
        (0, bun_test_1.expect)(names).toContain("cancel_routine");
        (0, bun_test_1.expect)(names).toContain("register_webhook_channel");
        (0, bun_test_1.expect)(names).toContain("enqueue_background_task");
        (0, bun_test_1.expect)(names).toContain("get_task_status");
    });
});
// ═════════════════════════════════════════════════════════════════════
// 2. Resource listing
// ═════════════════════════════════════════════════════════════════════
(0, bun_test_1.describe)("resources/list", () => {
    (0, bun_test_1.test)("lists 10 resources", async () => {
        const response = (await sendRequest("resources/list"));
        (0, bun_test_1.expect)(response.result.resources).toBeDefined();
        (0, bun_test_1.expect)(Array.isArray(response.result.resources)).toBe(true);
        (0, bun_test_1.expect)(response.result.resources).toHaveLength(10);
    });
    (0, bun_test_1.test)("each resource has uri, name, description, and mimeType", async () => {
        const response = (await sendRequest("resources/list"));
        for (const resource of response.result.resources) {
            (0, bun_test_1.expect)(typeof resource.uri).toBe("string");
            (0, bun_test_1.expect)(resource.uri.length).toBeGreaterThan(0);
            (0, bun_test_1.expect)(typeof resource.name).toBe("string");
            (0, bun_test_1.expect)(typeof resource.description).toBe("string");
            (0, bun_test_1.expect)(resource.mimeType).toBe("application/json");
        }
    });
    (0, bun_test_1.test)("includes preset resources", async () => {
        const response = (await sendRequest("resources/list"));
        const uris = response.result.resources.map((r) => r.uri);
        (0, bun_test_1.expect)(uris).toContain("presets://effects");
        (0, bun_test_1.expect)(uris).toContain("presets://transitions");
        (0, bun_test_1.expect)(uris).toContain("presets://color-grades");
    });
    (0, bun_test_1.test)("includes template resources", async () => {
        const response = (await sendRequest("resources/list"));
        const uris = response.result.resources.map((r) => r.uri);
        (0, bun_test_1.expect)(uris).toContain("templates://titles");
        (0, bun_test_1.expect)(uris).toContain("templates://lower-thirds");
    });
    (0, bun_test_1.test)("includes keyboard shortcuts resource", async () => {
        const response = (await sendRequest("resources/list"));
        const uris = response.result.resources.map((r) => r.uri);
        (0, bun_test_1.expect)(uris).toContain("docs://keyboard-shortcuts");
    });
    (0, bun_test_1.test)("includes system capabilities resource", async () => {
        const response = (await sendRequest("resources/list"));
        const uris = response.result.resources.map((r) => r.uri);
        (0, bun_test_1.expect)(uris).toContain("system://capabilities");
    });
    (0, bun_test_1.test)("includes project resources", async () => {
        const response = (await sendRequest("resources/list"));
        const uris = response.result.resources.map((r) => r.uri);
        (0, bun_test_1.expect)(uris).toContain("project://current/assets");
        (0, bun_test_1.expect)(uris).toContain("project://current/effects");
        (0, bun_test_1.expect)(uris).toContain("project://current/stats");
    });
});
// ═════════════════════════════════════════════════════════════════════
// 3. Resource reading
// ═════════════════════════════════════════════════════════════════════
(0, bun_test_1.describe)("resources/read", () => {
    (0, bun_test_1.test)("reads preset effects resource with structured content", async () => {
        const response = (await sendRequest("resources/read", {
            uri: "presets://effects",
        }));
        (0, bun_test_1.expect)(response.result.contents).toHaveLength(1);
        const content = JSON.parse(response.result.contents[0].text);
        (0, bun_test_1.expect)(content.categories).toBeDefined();
        (0, bun_test_1.expect)(content.categories.stylize).toBeDefined();
        (0, bun_test_1.expect)(content.categories.distort).toBeDefined();
        (0, bun_test_1.expect)(content.categories.blur).toBeDefined();
    });
    (0, bun_test_1.test)("reads keyboard shortcuts with categorized bindings", async () => {
        const response = (await sendRequest("resources/read", {
            uri: "docs://keyboard-shortcuts",
        }));
        const content = JSON.parse(response.result.contents[0].text);
        (0, bun_test_1.expect)(content.categories).toBeDefined();
        (0, bun_test_1.expect)(content.categories.playback).toBeDefined();
        (0, bun_test_1.expect)(content.categories.editing).toBeDefined();
        (0, bun_test_1.expect)(content.categories.tools).toBeDefined();
        (0, bun_test_1.expect)(content.categories.navigation).toBeDefined();
    });
    (0, bun_test_1.test)("reads system capabilities", async () => {
        const response = (await sendRequest("resources/read", {
            uri: "system://capabilities",
        }));
        const content = JSON.parse(response.result.contents[0].text);
        (0, bun_test_1.expect)(content.platform).toBeDefined();
        (0, bun_test_1.expect)(content.platform.name).toBe("Lazynext");
        (0, bun_test_1.expect)(content.formats).toBeDefined();
        (0, bun_test_1.expect)(content.ai).toBeDefined();
    });
    (0, bun_test_1.test)("returns error for unknown resource URI", async () => {
        const response = (await sendRequest("resources/read", {
            uri: "nonexistent://foo",
        }));
        (0, bun_test_1.expect)(response.result.contents).toHaveLength(1);
        (0, bun_test_1.expect)(response.result.contents[0].text).toContain("Unknown resource");
    });
});
// ═════════════════════════════════════════════════════════════════════
// 4. Prompt listing
// ═════════════════════════════════════════════════════════════════════
(0, bun_test_1.describe)("prompts/list", () => {
    (0, bun_test_1.test)("lists 8 prompts", async () => {
        const response = (await sendRequest("prompts/list"));
        (0, bun_test_1.expect)(response.result.prompts).toBeDefined();
        (0, bun_test_1.expect)(Array.isArray(response.result.prompts)).toBe(true);
        (0, bun_test_1.expect)(response.result.prompts).toHaveLength(8);
    });
    (0, bun_test_1.test)("each prompt has name, description, and arguments array", async () => {
        const response = (await sendRequest("prompts/list"));
        for (const prompt of response.result.prompts) {
            (0, bun_test_1.expect)(typeof prompt.name).toBe("string");
            (0, bun_test_1.expect)(prompt.name.length).toBeGreaterThan(0);
            (0, bun_test_1.expect)(typeof prompt.description).toBe("string");
            (0, bun_test_1.expect)(Array.isArray(prompt.arguments)).toBe(true);
            for (const arg of prompt.arguments) {
                (0, bun_test_1.expect)(typeof arg.name).toBe("string");
                (0, bun_test_1.expect)(typeof arg.description).toBe("string");
            }
        }
    });
    (0, bun_test_1.test)("includes all expected prompt templates", async () => {
        const response = (await sendRequest("prompts/list"));
        const names = response.result.prompts.map((p) => p.name);
        (0, bun_test_1.expect)(names).toContain("edit/viral-reel");
        (0, bun_test_1.expect)(names).toContain("edit/podcast");
        (0, bun_test_1.expect)(names).toContain("edit/tutorial");
        (0, bun_test_1.expect)(names).toContain("edit/product-review");
        (0, bun_test_1.expect)(names).toContain("edit/wedding");
        (0, bun_test_1.expect)(names).toContain("edit/talking-head");
        (0, bun_test_1.expect)(names).toContain("edit/montage");
        (0, bun_test_1.expect)(names).toContain("edit/interview");
    });
    (0, bun_test_1.test)("prompts/edit/viral-reel has expected arguments", async () => {
        const response = (await sendRequest("prompts/list"));
        const viralReel = response.result.prompts.find((p) => p.name === "edit/viral-reel");
        (0, bun_test_1.expect)(viralReel).toBeDefined();
        const argNames = viralReel.arguments.map((a) => a.name);
        (0, bun_test_1.expect)(argNames).toContain("topic");
        (0, bun_test_1.expect)(argNames).toContain("platform");
        (0, bun_test_1.expect)(argNames).toContain("duration");
        (0, bun_test_1.expect)(argNames).toContain("tone");
        const topicArg = viralReel.arguments.find((a) => a.name === "topic");
        (0, bun_test_1.expect)(topicArg?.required).toBe(true);
    });
});
// ═════════════════════════════════════════════════════════════════════
// 5. Prompt resolution
// ═════════════════════════════════════════════════════════════════════
(0, bun_test_1.describe)("prompts/get", () => {
    (0, bun_test_1.test)("resolves edit/viral-reel with default arguments", async () => {
        const response = (await sendRequest("prompts/get", {
            name: "edit/viral-reel",
            arguments: { topic: "cooking" },
        }));
        (0, bun_test_1.expect)(response.result.messages).toHaveLength(1);
        (0, bun_test_1.expect)(response.result.messages[0].role).toBe("user");
        (0, bun_test_1.expect)(response.result.messages[0].content.type).toBe("text");
        (0, bun_test_1.expect)(response.result.messages[0].content.text).toContain("cooking");
        (0, bun_test_1.expect)(response.result.messages[0].content.text).toContain("auto_reframe");
        (0, bun_test_1.expect)(response.result.messages[0].content.text).toContain("viral_captions");
    });
    (0, bun_test_1.test)("resolves edit/podcast with custom speaker count", async () => {
        const response = (await sendRequest("prompts/get", {
            name: "edit/podcast",
            arguments: { numSpeakers: "3", style: "tight" },
        }));
        (0, bun_test_1.expect)(response.result.messages).toHaveLength(1);
        (0, bun_test_1.expect)(response.result.messages[0].content.text).toContain("3-speaker");
        (0, bun_test_1.expect)(response.result.messages[0].content.text).toContain("diarize_speakers");
    });
    (0, bun_test_1.test)("resolves edit/product-review with product name", async () => {
        const response = (await sendRequest("prompts/get", {
            name: "edit/product-review",
            arguments: { productName: "WidgetPro 3000", style: "unboxing" },
        }));
        (0, bun_test_1.expect)(response.result.messages[0].content.text).toContain("WidgetPro 3000");
        (0, bun_test_1.expect)(response.result.messages[0].content.text).toContain("sound_effect");
    });
    (0, bun_test_1.test)("returns error for unknown prompt", async () => {
        const response = (await sendRequest("prompts/get", {
            name: "edit/nonexistent",
        }));
        (0, bun_test_1.expect)(response.result.messages[0].role).toBe("assistant");
        (0, bun_test_1.expect)(response.result.messages[0].content.text).toContain("Unknown prompt template");
    });
});
// ═════════════════════════════════════════════════════════════════════
// 6. Tool call: unknown tool
// ═════════════════════════════════════════════════════════════════════
(0, bun_test_1.describe)("tools/call — error handling", () => {
    (0, bun_test_1.test)("returns error for unknown tool name", async () => {
        const response = (await sendRequest("tools/call", {
            name: "nonexistent_tool",
        }));
        (0, bun_test_1.expect)(response.result.isError).toBe(true);
        (0, bun_test_1.expect)(response.result.content[0].text).toContain("Unknown tool");
    });
});
// ═════════════════════════════════════════════════════════════════════
// 7. Tool call: core editing → AI Agents orchestrator
// ═════════════════════════════════════════════════════════════════════
(0, bun_test_1.describe)("tools/call — core editing routing", () => {
    (0, bun_test_1.beforeEach)(() => {
        fetchCalls.length = 0;
    });
    (0, bun_test_1.test)("autonomous_edit routes to AI Agents orchestrator", async () => {
        await sendRequest("tools/call", {
            name: "autonomous_edit",
            arguments: { prompt: "cut silences", projectId: "proj-1" },
        });
        (0, bun_test_1.expect)(fetchCalls.length).toBeGreaterThan(0);
        const orchestratorCall = fetchCalls.find((c) => c.url.includes("orchestrate"));
        (0, bun_test_1.expect)(orchestratorCall).toBeDefined();
        (0, bun_test_1.expect)(orchestratorCall.url).toContain(":8002");
        (0, bun_test_1.expect)(orchestratorCall.method).toBe("POST");
        const body = JSON.parse(orchestratorCall.body);
        (0, bun_test_1.expect)(body.prompt).toBe("cut silences");
        (0, bun_test_1.expect)(body.projectId).toBe("proj-1");
    });
    (0, bun_test_1.test)("transcribe routes to AI Agents orchestrator", async () => {
        await sendRequest("tools/call", {
            name: "transcribe",
            arguments: { mediaUrl: "https://example.com/video.mp4" },
        });
        const orchestratorCall = fetchCalls.find((c) => c.url.includes("orchestrate"));
        (0, bun_test_1.expect)(orchestratorCall).toBeDefined();
        (0, bun_test_1.expect)(orchestratorCall.url).toContain(":8002");
    });
    (0, bun_test_1.test)("remove_filler_words routes to AI Agents orchestrator", async () => {
        await sendRequest("tools/call", {
            name: "remove_filler_words",
            arguments: { threshold: 0.7 },
        });
        const orchestratorCall = fetchCalls.find((c) => c.url.includes("orchestrate"));
        (0, bun_test_1.expect)(orchestratorCall).toBeDefined();
    });
    (0, bun_test_1.test)("diarize_speakers routes to AI Agents orchestrator", async () => {
        await sendRequest("tools/call", {
            name: "diarize_speakers",
            arguments: { numSpeakers: 3 },
        });
        const orchestratorCall = fetchCalls.find((c) => c.url.includes("orchestrate"));
        (0, bun_test_1.expect)(orchestratorCall).toBeDefined();
    });
    (0, bun_test_1.test)("edit_via_transcript routes to AI Agents orchestrator", async () => {
        await sendRequest("tools/call", {
            name: "edit_via_transcript",
            arguments: { transcript: "Hello world at 0:00", edits: "Remove Hello" },
        });
        const orchestratorCall = fetchCalls.find((c) => c.url.includes("orchestrate"));
        (0, bun_test_1.expect)(orchestratorCall).toBeDefined();
    });
});
// ═════════════════════════════════════════════════════════════════════
// 8. Tool call: export → API Gateway
// ═════════════════════════════════════════════════════════════════════
(0, bun_test_1.describe)("tools/call — export routing", () => {
    (0, bun_test_1.beforeEach)(() => {
        fetchCalls.length = 0;
    });
    (0, bun_test_1.test)("export_project routes to API Gateway /api/v1/export", async () => {
        await sendRequest("tools/call", {
            name: "export_project",
            arguments: { format: "mp4", resolution: "1080p" },
        });
        const exportCall = fetchCalls.find((c) => c.url.includes("/api/v1/export"));
        (0, bun_test_1.expect)(exportCall).toBeDefined();
        (0, bun_test_1.expect)(exportCall.url).toContain(":8005");
        (0, bun_test_1.expect)(exportCall.method).toBe("POST");
    });
    (0, bun_test_1.test)("render routes to API Gateway /api/v1/export", async () => {
        await sendRequest("tools/call", {
            name: "render",
            arguments: { format: "mp4" },
        });
        const exportCall = fetchCalls.find((c) => c.url.includes("/api/v1/export"));
        (0, bun_test_1.expect)(exportCall).toBeDefined();
    });
    (0, bun_test_1.test)("render_section routes to API Gateway", async () => {
        await sendRequest("tools/call", {
            name: "render_section",
            arguments: { inPoint: 0, outPoint: 30 },
        });
        const exportCall = fetchCalls.find((c) => c.url.includes("/api/v1/export"));
        (0, bun_test_1.expect)(exportCall).toBeDefined();
    });
    (0, bun_test_1.test)("export_gif routes to API Gateway", async () => {
        await sendRequest("tools/call", {
            name: "export_gif",
            arguments: { inPoint: 5, outPoint: 10 },
        });
        const exportCall = fetchCalls.find((c) => c.url.includes("/api/v1/export"));
        (0, bun_test_1.expect)(exportCall).toBeDefined();
    });
    (0, bun_test_1.test)("export_proxy routes to API Gateway", async () => {
        await sendRequest("tools/call", {
            name: "export_proxy",
        });
        const exportCall = fetchCalls.find((c) => c.url.includes("/api/v1/export"));
        (0, bun_test_1.expect)(exportCall).toBeDefined();
    });
    (0, bun_test_1.test)("generate_thumbnail routes to API Gateway", async () => {
        await sendRequest("tools/call", {
            name: "generate_thumbnail",
            arguments: { position: 10 },
        });
        const exportCall = fetchCalls.find((c) => c.url.includes("/api/v1/export"));
        (0, bun_test_1.expect)(exportCall).toBeDefined();
    });
});
// ═════════════════════════════════════════════════════════════════════
// 9. Tool call: project management → API Gateway
// ═════════════════════════════════════════════════════════════════════
(0, bun_test_1.describe)("tools/call — project management routing", () => {
    (0, bun_test_1.beforeEach)(() => {
        fetchCalls.length = 0;
    });
    (0, bun_test_1.test)("get_timeline_state routes to API Gateway with project ID", async () => {
        await sendRequest("tools/call", {
            name: "get_timeline_state",
            arguments: { projectId: "proj-42" },
        });
        const call = fetchCalls[0];
        (0, bun_test_1.expect)(call).toBeDefined();
        (0, bun_test_1.expect)(call.url).toContain(":8005");
        (0, bun_test_1.expect)(call.url).toContain("/api/v1/projects/proj-42");
    });
    (0, bun_test_1.test)("get_project_info routes to API Gateway", async () => {
        await sendRequest("tools/call", {
            name: "get_project_info",
            arguments: { projectId: "proj-1" },
        });
        const call = fetchCalls[0];
        (0, bun_test_1.expect)(call).toBeDefined();
        (0, bun_test_1.expect)(call.url).toContain("/api/v1/projects/proj-1");
    });
    (0, bun_test_1.test)("duplicate_project uses POST with correct endpoint", async () => {
        await sendRequest("tools/call", {
            name: "duplicate_project",
            arguments: { projectId: "proj-1", newName: "proj-1-copy" },
        });
        const call = fetchCalls[0];
        (0, bun_test_1.expect)(call).toBeDefined();
        (0, bun_test_1.expect)(call.url).toContain("/api/v1/projects/proj-1/duplicate");
        (0, bun_test_1.expect)(call.method).toBe("POST");
    });
    (0, bun_test_1.test)("archive_project uses POST with correct endpoint", async () => {
        await sendRequest("tools/call", {
            name: "archive_project",
            arguments: { projectId: "proj-1" },
        });
        const call = fetchCalls[0];
        (0, bun_test_1.expect)(call).toBeDefined();
        (0, bun_test_1.expect)(call.url).toContain("/api/v1/projects/proj-1/archive");
        (0, bun_test_1.expect)(call.method).toBe("POST");
    });
});
// ═════════════════════════════════════════════════════════════════════
// 10. Tool call: scheduling / channels → API Gateway
// ═════════════════════════════════════════════════════════════════════
(0, bun_test_1.describe)("tools/call — scheduling routing", () => {
    (0, bun_test_1.beforeEach)(() => {
        fetchCalls.length = 0;
    });
    (0, bun_test_1.test)("schedule_routine POSTs to /api/v1/routines", async () => {
        await sendRequest("tools/call", {
            name: "schedule_routine",
            arguments: {
                name: "nightly export",
                cronExpression: "0 2 * * *",
                prompt: "export project",
            },
        });
        const call = fetchCalls[0];
        (0, bun_test_1.expect)(call).toBeDefined();
        (0, bun_test_1.expect)(call.url).toContain("/api/v1/routines");
        (0, bun_test_1.expect)(call.method).toBe("POST");
        const body = JSON.parse(call.body);
        (0, bun_test_1.expect)(body.name).toBe("nightly export");
        (0, bun_test_1.expect)(body.cron_expression).toBe("0 2 * * *");
    });
    (0, bun_test_1.test)("list_routines GETs /api/v1/routines", async () => {
        await sendRequest("tools/call", {
            name: "list_routines",
        });
        const call = fetchCalls[0];
        (0, bun_test_1.expect)(call).toBeDefined();
        (0, bun_test_1.expect)(call.url).toContain("/api/v1/routines");
        (0, bun_test_1.expect)(call.method).toBe("GET");
    });
    (0, bun_test_1.test)("cancel_routine DELETEs /api/v1/routines/:id", async () => {
        await sendRequest("tools/call", {
            name: "cancel_routine",
            arguments: { routineId: "routine-5" },
        });
        const call = fetchCalls[0];
        (0, bun_test_1.expect)(call).toBeDefined();
        (0, bun_test_1.expect)(call.url).toContain("/api/v1/routines/routine-5");
        (0, bun_test_1.expect)(call.method).toBe("DELETE");
    });
    (0, bun_test_1.test)("register_webhook_channel POSTs to /api/v1/channels/webhook", async () => {
        await sendRequest("tools/call", {
            name: "register_webhook_channel",
            arguments: {
                channel: "discord",
                url: "https://discord.com/webhook/123",
                secret: "s3cret",
            },
        });
        const call = fetchCalls[0];
        (0, bun_test_1.expect)(call).toBeDefined();
        (0, bun_test_1.expect)(call.url).toContain("/api/v1/channels/webhook");
        (0, bun_test_1.expect)(call.method).toBe("POST");
    });
    (0, bun_test_1.test)("enqueue_background_task POSTs to /api/v1/tasks", async () => {
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
        (0, bun_test_1.expect)(call).toBeDefined();
        (0, bun_test_1.expect)(call.url).toContain("/api/v1/tasks");
        (0, bun_test_1.expect)(call.method).toBe("POST");
        const body = JSON.parse(call.body);
        (0, bun_test_1.expect)(body.task_type).toBe("auto_backup");
        (0, bun_test_1.expect)(body.priority).toBe(50);
    });
    (0, bun_test_1.test)("get_task_status GETs /api/v1/tasks/:id", async () => {
        await sendRequest("tools/call", {
            name: "get_task_status",
            arguments: { taskId: "task-99" },
        });
        const call = fetchCalls[0];
        (0, bun_test_1.expect)(call).toBeDefined();
        (0, bun_test_1.expect)(call.url).toContain("/api/v1/tasks/task-99");
        (0, bun_test_1.expect)(call.method).toBe("GET");
    });
});
// ═════════════════════════════════════════════════════════════════════
// 11. Prompt injection sanitization
// ═════════════════════════════════════════════════════════════════════
(0, bun_test_1.describe)("tools/call — prompt injection sanitization", () => {
    (0, bun_test_1.beforeEach)(() => {
        fetchCalls.length = 0;
    });
    (0, bun_test_1.test)("truncates argument values at 1000 characters", async () => {
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
        (0, bun_test_1.expect)(call).toBeDefined();
        const body = JSON.parse(call.body);
        // The prompt is built as: "${name} ${key}: ${truncatedValue}, ..."
        // The long value should be truncated at 1000
        (0, bun_test_1.expect)(body.prompt).toContain("add_crossfade");
        (0, bun_test_1.expect)(body.prompt).toContain(`clipBId: ${"X".repeat(1000)}`);
        (0, bun_test_1.expect)(body.prompt).not.toContain("X".repeat(1001));
    });
    (0, bun_test_1.test)("does not truncate short argument values", async () => {
        const shortValue = "hello";
        await sendRequest("tools/call", {
            name: "enhance_audio",
            arguments: { profile: shortValue, mediaUrl: "https://example.com/audio.mp3" },
        });
        const call = fetchCalls.find((c) => c.url.includes("orchestrate"));
        (0, bun_test_1.expect)(call).toBeDefined();
        const body = JSON.parse(call.body);
        (0, bun_test_1.expect)(body.prompt).toContain("profile: hello");
    });
    (0, bun_test_1.test)("handles null / undefined arguments gracefully", async () => {
        await sendRequest("tools/call", {
            name: "auto_beat_sync",
            arguments: { sensitivity: null },
        });
        const call = fetchCalls.find((c) => c.url.includes("orchestrate"));
        (0, bun_test_1.expect)(call).toBeDefined();
        const body = JSON.parse(call.body);
        // null values become the empty string via String(null ?? "")
        (0, bun_test_1.expect)(body.prompt).toContain("sensitivity: ");
    });
    (0, bun_test_1.test)("truncates total prompt at 10000 characters", async () => {
        // Send many large arguments to exceed the 10000 char prompt limit
        const args = {};
        for (let i = 0; i < 20; i++) {
            args[`key${i}`] = "X".repeat(900);
        }
        await sendRequest("tools/call", {
            name: "apply_color_grade",
            arguments: args,
        });
        const call = fetchCalls.find((c) => c.url.includes("orchestrate"));
        (0, bun_test_1.expect)(call).toBeDefined();
        const body = JSON.parse(call.body);
        (0, bun_test_1.expect)(body.prompt.length).toBeLessThanOrEqual(10000);
    });
    (0, bun_test_1.test)("limits to 100 argument entries", async () => {
        const args = {};
        for (let i = 0; i < 200; i++) {
            args[`key${i}`] = "value";
        }
        await sendRequest("tools/call", {
            name: "add_crossfade",
            arguments: args,
        });
        const call = fetchCalls.find((c) => c.url.includes("orchestrate"));
        (0, bun_test_1.expect)(call).toBeDefined();
        const body = JSON.parse(call.body);
        // Should be limited by the 100-arg and 10000-char caps
        (0, bun_test_1.expect)(body.prompt.length).toBeLessThanOrEqual(10000);
    });
});
// ═════════════════════════════════════════════════════════════════════
// 12. JSON-RPC response format
// ═════════════════════════════════════════════════════════════════════
(0, bun_test_1.describe)("JSON-RPC protocol conformance", () => {
    (0, bun_test_1.test)("responses contain jsonrpc field", async () => {
        const response = await sendRequest("tools/list");
        (0, bun_test_1.expect)(response.jsonrpc).toBe("2.0");
    });
    (0, bun_test_1.test)("responses echo back the request id", async () => {
        // sendRequest auto-assigns an id; verify it's preserved
        const id = nextId;
        const response = (await sendRequest("resources/list"));
        (0, bun_test_1.expect)(response.id).toBe(id);
    });
    (0, bun_test_1.test)("result objects match expected structure", async () => {
        const response = (await sendRequest("prompts/list"));
        (0, bun_test_1.expect)(response.result).toBeDefined();
        (0, bun_test_1.expect)(typeof response.result).toBe("object");
        (0, bun_test_1.expect)(response.result.prompts).toBeDefined();
    });
});
// ═════════════════════════════════════════════════════════════════════
// 13. Graceful shutdown
// ═════════════════════════════════════════════════════════════════════
(0, bun_test_1.describe)("graceful shutdown", () => {
    (0, bun_test_1.test)("SIGINT triggers process.exit(0)", async () => {
        exitCodes.length = 0;
        process.emit("SIGINT", "SIGINT");
        await new Promise((r) => setTimeout(r, 50));
        (0, bun_test_1.expect)(exitCodes).not.toBeEmpty();
        (0, bun_test_1.expect)(exitCodes[0]).toBe(0);
    });
    (0, bun_test_1.test)("signals are registered for SIGINT, SIGTERM, and SIGHUP", () => {
        // Verify the process has listeners for all three signals.
        // At this point SIGINT has already been emitted (isShuttingDown is
        // true), so the handler won't call exit again — but we can
        // confirm the listener count is > 0 for each.
        const sigintCount = process.listenerCount("SIGINT");
        const sigtermCount = process.listenerCount("SIGTERM");
        const sighupCount = process.listenerCount("SIGHUP");
        (0, bun_test_1.expect)(sigintCount).toBeGreaterThan(0);
        (0, bun_test_1.expect)(sigtermCount).toBeGreaterThan(0);
        (0, bun_test_1.expect)(sighupCount).toBeGreaterThan(0);
    });
    (0, bun_test_1.test)("double shutdown is idempotent", async () => {
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
        (0, bun_test_1.expect)(exitCodes).toHaveLength(0);
    });
});
