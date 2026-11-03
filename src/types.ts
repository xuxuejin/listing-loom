export interface ProductDraft {
  id: string;
  title: string;
  itemCode: string;
  merchant: string;
  category: string;
  currentPrice: string;
  originalPrice: string;
  currency: string;
  discount: string;
  features: string;
  description: string;
  material: string;
  size: string;
  color: string;
  sourceUrl: string;
  createdAt: string;
  updatedAt: string;
}

export type ProductFields = Omit<ProductDraft, 'id' | 'createdAt' | 'updatedAt'>;

export const emptyProduct = (): ProductFields => ({
  title: '', itemCode: '', merchant: '', category: '', currentPrice: '',
  originalPrice: '', currency: '', discount: '', features: '', description: '',
  material: '', size: '', color: '', sourceUrl: '',
});

export const fieldLabels: Record<keyof ProductFields, string> = {
  title: '页面标题', itemCode: 'Item Code', merchant: '商家', category: '类目',
  currentPrice: '当前价', originalPrice: '原价', currency: '币种', discount: '折扣',
  features: 'Product Features', description: '描述', material: '材质', size: '尺寸',
  color: '颜色', sourceUrl: '商品页面链接',
};
