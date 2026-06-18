import { NextResponse } from "next/server";

const GENERATIVE_STUDIO_URL =
  process.env.GENERATIVE_STUDIO_URL || "http://localhost:8001";

export async function POST(request: Request) {
  try {
    const { text, voiceId } = (await request.json()) as {
      text?: string;
      voiceId?: string;
    };

    if (!text) {
      return NextResponse.json(
        { success: false, error: "Text prompt is required" },
        { status: 400 },
      );
    }

    console.log(
      `[API] Dispatching TTS to Generative Studio: "${text.substring(0, 80)}..."`,
    );

    // Forward to generative-studio dub endpoint
    try {
      const response = await fetch(`${GENERATIVE_STUDIO_URL}/dub`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clip_id: `tts-${Date.now()}`,
          target_language: "en-US",
          text_to_dub: text,
          ...(voiceId ? { voice_id: voiceId } : {}),
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as { audio_url?: string };
        return NextResponse.json({
          success: true,
          message: "AI Voiceover generated",
          audioClip: {
            id: `audio-${Date.now()}`,
            name: `AI Voiceover: "${text.substring(0, 30)}..."`,
            type: "audio",
            start_frame: 0,
            duration_frames: Math.ceil(text.split(" ").length * 15),
            source: data.audio_url,
            volume: 1.0,
            isAI: true,
          },
        });
      }
    } catch (err) {
      console.warn(`[TTS] Generative Studio unreachable: ${err}`);
    }

    // Dev-only fallback
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({
        success: true,
        message: "AI Voiceover generated (dev fallback)",
        audioClip: {
          id: `audio-${Date.now()}`,
          name: `AI Voiceover: "${text.substring(0, 30)}..."`,
          type: "audio",
          start_frame: 0,
          duration_frames: 180,
          source:
            "https://actions.google.com/sounds/v1/speech/voices_local_male.ogg",
          volume: 1.0,
          isAI: true,
          source_note: "dev-fallback",
        },
      });
    }

    return NextResponse.json(
      { success: false, error: "TTS service unavailable" },
      { status: 503 },
    );
  } catch (error: unknown) {
    console.error("TTS API Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
