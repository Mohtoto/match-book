/**
 * Cell-to-string coercion.
 *
 * The rule this file exists to enforce: every cell is read as a string, always.
 * We do not know which column holds the part number until the user maps it, so
 * we refuse to infer a type for any of them. Numeric coercion happens later and
 * only on columns the user has explicitly mapped to `price` or `pack_size`.
 *
 * The three failure modes this prevents, all of which occur constantly in real
 * supplier files:
 *
 *   - Leading zeros destroyed:      "0012345" -> 12345, matching nothing
 *   - Scientific notation:          5012345678901 -> "5.01234567890E+12"
 *   - Trailing decimals:            "12345" -> "12345.0"
 */

/**
 * Whitespace that looks like a space but isn't, plus zero-width characters.
 * These arrive inside identifiers constantly — usually from a copy-paste out of
 * a web page or a PDF — and make an otherwise exact match fail silently.
 */
const INVISIBLE_CHARS =
  /[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g;

/** Collapse odd whitespace to plain spaces and trim. Never alters digits. */
export function cleanWhitespace(value: string): string {
  return value.replace(INVISIBLE_CHARS, " ").replace(/\s+/g, " ").trim();
}

/**
 * Render a number in full decimal form, never in scientific notation.
 *
 * `String(5012345678901)` is already safe, but `String(1e21)` is not, and
 * neither is `String(0.0000001)`. Prices and identifiers both hit these ranges
 * in practice, so we go through a fixed-notation formatter.
 */
export function numberToPlainString(value: number): string {
  if (!Number.isFinite(value)) return "";

  // Integers cover every identifier and most pack sizes. BigInt renders them in
  // full regardless of magnitude, so no barcode can come out as an exponent.
  if (Number.isInteger(value)) return BigInt(value).toString();

  const asString = String(value);
  if (!/e/i.test(asString)) return asString;

  // toFixed caps at 100 fraction digits, which is far more than any real price
  // or identifier needs, and strips the exponent form.
  return value
    .toFixed(20)
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
}

/**
 * Recover leading zeros that a spreadsheet stored as a number but displays as
 * padded text.
 *
 * A SKU of `0012345` in a cell formatted `00000000` is stored as the number
 * 12345 with a display format that re-adds the zeros. The stored value has lost
 * them; the display text has them. So when the formatted text is the canonical
 * digits with zeros in front, the formatted text is the truer identifier.
 *
 * We deliberately do *not* trust formatted text in general: Excel will happily
 * display a 13-digit barcode as "5.01235E+12", which is exactly the value we
 * are trying to avoid.
 */
function preferPaddedText(canonical: string, formatted: string): string {
  if (!formatted || formatted === canonical) return canonical;
  if (!/^0\d*$/.test(formatted)) return canonical;
  if (formatted.replace(/^0+/, "") !== canonical) return canonical;
  return formatted;
}

/**
 * An ExcelJS cell value, which may be a scalar or one of several wrapper
 * objects depending on how the cell was authored.
 */
type SpreadsheetValue =
  | null
  | undefined
  | string
  | number
  | boolean
  | Date
  | { formula?: string; result?: unknown; sharedFormula?: string }
  | { richText?: Array<{ text?: string }> }
  | { text?: string; hyperlink?: string }
  | { error?: string };

/**
 * Coerce any spreadsheet cell to the string we will treat as its content.
 *
 * @param value     the raw stored value
 * @param formatted the cell's displayed text, used only to recover leading zeros
 */
export function toCellString(
  value: SpreadsheetValue,
  formatted?: string
): string {
  if (value === null || value === undefined) return "";

  if (typeof value === "string") return cleanWhitespace(value);

  if (typeof value === "number") {
    const canonical = numberToPlainString(value);
    return preferPaddedText(canonical, cleanWhitespace(formatted ?? ""));
  }

  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";

  if (value instanceof Date) {
    // ISO date, no time component — supplier files carry dates, not timestamps.
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "object") {
    if ("error" in value && value.error) return "";
    if ("richText" in value && Array.isArray(value.richText)) {
      return cleanWhitespace(value.richText.map((r) => r.text ?? "").join(""));
    }
    if ("formula" in value || "sharedFormula" in value) {
      // Cached result of the formula, recursed so a numeric result still gets
      // the plain-string treatment.
      return toCellString(value.result as SpreadsheetValue, formatted);
    }
    if ("hyperlink" in value) return cleanWhitespace(value.text ?? "");
  }

  return cleanWhitespace(String(value));
}

/**
 * Normalise an identifier for the normalised-match step of the cascade.
 *
 * Uppercase, and strip separators only — whitespace, hyphens, periods,
 * underscores, forward slashes. Digits are never touched, so leading zeros
 * survive. `0012-345/A` and `0012345 A` both become `0012345A`; neither becomes
 * `12345A`.
 */
export function normaliseIdentifier(value: string): string {
  return cleanWhitespace(value)
    .toUpperCase()
    .replace(/[\s\-._/\\]/g, "");
}

/** True when a row carries no content at all and can be skipped outright. */
export function isBlankRow(cells: string[]): boolean {
  return cells.every((cell) => cell.trim() === "");
}
