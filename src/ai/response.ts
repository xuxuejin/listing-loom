import type { AIListingContent } from '../types';

export function parseListing(text: string): AIListingContent {
  const clean = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start < 0 || end <= start)
    throw new Error('AI 返回内容不是有效 JSON，请重试。');

  let raw: unknown;
  try {
    raw = JSON.parse(clean.slice(start, end + 1));
  } catch {
    throw new Error('无法解析 AI 返回的文案，请重新生成。');
  }
  if (!raw || typeof raw !== 'object')
    throw new Error('AI 返回的内容结构不正确。');

  const value = raw as Record<string, unknown>;
  const result: AIListingContent = {
    productTitle:
      typeof value.productTitle === 'string' ? value.productTitle.trim() : '',
    bullets: Array.isArray(value.bullets)
      ? value.bullets
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter(Boolean)
      : [],
    productDescription:
      typeof value.productDescription === 'string'
        ? value.productDescription.trim()
        : '',
    searchKeywords: Array.isArray(value.searchKeywords)
      ? value.searchKeywords
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter(Boolean)
      : [],
  };

  if (
    !result.productTitle ||
    result.bullets.length < 5 ||
    !result.productDescription
  ) {
    throw new Error('AI 返回内容缺少标题、商品描述或至少 5 条要点，请重试。');
  }
  if (result.productTitle.length > 200)
    throw new Error('AI 返回的标题超过 200 个字符，请重新生成。');
  if (result.bullets.length > 8)
    throw new Error('AI 返回的要点超过 8 条，请重新生成。');
  return result;
}

export function extractGeminiText(data: {
  steps?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  outputs?: Array<{ type?: string; text?: string }>;
  output_text?: string;
}): string {
  return (
    data.output_text ||
    data.steps
      ?.filter((step) => step.type === 'model_output')
      .flatMap((step) => step.content ?? [])
      .filter((part) => part.type === 'text')
      .map((part) => part.text ?? '')
      .join('') ||
    data.outputs
      ?.filter((output) => output.type === 'text')
      .map((output) => output.text ?? '')
      .join('') ||
    ''
  );
}
