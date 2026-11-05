import type { ProductExtractionResult } from './types';
import { extractGigaProductData } from './scrapers/giga/extractProductData';

// Keep the old import path stable while platform page extraction lives in its
// own adapter, ready for additional supplier platforms.
export const extractProductData = extractGigaProductData;

export async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab;
}

export async function scrapeActiveTab(): Promise<ProductExtractionResult> {
  const tab = await getActiveTab();
  if (typeof tab?.id !== 'number') {
    throw new Error('没有找到浏览器当前选中的标签页，请切到商品页面后重试。');
  }

  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractGigaProductData,
    });
    if (!result?.result) throw new Error('商品页没有返回采集结果。');
    return result.result;
  } catch (error) {
    const detail = error instanceof Error ? error.message : '';
    throw new Error(`采集失败：${detail || '请确认扩展已获准访问当前商品网站。'}`);
  }
}
