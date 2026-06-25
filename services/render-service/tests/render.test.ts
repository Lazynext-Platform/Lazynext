import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import app from "../src/index";

describe("Render Service API", () => {
  const TEST_PORT = 8010;
  let server: any;
  let redisAvailable = false;

  beforeAll(async () => {
    server = app.listen(TEST_PORT);
    // Probe whether Redis is reachable. If not, queue-dependent
    // tests will be skipped rather than failing in CI.
    try {
      const res = await fetch(`http://localhost:${TEST_PORT}/health`);
      const data = await res.json();
      redisAvailable = data.redis_available === true;
    } catch {
      redisAvailable = false;
    }
  });

  afterAll(() => {
    server.close();
  });

  test("GET /health should return status ok", async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(data.ffmpeg_available).toBe(true);
  });

  test("POST /api/v1/jobs should queue a job and return a jobId", async () => {
    if (!redisAvailable) {
      console.warn("Skipping: Redis unavailable (queue test requires Redis)");
      return;
    }
    const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: "test_proj_1", format: "mp4" }),
    });
    expect(res.status).toBe(202);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.jobId).toBeDefined();

    // Verify job is available via GET
    const jobRes = await fetch(`http://localhost:${TEST_PORT}/api/v1/jobs/${data.jobId}`);
    expect(jobRes.status).toBe(200);
    const jobData = await jobRes.json();
    expect(jobData.success).toBe(true);
    expect(jobData.job.projectId).toBe("test_proj_1");
    // Worker runs in-process and may have already picked up the job.
    // Accept either "queued" or "rendering" as valid initial states.
    expect(["queued", "rendering"]).toContain(jobData.job.status);
  });

  test("POST /api/v1/jobs without projectId should fail", async () => {
    if (!redisAvailable) {
      console.warn("Skipping: Redis unavailable");
      return;
    }
    const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "mp4" }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Missing projectId");
  });

  test("GET /api/v1/jobs/:jobId with invalid id should 404", async () => {
    if (!redisAvailable) {
      console.warn("Skipping: Redis unavailable");
      return;
    }
    const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/jobs/invalid-id-123`);
    expect(res.status).toBe(404);
  });
});
