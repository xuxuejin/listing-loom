import type { FilledWorkbook } from './fillTemplate';

export function downloadWorkbook(workbook: FilledWorkbook): void {
  const buffer = new ArrayBuffer(workbook.bytes.byteLength);
  new Uint8Array(buffer).set(workbook.bytes);
  const contentType =
    workbook.extension === 'xlsm'
      ? 'application/vnd.ms-excel.sheet.macroEnabled.12'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const blob = new Blob([buffer], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = workbook.fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
