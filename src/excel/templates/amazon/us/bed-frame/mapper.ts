import type { ProductDraft } from '@/types';
import type { PricingSettings } from '@/storage';
import type { ParentageLevel, TemplateRow } from '@/excel/types';
import { sanitizeListingText } from '@/ai/sanitize';

export interface BedFrameMappingOptions {
  productType: string;
  parentageLevel: ParentageLevel;
  parentSku: string;
  pricing: PricingSettings;
  shippingTemplateField: string;
  shippingTemplateValue: string;
}

function parseNumber(value: string): number | undefined {
  const normalized = value.replace(/[^0-9.-]/g, '');
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function productAttribute(
  draft: ProductDraft,
  label: string,
  legacyKey: string,
): string {
  const normalize = (value: string) =>
    value
      .replace(/\s+/g, ' ')
      .replace(/[:：]\s*$/, '')
      .trim()
      .toLocaleLowerCase();
  const entry = Object.entries(draft.attributes ?? {}).find(
    ([name]) => normalize(name) === normalize(label),
  );
  if (entry?.[1]) return entry[1];
  const legacyValue = (draft as ProductDraft & Record<string, unknown>)[
    legacyKey
  ];
  return typeof legacyValue === 'string' ? legacyValue : '';
}

function getListingPrice(
  draft: ProductDraft,
  pricing: PricingSettings,
): number {
  const purchasePrice = parseNumber(draft.originalPrice || draft.salePrice);
  const fulfillment = parseNumber(draft.fulfillment) ?? 0;
  const combinedRate =
    (pricing.commission +
      pricing.damage +
      pricing.advertising +
      pricing.profit) /
    100;

  if (purchasePrice === undefined) {
    throw new Error(
      draft.itemCode +
        ': 缺少 Original Price 和 Sale Price，无法计算 Listing Price。',
    );
  }
  if (combinedRate >= 1) {
    throw new Error('定价参数合计必须小于 100%，否则无法计算 Listing Price。');
  }
  return Number(
    ((purchasePrice + fulfillment) / (1 - combinedRate)).toFixed(2),
  );
}

export function mapBedFrameDraft(
  draft: ProductDraft,
  options: BedFrameMappingOptions,
): TemplateRow {
  if (!draft.aiResult) {
    throw new Error(
      (draft.itemCode || draft.productName) + ': 尚无 AI 优化结果。',
    );
  }
  if (!draft.itemCode.trim())
    throw new Error('有商品缺少 Item Code，无法填写 SKU。');
  if (options.parentageLevel === 'Child' && !options.parentSku.trim()) {
    throw new Error('Parentage Level 选择 Child 时，请填写 Parent SKU。');
  }

  const listingPrice = getListingPrice(draft, options.pricing);
  // Sanitize here as well so drafts saved before this fix export cleanly.
  const bullets = draft.aiResult.bullets.slice(0, 5).map(sanitizeListingText);
  const keywords = draft.aiResult.searchKeywords
    .map(sanitizeListingText)
    .join(' ')
    .trim();
  const optionalNumber = (value: string) => parseNumber(value);
  const mainMaterial = productAttribute(draft, 'Main Material', 'mainMaterial');
  const mainColor = productAttribute(draft, 'Main Color', 'mainColor');

  return {
    sku: draft.itemCode.trim(),
    productType: options.productType,
    listingAction: '',
    parentageLevel: options.parentageLevel,
    parentSku:
      options.parentageLevel === 'Child' ? options.parentSku.trim() : '',
    variationThemeName: 'COLOR/SET_NAME',
    itemName: sanitizeListingText(draft.aiResult.productTitle),
    brandName: draft.brandName?.trim() ?? '',
    productIdType: 'GTIN Exempt',
    modelNumber: draft.itemCode.trim(),
    modelName: 'Bed Frame',
    manufacturer: draft.brandName?.trim() ?? '',
    productDescription: sanitizeListingText(draft.aiResult.productDescription),
    bulletPoint1: bullets[0] ?? '',
    bulletPoint2: bullets[1] ?? '',
    bulletPoint3: bullets[2] ?? '',
    bulletPoint4: bullets[3] ?? '',
    bulletPoint5: bullets[4] ?? '',
    genericKeyword: keywords,
    specialFeatures: 'No Box Spring Needed',
    material: mainMaterial.trim(),
    fabricType: mainMaterial.trim(),
    numberOfItems: 1,
    color: mainColor.trim(),
    partNumber: draft.itemCode.trim(),
    requiredAssembly: 'Yes',
    finishType: 'Powder Coated',
    includedComponents: 'Guardrails',
    isFragile: 'No',
    itemHeightFloorToTop: optionalNumber(
      productAttribute(draft, 'Assembled Height (in.)', 'assembledHeight'),
    ),
    itemHeightUnit: 'Inches',
    itemLengthHeadToToe: optionalNumber(
      productAttribute(draft, 'Assembled Length (in.)', 'assembledLength'),
    ),
    itemLengthUnit: 'Inches',
    itemWidthSideToSide: optionalNumber(
      productAttribute(draft, 'Assembled Width (in.)', 'assembledWidth'),
    ),
    itemWidthUnit: 'Inches',
    setName: draft.itemCode.trim(),
    itemWeight: optionalNumber(
      productAttribute(draft, 'Product Weight (lbs.)', 'productWeight'),
    ),
    itemWeightUnit: 'Pounds',
    itemCondition: 'New',
    listPrice: listingPrice,
    fulfillmentChannelCode: 'Fulfillment by Merchant (Default)',
    quantity: 20,
    yourPrice: listingPrice,
    shippingTemplate: options.shippingTemplateValue,
    countryOfOrigin: productAttribute(
      draft,
      'Place of Origin',
      'placeOfOrigin',
    ).trim(),
    batteriesRequired: 'No',
    dangerousGoodsRegulations: 'Not Applicable',
  };
}
