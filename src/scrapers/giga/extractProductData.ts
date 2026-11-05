import type { ProductExtractionResult } from '../../types';

/** Self-contained because Chrome serializes this function into the page. */
export function extractGigaProductData(): ProductExtractionResult {
  const clean = (value: string | null | undefined) =>
    (value || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[\t\r\n]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  const normalizeLabel = (value: string | null | undefined) =>
    clean(value).replace(/[:：]\s*$/, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();

  const productInfoPane = document.querySelector('#pane-description');
  const productInfo: Record<string, string> = {};
  for (const row of Array.from(productInfoPane?.querySelectorAll('.items') ?? [])) {
    const labelElement = row.firstElementChild;
    const valueElement = labelElement?.nextElementSibling;
    const label = clean(labelElement?.textContent).replace(/[:：]\s*$/, '').trim();
    const normalized = normalizeLabel(label);
    if (
      !label ||
      !valueElement ||
      normalized === 'package size' ||
      normalized.startsWith('package size ')
    ) continue;
    const value = clean(valueElement.getAttribute('title') || valueElement.textContent);
    if (value) productInfo[label] = value;
  }

  // Item Code and Product Name already have dedicated fields in the capture
  // panel. Keep other Product Info values dynamic, each in exactly one place.
  const attributes = Object.fromEntries(
    Object.entries(productInfo).filter(([label]) =>
      !['item code', 'product name'].includes(normalizeLabel(label)),
    ),
  );

  const attribute = (name: string) => {
    const expected = normalizeLabel(name);
    const entry = Object.entries(productInfo).find(([label]) => normalizeLabel(label) === expected);
    return entry?.[1] ?? '';
  };
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
  const parseMoney = (text: string) => {
    const match = text.match(/(?:\b([A-Z]{2,3})\s*)?\$\s*([\d,]+(?:\.\d{1,2})?)/i);
    if (!match) return undefined;
    return {
      amount: Number(match[2].replace(/,/g, '')),
      display: match[2].replace(/,/g, ''),
    };
  };

  const itemCodeValue = attribute('Item Code') || valueAfterLabel('Item Code');
  const itemCode = itemCodeValue.length > 2 && !/^ok$/i.test(itemCodeValue)
    ? itemCodeValue
    : '';
  const productName = attribute('Product Name') || valueAfterLabel('Product Name');

  // Scope price extraction to the Price(Unit) row so unrelated prices on the
  // page (for example bundle options) cannot become the listing price.
  const priceRow = Array.from(document.querySelectorAll('.price-line')).find((row) =>
    /^price\s*\(\s*unit\s*\)$/i.test(
      clean(row.querySelector('.price-title')?.textContent).replace(/[:：]$/, ''),
    ),
  );
  const priceContainer = priceRow?.querySelector('.active-price') ?? document.querySelector('.active-price');
  const sale = parseMoney(clean(priceContainer?.querySelector('.text-bold')?.textContent));
  const struckPrice = parseMoney(clean(priceContainer?.querySelector('.line-through')?.textContent));
  const original = struckPrice && sale && struckPrice.amount > sale.amount ? struckPrice : sale;
  const discountText = clean(priceRow?.querySelector('.discount-show')?.textContent)
    || clean(document.querySelector('.discount-show')?.textContent);
  const pageDiscount = discountText.match(/(\d+(?:\.\d+)?)\s*%\s*OFF\b/i);
  const computedDiscount = sale && original && original.amount > sale.amount
    ? ((original.amount - sale.amount) / original.amount) * 100
    : undefined;
  const warnings: string[] = [];
  let discount = pageDiscount ? `${pageDiscount[1]}%` : '';
  if (!discount && computedDiscount !== undefined) discount = `${Math.round(computedDiscount)}%`;
  if (
    pageDiscount && computedDiscount !== undefined &&
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
  const fallbackFeatures = featureContainer?.textContent?.split(/[\r\n]+/).map(clean).filter(Boolean) || [];
  const productFeatures = featureItems.length ? featureItems : fallbackFeatures;

  const fulfillmentText = Array.from(document.querySelectorAll('.ship-type, .purchase-type'))
    .map(section => clean(section.textContent))
    .find(text => /Estimated\s+Fulfillment\s+Fee\s*:/i.test(text)) || '';
  const fulfillmentMatch = fulfillmentText.match(
    /Estimated\s+Fulfillment\s+Fee\s*:\s*((?:[A-Z]{2,3}\s*)?\$\s*[\d,]+(?:\.\d{1,2})?)/i,
  );
  const fulfillmentMoney = fulfillmentMatch ? parseMoney(fulfillmentMatch[1]) : undefined;

  return {
    product: {
      brandName: '',
      itemCode,
      productName,
      originalPrice: original?.display || sale?.display || '',
      salePrice: sale?.display || '',
      discount,
      available,
      fulfillment: fulfillmentMoney ? String(Math.ceil(fulfillmentMoney.amount)) : '',
      productFeatures,
      attributes,
    },
    warnings,
  };
}
