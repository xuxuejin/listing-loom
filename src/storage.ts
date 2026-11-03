import type { ProductDraft } from './types';

const STORAGE_KEY = 'listingLoomDrafts';

export async function getDrafts(): Promise<ProductDraft[]> {
  return ((await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY] as ProductDraft[] | undefined) ?? [];
}

export async function saveDraft(draft: ProductDraft): Promise<void> {
  const drafts = await getDrafts();
  const next = [draft, ...drafts.filter(item => item.id !== draft.id)];
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
}

export async function deleteDraft(id: string): Promise<void> {
  const next = (await getDrafts()).filter(item => item.id !== id);
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
}
