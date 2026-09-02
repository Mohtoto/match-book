import Papa from "papaparse";
import { cleanWhitespace } from "./cells";
import { ParseError } from "./types";

/**
 * Decode CSV bytes.
 *
 * Older ERPs export Windows-1252 and will silently corrupt characters if read
 * as UTF-8, so we try strict UTF-8 first and fall back rather than producing
 * replacement characters in the middle of a product description.
 */
export function decodeCsv(buffer: Buffer): { text: string; encoding: string } {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    return { text, encoding: "utf-8" };
  } catch {
    const text = new TextDecoder("windows-1252").decode(buffer);
    return { text, encoding: "windows-1252" };
  }
}

/**
 * Read a CSV into a raw grid of strings.
 *
 * `dynamicTyping` stays off and `header` stays false, deliberately. Every cell
 * comes back as the text that was in the file, which is exactly what we want —
 * a CSV is the one format where leading zeros and long barcodes survive
 * untouched, and we are not about to undo that by asking a parser to guess
 * types. The header is located later, because it is frequently not row 1.
 */
export function readCsvGrid(buffer: Buffer): {
  grid: string[][];
  encoding: string;
} {
  const { text, encoding } = decodeCsv(buffer);

  const result = Papa.parse<string[]>(text, {
    header: false,
    dynamicTyping: false,
    skipEmptyLines: false,
    // Papa sniffs comma, tab, semicolon and pipe, which covers what ERPs emit.
    delimiter: "",
  });

  // Papa reports recoverable problems (a short row, a stray quote) as errors
  // while still returning the data. Only a total failure to produce rows is
  // worth refusing over.
  if (result.data.length === 0) {
    const detail = result.errors[0]?.message ?? "no rows found";
    throw new ParseError(`Could not read this CSV: ${detail}`);
  }

  const grid = result.data.map((row) =>
    (Array.isArray(row) ? row : [row]).map((cell) =>
      cell === null || cell === undefined ? "" : cleanWhitespace(String(cell))
    )
  );

  return { grid, encoding };
}
