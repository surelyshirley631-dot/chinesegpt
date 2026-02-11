import { NextRequest, NextResponse } from 'next/server';
import { EdgeTTSClient, OUTPUT_FORMAT } from 'edge-tts-client';

export async function POST(req: NextRequest) {
  try {
    const { text, voice, rate } = await req.json();

    if (!text || !voice) {
      return NextResponse.json({ error: 'Missing text or voice' }, { status: 400 });
    }

    const client = new EdgeTTSClient();
    
    // Set up voice
    await client.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    
    // Create streaming request
    const stream = await client.toStream(text, {
      rate: rate || 1.0,
      volume: 100,
      pitch: '+0Hz'
    });

    // Collect chunks
    const chunks: Uint8Array[] = [];
    
    return new Promise((resolve) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stream.on('data', (chunk: any) => {
        if (chunk) chunks.push(chunk);
      });

      stream.on('end', () => {
        const audioBuffer = Buffer.concat(chunks);
        resolve(new NextResponse(audioBuffer, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.length.toString(),
          },
        }));
      });
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (stream as any).on('error', (err: any) => {
        console.error("EdgeTTS Stream Error:", err);
         resolve(NextResponse.json({ error: 'TTS generation failed' }, { status: 500 }));
      });
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('TTS API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
