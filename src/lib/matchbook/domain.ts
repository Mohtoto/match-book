import { z } from "zod";

/**
 * Shared vocabulary for the reconciliation domain.
 *
 * These live in lib rather than in a schema file because several tables and
 * both API and UI layers need them. Columns store them as `text` (matching the
 * boilerplate's convention) and validate against these zod enums at the edge.
 */

/** What kind of file was uploaded. */
export const uploadKindSchema = z.enum(["catalogue", "supplier_price"]);
export type UploadKind = z.infer<typeof uploadKindSchema>;

/**
 * Whether a supplier file is the supplier's complete list or only the lines
 * they are changing.
 *
 * This is the single most consequential field in the system. A missing SKU in a
 * `full` upload may mean discontinued; in a `delta` upload it means nothing at
 * all. Defaulting to `delta` is deliberate — it is the safe assumption, and
 * getting it wrong would have a customer deactivate products they still sell.
 */
export const declaredTypeSchema = z.enum(["full", "delta"]);
export type DeclaredType = z.infer<typeof declaredTypeSchema>;
export const DEFAULT_DECLARED_TYPE: DeclaredType = "delta";

/** Which side of the comparison a column mapping describes. */
export const mappingSourceSchema = z.enum(["catalogue", "supplier"]);
export type MappingSource = z.infer<typeof mappingSourceSchema>;

/** The logical fields we try to locate in an uploaded file. */
export const mappableFieldSchema = z.enum([
  "part_number",
  "description",
  "price",
  "uom",
  "pack_size",
  "mfr_part_number",
  "barcode",
  "quantity_break",
]);
export type MappableField = z.infer<typeof mappableFieldSchema>;

/**
 * Fields that hold an identifier and must therefore never be parsed as a
 * number. Consulted by the parser to force string coercion at read time.
 */
export const IDENTIFIER_FIELDS: MappableField[] = [
  "part_number",
  "mfr_part_number",
  "barcode",
];

/** How a supplier line came to be associated with an internal SKU. */
export const matchMethodSchema = z.enum([
  "saved_mapping",
  "exact",
  "normalised",
  "alternate_id",
  "manual",
  "fuzzy_confirmed",
]);
export type MatchMethod = z.infer<typeof matchMethodSchema>;

/** The terminal category of every supplier line and every internal SKU. */
export const diffCategorySchema = z.enum([
  "price_increase",
  "price_decrease",
  "price_unchanged",
  "not_stocked",
  "unmatched_supplier_line",
  "possibly_discontinued",
  "not_in_this_update",
  "conflict",
  "uom_unresolved",
]);
export type DiffCategory = z.infer<typeof diffCategorySchema>;

/** Sanity flags raised against a computed line. `zero_or_negative_price` blocks export. */
export const lineFlagSchema = z.enum([
  "threshold_exceeded",
  "order_of_magnitude",
  "zero_or_negative_price",
  "duplicated_price_across_items",
  "unhandled_quantity_tier",
]);
export type LineFlag = z.infer<typeof lineFlagSchema>;

export const runStatusSchema = z.enum([
  "parsing",
  "awaiting_mapping",
  "awaiting_review",
  "complete",
  "failed",
]);
export type RunStatus = z.infer<typeof runStatusSchema>;

/**
 * Upload limits. These live here rather than in `storage.ts` because the
 * uploader UI needs them too, and `storage.ts` is `server-only`.
 */

/** Roughly 100k rows of XLSX. Beyond this, the file is not a price list. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/**
 * Legacy `.xls` is deliberately absent: it is a different binary format we
 * cannot read, and accepting it only to fail later is worse than saying so up
 * front. The error tells the user to Save As instead.
 */
export const ACCEPTED_UPLOAD_EXTENSIONS = [
  ".csv",
  ".tsv",
  ".txt",
  ".xlsx",
  ".xlsm",
];

export function hasAcceptedExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return ACCEPTED_UPLOAD_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/** Default movement threshold beyond which a price change is flagged, per customer. */
export const DEFAULT_MOVEMENT_THRESHOLD_PERCENT = 30;

/**
 * If more than this share of a supplier file fails to match, it is far more
 * likely a column mapping error than genuinely new products, and the report is
 * replaced with a mapping warning rather than shown.
 */
export const UNMATCHED_WARNING_RATIO = 0.4;
