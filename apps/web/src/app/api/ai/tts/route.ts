import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { text, voiceId } = await request.json();

    if (!text) {
      return NextResponse.json({ success: false, error: 'Text prompt is required' }, { status: 400 });
    }

    console.log(`[API] Dispatching TTS generation task to Generative Studio... Voice: ${voiceId || 'default'}`);

    // In a production environment, this would call the Python Text-To-Speech API
    // e.g., ElevenLabs proxy or EdgeTTS from Text-To-Video-AI.
    await new Promise(resolve => setTimeout(resolve, 800));

    // Simulated TTS output clip mapped to the timeline format
    const mockAudioClip = {
      id: `audio-${Date.now()}`,
      name: `AI Voiceover: "${text.substring(0, 15)}..."`,
      type: "audio",
      start_frame: 0,
      duration_frames: 180, // Approx 3 seconds
      source: "https://actions.google.com/sounds/v1/speech/voices_local_male.ogg",
      volume: 1.0,
      isAI: true
    };

    return NextResponse.json({
      success: true,
      message: 'AI Voiceover generated successfully',
      audioClip: mockAudioClip
    });

  } catch (error: any) {
    console.error("TTS API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
