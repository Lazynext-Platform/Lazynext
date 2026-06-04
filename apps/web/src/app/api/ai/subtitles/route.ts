import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { videoId } = body;

    // Simulate an AI transcription processing delay (e.g., calling OpenAI Whisper API)
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Return realistic structured subtitle tracks
    return NextResponse.json({
      success: true,
      message: 'Transcription complete',
      subtitles: [
        {
          id: crypto.randomUUID(),
          type: "text",
          name: "Sub 1",
          text_content: "Welcome to Lazynext, the future of video editing.",
          start_frame: 0,
          duration_frames: 90,
          font_family: "Inter",
          color: "#ffffff",
          font_size: 40,
          bg_color: "rgba(0,0,0,0.5)",
          bg_padding: 8,
          text_align: "center",
          transform: { x: 0, y: 300, scale: 1, rotation: 0, opacity: 1 }
        },
        {
          id: crypto.randomUUID(),
          type: "text",
          name: "Sub 2",
          text_content: "Powered by WebAssembly, Rust, and AI.",
          start_frame: 90,
          duration_frames: 100,
          font_family: "Inter",
          color: "#ffffff",
          font_size: 40,
          bg_color: "rgba(0,0,0,0.5)",
          bg_padding: 8,
          text_align: "center",
          transform: { x: 0, y: 300, scale: 1, rotation: 0, opacity: 1 }
        },
        {
          id: crypto.randomUUID(),
          type: "text",
          name: "Sub 3",
          text_content: "Let's create something beautiful today.",
          start_frame: 190,
          duration_frames: 110,
          font_family: "Inter",
          color: "#ffffff",
          font_size: 40,
          bg_color: "rgba(0,0,0,0.5)",
          bg_padding: 8,
          text_align: "center",
          transform: { x: 0, y: 300, scale: 1, rotation: 0, opacity: 1 }
        }
      ]
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to transcribe audio' }, { status: 500 });
  }
}
