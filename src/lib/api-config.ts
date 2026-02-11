export interface Message {
  role: 'user' | 'model';
  content: string;
}

export interface ApiConfig {
  apiKey: string;
  modelName: string;
}

export function getApiConfig(): ApiConfig {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not defined in environment variables');
  }

  return {
    apiKey,
    modelName: 'gemini-flash-lite-latest', // Using Flash Lite model which appears to have available quota
  };
}
