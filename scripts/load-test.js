// ── Lazynext Platform K6 Load Test ──────────────────────────────
// Tests all 7 formats under concurrent load.
//
// Usage:
//   k6 run scripts/load-test.js --env TARGET_URL=http://localhost:8005
//   k6 run scripts/load-test.js --env TARGET_URL=https://api.lazynext.ai --vus 50 --duration 5m
//
// Requirements: k6 (https://k6.io/docs/get-started/installation/)

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

const TARGET = __ENV.TARGET_URL || "http://localhost:8005";
const WEB_URL = __ENV.WEB_URL || "http://localhost:3000";

const errorRate = new Rate("errors");
const renderLatency = new Trend("render_latency_ms");
const aiLatency = new Trend("ai_latency_ms");
const apiLatency = new Trend("api_latency_ms");

export const options = {
  stages: [
    { duration: "30s", target: 10 },  // Ramp up to 10 users
    { duration: "2m", target: 50 },   // Stay at 50 users
    { duration: "30s", target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"],       // 95% of requests under 2s
    errors: ["rate<0.05"],                    // <5% error rate
    api_latency: ["p(95)<500"],               // API p95 under 500ms
    render_latency: ["p(95)<30000"],          // Render p95 under 30s
    ai_latency: ["p(95)<15000"],              // AI p95 under 15s
  },
};

export default function () {
  // ── 1. Health Checks (SLO baseline) ──
  group("Health Checks", () => {
    const health = http.get(`${TARGET}/health`, { timeout: "5s" });
    check(health, { "API Gateway healthy": (r) => r.status === 200 });
    apiLatency.add(health.timings.duration);
    errorRate.add(health.status >= 400);

    sleep(1);
  });

  // ── 2. API Gateway CRUD ──
  group("API Gateway", () => {
    // Create project
    const createRes = http.post(
      `${TARGET}/api/v1/projects`,
      JSON.stringify({ name: "load-test", width: 1920, height: 1080, framerate: 30 }),
      { headers: { "Content-Type": "application/json" }, timeout: "10s" }
    );
    check(createRes, { "Create project": (r) => r.status < 500 });
    apiLatency.add(createRes.timings.duration);
    errorRate.add(createRes.status >= 400);

    // List projects
    const listRes = http.get(`${TARGET}/api/v1/projects`, { timeout: "5s" });
    check(listRes, { "List projects": (r) => r.status < 500 });
    apiLatency.add(listRes.timings.duration);

    sleep(1);
  });

  // ── 3. AI Autonomous Edit ──
  group("AI Edit", () => {
    const payload = JSON.stringify({
      prompt: "Add a video track with a color grade",
      require_plan_approval: false,
      source_files: [],
    });

    const editRes = http.post(
      `${TARGET}/api/v1/autonomous_edit`,
      payload,
      { headers: { "Content-Type": "application/json" }, timeout: "30s" }
    );
    check(editRes, { "AI edit ok": (r) => r.status < 500 });
    aiLatency.add(editRes.timings.duration);
    errorRate.add(editRes.status >= 400);
    sleep(2);
  });

  // ── 4. Web App Page Load ──
  group("Web App", () => {
    const pages = ["/", "/editor", "/dashboard"];
    pages.forEach((page) => {
      const res = http.get(`${WEB_URL}${page}`, { timeout: "10s" });
      check(res, { [`Page ${page}`]: (r) => r.status === 200 || r.status === 304 });
      apiLatency.add(res.timings.duration);
      errorRate.add(res.status >= 400);
      sleep(0.5);
    });
  });

  // ── 5. Render Service ──
  group("Render Service", () => {
    const renderRes = http.post(
      `${TARGET}/api/v1/export`,
      JSON.stringify({
        projectId: "load-test",
        format: "mp4",
        width: 640,
        height: 480,
        framerate: 10,
        totalFrames: 30,
        bitrate_kbps: 500,
      }),
      { headers: { "Content-Type": "application/json" }, timeout: "30s" }
    );
    check(renderRes, { "Export request": (r) => r.status < 500 });
    renderLatency.add(renderRes.timings.duration);
    errorRate.add(renderRes.status >= 400);

    // Stream synthetic frames (5 frames)
    const jobId = renderRes.json()?.jobId;
    if (jobId) {
      const frameSize = 640 * 480 * 4; // RGBA
      const frame = new Uint8Array(frameSize);
      for (let i = 0; i < 5; i++) {
        const frameRes = http.post(
          `${TARGET}/api/v1/export/${jobId}/frames`,
          frame.buffer,
          {
            headers: {
              "Content-Type": "application/octet-stream",
              "X-Frame-Seq": String(i),
            },
            timeout: "10s",
          }
        );
        check(frameRes, { "Frame upload": (r) => r.status < 500 });
        errorRate.add(frameRes.status >= 400);
      }
      // End stream
      http.post(`${TARGET}/api/v1/export/${jobId}/frames/end`, null, { timeout: "10s" });
    }

    sleep(3);
  });

  // ── 6. MCP Protocol (JSON-RPC echo) ──
  group("MCP Protocol", () => {
    const mcpPayload = JSON.stringify({
      jsonrpc: "2.0",
      id: "load-test",
      method: "tools/list",
      params: {},
    });
    const mcpRes = http.post(
      `${TARGET}/api/mcp`,
      mcpPayload,
      { headers: { "Content-Type": "application/json" }, timeout: "5s" }
    );
    check(mcpRes, { "MCP tools/list": (r) => r.status < 500 });
    apiLatency.add(mcpRes.timings.duration);
    errorRate.add(mcpRes.status >= 400);
    sleep(1);
  });

  // ── 7. Media Ingest ──
  group("Media Ingest", () => {
    const ingestRes = http.post(
      `${TARGET}/api/v1/ai/ingest`,
      JSON.stringify({
        url: "file:///tmp/test-video.mp4",
        projectId: "load-test",
        source: "load-test",
      }),
      { headers: { "Content-Type": "application/json" }, timeout: "10s" }
    );
    check(ingestRes, { "Media ingest": (r) => r.status < 500 });
    apiLatency.add(ingestRes.timings.duration);
    errorRate.add(ingestRes.status >= 400);
    sleep(1);
  });
}

export function handleSummary(data) {
  return {
    "scripts/load-test-results.json": JSON.stringify(data, null, 2),
    stdout: `
=== Lazynext Load Test Results ===

Checks Passed: ${data.metrics.checks_passes?.values?.count || 0}
Checks Failed: ${data.metrics.checks_fails?.values?.count || 0}
Error Rate:    ${(data.metrics.errors?.values?.rate * 100).toFixed(2)}%

API P95:      ${data.metrics.api_latency?.values?.["p(95)"]?.toFixed(0) || "N/A"}ms
AI P95:       ${data.metrics.ai_latency?.values?.["p(95)"]?.toFixed(0) || "N/A"}ms
Render P95:   ${data.metrics.render_latency?.values?.["p(95)"]?.toFixed(0) || "N/A"}ms

Total Requests: ${data.metrics.http_reqs?.values?.count || 0}
Avg Duration:   ${data.metrics.http_req_duration?.values?.avg?.toFixed(0) || "N/A"}ms
Max Duration:   ${data.metrics.http_req_duration?.values?.max?.toFixed(0) || "N/A"}ms
`,
  };
}
