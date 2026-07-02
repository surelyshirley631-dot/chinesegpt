import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { getApiConfigs } from '@/lib/api-config';

const classifyInput = (text: string): 'character' | 'phrase' | 'sentence' => {
  const normalized = text.trim();
  const cjkCount = (normalized.match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g) || []).length;
  if (cjkCount <= 1) return 'character';
  if (/[。！？!?；;，,]/.test(normalized) || cjkCount >= 8) return 'sentence';
  return 'phrase';
};

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const inputType = classifyInput(text);
    const configs = getApiConfigs();
    console.log('Pinyin Translate: Found configs:', configs.length, configs.map(c => c.provider));
    
    if (configs.length === 0) {
      console.error('Pinyin Translate: No AI providers configured');
      return NextResponse.json({ error: 'No AI providers configured' }, { status: 500 });
    }

    const prompt = `You are a professional Chinese-to-English translator.
Translate naturally and contextually instead of literal word-by-word translation.

Input type: ${inputType}
Chinese: ${text}

Rules:
1) Return ONLY one English translation line. No explanation.
2) If input type is "sentence", prioritize fluent, natural sentence translation.
3) If input type is "phrase", keep concise and idiomatic.
4) If input type is "character", provide the most likely meaning in common learning context.
5) Keep punctuation natural in English.`;

    let lastError = null;

    // Try providers in order
    for (const config of configs) {
      try {
        console.log(`Pinyin Translate: Trying ${config.provider}...`);
        let translation = '';

        if (config.provider === 'gemini') {
          const genAI = new GoogleGenerativeAI(config.apiKey);
          const model = genAI.getGenerativeModel({ model: config.modelName });
          const result = await model.generateContent(prompt);
          translation = result.response.text().trim();
        } else {
          // OpenAI compatible (DeepSeek, SiliconFlow)
          const openai = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseUrl,
          });

          const completion = await openai.chat.completions.create({
            model: config.modelName,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
          });

          translation = completion.choices[0].message.content?.trim() || '';
        }

        if (translation) {
          console.log(`Pinyin Translate: Success with ${config.provider}`);
          return NextResponse.json({ translation, inputType, provider: config.provider });
        }
      } catch (error: any) {
        console.error(`Pinyin Translate error with ${config.provider}:`, error.message);
        lastError = error;
        continue;
      }
    }

    console.error('Pinyin Translate: All providers failed');
    return NextResponse.json(
      { error: lastError?.message || 'All translation providers failed' },
      { status: lastError?.status || 500 }
    );

  } catch (error: any) {
    console.error('Pinyin translate API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Translation failed' },
      { status: 500 },
    );
  }
}
