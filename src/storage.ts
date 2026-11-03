import type { ProductDraft } from './types';
import { defaultTheme, isThemeId, type ThemeId } from './theme';

const STORAGE_KEY = 'listingLoomDrafts';
const PRICING_KEY = 'listingLoomPricing';
const THEME_KEY = 'listingLoomTheme';

export async function getTheme(): Promise<ThemeId> {
  const stored = (await chrome.storage.local.get(THEME_KEY))[THEME_KEY];
  return isThemeId(stored) ? stored : defaultTheme;
}

export async function saveTheme(theme: ThemeId): Promise<void> {
  await chrome.storage.local.set({ [THEME_KEY]: theme });
}

export interface PricingSettings {
  commission: number;
  damage: number;
  advertising: number;
  profit: number;
}

export const defaultPricing: PricingSettings = {
  commission: 15,
  damage: 8,
  advertising: 5,
  profit: 5,
};

export async function getPricing(): Promise<PricingSettings> {
  return { ...defaultPricing, ...((await chrome.storage.local.get(PRICING_KEY))[PRICING_KEY] as Partial<PricingSettings> | undefined) };
}

export async function savePricing(pricing: PricingSettings): Promise<void> {
  await chrome.storage.local.set({ [PRICING_KEY]: pricing });
}

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
