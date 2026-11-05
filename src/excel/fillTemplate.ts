import { unzipSync, zipSync } from 'fflate';
import type { LoadedExcelTemplate, TemplateMapOptions } from './types';
import type { ProductDraft } from '../types';
import { sanitizeListingText } from '../ai/sanitize';

const spreadsheetNamespace =
  'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const officeRelationshipNamespace =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const packageRelationshipNamespace =
  'http://schemas.openxmlformats.org/package/2006/relationships';
const xmlNamespace = 'http://www.w3.org/XML/1998/namespace';

function parseXml(xml: string, description: string): XMLDocument {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.getElementsByTagName('parsererror').length) {
    throw new Error('无法解析 Excel 文件中的 ' + description + '。');
  }
  return document;
}

function normalizeZipPath(path: string): string {
  const parts: string[] = [];
  for (const part of path.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return parts.join('/');
}

function findWorksheetPath(
  files: Record<string, Uint8Array>,
  sheetName: string,
): string {
  const workbookBytes = files['xl/workbook.xml'];
  const relationshipsBytes = files['xl/_rels/workbook.xml.rels'];
  if (!workbookBytes || !relationshipsBytes) {
    throw new Error('Excel 文件缺少工作簿目录信息。');
  }

  const workbookDocument = parseXml(
    new TextDecoder().decode(workbookBytes),
    '工作簿目录',
  );
  const sheet = Array.from(
    workbookDocument.getElementsByTagNameNS(spreadsheetNamespace, 'sheet'),
  ).find((item) => item.getAttribute('name') === sheetName);
  if (!sheet) throw new Error('找不到“' + sheetName + '”工作表。');

  const relationshipId = sheet.getAttributeNS(
    officeRelationshipNamespace,
    'id',
  );
  if (!relationshipId) throw new Error('工作表关系 ID 缺失。');

  const relationshipsDocument = parseXml(
    new TextDecoder().decode(relationshipsBytes),
    '工作表关系',
  );
  const relationship = Array.from(
    relationshipsDocument.getElementsByTagNameNS(
      packageRelationshipNamespace,
      'Relationship',
    ),
  ).find((item) => item.getAttribute('Id') === relationshipId);
  const target = relationship?.getAttribute('Target');
  if (!target) throw new Error('找不到“' + sheetName + '”工作表文件。');

  return target.startsWith('/')
    ? normalizeZipPath(target)
    : normalizeZipPath('xl/' + target);
}

function columnIndex(column: string): number {
  let result = 0;
  for (const character of column.toUpperCase()) {
    result = result * 26 + character.charCodeAt(0) - 64;
  }
  return result - 1;
}

function cellColumnIndex(address: string): number {
  const letters = address.match(/^[A-Z]+/i)?.[0] ?? '';
  return columnIndex(letters);
}

function getOrCreateRow(
  document: XMLDocument,
  sheetData: Element,
  rowNumber: number,
  styleSourceRow: Element | undefined,
): Element {
  const existing = Array.from(
    sheetData.getElementsByTagNameNS(spreadsheetNamespace, 'row'),
  ).find(
    (row) =>
      row.parentElement === sheetData &&
      row.getAttribute('r') === String(rowNumber),
  );
  if (existing) return existing;

  const row = document.createElementNS(spreadsheetNamespace, 'row');
  row.setAttribute('r', String(rowNumber));
  if (styleSourceRow) {
    for (const attribute of [
      'spans',
      's',
      'customFormat',
      'ht',
      'customHeight',
    ]) {
      const value = styleSourceRow.getAttribute(attribute);
      if (value) row.setAttribute(attribute, value);
    }
  }

  const nextRow = Array.from(
    sheetData.getElementsByTagNameNS(spreadsheetNamespace, 'row'),
  ).find(
    (item) =>
      item.parentElement === sheetData &&
      Number(item.getAttribute('r')) > rowNumber,
  );
  sheetData.insertBefore(row, nextRow ?? null);
  return row;
}

function findRow(sheetData: Element, rowNumber: number): Element | undefined {
  return Array.from(
    sheetData.getElementsByTagNameNS(spreadsheetNamespace, 'row'),
  ).find(
    (row) =>
      row.parentElement === sheetData &&
      row.getAttribute('r') === String(rowNumber),
  );
}

function findCell(
  row: Element | undefined,
  address: string,
): Element | undefined {
  return row
    ? Array.from(row.getElementsByTagNameNS(spreadsheetNamespace, 'c')).find(
        (cell) =>
          cell.parentElement === row && cell.getAttribute('r') === address,
      )
    : undefined;
}

function getOrCreateCell(
  document: XMLDocument,
  row: Element,
  address: string,
  styleSourceCell: Element | undefined,
): Element {
  const existing = findCell(row, address);
  if (existing) return existing;

  const cell = document.createElementNS(spreadsheetNamespace, 'c');
  cell.setAttribute('r', address);
  const style = styleSourceCell?.getAttribute('s');
  if (style) cell.setAttribute('s', style);

  const nextCell = Array.from(
    row.getElementsByTagNameNS(spreadsheetNamespace, 'c'),
  ).find(
    (item) =>
      item.parentElement === row &&
      cellColumnIndex(item.getAttribute('r') ?? '') > cellColumnIndex(address),
  );
  row.insertBefore(cell, nextCell ?? null);
  return cell;
}

function setCellValue(
  document: XMLDocument,
  cell: Element,
  value: string | number,
): void {
  while (cell.firstChild) cell.removeChild(cell.firstChild);
  cell.removeAttribute('t');

  if (typeof value === 'number' && Number.isFinite(value)) {
    const valueNode = document.createElementNS(spreadsheetNamespace, 'v');
    valueNode.textContent = String(value);
    cell.appendChild(valueNode);
    return;
  }

  const text = String(value);
  if (!text) return;
  cell.setAttribute('t', 'inlineStr');
  const inlineString = document.createElementNS(spreadsheetNamespace, 'is');
  const textNode = document.createElementNS(spreadsheetNamespace, 't');
  if (text.trim() !== text) {
    textNode.setAttributeNS(xmlNamespace, 'xml:space', 'preserve');
  }
  textNode.textContent = text;
  inlineString.appendChild(textNode);
  cell.appendChild(inlineString);
}

function applyWhiteFillToEditableCell(
  cell: Element,
  stylesDocument: XMLDocument | null,
  sheetProtected: boolean,
  styleCache: Map<number, number>,
): void {
  if (!stylesDocument) return;
  const cellXfs = Array.from(
    stylesDocument.getElementsByTagNameNS(spreadsheetNamespace, 'cellXfs'),
  )[0];
  if (!cellXfs) return;
  const styleIndex = Number(cell.getAttribute('s') ?? '0');
  const styles = Array.from(cellXfs.children).filter(
    (item) => item.localName === 'xf',
  );
  const style = styles[styleIndex];
  if (!style) return;

  // Preserve template-defined disabled cells when sheet protection is active.
  const protection = Array.from(
    style.getElementsByTagNameNS(spreadsheetNamespace, 'protection'),
  )[0];
  if (sheetProtected && protection?.getAttribute('locked') !== '0') return;

  if (style.getAttribute('fillId') === '0') return;
  const cachedStyleIndex = styleCache.get(styleIndex);
  if (cachedStyleIndex !== undefined) {
    cell.setAttribute('s', String(cachedStyleIndex));
    return;
  }

  const whiteStyle = style.cloneNode(true) as Element;
  whiteStyle.setAttribute('fillId', '0');
  whiteStyle.setAttribute('applyFill', '1');
  const nextStyleIndex = styles.length;
  cellXfs.appendChild(whiteStyle);
  cellXfs.setAttribute('count', String(nextStyleIndex + 1));
  styleCache.set(styleIndex, nextStyleIndex);
  cell.setAttribute('s', String(nextStyleIndex));
}

function updateSheetDimension(
  sheet: Element,
  finalRow: number,
  finalColumn: number,
): void {
  const dimension = Array.from(
    sheet.getElementsByTagNameNS(spreadsheetNamespace, 'dimension'),
  )[0];
  if (!dimension) return;
  const current = dimension.getAttribute('ref');
  const match = current?.match(/^([A-Z]+\d+):([A-Z]+)(\d+)$/i);
  if (!match) return;

  const endColumn = match[2].toUpperCase();
  const endRow = Number(match[3]);
  const nextEndColumn =
    columnIndex(endColumn) >= finalColumn
      ? endColumn
      : addressColumn(finalColumn);
  dimension.setAttribute(
    'ref',
    match[1] + ':' + nextEndColumn + Math.max(endRow, finalRow),
  );
}

function addressColumn(index: number): string {
  let value = index + 1;
  let result = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function validateMappedRow(
  row: Record<string, string | number | undefined>,
  template: LoadedExcelTemplate,
  draft: ProductDraft,
): void {
  const missing = template.schema.fields
    .filter(
      (field) =>
        field.required &&
        (row[field.key] === undefined || String(row[field.key]).trim() === ''),
    )
    .map((field) => field.label);
  if (missing.length) {
    throw new Error(
      (draft.itemCode || draft.productName) +
        ': 以下模版必填字段没有值：' +
        missing.join('、'),
    );
  }
}

export interface FilledWorkbook {
  bytes: Uint8Array;
  fileName: string;
  extension: string;
}

export async function fillExcelTemplate(
  template: LoadedExcelTemplate,
  drafts: ProductDraft[],
  options: TemplateMapOptions,
): Promise<FilledWorkbook> {
  if (!drafts.length) throw new Error('没有可导出的暂存商品。');
  if (template.platformCode !== 'AZ') {
    throw new Error(
      '已识别为 Walmart 模版；Walmart 的字段映射配置尚未完成，暂不能导出，避免写错列。',
    );
  }

  const mappedRows = drafts.map((draft) => {
    const row = template.mapper(draft, {
      ...options,
      productType: template.categoryCode,
    });
    validateMappedRow(row, template, draft);
    return row;
  });

  const archive = unzipSync(new Uint8Array(await template.file.arrayBuffer()));
  const sheetPath = findWorksheetPath(archive, template.schema.worksheet);
  const sheetBytes = archive[sheetPath];
  if (!sheetBytes) throw new Error('Excel 文件中缺少目标工作表内容。');

  const sheetDocument = parseXml(
    new TextDecoder().decode(sheetBytes),
    template.schema.worksheet + ' 工作表',
  );
  const sheet = sheetDocument.documentElement;
  const sheetProtected =
    sheet.getElementsByTagNameNS(spreadsheetNamespace, 'sheetProtection').length > 0;
  const stylesBytes = archive['xl/styles.xml'];
  const stylesDocument = stylesBytes
    ? parseXml(new TextDecoder().decode(stylesBytes), '单元格样式')
    : null;
  const whiteStyleCache = new Map<number, number>();
  const sheetData = Array.from(
    sheet.getElementsByTagNameNS(spreadsheetNamespace, 'sheetData'),
  )[0];
  if (!sheetData) throw new Error('目标工作表缺少单元格数据区域。');

  const styleSourceRow = findRow(sheetData, template.dataStartRow);
  let lastColumn = 0;
  for (let rowIndex = 0; rowIndex < mappedRows.length; rowIndex += 1) {
    const rowNumber = template.dataStartRow + rowIndex;
    const row = getOrCreateRow(
      sheetDocument,
      sheetData,
      rowNumber,
      styleSourceRow,
    );
    const mapped = mappedRows[rowIndex];
    for (const field of template.schema.fields) {
      // Static Amazon fields always follow the category/marketplace schema's
      // explicit column mapping. AI-only scraped attributes never participate
      // in this mapping.
      const columnName = field.column;
      const column = columnIndex(columnName);
      lastColumn = Math.max(lastColumn, column);
      const address = columnName + rowNumber;
      const styleSourceCell = findCell(
        styleSourceRow,
        columnName + template.dataStartRow,
      );
      const cell = getOrCreateCell(
        sheetDocument,
        row,
        address,
        styleSourceCell,
      );
      const value = mapped[field.key];
      if (value === undefined) continue;
      applyWhiteFillToEditableCell(
        cell,
        stylesDocument,
        sheetProtected,
        whiteStyleCache,
      );
      setCellValue(sheetDocument, cell, value);
    }

    const allowedCustomFieldNames = new Set(
      (drafts[rowIndex].customFields ?? []).map((field) =>
        field.fieldName.replace(/\s+/g, ' ').trim().toLocaleLowerCase(),
      ),
    );
    for (const customField of drafts[rowIndex].aiResult?.customFields ?? []) {
      const label = customField.fieldName.replace(/\s+/g, ' ').trim();
      if (!allowedCustomFieldNames.has(label.toLocaleLowerCase())) continue;
      const columnName = template.headerColumns[label.toLocaleLowerCase()];
      if (!columnName) {
        throw new Error(
          `模板中找不到自定义字段列“${label}”，请确认字段名与表头一致。`,
        );
      }
      const address = columnName + rowNumber;
      const cell = getOrCreateCell(
        sheetDocument,
        row,
        address,
        findCell(styleSourceRow, columnName + template.dataStartRow),
      );
      applyWhiteFillToEditableCell(
        cell,
        stylesDocument,
        sheetProtected,
        whiteStyleCache,
      );
      setCellValue(sheetDocument, cell, sanitizeListingText(customField.value));
      lastColumn = Math.max(lastColumn, columnIndex(columnName));
    }
  }

  // Guard against exporting an incomplete row if a schema mapping or XML write
  // regresses. These values are required for Amazon's template validation.
  for (let rowIndex = 0; rowIndex < mappedRows.length; rowIndex += 1) {
    const rowNumber = template.dataStartRow + rowIndex;
    const mapped = mappedRows[rowIndex];
    for (const key of [
      'countryOfOrigin',
      'batteriesRequired',
      'dangerousGoodsRegulations',
    ]) {
      const field = template.schema.fields.find((item) => item.key === key);
      if (!field) throw new Error('模版映射缺少字段：' + key);
      const expected = mapped[key];
      const cell = findCell(
        findRow(sheetData, rowNumber),
        field.column + rowNumber,
      );
      const actual = cell?.textContent?.trim() ?? '';
      if (expected === undefined || actual !== String(expected).trim()) {
        throw new Error(
          '第 ' +
            (rowIndex + 1) +
            ' 条商品的“' +
            field.label +
            '”写入失败，请重新导出。',
        );
      }
    }
  }

  updateSheetDimension(
    sheet,
    template.dataStartRow + mappedRows.length - 1,
    lastColumn,
  );
  archive[sheetPath] = new TextEncoder().encode(
    new XMLSerializer().serializeToString(sheetDocument),
  );
  if (stylesDocument) {
    archive['xl/styles.xml'] = new TextEncoder().encode(
      new XMLSerializer().serializeToString(stylesDocument),
    );
  }

  const bytes = zipSync(archive, { level: 6 });
  const safeName = template.file.name.replace(/\.xlsm?$/i, '');
  const extension = template.file.name.toLowerCase().endsWith('.xlsm')
    ? 'xlsm'
    : 'xlsx';
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return {
    bytes,
    fileName: safeName + '-' + dateStr + '-filled.' + extension,
    extension,
  };
}
