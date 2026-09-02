import { isBlankRow } from "./cells";

/**
 * Header row detection.
 *
 * Supplier price files routinely open with a logo, a title, a date, a contact
 * name and two blank rows before the actual header. Assuming row 1 produces
 * garbage columns, so we score the candidates and pick the best — and always
 * let the user override, because a heuristic will be wrong sometimes and the
 * cost of being wrong silently is high.
 */

/** How far into the file to look. Real preamble is never longer than this. */
const MAX_SCAN_ROWS = 30;

/**
 * Words that appear in the header of price files across every supplier we care
 * about. A row containing several of these is almost certainly the header.
 */
const HEADER_KEYWORDS = [
  "part",
  "sku",
  "code",
  "item",
  "product",
  "price",
  "cost",
  "rate",
  "desc",
  "name",
  "qty",
  "quantity",
  "uom",
  "unit",
  "pack",
  "size",
  "barcode",
  "ean",
  "gtin",
  "upc",
  "mfr",
  "manufacturer",
  "brand",
  "supplier",
  "list",
  "each",
];

function isNumericLike(value: string): boolean {
  return /^[\s$£€¥]*[\d.,]+\s*%?$/.test(value) && /\d/.test(value);
}

function scoreRow(row: string[], width: number, below: string[][]): number {
  const filled = row.filter((cell) => cell.trim() !== "");
  if (filled.length === 0) return -1;

  // A header labels most of the columns the data uses. A stray title in A1
  // fills one cell out of twelve and scores badly here.
  const fillRatio = filled.length / Math.max(width, 1);

  // Headers are distinct labels. Repeated values suggest a data row.
  const distinctRatio = new Set(filled.map((c) => c.toLowerCase())).size / filled.length;

  // Headers are words, data rows are largely numbers.
  const textRatio = filled.filter((c) => !isNumericLike(c)).length / filled.length;

  // Headers are short labels, not sentences.
  const shortRatio = filled.filter((c) => c.length <= 40).length / filled.length;

  const keywordHits = filled.filter((cell) => {
    const lower = cell.toLowerCase();
    return HEADER_KEYWORDS.some((word) => lower.includes(word));
  }).length;
  const keywordRatio = Math.min(keywordHits / 3, 1);

  // A header has data under it. A footer or a note does not.
  const populatedBelow = below.filter((r) => !isBlankRow(r)).length;
  const hasDataBelow = populatedBelow >= Math.min(2, below.length) ? 1 : 0;

  // A header is more textual than the rows beneath it. This is what separates
  // the header from the first data row when both are fully populated.
  const belowTextRatios = below
    .filter((r) => !isBlankRow(r))
    .slice(0, 5)
    .map((r) => {
      const cells = r.filter((c) => c.trim() !== "");
      if (cells.length === 0) return 0;
      return cells.filter((c) => !isNumericLike(c)).length / cells.length;
    });
  const averageBelowTextRatio =
    belowTextRatios.length > 0
      ? belowTextRatios.reduce((a, b) => a + b, 0) / belowTextRatios.length
      : 0;
  const moreTextualThanBelow = Math.max(0, textRatio - averageBelowTextRatio);

  return (
    fillRatio * 2.5 +
    distinctRatio * 1.5 +
    textRatio * 1.5 +
    shortRatio * 0.5 +
    keywordRatio * 3 +
    hasDataBelow * 1.5 +
    moreTextualThanBelow * 2
  );
}

/**
 * Best guess at the 0-indexed header row. Returns 0 when nothing scores, so a
 * pathological file still produces something the user can correct.
 */
export function detectHeaderRow(rows: string[][]): number {
  if (rows.length === 0) return 0;

  const width = Math.max(...rows.slice(0, MAX_SCAN_ROWS).map((r) => r.length), 1);

  let bestIndex = 0;
  let bestScore = -Infinity;

  const limit = Math.min(rows.length, MAX_SCAN_ROWS);
  for (let index = 0; index < limit; index += 1) {
    const score = scoreRow(rows[index], width, rows.slice(index + 1, index + 8));
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  return bestIndex;
}

/**
 * Turn a header row into usable column names, filling blanks and disambiguating
 * duplicates so that a column can always be referred to by name.
 */
export function buildColumnNames(headerRow: string[], width: number): string[] {
  const seen = new Map<string, number>();

  return Array.from({ length: width }, (_, index) => {
    const raw = (headerRow[index] ?? "").trim();
    const base = raw === "" ? `Column ${index + 1}` : raw;

    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base} (${count + 1})`;
  });
}
