import type { AIListingContent, ProductDraft } from '../../types';
import type { DeepSeekModel } from '../models';
import { buildProductSource, promptRules } from '../prompt';
import { parseListing } from '../response';
import { ApiRequestError, fetchWithRetry } from '../retry';

export async function optimizeWithDeepSeek(
  draft: ProductDraft,
  apiKey: string,
  model: DeepSeekModel,
): Promise<AIListingContent> {
  if (!apiKey.trim()) throw new Error('请先填写 DeepSeek API Key。');

  let response: Response;
  try {
    response = await fetchWithRetry(
      () =>
        fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey.trim()}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: promptRules },
              {
                role: 'user',
                content: `Product source data (JSON):\n${JSON.stringify(buildProductSource(draft))}\n\nReturn the requested JSON now.`,
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.4,
          }),
        }),
      'DeepSeek',
    );
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 402) {
      throw new Error(
        'DeepSeek API 账户余额不足（HTTP 402）。请在 DeepSeek 开放平台检查余额或充值；是否有免费额度取决于账户当前可用的赠送额度。',
      );
    }
    throw error;
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('DeepSeek 没有返回可用的文案。');
  return parseListing(text);
}
