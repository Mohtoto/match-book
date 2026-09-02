import { z } from "zod";
import {
  declaredTypeSchema,
  uploadKindSchema,
  mappableFieldSchema,
  mappingSourceSchema,
} from "@/lib/matchbook/domain";

export const supplierFormSchema = z.object({
  name: z.string().trim().min(1, "Supplier name is required").max(200),
  defaultCurrency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/, "Use a three-letter currency code, e.g. AUD")
    .default("AUD"),
  notes: z.string().trim().max(2000).nullable().default(null),
});

export type SupplierFormValues = z.infer<typeof supplierFormSchema>;
export type SupplierFormInput = z.input<typeof supplierFormSchema>;

/**
 * Metadata submitted alongside an uploaded file.
 *
 * `declaredType` is required for supplier price files and has no default here
 * on purpose — the UI defaults it to `delta`, but the API refuses to infer it.
 * Guessing wrong is what causes a customer to deactivate products they still
 * sell, so the answer has to be stated, not assumed.
 */
export const uploadMetadataSchema = z
  .object({
    kind: uploadKindSchema,
    supplierId: z.string().trim().min(1).nullable().default(null),
    declaredType: declaredTypeSchema.nullable().default(null),
    /** Plain calendar date; supplier files carry dates, not timestamps. */
    effectiveDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD")
      .nullable()
      .default(null),
    sheetName: z.string().trim().min(1).nullable().default(null),
    headerRowIndex: z.coerce.number().int().min(0).max(5000).nullable().default(null),
  })
  .refine(
    (value) => value.kind !== "supplier_price" || value.supplierId !== null,
    { message: "Choose which supplier this price file came from", path: ["supplierId"] }
  )
  .refine(
    (value) => value.kind !== "supplier_price" || value.declaredType !== null,
    {
      message:
        "Say whether this is the supplier's full catalogue or only the lines they are changing",
      path: ["declaredType"],
    }
  );

export type UploadMetadataInput = z.input<typeof uploadMetadataSchema>;

export const previewQuerySchema = z.object({
  sheetName: z.string().trim().min(1).nullable().default(null),
  headerRowIndex: z.coerce.number().int().min(0).max(5000).nullable().default(null),
});

export const columnMappingEntrySchema = z.object({
  source: mappingSourceSchema,
  field: mappableFieldSchema,
  sourceColumnName: z.string().trim().min(1),
});

export const columnMappingFormSchema = z.object({
  supplierId: z.string().trim().min(1).nullable().default(null),
  mappings: z.array(columnMappingEntrySchema),
});
