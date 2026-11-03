import type { ProductExtractionResult } from './types';

/** Runs in the product page. Keep helpers inside this function because Chrome
 * serializes the function before injecting it into the page context. */
export function extractProductData(): ProductExtractionResult {
  const clean = (value: string | null | undefined) =>
    (value || '').replace(/\u00a0/g, ' ').replace(/[\t\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  const normalizeLabel = (value: string | null | undefined) =>
    clean(value).replace(/[:：]\s*$/, '').toLocaleLowerCase();

  const findLabel = (label: string) => {
    const expected = normalizeLabel(label);
    return Array.from(document.querySelectorAll('*')).find(
      element => normalizeLabel(element.textContent) === expected,
    );
  };
  const valueAfterLabel = (label: string) => {
    const labelElement = findLabel(label);
    const valueElement = labelElement?.nextElementSibling;
    return clean(valueElement?.getAttribute('title') || valueElement?.textContent);
  };
  const itemCodeCandidates = Array.from(document.querySelectorAll('.items')).flatMap(row => {
    const labelElement = Array.from(row.querySelectorAll('*')).find(
      element => normalizeLabel(element.textContent) === 'item code',
    );
    const valueElement = labelElement?.nextElementSibling;
    if (!valueElement || !row.contains(valueElement)) return [];
    return [
      clean(valueElement.getAttribute('title')),
      clean(valueElement.textContent),
    ];
  });
  const validItemCode = (value: string) => value.length > 2 && !/^ok$/i.test(value);
  const parseMoney = (text: string) => {
    const match = text.match(/\b([A-Z]{2,3})\$\s*([\d,]+(?:\.\d{1,2})?)/i);
    if (!match) return undefined;
    return {
      amount: Number(match[2].replace(/,/g, '')),
      display: match[2].replace(/,/g, ''),
    };
  };

  const itemCode = itemCodeCandidates.find(validItemCode)
    || (() => {
      const value = valueAfterLabel('Item Code');
      return validItemCode(value) ? value : '';
    })();
  const productName = valueAfterLabel('Product Name');

  const priceContainer = document.querySelector('.active-price');
  const priceChildren = priceContainer ? Array.from(priceContainer.children) : [];
  const currentPriceElement = priceChildren.find(child => child.classList.contains('text-bold'));
  const lineThroughElement = currentPriceElement?.nextElementSibling;
  const originalPriceElement = lineThroughElement?.classList.contains('line-through')
    ? lineThroughElement
    : undefined;
  const sale = parseMoney(clean(currentPriceElement?.textContent));
  const original = parseMoney(clean(originalPriceElement?.textContent));

  const saveText = priceChildren
    .slice(Math.max(priceChildren.indexOf(originalPriceElement as Element) + 1, 0))
    .map(element => clean(element.textContent))
    .find(text => /\bSave\b/i.test(text)) || '';
  const savedAmount = parseMoney(saveText);
  const hasPositiveSave = Boolean(savedAmount && savedAmount.amount > 0);

  const discountText = clean(document.querySelector('.discount-show')?.textContent);
  const pageDiscount = discountText.match(/(\d+(?:\.\d+)?)\s*%\s*OFF\b/i);
  const computedDiscount = sale && original && original.amount > sale.amount
    ? ((original.amount - sale.amount) / original.amount) * 100
    : undefined;
  const warnings: string[] = [];
  if (
    hasPositiveSave && savedAmount && sale && original &&
    Math.abs((original.amount - sale.amount) - savedAmount.amount) > 0.01
  ) {
    warnings.push(
      `页面显示节省 ${savedAmount.display}，但原价与促销价相差 ${(original.amount - sale.amount).toFixed(2)}，请核对价格。`,
    );
  }
  let discount = pageDiscount ? `${pageDiscount[1]}%` : '';
  if (!discount && hasPositiveSave && computedDiscount !== undefined) {
    discount = `${Math.round(computedDiscount)}%`;
  } else if (
    pageDiscount && hasPositiveSave && computedDiscount !== undefined &&
    Math.abs(Number(pageDiscount[1]) - computedDiscount) > 1.5
  ) {
    warnings.push(
      `页面折扣为 ${pageDiscount[1]}%，但根据原价和促销价计算约为 ${computedDiscount.toFixed(1)}%，请核对。`,
    );
  }

  const availableElement = findLabel('Available');
  const available = clean(availableElement?.previousElementSibling?.textContent);

  const featureHeading = findLabel('Product Features');
  const featureContainer = featureHeading?.nextElementSibling;
  const featureItems = featureContainer
    ? Array.from(featureContainer.querySelectorAll('li')).map(item => clean(item.textContent)).filter(Boolean)
    : [];
  const fallbackFeatures = featureContainer?.textContent
    ?.split(/[\r\n]+/)
    .map(clean)
    .filter(Boolean) || [];
  const productFeatures = featureItems.length ? featureItems : fallbackFeatures;

  const fulfillmentSection = Array.from(document.querySelectorAll('.purchase-type')).find(section =>
    /Estimated\s+Fulfillment\s+Fee\s*:/i.test(clean(section.textContent)),
  );
  const fulfillmentMatch = clean(fulfillmentSection?.textContent).match(
    /Estimated\s+Fulfillment\s+Fee\s*:\s*([A-Z]{2,3}\$\s*[\d,]+(?:\.\d{1,2})?)/i,
  );
  const fulfillmentMoney = fulfillmentMatch ? parseMoney(fulfillmentMatch[1]) : undefined;
  const fulfillment = fulfillmentMoney ? String(Math.ceil(fulfillmentMoney.amount)) : '';

  const product: ProductExtractionResult['product'] = {
    itemCode,
    productName,
    originalPrice: original?.display || '',
    salePrice: sale?.display || '',
    discount,
    available,
    fulfillment,
    productFeatures,
    mainColor: valueAfterLabel('Main Color'),
    mainMaterial: valueAfterLabel('Main Material'),
    bedFrameMaterial: valueAfterLabel('Bed Frame Material'),
    assembledLength: valueAfterLabel('Assembled Length (in.)'),
    assembledWidth: valueAfterLabel('Assembled Width (in.)'),
    assembledHeight: valueAfterLabel('Assembled Height (in.)'),
    productWeight: valueAfterLabel('Product Weight (lbs.)'),
  };

  return { product, warnings };
}

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
      func: extractProductData,
    });
    if (!result?.result) throw new Error('商品页没有返回采集结果。');
    return result.result;
  } catch (error) {
    const detail = error instanceof Error ? error.message : '';
    throw new Error(`采集失败：${detail || '请确认扩展已获准访问当前商品网站。'}`);
  }
}
