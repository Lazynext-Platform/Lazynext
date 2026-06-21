import { expect, test, describe, mock } from "bun:test";
import { decomposeIntent } from "../src/orchestrator";

describe("AI Orchestrator - Rule-Based Decomposition", () => {
  test("transcribe intent should map to transcribe tool", async () => {
    const prompt = "Please transcribe this video and add subtitles.";
    const result = await decomposeIntent(prompt);
    
    expect(result.steps.length).toBeGreaterThanOrEqual(1);
    const transcribeStep = result.steps.find((s) => s.tool === "transcribe");
    expect(transcribeStep).toBeDefined();
    expect(transcribeStep?.args.video_id).toBe("input_video");
  });

  test("dub intent should map to generate_dub tool", async () => {
    const prompt = "Translate and dub this video into Spanish.";
    const result = await decomposeIntent(prompt);
    
    const dubStep = result.steps.find((s) => s.tool === "generate_dub");
    expect(dubStep).toBeDefined();
    expect(dubStep?.args.target_language).toBe("es-ES");
  });

  test("broll intent should map to generate_broll", async () => {
    const prompt = "Generate b-roll of a futuristic city.";
    const result = await decomposeIntent(prompt);
    
    const brollStep = result.steps.find((s) => s.tool === "generate_broll");
    expect(brollStep).toBeDefined();
    expect((brollStep?.args.prompt as string).includes("futuristic city")).toBe(true);
  });

  test("silence trim intent should map to trim_silence", async () => {
    const prompt = "Clean up the audio and trim silence.";
    const result = await decomposeIntent(prompt);
    
    const trimStep = result.steps.find((s) => s.tool === "trim_silence");
    expect(trimStep).toBeDefined();
  });

  test("multiple intents should sequence tools and end with render", async () => {
    const prompt = "Transcribe the video, dub it to French, and trim silence.";
    const result = await decomposeIntent(prompt);
    
    const tools = result.steps.map((s) => s.tool);
    expect(tools).toContain("transcribe");
    expect(tools).toContain("generate_dub");
    expect(tools).toContain("trim_silence");
    // render step is always added if there are other steps
    expect(tools[tools.length - 1]).toBe("render");
  });
  
  test("default intent should fetch assets and render", async () => {
    const prompt = "Make a cool montage of nature.";
    const result = await decomposeIntent(prompt);
    
    const tools = result.steps.map((s) => s.tool);
    expect(tools).toContain("fetch_assets");
    expect(tools).toContain("render");
  });
});
