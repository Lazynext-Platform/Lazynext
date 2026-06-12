import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { prompt, type } = await req.json();

    if (!prompt) {
      return new NextResponse('Prompt is required', { status: 400 });
    }

    // Simulate network latency for generation (3-5 seconds)
    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));

    if (type === 'video') {
      // Return a simulated video URL
      const mockUrl = `https://source.unsplash.com/1280x720/?${encodeURIComponent(prompt)}`;
      return NextResponse.json({ 
        url: mockUrl,
        type: 'video',
        name: `Generated Video: ${prompt.substring(0, 20)}...`
      });
    }

    if (type === 'audio') {
      // Return a simulated audio URL
      return NextResponse.json({
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        type: 'audio',
        name: `Generated VO: ${prompt.substring(0, 20)}...`
      });
    }

    return new NextResponse('Invalid generation type', { status: 400 });

  } catch (error) {
    console.error('[AI_GENERATE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
