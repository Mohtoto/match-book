import {
  pgTable,
  text,
  timestamp,
  numeric,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./user";
import { suppliers } from "./suppliers";
import type { MatchMethod } from "@/lib/matchbook/domain";

/**
 * A confirmed supplier-part-number to internal-SKU association.
 *
 * The most valuable table in the system. Every human confirmation of a fuzzy or
 * alternate match is written here immediately, which is what makes next
 * month's upload from the same supplier trivial — and that is the whole
 * business. Month six is worth far more than month one because of what has
 * accumulated here.
 *
 * `conversionFactor` is how many internal units come in one supplier priced
 * unit, so `internal_unit_price = supplier_price / conversionFactor`. It is
 * numeric rather than integer because some units genuinely divide (priced per
 * metre, stocked per 100mm).
 */
export const skuMappings = pgTable(
  "sku_mapping",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    supplierId: text("supplierId")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),

    /** Identifiers are always text. Never let these become numbers. */
    supplierPartNumber: text("supplierPartNumber").notNull(),
    internalSku: text("internalSku").notNull(),

    conversionFactor: numeric("conversionFactor", { precision: 18, scale: 6 })
      .notNull()
      .default("1"),

    matchMethod: text("matchMethod").$type<MatchMethod>().notNull(),

    confirmedBy: text("confirmedBy").references(() => users.id, {
      onDelete: "set null",
    }),
    confirmedAt: timestamp("confirmedAt", { mode: "date" }),

    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    // Step 1 of the matching cascade looks up exactly this.
    uniqueIndex("sku_mapping_lookup_idx").on(
      table.userId,
      table.supplierId,
      table.supplierPartNumber
    ),
    index("sku_mapping_internal_sku_idx").on(table.userId, table.internalSku),
  ]
);

export type SkuMapping = typeof skuMappings.$inferSelect;
export type NewSkuMapping = typeof skuMappings.$inferInsert;
