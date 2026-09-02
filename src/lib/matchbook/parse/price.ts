import { cleanWhitespace } from "./cells";

/**
 * Price parsing.
 *
 * Runs only on a column the user has explicitly mapped to `price`. We never
 * guess that a column is numeric — see `cells.ts` for why.
 *
 * Prices are returned as decimal *strings*, not JS numbers, and stored in
 * `numeric` columns. This is money the customer is deciding whether to act on;
 * it does not go anywhere near a float.
 */

export type DecimalSeparator = "." | ",";

export type PriceParseResult =
  | { ok: true; value: string }
  /** `ambiguous` means we could read it two ways and refuse to pick. */
  | { ok: false; reason: "empty" | "unparseable" | "ambiguous"; raw: string };

/** Currency symbols and codes seen in the price columns of real supplier files. */
const CURRENCY_NOISE =
  /(?:AUD|NZD|USD|GBP|EUR|CAD|SGD|HKD|JPY|CNY|ZAR|INR|\$|£|€|¥|₹|A\$|NZ\$|US\$)/gi;

/**
 * Decide whether `1.234,50` means one thousand two hundred and thirty-four, or
 * whether `1.234` means one point two three four.
 *
 * Returns null when the value genuinely cannot be disambiguated, in which case
 * the caller must ask the user for a locale rather than guess. A missing answer
 * is far better than a wrong one.
 */
export function inferDecimalSeparator(raw: string): DecimalSeparator | null {
  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");

  if (!hasComma && !hasDot) return ".";

  // Both present: whichever appears last is the decimal separator, because the
  // thousands separator can never follow it.
  if (hasComma && hasDot) {
    return raw.lastIndexOf(",") > raw.lastIndexOf(".") ? "," : ".";
  }

  const separator: DecimalSeparator = hasComma ? "," : ".";
  const parts = raw.split(separator);

  // More than one occurrence can only be a thousands separator: "1.234.567".
  if (parts.length > 2) return separator === "," ? "." : ",";

  const fraction = parts[1] ?? "";

  // Exactly three trailing digits is the ambiguous case. "1,234" is a thousands
  // separator to an Australian and a decimal to a German, and both readings are
  // plausible prices. Refuse to choose.
  if (fraction.length === 3 && /^\d{3}$/.test(fraction)) return null;

  return separator;
}

/**
 * Parse one price cell.
 *
 * @param raw             the cell's string content
 * @param decimalOverride the locale the user confirmed for this supplier, which
 *                        removes the ambiguity permanently once answered
 */
export function parsePrice(
  raw: string,
  decimalOverride?: DecimalSeparator
): PriceParseResult {
  const cleaned = cleanWhitespace(raw);
  if (cleaned === "") return { ok: false, reason: "empty", raw };

  // Accounting notation: (12.34) means negative. Preserved rather than
  // discarded so the zero-or-negative sanity check can see it and block.
  const isParenthesised = /^\(.*\)$/.test(cleaned);

  let stripped = cleaned
    .replace(/^\(|\)$/g, "")
    .replace(CURRENCY_NOISE, "")
    .replace(/\s/g, "");

  const isNegative = isParenthesised || stripped.startsWith("-");
  stripped = stripped.replace(/^[+-]/, "");

  if (stripped === "" || !/\d/.test(stripped)) {
    return { ok: false, reason: "unparseable", raw };
  }

  if (/[^\d.,]/.test(stripped)) {
    return { ok: false, reason: "unparseable", raw };
  }

  const separator = decimalOverride ?? inferDecimalSeparator(stripped);
  if (separator === null) return { ok: false, reason: "ambiguous", raw };

  const thousands = separator === "." ? "," : ".";
  const digits = stripped.split(thousands).join("");
  const [whole, fraction = ""] = digits.split(separator);

  if (!/^\d*$/.test(whole) || !/^\d*$/.test(fraction)) {
    return { ok: false, reason: "unparseable", raw };
  }

  const magnitude = `${whole === "" ? "0" : whole}${
    fraction === "" ? "" : `.${fraction}`
  }`;

  if (!/\d/.test(magnitude)) return { ok: false, reason: "unparseable", raw };

  return { ok: true, value: isNegative ? `-${magnitude}` : magnitude };
}

/**
 * Parse a pack size or quantity. Integers in practice, but parsed through the
 * price rules because the same currency-and-separator noise turns up.
 */
export function parseQuantity(raw: string): number | null {
  const result = parsePrice(raw);
  if (!result.ok) return null;
  const value = Number(result.value);
  return Number.isFinite(value) ? value : null;
}
