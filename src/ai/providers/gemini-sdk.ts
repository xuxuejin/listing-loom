import { GoogleGenAI } from '@google/genai';
import type { AIListingContent, ProductDraft } from '../../types';
import { geminiModels } from '../models';
import { buildPrompt } from '../prompt';
import { parseListing } from '../response';

function getHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object' || !('status' in error))
    return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : undefined;
}

export async function optimizeWithGeminiSdk(
  draft: ProductDraft,
  apiKey: string,
): Promise<AIListingContent> {
  if (!apiKey.trim()) throw new Error('请先填写 Gemini API Key。');

  // The SDK retries transient HTTP failures. The app tries remaining models if
  // the selected SDK model is unavailable or stays overloaded after retries.
  const client = new GoogleGenAI({ apiKey: apiKey.trim() });
  let lastError: unknown;
  for (const model of geminiModels) {
    try {
      const response = await client.models.generateContent({
        model,
        contents: buildPrompt(draft),
        config: { responseMimeType: 'application/json' },
      });
      if (!response.text?.trim())
        throw new Error('Gemini SDK 没有返回可用的文案。');
      return parseListing(response.text, draft.customFields);
    } catch (error) {
      lastError = error;
      const status = getHttpStatus(error);
      if (status === 400 || status === 401 || status === 403) throw error;
    }
  }

  const message = lastError instanceof Error ? lastError.message : '未知错误';
  throw new Error(
    `Gemini SDK 的模型均不可用，已尝试自动重试和降级。${message}`,
  );
}
