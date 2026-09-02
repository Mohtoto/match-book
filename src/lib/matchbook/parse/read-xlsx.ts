import ExcelJS from "exceljs";
import { toCellString } from "./cells";
import { ParseError, type SheetRef } from "./types";

/**
 * Legacy .xls is a completely different binary format that ExcelJS cannot read.
 * Distributors do still receive them, so the error has to tell the user what to
 * do rather than just failing.
 */
export function assertNotLegacyXls(filename: string, buffer: Buffer): void {
  const isLegacyExtension = /\.xls$/i.test(filename);
  // OLE2 compound document magic number — the real .xls signature.
  const hasOleHeader =
    buffer.length >= 8 &&
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0;

  if (isLegacyExtension || hasOleHeader) {
    throw new ParseError(
      "This is a legacy .xls file, which we can't read yet. Open it in Excel " +
        "and use Save As to produce a .xlsx or .csv, then upload that."
    );
  }
}

export async function loadWorkbook(
  filename: string,
  buffer: Buffer
): Promise<ExcelJS.Workbook> {
  assertNotLegacyXls(filename, buffer);

  const workbook = new ExcelJS.Workbook();
  try {
    // ExcelJS wants an ArrayBuffer-ish; a Buffer view is accepted at runtime.
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch (error) {
    throw new ParseError(
      `Could not read this spreadsheet: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    );
  }

  if (workbook.worksheets.length === 0) {
    throw new ParseError("This workbook has no sheets.");
  }

  return workbook;
}

export function listSheets(workbook: ExcelJS.Workbook): SheetRef[] {
  return workbook.worksheets.map((sheet) => ({
    name: sheet.name,
    rowCount: sheet.rowCount,
  }));
}

/**
 * Read one worksheet into a raw grid of strings.
 *
 * Two spreadsheet-specific hazards are handled here:
 *
 *   - **Merged cells.** In a merged region only the master cell holds the
 *     value. Header rows are the most common place for merges, so resolving to
 *     the master keeps the header readable instead of full of blanks.
 *   - **Sparse rows.** ExcelJS omits cells that were never written, so we index
 *     by column position to a fixed width rather than iterating what exists,
 *     otherwise columns shift left and every mapping is wrong.
 */
/**
 * Reconstruct the padded display text of a zero-padded numeric cell.
 *
 * A part number of `0012345` is commonly stored as the number 12345 with the
 * number format `0000000`, which re-adds the zeros on screen. ExcelJS's
 * `cell.text` does not apply number formats, so the padding is invisible unless
 * we read the format ourselves — and without it the identifier matches nothing.
 *
 * Only a format that is purely zeros is handled. Anything more elaborate is
 * left alone rather than half-interpreted.
 */
function paddedTextFromNumberFormat(
  value: unknown,
  numFmt: string | undefined
): string | undefined {
  if (!numFmt) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return undefined;
  }

  const format = numFmt.trim();
  if (!/^0+$/.test(format)) return undefined;

  const digits = String(value);
  return digits.length >= format.length
    ? undefined
    : digits.padStart(format.length, "0");
}

export function readSheetGrid(worksheet: ExcelJS.Worksheet): string[][] {
  const width = Math.max(worksheet.columnCount, 1);
  const grid: string[][] = [];

  for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const cells: string[] = new Array(width).fill("");

    for (let column = 1; column <= width; column += 1) {
      const cell = row.getCell(column);
      const source = cell.master ?? cell;
      // Display text is consulted only to recover leading zeros a number lost;
      // it is never trusted in general, because Excel will happily display a
      // 13-digit barcode as "5.01235E+12".
      const formatted =
        paddedTextFromNumberFormat(source.value, source.numFmt) ??
        (typeof source.text === "string" ? source.text : undefined);

      cells[column - 1] = toCellString(source.value as never, formatted);
    }

    grid.push(cells);
  }

  return grid;
}

export function selectWorksheet(
  workbook: ExcelJS.Workbook,
  sheetName?: string
): ExcelJS.Worksheet {
  if (!sheetName) return workbook.worksheets[0];

  const found = workbook.worksheets.find((sheet) => sheet.name === sheetName);
  if (!found) {
    throw new ParseError(`This workbook has no sheet called "${sheetName}".`);
  }
  return found;
}
