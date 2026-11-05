export interface ProductFields {
  brandName: string;
  itemCode: string;
  productName: string;
  originalPrice: string;
  salePrice: string;
  discount: string;
  available: string;
  fulfillment: string;
  productFeatures: string[];
  attributes: Record<string, string>;
}

export interface CustomProductField {
  fieldName: string;
  presetValue: string;
}

export interface ProductDraft extends ProductFields {
  id: string;
  createdAt: string;
  updatedAt: string;
  aiResult?: AIListingContent;
  customFields?: CustomProductField[];
}

export interface AIListingContent {
  productTitle: string;
  bullets: string[];
  productDescription: string;
  searchKeywords: string[];
  customFields?: Array<{ fieldName: string; value: string }>;
}

export interface ProductExtractionResult {
  product: ProductFields;
  warnings: string[];
}

export interface CaptureFilters {
  minAvailable: number;
  minDiscount: number;
}

export const emptyProduct = (): ProductFields => ({
  brandName: '',
  itemCode: '',
  productName: '',
  originalPrice: '',
  salePrice: '',
  discount: '',
  available: '',
  fulfillment: '',
  productFeatures: [],
  attributes: {},
});

export const fieldLabels: Record<keyof ProductFields, string> = {
  brandName: 'Brand Name',
  itemCode: 'Item Code',
  productName: 'Product Name',
  originalPrice: 'Original Price',
  salePrice: 'Sale Price',
  discount: 'Discount',
  available: 'Available',
  fulfillment: 'Fulfillment',
  productFeatures: 'Product Features',
  attributes: 'Additional Product Attributes',
};
