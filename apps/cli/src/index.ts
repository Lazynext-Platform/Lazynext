#!/usr/bin/env node

import { Command } from "commander";

const program = new Command();

program
  .name("lazynext")
  .description("CLI to orchestrate autonomous video editing with Lazynext API Gateway")
  .version("0.1.0");

program
  .command("edit")
  .description("Execute an autonomous video edit")
  .requiredOption("-p, --prompt <string>", "Natural language instruction for the edit")
  .option("-a, --analyze <string>", "Analyze media files before editing (provide path to media)")
  .action(async (options) => {
    console.log(`🤖 Requesting autonomous edit: "${options.prompt}"`);

    try {
      const res = await fetch("http://localhost:8005/v1/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: options.prompt }),
      });

      if (!res.ok) {
        throw new Error(`API Gateway returned status: ${res.status}`);
      }

      const data = await res.json() as { jobId: string; status: string };
      console.log(`✅ Job created successfully! Job ID: ${data.jobId}`);
      console.log(`⏳ Status: ${data.status}`);

      // Basic polling mechanism
      const poll = setInterval(async () => {
        try {
          const pollRes = await fetch(`http://localhost:8005/v1/jobs/${data.jobId}`);
          if (pollRes.ok) {
            const jobData = await pollRes.json() as any;
            if (jobData.status === "completed") {
              console.log(`🎉 Job completed!`);
              console.log(`Result: ${jobData.result}`);
              console.log(`Video URL: ${jobData.videoUrl}`);
              clearInterval(poll);
            } else if (jobData.status === "failed") {
              console.error(`❌ Job failed: ${jobData.error}`);
              clearInterval(poll);
            } else {
              process.stdout.write(".");
            }
          }
        } catch (e) {
          // ignore network errors while polling
        }
      }, 1000);

    } catch (error: any) {
      console.error(`❌ Error communicating with API Gateway: ${error.message}`);
    }
  });

program
  .command("prompt <prompt-text>")
  .description("Agentic command to orchestrate a full video edit workflow (e.g. 'make a recap video')")
  .action(async (promptText) => {
    console.log(`🤖 Agentic Workflow Triggered: "${promptText}"`);
    try {
      const res = await fetch("http://localhost:8005/v1/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText, mode: "agentic" }),
      });

      if (!res.ok) {
        throw new Error(`API Gateway returned status: ${res.status}`);
      }

      const data = await res.json() as { jobId: string; status: string };
      console.log(`✅ Agentic Job created successfully! Job ID: ${data.jobId}`);
      console.log(`⏳ Status: ${data.status}`);
      
      // Basic polling mechanism
      const poll = setInterval(async () => {
        try {
          const pollRes = await fetch(`http://localhost:8005/v1/jobs/${data.jobId}`);
          if (pollRes.ok) {
            const jobData = await pollRes.json() as any;
            if (jobData.status === "completed") {
              console.log(`\n🎉 Agentic Workflow completed!`);
              console.log(`Result: ${jobData.result}`);
              console.log(`Video URL: ${jobData.videoUrl}`);
              clearInterval(poll);
            } else if (jobData.status === "failed") {
              console.error(`\n❌ Job failed: ${jobData.error}`);
              clearInterval(poll);
            } else {
              process.stdout.write(".");
            }
          }
        } catch (e) {
          // ignore network errors while polling
        }
      }, 1000);

    } catch (error: any) {
      console.error(`❌ Error communicating with API Gateway: ${error.message}`);
    }
  });

program.parse(process.argv);
