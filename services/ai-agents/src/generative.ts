import { Request, Response } from "express";

/**
 * Mock generative AI studio.
 * In a production scenario, this hooks up to Replicate, Runway, or ElevenLabs APIs.
 */

export const generateBroll = async (req: Request, res: Response) => {
  const { prompt, duration = 3 } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }

  console.log(`[Generative] Generating B-Roll: "${prompt}" for ${duration}s`);

  // Simulate external API call delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  res.json({
    success: true,
    assetUrl: `https://generative.lazynext.ai/assets/broll_${Date.now()}.mp4`,
    prompt,
    duration,
    metadata: {
      provider: "MockSVD",
      fps: 30,
    }
  });
};

export const generateDub = async (req: Request, res: Response) => {
  const { script, voice = "cinematic_narrator" } = req.body;
  if (!script) {
    return res.status(400).json({ error: "Missing script" });
  }

  console.log(`[Generative] Generating Dub: "${script}" with voice ${voice}`);

  // Simulate external API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  res.json({
    success: true,
    assetUrl: `https://generative.lazynext.ai/assets/dub_${Date.now()}.wav`,
    script,
    voice,
    metadata: {
      provider: "MockElevenLabs",
      length_seconds: Math.max(script.length / 15, 1.0),
    }
  });
};
