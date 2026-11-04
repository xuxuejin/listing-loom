import type { ProductDraft } from '../types';

export const promptRules = `You are an Amazon listing copywriter. Use only facts in the supplied product data. Never invent certifications, guarantees, included accessories, or specifications. Return valid JSON only with exactly these keys: productTitle (string), bullets (array of 5 to 8 strings), productDescription (string), searchKeywords (array of relevant search phrases).

Apply all of these listing rules:
1. Product title: [brand if supplied] + core product name + key features separated by commas + intended use/audience + material/color + size/capacity when supplied. Maximum 200 characters. Use title case, do not use all caps except a supplied brand, put core search terms first, and exclude price, promotions, and subjective superlatives such as best or amazing.
2. About This Item: write 5 to 8 bullets. Each begins with a short bold-style uppercase heading followed by a colon, then a detailed feature-to-benefit sentence. Focus each bullet on one benefit. Put the strongest differentiators first, followed by materials/safety only if supplied, dimensions/use, ease of use, and a quality/support point only if supported by source facts. Keep each bullet's first 50 characters informative. Naturally include relevant title keywords without stuffing.
3. Product description: concise, candid, friendly overview of purpose and supplied features. Mention limitations only if provided. Check spelling and grammar. Never mention or compare competitors.
4. Avoid competitor brand names, unsupported claims, prohibited/sensitive wording, and superlatives such as best, No.1, or top. Search keywords should be relevant phrases grounded in the product facts, without competitor trademarks or repetition.`;

export function buildProductSource(draft: ProductDraft) {
  return {
    productName: draft.productName,
    productFeatures: draft.productFeatures,
    itemCode: draft.itemCode,
    mainColor: draft.mainColor,
    mainMaterial: draft.mainMaterial,
    bedFrameMaterial: draft.bedFrameMaterial,
    dimensionsInches: [
      draft.assembledLength,
      draft.assembledWidth,
      draft.assembledHeight,
    ],
    weightLbs: draft.productWeight,
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
  },
  required: ['productTitle', 'bullets', 'productDescription', 'searchKeywords'],
};
