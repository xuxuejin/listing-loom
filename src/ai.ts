import type { AIListingContent, ProductDraft } from './types';
import type { AIModel, CloudAIProvider, GeminiModel } from './ai/models';
import { geminiModels } from './ai/models';
import { optimizeWithDeepSeek } from './ai/providers/deepseek';
import { optimizeWithGemini } from './ai/providers/gemini';
import { optimizeWithNano } from './ai/providers/nano';

export { geminiModels } from './ai/models';
export type {
  AIModel,
  CloudAIProvider,
  DeepSeekModel,
  GeminiModel,
} from './ai/models';

export function optimizeDraft(
  draft: ProductDraft,
  model: AIModel,
  apiKey = '',
): Promise<AIListingContent> {
  if (model === 'gemini-nano') return optimizeWithNano(draft);
  if (model === 'gemini-sdk') {
    return import('./ai/providers/gemini-sdk').then(
      ({ optimizeWithGeminiSdk }) => optimizeWithGeminiSdk(draft, apiKey),
    );
  }
  if (geminiModels.includes(model as GeminiModel)) {
    return optimizeWithGemini(draft, apiKey, model as GeminiModel);
  }
  return optimizeWithDeepSeek(
    draft,
    apiKey,
    model as Exclude<AIModel, GeminiModel | 'gemini-nano' | 'gemini-sdk'>,
  );
}

export function getAIProvider(model: AIModel): CloudAIProvider | null {
  if (model === 'gemini-nano') return null;
  return model.startsWith('deepseek-') ? 'deepseek' : 'gemini';
}
