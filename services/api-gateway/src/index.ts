import Fastify from "fastify";
import cors from "@fastify/cors";
import crypto from "crypto";

const fastify = Fastify({ logger: true });

fastify.register(cors, {
  origin: "*",
});

// Mock jobs store
const jobs = new Map<string, any>();

fastify.post("/v1/execute", async (request, reply) => {
  const { prompt } = request.body as { prompt: string };
  const jobId = crypto.randomUUID();
  
  // Create a mock job
  jobs.set(jobId, {
    id: jobId,
    status: "processing",
    prompt,
    createdAt: new Date().toISOString()
  });

  // Mock background processing
  setTimeout(() => {
    jobs.set(jobId, {
      ...jobs.get(jobId),
      status: "completed",
      result: "Autonomously executed intent: " + prompt,
      videoUrl: "https://cdn.lazynext.ai/rendered/" + jobId + ".mp4",
      completedAt: new Date().toISOString()
    });
  }, 5000);

  return { jobId, status: "processing" };
});

fastify.get("/v1/jobs/:id", async (request, reply) => {
  const { id } = request.params as { id: string };
  const job = jobs.get(id);
  
  if (!job) {
    reply.code(404);
    return { error: "Job not found" };
  }

  return job;
});

fastify.get("/health", async () => {
  return { status: "ok" };
});

const start = async () => {
  try {
    await fastify.listen({ port: 8005, host: "0.0.0.0" });
    console.log("API Gateway listening on port 8005");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
