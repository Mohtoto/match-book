import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./user";
import { suppliers } from "./suppliers";
import type { MappingSource, MappableField } from "@/lib/matchbook/domain";

/**
 * Which column in a given file holds which logical field.
 *
 * This table is why the second upload from a supplier is fast, and it is the
 * second most valuable data in the system after `sku_mapping`. Treat it as an
 * asset: accumulate it, never discard it.
 *
 * `supplierId` is null for `source = "catalogue"` — the customer's own export
 * has the same shape no matter which supplier it is being compared against.
 */
export const columnMappings = pgTable(
  "column_mapping",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    supplierId: text("supplierId").references(() => suppliers.id, {
      onDelete: "cascade",
    }),

    source: text("source").$type<MappingSource>().notNull(),
    field: text("field").$type<MappableField>().notNull(),
    sourceColumnName: text("sourceColumnName").notNull(),

    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    // Postgres treats NULLs as distinct in unique indexes, so the per-supplier
    // and tenant-wide catalogue cases each need their own partial index.
    uniqueIndex("column_mapping_supplier_field_idx")
      .on(table.userId, table.supplierId, table.source, table.field)
      .where(sql`"supplierId" is not null`),
    uniqueIndex("column_mapping_catalogue_field_idx")
      .on(table.userId, table.source, table.field)
      .where(sql`"supplierId" is null`),
    index("column_mapping_lookup_idx").on(table.userId, table.supplierId),
  ]
);

export type ColumnMapping = typeof columnMappings.$inferSelect;
export type NewColumnMapping = typeof columnMappings.$inferInsert;
