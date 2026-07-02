import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { getApiConfigs } from '@/lib/api-config';

export async function POST(req: Request) {
  try {
    const { url, type } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // 1. Fetch HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ChineseGPT/1.0;)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }
    
    const html = await response.text();

    // 2. Extract Data (Simple Regex to avoid heavy dependencies)
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Try to find Open Graph image
    const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]*)"/i) ||
                         html.match(/<meta\s+name="twitter:image"\s+content="([^"]*)"/i) ||
                         html.match(/<link\s+rel="image_src"\s+href="([^"]*)"/i);
                         
    let imageUrl = ogImageMatch ? ogImageMatch[1] : '';
    
    // Fix relative URLs for images
    if (imageUrl && !imageUrl.startsWith('http')) {
      try {
        const urlObj = new URL(url);
        imageUrl = new URL(imageUrl, urlObj.origin).toString();
      } catch (e) {
        console.warn('Failed to resolve relative image URL', e);
      }
    }

    // Clean text for AI processing
    let cleanText = html
      .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
      .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "")
      .replace(/<[^>]+>/g, ' ') // Strip tags
      .replace(/\s+/g, ' ') // Collapse spaces
      .trim()
      .slice(0, 15000); 

    // 3. Process with configured AI
    const configs = getApiConfigs();
    if (configs.length === 0) {
      return NextResponse.json({ error: 'No AI providers configured' }, { status: 500 });
    }
    
    const prompt = `
    Analyze the following text content from a webpage about "${type || 'Chinese culture/language'}".
    URL: ${url}
    Title: ${title}
    Content: ${cleanText}

    Task: Create a structured learning card JSON object.
    
    Requirements:
    1. "zh": A simplified Chinese title/term (HSK 1-3 if possible).
    2. "en": English translation of the title.
    3. "desc": A very short English description (1 sentence).
    4. "detail": A simple Chinese explanation (HSK 3 level). Do NOT use Pinyin or Ruby tags here, just plain Chinese characters.
    5. "examples": Array of 2 examples { zh, en }.
    
    Output JSON ONLY. No markdown.
    Structure:
    {
      "zh": "...",
      "en": "...",
      "desc": "...",
      "detail": "...",
      "examples": [
        { "zh": "...", "en": "..." },
        { "zh": "...", "en": "..." }
      ]
    }
    `;

    let aiText = '';
    let lastError = null;

    for (const config of configs) {
      try {
        if (config.provider === 'gemini') {
          const genAI = new GoogleGenerativeAI(config.apiKey);
          const model = genAI.getGenerativeModel({ model: config.modelName });
          const result = await model.generateContent(prompt);
          aiText = result.response.text();
        } else {
          const openai = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseUrl,
          });

          const completion = await openai.chat.completions.create({
            model: config.modelName,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            response_format: { type: 'json_object' }
          });
          aiText = completion.choices[0].message.content || '';
        }
        
        if (aiText) break;
      } catch (e) {
        console.error(`Process URL error with ${config.provider}:`, e);
        lastError = e;
      }
    }

    if (!aiText) {
      throw new Error(lastError?.message || 'All AI providers failed to process URL');
    }

    // Clean markdown code blocks if present
    const jsonStr = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let data;
    try {
      data = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse AI response:', aiText);
      throw new Error('Failed to generate valid JSON from AI');
    }

    return NextResponse.json({
      ...data,
      imageUrl: imageUrl || data.imageUrl
    });

  } catch (error: any) {
    console.error('URL processing error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
