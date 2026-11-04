export const geminiModels = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
] as const;

export type GeminiModel = (typeof geminiModels)[number];
export type DeepSeekModel = 'deepseek-flash' | 'deepseek-v4-pro';
export type AIModel =
  GeminiModel | DeepSeekModel | 'gemini-sdk' | 'gemini-nano';
export type CloudAIProvider = 'gemini' | 'deepseek';
