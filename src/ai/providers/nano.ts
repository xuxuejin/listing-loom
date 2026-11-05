import type { AIListingContent, ProductDraft } from '../../types';
import { buildPrompt } from '../prompt';
import { parseListing } from '../response';

interface LanguageModelSession {
  prompt(input: string): Promise<string>;
  destroy?: () => void;
}

interface LanguageModelApi {
  availability?: (options?: unknown) => Promise<string>;
  create: (options?: unknown) => Promise<LanguageModelSession>;
}

interface BuiltInAiGlobal {
  LanguageModel?: LanguageModelApi;
  ai?: { languageModel?: LanguageModelApi };
}

export async function optimizeWithNano(
  draft: ProductDraft,
): Promise<AIListingContent> {
  const globals = globalThis as typeof globalThis & BuiltInAiGlobal;
  const api = globals.ai?.languageModel ?? globals.LanguageModel;
  if (!api?.create) {
    throw new Error(
      '当前 Chrome 未提供 Gemini Nano Prompt API。请更新 Chrome，并确认设备支持内置 AI。',
    );
  }

  const options = {
    expectedInputs: [{ type: 'text', languages: ['en'] }],
    expectedOutputs: [{ type: 'text', languages: ['en'] }],
  };
  if (api.availability) {
    const availability = await api.availability(options);
    if (availability === 'unavailable') {
      throw new Error('此设备或 Chrome 版本暂不支持 Gemini Nano。');
    }
  }

  let session: LanguageModelSession | undefined;
  try {
    session = await api.create(options);
    return parseListing(await session.prompt(buildPrompt(draft)), draft.customFields);
  } catch (error) {
    if (error instanceof Error && error.message) throw error;
    throw new Error('Gemini Nano 生成失败；模型可能仍在下载，请稍后重试。');
  } finally {
    session?.destroy?.();
  }
}
