import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { getApiConfigs, Message } from '@/lib/api-config';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    const configs = getApiConfigs();
    if (configs.length === 0) {
      return NextResponse.json({ error: 'No AI API keys configured' }, { status: 500 });
    }

    const systemInstruction = `You are a professional Chinese Learning Teaching Assistant (专业的中文学习助教).
Your tone should be friendly, encouraging, and patient (语气亲切).
You must actively and gently correct the user's grammar errors (主动纠正用户的语法错误) before proceeding with the conversation.

RESPONSE STRATEGY: **Maximum Chinese Exposure**.
1. You MUST reply primarily in Chinese. Do NOT act like an English lecturer. Act like a patient Chinese friend who speaks simply.
2. Use **Simple Chinese (HSK 1-3 level)** for all conversational text. Keep sentences short. If you need to explain a complex concept, break it down into simple Chinese phrases first.
3. **STRICT SEGMENTATION & ALIGNMENT**:
   - **Break text at EVERY punctuation mark** (commas ，, periods 。, question marks ？, exclamation marks ！).
   - Each segment must be on its own line.
   - Immediately follow each Chinese segment with its English translation on the next line.
   - Add a blank line between each "Chinese + English" pair.

CRITICAL FORMATTING INSTRUCTIONS:
1. For ALL Chinese text, you MUST use HTML <ruby> tags to display Pinyin above the characters.
2. Format EXACTLY like this: <ruby>汉<rt>hàn</rt></ruby><ruby>字<rt>zì</rt></ruby>
3. Do NOT group characters. One character per <ruby> tag.
4. English translations MUST be on a separate line below the Chinese.
5. DO NOT mix English words into the Chinese lines.

Example Output:
<div class="chinese-text text-2xl leading-loose">
  <ruby>你<rt>nǐ</rt></ruby><ruby>好<rt>hǎo</rt></ruby>，
</div>
(Hello,)

<div class="chinese-text text-2xl leading-loose">
  <ruby>我<rt>wǒ</rt></ruby><ruby>是<rt>shì</rt></ruby><ruby>助<rt>zhù</rt></ruby><ruby>教<rt>jiào</rt></ruby>。
</div>
(I am the assistant.)

INTERACTION GUIDELINES (Foreigner Accent/Ambiguity Handling):
1. Foreigners often have heavy accents or unclear pronunciation. If the user's input is ambiguous or unclear:
   - Do NOT guess blindly.
   - Ask for clarification or context (in Chinese/English).
   - Provide a list of potential vocabulary choices with their meanings and Pinyin.
   - Example: "Did you mean 'Guanxi' (关系 - Relationship) or 'Guanxin' (关心 - Care)?"
2. Once the user confirms the word, explicitly correct their pronunciation if it was wrong.
3. ALWAYS strictly follow the formatting rules (ruby tags for Chinese).
`;

    let lastError = null;

    // Try providers in order (Gemini -> SiliconFlow -> DeepSeek)
    for (const config of configs) {
      try {
        console.log(`Chat API: Trying provider ${config.provider}...`);
        let responseText = '';

        if (config.provider === 'gemini') {
          const genAI = new GoogleGenerativeAI(config.apiKey);
          const model = genAI.getGenerativeModel({
            model: config.modelName,
            systemInstruction: systemInstruction,
          });

          const history = messages
            .slice(0, -1)
            .filter((msg: any) => msg.role !== 'system')
            .map((msg: Message) => ({
              role: msg.role === 'user' ? 'user' : 'model',
              parts: [{ text: msg.content }],
            }));

          if (history.length > 0 && history[0].role !== 'user') {
            history.unshift({ role: 'user', parts: [{ text: 'Hello' }] });
          }

          const chat = model.startChat({ history });
          const lastMessage = messages[messages.length - 1];
          const result = await chat.sendMessage(lastMessage.content);
          responseText = result.response.text();
        } else {
          // OpenAI compatible (DeepSeek, SiliconFlow)
          const openai = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseUrl,
          });

          const completion = await openai.chat.completions.create({
            model: config.modelName,
            messages: [
              { role: 'system', content: systemInstruction },
              ...messages.map((m: any) => ({
                role: m.role === 'model' ? 'assistant' : m.role,
                content: m.content
              }))
            ],
            temperature: 0.7,
          });

          responseText = completion.choices[0].message.content || '';
        }

        console.log(`Chat API: Success with ${config.provider}`);
        return NextResponse.json({
          message: {
            role: 'model',
            content: responseText,
          },
        });
      } catch (error: any) {
        console.error(`Chat API: Error with ${config.provider} provider:`, error.message || error);
        lastError = error;
        continue;
      }
    }

    return NextResponse.json(
      { error: lastError?.message || 'All AI providers failed' },
      { status: lastError?.status || 500 }
    );

  } catch (error: any) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
