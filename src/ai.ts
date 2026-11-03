import type { ProductDraft } from './types';

/** Integration seam for a future AI provider. The UI can call this once a provider is configured. */
export async function optimizeAllDrafts(drafts: ProductDraft[]): Promise<ProductDraft[]> {
  if (!drafts.length) return [];
  throw new Error('AI 服务接口尚未接入，当前暂存商品未发送。');
}
