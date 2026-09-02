import { isBlankRow } from "./cells";
import { buildColumnNames, detectHeaderRow } from "./header";
import { readCsvGrid } from "./read-csv";
import { listSheets, loadWorkbook, readSheetGrid, selectWorksheet } from "./read-xlsx";
import {
  ParseError,
  type ParsedFile,
  type ParsedRow,
  type ParseOptions,
  type SheetRef,
} from "./types";

export * from "./types";
export { cleanWhitespace, normaliseIdentifier, toCellString } from "./cells";
export { parsePrice, parseQuantity, inferDecimalSeparator } from "./price";
export { detectHeaderRow } from "./header";

/** Rows shown in an on-screen preview. Full parses pass no cap. */
export const PREVIEW_ROW_LIMIT = 100;

function isSpreadsheet(filename: string): boolean {
  return /\.(xlsx|xlsm)$/i.test(filename) || /\.xls$/i.test(filename);
}

function isCsv(filename: string): boolean {
  return /\.(csv|tsv|txt)$/i.test(filename);
}

/**
 * Turn a raw grid into a header plus data rows.
 *
 * Fully blank rows are dropped — supplier files are full of spacer rows. Rows
 * that look like subtotals are *not* dropped here: identifying them requires
 * knowing which column is the part number, which is not decided until the user
 * maps the columns, so that filtering belongs to the matching stage.
 */
function buildParsedFile(
  grid: string[][],
  sheets: SheetRef[],
  sheetName: string,
  options: ParseOptions,
  encoding?: string
): ParsedFile {
  if (grid.length === 0) {
    throw new ParseError("This file appears to be empty.");
  }

  const width = Math.max(...grid.map((row) => row.length), 1);
  const padded = grid.map((row) =>
    row.length === width
      ? row
      : [...row, ...new Array(width - row.length).fill("")]
  );

  const detected = detectHeaderRow(padded);
  const headerWasDetected = options.headerRowIndex === undefined;
  const headerRowIndex = headerWasDetected ? detected : options.headerRowIndex!;

  if (headerRowIndex < 0 || headerRowIndex >= padded.length) {
    throw new ParseError(
      `Header row ${headerRowIndex + 1} is outside this file, which has ${padded.length} rows.`
    );
  }

  const columns = buildColumnNames(padded[headerRowIndex], width);

  const rows: ParsedRow[] = [];
  let skippedBlankRows = 0;
  let totalDataRows = 0;
  const limit = options.maxRows ?? Infinity;

  for (let index = headerRowIndex + 1; index < padded.length; index += 1) {
    const cells = padded[index];
    if (isBlankRow(cells)) {
      skippedBlankRows += 1;
      continue;
    }

    totalDataRows += 1;
    if (rows.length < limit) {
      // 1-indexed so it matches what the user sees in the row gutter.
      rows.push({ rowNumber: index + 1, cells });
    }
  }

  return {
    sheets,
    sheetName,
    headerRowIndex,
    headerWasDetected,
    columns,
    rows,
    totalDataRows,
    truncated: totalDataRows > rows.length,
    skippedBlankRows,
    encoding,
  };
}

/**
 * Parse an uploaded file into columns and rows.
 *
 * Read-only and reproducible: the same bytes and the same options always give
 * the same result, which is what lets a run from three months ago be explained.
 * Every value comes back as a string; see `cells.ts` for why that is
 * non-negotiable.
 */
export async function parseUploadBuffer(
  filename: string,
  buffer: Buffer,
  options: ParseOptions = {}
): Promise<ParsedFile> {
  if (buffer.length === 0) {
    throw new ParseError("This file is empty.");
  }

  if (isCsv(filename)) {
    const { grid, encoding } = readCsvGrid(buffer);
    return buildParsedFile(
      grid,
      [{ name: filename, rowCount: grid.length }],
      filename,
      options,
      encoding
    );
  }

  if (isSpreadsheet(filename)) {
    const workbook = await loadWorkbook(filename, buffer);
    const worksheet = selectWorksheet(workbook, options.sheetName);
    const grid = readSheetGrid(worksheet);
    return buildParsedFile(grid, listSheets(workbook), worksheet.name, options);
  }

  throw new ParseError(
    "Unsupported file type. Upload a .csv or .xlsx file — if you have a .xls, " +
      "open it in Excel and use Save As first."
  );
}
