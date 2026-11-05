import type { PricingSettings } from '../storage';
import type { ProductDraft } from '../types';

export type ParentageLevel = 'Parent' | 'Child';
export type ExcelCellValue = string | number | undefined;
export type TemplateRow = Record<string, ExcelCellValue>;

export interface TemplateSchema {
  platform: string;
  marketplace: string;
  category: string;
  worksheet: string;
  dataStartRowFallback: number;
  startRowDetection: {
    column: string;
    header: string;
    searchRows: number;
  };
  fields: Array<{
    key: string;
    label: string;
    column: string;
    type: 'string' | 'number';
    required: boolean;
  }>;
}

export interface TemplateMapOptions {
  parentageLevel: ParentageLevel;
  parentSku: string;
  pricing: PricingSettings;
  shippingTemplateField: string;
  shippingTemplateValue: string;
}

export type TemplateMapper = (
  draft: ProductDraft,
  options: TemplateMapOptions & { productType: string },
) => TemplateRow;

export interface LoadedExcelTemplate {
  file: File;
  schema: TemplateSchema;
  dataStartRow: number;
  categoryCode: string;
  marketplaceCode: string;
  platformCode: string;
  headerColumns: Record<string, string>;
  mapper: TemplateMapper;
}

export interface ExcelTemplateSummary {
  platformCode: string;
  platformName: string;
  categoryCode: string;
  categoryName: string;
  marketplaceCode: string;
  marketplaceName: string;
  worksheet: string;
  dataStartRow: number;
}
