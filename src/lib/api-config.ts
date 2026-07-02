export interface Message {
  role: 'user' | 'model' | 'assistant' | 'system';
  content: string;
}

export type AIProvider = 'gemini' | 'deepseek' | 'siliconflow' | 'groq';

export interface ApiConfig {
  apiKey: string;
  modelName: string;
  provider: AIProvider;
  baseUrl?: string;
}

export function getApiConfigs(): ApiConfig[] {
  const configs: ApiConfig[] = [];

  // 1. Check for Gemini (User just re-added it)
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)?.trim();
  if (geminiKey && geminiKey.length > 0 && !geminiKey.includes('YOUR_')) {
    console.log('API Config: Found Gemini Key');
    configs.push({
      apiKey: geminiKey,
      modelName: 'gemini-flash-lite-latest', // Use model name from ListModels output for 2026 environment
      provider: 'gemini'
    });
  }

  // 2. Check for SiliconFlow (Free alternative)
  const siliconflowKey = process.env.SILICONFLOW_API_KEY?.trim();
  if (siliconflowKey && siliconflowKey.length > 0) {
    configs.push({
      apiKey: siliconflowKey,
      modelName: 'deepseek-ai/DeepSeek-V3', // Use DeepSeek-V3 on SiliconFlow
      provider: 'siliconflow',
      baseUrl: 'https://api.siliconflow.cn/v1'
    });
  }

  // 3. Check for DeepSeek (Paid)
  const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (deepseekKey && deepseekKey.length > 0 && !deepseekKey.includes('YOUR_')) {
    configs.push({
      apiKey: deepseekKey,
      modelName: 'deepseek-chat',
      provider: 'deepseek',
      baseUrl: 'https://api.deepseek.com/v1'
    });
  }

  return configs;
}

export function getApiConfig(): ApiConfig {
  const configs = getApiConfigs();
  if (configs.length > 0) {
    return configs[0];
  }

  console.error('API Config: No valid API keys found in environment variables');
  throw new Error('No AI API key found. Please add GEMINI_API_KEY or DEEPSEEK_API_KEY to .env.local');
}
