import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { z } from "zod";
import { users } from "./user";

/**
 * An output column: either a field from the run, or a fixed literal. Constants
 * matter more than they look — ERPs routinely demand a price-list code or
 * currency code in a column that has nothing to do with the data.
 */
export const exportColumnSchema = z.union([
  z.object({
    header: z.string(),
    kind: z.literal("field"),
    field: z.enum([
      "internal_sku",
      "supplier_part_number",
      "new_unit_price",
      "old_unit_price",
      "effective_date",
      "supplier_name",
      "description_internal",
    ]),
  }),
  z.object({
    header: z.string(),
    kind: z.literal("constant"),
    value: z.string(),
  }),
]);

export type ExportColumn = z.infer<typeof exportColumnSchema>;

export const columnSpecSchema = z.array(exportColumnSchema);
export type ColumnSpec = z.infer<typeof columnSpecSchema>;

/**
 * Per-tenant configuration, not code. V1 ships one hardcoded template for the
 * first customer's ERP; the configuration UI waits until a second customer
 * needs a different shape. Do not build a template designer before there are
 * two templates.
 */
export const exportTemplates = pgTable(
  "export_template",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    targetSystem: text("targetSystem"),

    columnSpecJson: jsonb("columnSpecJson").$type<ColumnSpec>().notNull(),

    delimiter: text("delimiter").notNull().default(","),
    dateFormat: text("dateFormat").notNull().default("yyyy-MM-dd"),
    /** Older ERPs need windows-1252 and will silently corrupt characters without it. */
    encoding: text("encoding").notNull().default("utf-8"),
    includeHeader: boolean("includeHeader").notNull().default(true),
    decimalPlaces: integer("decimalPlaces").notNull().default(2),

    isDefault: boolean("isDefault").notNull().default(false),

    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [index("export_template_user_idx").on(table.userId)]
);

export type ExportTemplate = typeof exportTemplates.$inferSelect;
export type NewExportTemplate = typeof exportTemplates.$inferInsert;
