import type { CustomProductField, ProductDraft } from './types';
import { defaultTheme, isThemeId, type ThemeId } from './theme';
import type { CloudAIProvider } from './ai';

const STORAGE_KEY = 'listingLoomDrafts';
const PRICING_KEY = 'listingLoomPricing';
const THEME_KEY = 'listingLoomTheme';
const AI_API_KEYS_KEY = 'listingLoomApiKeys';
const BRAND_NAME_KEY = 'listingLoomBrandName';
const AI_CUSTOM_FIELDS_KEY = 'listingLoomAICustomFieldsByTemplate';
let apiKeyWriteQueue: Promise<void> = Promise.resolve();
let draftWriteQueue: Promise<void> = Promise.resolve();
let customFieldWriteQueue: Promise<void> = Promise.resolve();

function enqueueDraftWrite(operation: () => Promise<void>): Promise<void> {
  const write = draftWriteQueue.then(operation);
  draftWriteQueue = write.catch(() => undefined);
  return write;
}

export async function getAIProviderKeys(): Promise<
  Record<CloudAIProvider, string>
> {
  const stored = await chrome.storage.local.get([
    AI_API_KEYS_KEY,
    'listingLoomGeminiApiKey',
  ]);
  const keys = stored[AI_API_KEYS_KEY] as
    Partial<Record<CloudAIProvider, string>> | undefined;
  return {
    gemini:
      keys?.gemini ??
      (stored.listingLoomGeminiApiKey as string | undefined) ??
      '',
    deepseek: keys?.deepseek ?? '',
  };
}

export function saveAIProviderKey(
  provider: CloudAIProvider,
  apiKey: string,
): Promise<void> {
  const write = apiKeyWriteQueue.then(async () => {
    const keys = await getAIProviderKeys();
    const next = { ...keys, [provider]: apiKey.trim() };
    await chrome.storage.local.set({ [AI_API_KEYS_KEY]: next });
  });
  apiKeyWriteQueue = write.catch(() => undefined);
  return write;
}

export async function getTheme(): Promise<ThemeId> {
  const stored = (await chrome.storage.local.get(THEME_KEY))[THEME_KEY];
  return isThemeId(stored) ? stored : defaultTheme;
}

export async function saveTheme(theme: ThemeId): Promise<void> {
  await chrome.storage.local.set({ [THEME_KEY]: theme });
}

export async function getBrandName(): Promise<string> {
  const value = (await chrome.storage.local.get(BRAND_NAME_KEY))[BRAND_NAME_KEY];
  return typeof value === 'string' ? value : '';
}

export async function saveBrandName(brandName: string): Promise<void> {
  await chrome.storage.local.set({ [BRAND_NAME_KEY]: brandName.trim() });
}

export async function getTemplateCustomFields(
  templateKey: string,
): Promise<CustomProductField[]> {
  const stored = (await chrome.storage.local.get(AI_CUSTOM_FIELDS_KEY))[
    AI_CUSTOM_FIELDS_KEY
  ] as Record<string, CustomProductField[]> | undefined;
  return stored?.[templateKey] ?? [];
}

export async function saveTemplateCustomFields(
  templateKey: string,
  fields: CustomProductField[],
): Promise<void> {
  const write = customFieldWriteQueue.then(async () => {
    const stored = (await chrome.storage.local.get(AI_CUSTOM_FIELDS_KEY))[
      AI_CUSTOM_FIELDS_KEY
    ] as Record<string, CustomProductField[]> | undefined;
    await chrome.storage.local.set({
      [AI_CUSTOM_FIELDS_KEY]: { ...stored, [templateKey]: fields },
    });
  });
  customFieldWriteQueue = write.catch(() => undefined);
  return write;
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
  return {
    ...defaultPricing,
    ...((await chrome.storage.local.get(PRICING_KEY))[PRICING_KEY] as
      Partial<PricingSettings> | undefined),
  };
}

export async function savePricing(pricing: PricingSettings): Promise<void> {
  await chrome.storage.local.set({ [PRICING_KEY]: pricing });
}

export async function getDrafts(): Promise<ProductDraft[]> {
  return (
    ((await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY] as
      ProductDraft[] | undefined) ?? []
  );
}

export async function saveDraft(draft: ProductDraft): Promise<void> {
  return enqueueDraftWrite(async () => {
    const drafts = await getDrafts();
    const next = [draft, ...drafts.filter((item) => item.id !== draft.id)];
    await chrome.storage.local.set({ [STORAGE_KEY]: next });
  });
}

export async function deleteDraft(id: string): Promise<void> {
  return enqueueDraftWrite(async () => {
    const next = (await getDrafts()).filter((item) => item.id !== id);
    await chrome.storage.local.set({ [STORAGE_KEY]: next });
  });
}
