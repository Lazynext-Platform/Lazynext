import { Request, Response } from "express";

const GENERATIVE_STUDIO_URL =
  process.env.GENERATIVE_STUDIO_URL || "http://localhost:8001";

/**
 * Generate B-roll video via the generative-studio service.
 * Falls back to mock when the service is unreachable.
 */
export const generateBroll = async (req: Request, res: Response) => {
  const { prompt, duration = 3 } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }

  console.log(`[Generative] Generating B-Roll: "${prompt}" for ${duration}s`);

  try {
    const response = await fetch(
      `${GENERATIVE_STUDIO_URL}/generate-video`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          width: 1024,
          height: 576,
          num_frames: duration * 30,
        }),
      },
    );

    if (response.ok) {
      const data = await response.json() as { success: boolean; prediction_id?: string };
      res.json({
        success: true,
        predictionId: data.prediction_id,
        prompt,
        duration,
        metadata: { provider: "generative-studio" },
      });
      return;
    }
  } catch (err) {
    console.warn(`[Generative] Generative studio unreachable: ${err}. Using mock fallback.`);
  }

  // Mock fallback when service is unreachable
  await new Promise((resolve) => setTimeout(resolve, 500));
  res.json({
    success: true,
    assetUrl: `https://generative.lazynext.ai/assets/broll_${Date.now()}.mp4`,
    prompt,
    duration,
    metadata: { provider: "Mock", fps: 30 },
  });
};

/**
 * Generate AI dubbing via the generative-studio service.
 * Falls back to mock when the service is unreachable.
 */
export const generateDub = async (req: Request, res: Response) => {
  const { script, voice = "cinematic_narrator" } = req.body;
  if (!script) {
    return res.status(400).json({ error: "Missing script" });
  }

  console.log(`[Generative] Generating Dub: "${script}" with voice ${voice}`);

  try {
    const response = await fetch(
      `${GENERATIVE_STUDIO_URL}/dub`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: script,
          voice_id: voice,
        }),
      },
    );

    if (response.ok) {
      const data = await response.json() as { success: boolean; audio_url?: string };
      res.json({
        success: true,
        audioUrl: data.audio_url,
        script,
        voice,
        metadata: { provider: "generative-studio" },
      });
      return;
    }
  } catch (err) {
    console.warn(`[Generative] Generative studio unreachable: ${err}. Using mock fallback.`);
  }

  // Mock fallback when service is unreachable
  await new Promise((resolve) => setTimeout(resolve, 500));
  res.json({
    success: true,
    assetUrl: `https://generative.lazynext.ai/assets/dub_${Date.now()}.wav`,
    script,
    voice,
    metadata: { provider: "Mock", length_seconds: Math.max(script.length / 15, 1.0) },
  });
};
