export interface ProductFields {
  itemCode: string;
  productName: string;
  originalPrice: string;
  salePrice: string;
  discount: string;
  available: string;
  fulfillment: string;
  productFeatures: string[];
  mainColor: string;
  mainMaterial: string;
  bedFrameMaterial: string;
  assembledLength: string;
  assembledWidth: string;
  assembledHeight: string;
  productWeight: string;
}

export interface ProductDraft extends ProductFields {
  id: string;
  createdAt: string;
  updatedAt: string;
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
  itemCode: '',
  productName: '',
  originalPrice: '',
  salePrice: '',
  discount: '',
  available: '',
  fulfillment: '',
  productFeatures: [],
  mainColor: '',
  mainMaterial: '',
  bedFrameMaterial: '',
  assembledLength: '',
  assembledWidth: '',
  assembledHeight: '',
  productWeight: '',
});

export const fieldLabels: Record<keyof ProductFields, string> = {
  itemCode: 'Item Code',
  productName: 'Product Name',
  originalPrice: 'Original Price',
  salePrice: 'Sale Price',
  discount: 'Discount',
  available: 'Available',
  fulfillment: 'Fulfillment',
  productFeatures: 'Product Features',
  mainColor: 'Main Color',
  mainMaterial: 'Main Material',
  bedFrameMaterial: 'Bed Frame Material',
  assembledLength: 'Assembled Length (in.)',
  assembledWidth: 'Assembled Width (in.)',
  assembledHeight: 'Assembled Height (in.)',
  productWeight: 'Product Weight (lbs.)',
};
