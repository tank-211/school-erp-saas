/**
 * utils/sheetFile.js — reads an uploaded .xlsx / .xls / .csv into row objects
 * and writes workbooks (the student import template). Same as
 * ADMISSION/BACKEND/utils/sheetFile.js, in CommonJS.
 */
const XLSX = require('xlsx');

/** Rows of the "Students" sheet (or the first sheet) as { header: value }. */
const readSheetRows = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const name = workbook.SheetNames.find((n) => /student/i.test(n)) || workbook.SheetNames[0];
  const sheet = name ? workbook.Sheets[name] : null;
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
};

/** { sheetName: [[cell, ...], ...] } -> .xlsx file contents. */
const writeWorkbook = (sheets) => {
  const workbook = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    const widths = (rows[0] || []).map((_, i) =>
      Math.min(60, Math.max(10, ...rows.map((r) => String(r[i] ?? '').length + 2)))
    );
    sheet['!cols'] = widths.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(workbook, sheet, name);
  }
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

module.exports = { readSheetRows, writeWorkbook };
