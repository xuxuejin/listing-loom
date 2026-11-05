import type { ProductDraft } from '../types';
import { parsePresetValues } from './customFields';

export const promptRules = `You are an e-commerce listing copywriter. Use relevant facts from all supplied product data, including additionalProductAttributes. Never invent certifications, guarantees, included accessories, or specifications. Return valid JSON only with exactly these keys: productTitle (string), bullets (array of 5 to 8 strings), productDescription (string), searchKeywords (array of relevant search phrases), customFields (array of objects with fieldName and value strings).

Apply all of these listing rules:
1. Product title: [brand if supplied] + core product name + key features separated by commas + intended use/audience + material/color + size/capacity when supplied. Maximum 200 characters. Use title case, do not use all caps except a supplied brand, put core search terms first, and exclude price, promotions, and subjective superlatives such as best or amazing.
2. About This Item: write 5 to 8 bullets. Each begins with a short uppercase heading followed by a colon, then a detailed feature-to-benefit sentence. Return plain text only: do not use Markdown, bold/italic markers, asterisks, backticks, decorative bullets, or other formatting symbols. Focus each bullet on one benefit. Put the strongest differentiators first, followed by materials/safety only if supplied, dimensions/use, ease of use, and a quality/support point only if supported by source facts. Keep each bullet's first 50 characters informative. Naturally include relevant title keywords without stuffing.
3. Product description: concise, candid, friendly overview of purpose and supplied features. Mention limitations only if provided. Check spelling and grammar. Never mention or compare competitors.
4. For every supplied custom field, return exactly one value selected from its presetValues. Choose the best option supported by product facts. If no option is a clear fit, choose the most generic, truthful, non-misleading option available. Never return an empty value and never invent or rewrite an option. Copy the selected option text exactly, preserving its spelling and punctuation.
5. Avoid competitor brand names, unsupported claims, prohibited/sensitive wording, and superlatives such as best, No.1, or top. Search keywords should be relevant phrases grounded in the product facts, without competitor trademarks or repetition.`;

export function buildProductSource(draft: ProductDraft) {
  const additionalProductAttributes = Object.fromEntries(
    Object.entries(draft.attributes ?? {}).filter(
      ([label]) => !['item code', 'product name'].includes(
        label.replace(/[:：]\s*$/, '').trim().toLocaleLowerCase(),
      ),
    ),
  );
  return {
    brandName: draft.brandName ?? '',
    productName: draft.productName,
    productFeatures: draft.productFeatures,
    additionalProductAttributes,
    itemCode: draft.itemCode,
    customFields: (draft.customFields ?? [])
      .map((field) => ({
        fieldName: field.fieldName.trim(),
        presetValues: parsePresetValues(field.presetValue),
      }))
      .filter((field) => field.fieldName && field.presetValues.length > 0),
  };
}

export function buildPrompt(draft: ProductDraft): string {
  return `${promptRules}\n\nProduct source data (JSON):\n${JSON.stringify(buildProductSource(draft))}\n\nReturn the requested JSON now.`;
}

export const listingResponseSchema = {
  type: 'object',
  properties: {
    productTitle: { type: 'string' },
    bullets: {
      type: 'array',
      items: { type: 'string' },
      minItems: 5,
      maxItems: 8,
    },
    productDescription: { type: 'string' },
    searchKeywords: { type: 'array', items: { type: 'string' } },
    customFields: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          fieldName: { type: 'string' },
          value: { type: 'string' },
        },
        required: ['fieldName', 'value'],
      },
    },
  },
  required: ['productTitle', 'bullets', 'productDescription', 'searchKeywords', 'customFields'],
};
