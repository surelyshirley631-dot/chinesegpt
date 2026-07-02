import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { getApiConfigs } from '@/lib/api-config';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const configs = getApiConfigs();
    if (configs.length === 0) {
      return NextResponse.json({ error: 'No AI providers configured' }, { status: 500 });
    }

    // 1. Generate Embedding for the query (Prioritize Gemini for embeddings if available)
    let embedding = null;
    const geminiConfig = configs.find(c => c.provider === 'gemini');
    
    if (geminiConfig) {
      try {
        const genAI = new GoogleGenerativeAI(geminiConfig.apiKey);
        const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const embeddingResult = await embeddingModel.embedContent(message);
        embedding = embeddingResult.embedding.values;
      } catch (e) {
        console.warn('Gemini embedding failed, RAG might be degraded:', e);
      }
    }

    // 2. Retrieve relevant documents from Supabase (only if embedding is available)
    let documents: any[] = [];
    if (embedding) {
      const { data, error: searchError } = await supabase.rpc('match_documents', {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: 5
      });
      if (!searchError) {
        documents = data || [];
      } else {
        console.error('Supabase search error:', searchError);
      }
    }

    // 3. Construct the prompt with context
    const contextText = documents?.map((doc: any) => doc.content).join('\n---\n') || '';
    
    const prompt = `
You are a smart educational assistant for a Chinese learning platform.
Use the following context (course materials) to answer the user's question or provide an exercise.
If the answer is not in the context, use your general knowledge but mention that it's not in the specific courseware.

Context:
${contextText}

User Question: ${message}

Answer:
`;

    // 4. Generate Answer using configured provider
    let lastError = null;
    for (const config of configs) {
      try {
        let text = '';
        if (config.provider === 'gemini') {
          const genAI = new GoogleGenerativeAI(config.apiKey);
          const model = genAI.getGenerativeModel({ model: config.modelName });
          const result = await model.generateContent(prompt);
          text = result.response.text();
        } else {
          const openai = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseUrl,
          });
          const completion = await openai.chat.completions.create({
            model: config.modelName,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
          });
          text = completion.choices[0].message.content || '';
        }

        if (text) {
          return NextResponse.json({ 
            answer: text, 
            context: documents,
            provider: config.provider
          });
        }
      } catch (error: any) {
        console.error(`RAG error with ${config.provider}:`, error);
        lastError = error;
        continue;
      }
    }

    return NextResponse.json(
      { error: lastError?.message || 'All RAG providers failed' },
      { status: 500 }
    );

  } catch (error: any) {
    console.error('RAG Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
