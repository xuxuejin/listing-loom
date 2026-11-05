import bedFrameSchemaJson from './templates/amazon/us/bed-frame/schema.json';
import { mapBedFrameDraft } from './templates/amazon/us/bed-frame/mapper';
import type {
  ExcelTemplateSummary,
  LoadedExcelTemplate,
  TemplateSchema,
} from './types';

const bedFrameSchema = bedFrameSchemaJson as TemplateSchema;

function parseFileName(fileName: string): {
  categoryCode: string;
  platformCode: string;
  marketplaceCode: string;
  extension: string;
} {
  const match = fileName.match(/\.([^.]+)$/);
  const extension = match?.[1]?.toLowerCase() ?? '';
  if (!['xlsm', 'xlsx'].includes(extension)) {
    throw new Error('请选择 .xlsm 或 .xlsx 格式的 Excel 模版。');
  }

  const nameWithoutExtension = fileName.slice(0, fileName.lastIndexOf('.'));
  const segments = nameWithoutExtension.split('-').filter(Boolean);
  if (segments.length < 3) {
    throw new Error(
      '模版文件名应使用“品类-平台-站点-用途.xlsm”格式，例如 BED_FRAME-AZ-USA-TMP.xlsm。',
    );
  }
  return {
    categoryCode: segments[0].toUpperCase(),
    platformCode: segments[1].toUpperCase(),
    marketplaceCode: segments[2].toUpperCase(),
    extension,
  };
}

function resolveSchema(
  categoryCode: string,
  platformCode: string,
  marketplaceCode: string,
) {
  if (categoryCode === 'BED_FRAME' && platformCode === 'AZ' && ['USA', 'CAN'].includes(marketplaceCode)) {
    const schema: TemplateSchema = {
      ...bedFrameSchema,
      platform: 'amazon',
      marketplace: marketplaceCode,
      fields: bedFrameSchema.fields.map((field) => {
        if (field.key === 'fulfillmentChannelCode') {
          return { ...field, label: `Fulfillment Channel Code (${marketplaceCode === 'USA' ? 'US' : 'CA'})` };
        }
        if (field.key === 'shippingTemplate') {
          return { ...field, label: `Shipping Template (${marketplaceCode === 'USA' ? 'US' : 'CA'})` };
        }
        if (field.key === 'listPrice') {
          return { ...field, label: `List Price${marketplaceCode === 'CAN' ? ' CAD' : ''}` };
        }
        if (field.key === 'yourPrice') {
          return { ...field, label: `Your Price${marketplaceCode === 'USA' ? ' USD' : ' CAD'} (Sell on Amazon, ${marketplaceCode === 'USA' ? 'US' : 'CA'})` };
        }
        return field;
      }),
    };
    return { schema, mapper: mapBedFrameDraft };
  }
  if (categoryCode === 'BED_FRAME' && platformCode === 'OMNI' && marketplaceCode === 'USA') {
    return {
      schema: { ...bedFrameSchema, platform: 'walmart', marketplace: marketplaceCode },
      mapper: mapBedFrameDraft,
    };
  }
  throw new Error(`无法识别模版配置：${categoryCode}-${platformCode}-${marketplaceCode}。`);
}

function collectHeaderColumns(
  worksheet: import('xlsx').WorkSheet,
  XLSX: typeof import('xlsx'),
): Record<string, string> {
  const headers: Record<string, string> = {};
  if (!worksheet['!ref']) return headers;
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  for (let row = range.s.r; row <= range.e.r; row += 1) {
    for (let column = range.s.c; column <= range.e.c; column += 1) {
      const address = XLSX.utils.encode_cell({ r: row, c: column });
      const cell = worksheet[address] as import('xlsx').CellObject | undefined;
      const label = String(cell?.v ?? '').replace(/\s+/g, ' ').trim();
      const normalized = label.toLocaleLowerCase();
      if (label && !headers[normalized]) {
        headers[normalized] = XLSX.utils.encode_col(column);
      }
    }
  }
  return headers;
}

function detectDataStartRow(
  worksheet: import('xlsx').WorkSheet,
  schema: TemplateSchema,
): number {
  const { column, searchRows } = schema.startRowDetection;
  for (
    let row = schema.dataStartRowFallback;
    row < schema.dataStartRowFallback + searchRows;
    row += 1
  ) {
    const cell = worksheet[column + row] as
      import('xlsx').CellObject | undefined;
    if (String(cell?.v ?? '').trim() === '') return row;
  }
  return schema.dataStartRowFallback;
}

export async function loadExcelTemplate(
  file: File,
): Promise<LoadedExcelTemplate> {
  const { categoryCode, platformCode, marketplaceCode, extension } = parseFileName(file.name);
  const { schema, mapper } = resolveSchema(categoryCode, platformCode, marketplaceCode);
  const XLSX = await import('xlsx');
  let workbook: import('xlsx').WorkBook;
  try {
    const data = new Uint8Array(await file.arrayBuffer());
    workbook = XLSX.read(data, {
      type: 'array',
      bookVBA: extension === 'xlsm',
      cellStyles: true,
    });
  } catch {
    throw new Error('无法读取 Excel 模版，请确认文件未损坏并且没有加密。');
  }

  if (!workbook.Sheets[schema.worksheet]) {
    throw new Error('模版中没有找到“' + schema.worksheet + '”工作表。');
  }
  const worksheet = workbook.Sheets[schema.worksheet];
  const dataStartRow = detectDataStartRow(worksheet, schema);
  if (dataStartRow < 2) throw new Error('无法识别模版的数据起始行。');

  return {
    file,
    schema,
    dataStartRow,
    categoryCode,
    platformCode,
    marketplaceCode,
    headerColumns: collectHeaderColumns(worksheet, XLSX),
    mapper,
  };
}

export function getTemplateSummary(
  template: LoadedExcelTemplate,
): ExcelTemplateSummary {
  return {
    platformCode: template.platformCode,
    platformName: template.platformCode === 'AZ' ? 'Amazon' : 'Walmart',
    categoryCode: template.categoryCode,
    categoryName: template.categoryCode === 'BED_FRAME' ? 'Bed Frame' : template.categoryCode,
    marketplaceCode: template.marketplaceCode,
    marketplaceName: template.marketplaceCode === 'CAN' ? '加拿大' : '美国',
    worksheet: template.schema.worksheet,
    dataStartRow: template.dataStartRow,
  };
}
