import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Initialize Supabase Client (Service Role for backend operations if needed, or Anon if RLS permits)
// For RAG, we usually want to search all documents, so Service Role might be safer if RLS restricts read
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // 1. Generate Embedding for the query
    const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" }); // or text-embedding-004
    const embeddingResult = await embeddingModel.embedContent(message);
    const embedding = embeddingResult.embedding.values;

    // 2. Retrieve relevant documents from Supabase
    const { data: documents, error: searchError } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.5, // Adjust threshold as needed
      match_count: 5
    });

    if (searchError) {
      console.error('Supabase search error:', searchError);
      return NextResponse.json({ error: 'Failed to retrieve documents' }, { status: 500 });
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

    // 4. Generate Answer using Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Use a fast model
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ 
      answer: text, 
      context: documents // Optional: Return context sources for transparency
    });

  } catch (error) {
    console.error('RAG Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
