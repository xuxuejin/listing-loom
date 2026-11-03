import { emptyProduct, type ProductFields } from './types';

export function extractProductData(): ProductFields {
  const clean = (value: string | null | undefined) => (value || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
  const body = clean(document.body?.innerText);
  const title = clean(document.querySelector('h1')?.textContent)
    || document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content
    || document.title;
  const lines = body.split('\n').map(clean).filter(Boolean);
  const labeled = (pattern: RegExp) => {
    const index = lines.findIndex(line => pattern.test(line));
    if (index < 0) return '';
    const line = lines[index];
    return clean(line.replace(pattern, '').replace(/^[:：\-\s]+/, '')) || lines[index + 1] || '';
  };
  const itemCode = labeled(/^(?:Item\s*Code|Item\s*No\.?|SKU|Product\s*Code)\s*[:：\-]?/i);
  const merchant = labeled(/^(?:Seller|Merchant|Supplier|Sold\s+by|商家|供应商)\s*[:：\-]?/i);
  const category = clean([...document.querySelectorAll('nav a,[aria-label*="breadcrumb" i] a')].map(node => node.textContent).filter(Boolean).join(' / '));
  const moneyMatches = [...body.matchAll(/(CA\$|US\$|AU\$|C\$|USD|CAD|EUR|GBP|A\$|\$|€|£)\s*([\d,]+(?:\.\d{1,2})?)/gi)];
  const currencySymbol = moneyMatches[0]?.[1]?.toUpperCase() || '';
  const currency = /^(CA\$|C\$|CAD)$/.test(currencySymbol) ? 'CAD' : /^(US\$|USD)$/.test(currencySymbol) ? 'USD' : /^(AU\$|A\$)$/.test(currencySymbol) ? 'AUD' : currencySymbol === '€' ? 'EUR' : currencySymbol === '£' ? 'GBP' : '';
  const currentMatch = body.match(/(?:price\s*\(unit\)|sale\s*price|current\s*price|现价)\s*[:：]?\s*(?:CA\$|C\$|US\$|\$|€|£)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  const originalMatch = body.match(/(?:original\s*price|regular\s*price|was|原价)\s*[:：]?\s*(?:CA\$|C\$|US\$|\$|€|£)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  const features = (() => {
    const heading = [...document.querySelectorAll('h1,h2,h3,h4,strong,b')].find(node => /product features|features|key features|商品特性|产品特点/i.test(clean(node.textContent)));
    if (!heading) return '';
    let node: Element | null = heading.parentElement;
    for (let i = 0; i < 3 && node; i++, node = node.parentElement) {
      const text = clean(node.textContent);
      if (text.length > 20) return text.replace(/^.*?(?:Product Features|Key Features|Features|商品特性|产品特点)\s*/i, '').trim();
    }
    return '';
  })();
  const descriptionHeading = [...document.querySelectorAll('h2,h3,h4,strong,b')].find(node => /description|product details|商品描述|产品描述/i.test(clean(node.textContent)));
  const description = descriptionHeading ? clean(descriptionHeading.parentElement?.parentElement?.textContent).replace(clean(descriptionHeading.textContent), '').trim() : '';
  const findAttribute = (names: string[]) => {
    for (const line of lines) for (const name of names) {
      const match = line.match(new RegExp(`^${name}\\s*[:：]\\s*(.+)$`, 'i'));
      if (match) return clean(match[1]);
    }
    return '';
  };
  const findPrice = (match: RegExpMatchArray | null, fallback: string) => match?.[1]?.replace(/,/g, '') || fallback;
  return {
    ...emptyProduct(),
    title, itemCode, merchant, category,
    currentPrice: findPrice(currentMatch, moneyMatches[0]?.[2] || ''),
    originalPrice: findPrice(originalMatch, moneyMatches[1]?.[2] || ''),
    currency,
    discount: body.match(/\b(\d{1,2}(?:\.\d+)?\s*%\s*(?:OFF|discount)?)/i)?.[1] || '',
    features, description,
    material: findAttribute(['Material', '材质']),
    size: findAttribute(['Size', 'Dimensions', '尺寸']),
    color: findAttribute(['Color', 'Colour', '颜色']),
    sourceUrl: location.href,
  };
}

export async function scrapeActiveTab(): Promise<ProductFields> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id || !tab.url?.startsWith('http')) throw new Error('请先打开商品详情页面，再进行采集。');
  const [result] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractProductData });
  if (!result?.result) throw new Error('页面未返回商品数据，请刷新商品页后重试。');
  return result.result;
}
