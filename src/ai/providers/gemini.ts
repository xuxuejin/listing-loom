import type { AIListingContent, ProductDraft } from '../../types';
import type { GeminiModel } from '../models';
import { geminiModels } from '../models';
import { buildPrompt, listingResponseSchema } from '../prompt';
import { extractGeminiText, parseListing } from '../response';
import { ApiRequestError, fetchWithRetry, readApiError } from '../retry';

const endpoint =
  'https://generativelanguage.googleapis.com/v1beta/interactions';

export async function optimizeWithGemini(
  draft: ProductDraft,
  apiKey: string,
  preferredModel: GeminiModel,
): Promise<AIListingContent> {
  if (!apiKey.trim()) throw new Error('请先填写 Gemini API Key。');

  let lastError: Error | undefined;
  const preferredIndex = geminiModels.indexOf(preferredModel);
  for (const model of geminiModels.slice(preferredIndex)) {
    let response: Response;
    try {
      response = await fetchWithRetry(
        () =>
          fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey.trim(),
            },
            body: JSON.stringify({
              model,
              input: buildPrompt(draft),
              store: false,
              response_format: {
                type: 'text',
                mime_type: 'application/json',
                schema: listingResponseSchema,
              },
            }),
          }),
        'Gemini',
        true,
      );
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error('Gemini 请求失败。');
      continue;
    }

    if (response.status === 404) {
      lastError = await readApiError(response, 'Gemini');
      continue;
    }

    const data = (await response.json()) as {
      steps?: Array<{
        type?: string;
        content?: Array<{ type?: string; text?: string }>;
      }>;
      outputs?: Array<{ type?: string; text?: string }>;
      output_text?: string;
    };
    const text = extractGeminiText(data);
    if (!text) throw new Error('Gemini 没有返回可用的文案。');
    return parseListing(text, draft.customFields);
  }

  const summary =
    lastError instanceof ApiRequestError && lastError.status === 404
      ? 'Gemini 备用模型返回 404，可能未对当前 API Key 开放。'
      : 'Gemini 云端模型暂时繁忙，已完成自动重试和模型降级。';
  throw new Error(`${summary}${lastError?.message ?? '请稍后重试。'}`);
}
