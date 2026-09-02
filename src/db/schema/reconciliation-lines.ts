import {
  pgTable,
  text,
  timestamp,
  integer,
  numeric,
  index,
} from "drizzle-orm/pg-core";
import { reconciliationRuns } from "./reconciliation-runs";
import type {
  DiffCategory,
  LineFlag,
  MatchMethod,
} from "@/lib/matchbook/domain";

/**
 * One line of the change report. Every supplier line and every internal SKU
 * ends up in exactly one category.
 *
 * Prices are `numeric`, never floating point — this is money, and a customer
 * deciding whether to act on it. `conversionFactorApplied` is stored per line
 * so the arithmetic behind a unit price is always visible and checkable.
 */
export const reconciliationLines = pgTable(
  "reconciliation_line",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    runId: text("runId")
      .notNull()
      .references(() => reconciliationRuns.id, { onDelete: "cascade" }),

    category: text("category").$type<DiffCategory>().notNull(),

    supplierPartNumber: text("supplierPartNumber"),
    internalSku: text("internalSku"),
    descriptionSupplier: text("descriptionSupplier"),
    descriptionInternal: text("descriptionInternal"),

    oldUnitPrice: numeric("oldUnitPrice", { precision: 18, scale: 6 }),
    newUnitPrice: numeric("newUnitPrice", { precision: 18, scale: 6 }),
    deltaAbsolute: numeric("deltaAbsolute", { precision: 18, scale: 6 }),
    deltaPercent: numeric("deltaPercent", { precision: 12, scale: 4 }),

    conversionFactorApplied: numeric("conversionFactorApplied", {
      precision: 18,
      scale: 6,
    }),

    flags: text("flags").$type<LineFlag[]>().array().notNull().default([]),
    /** Human-readable reason per flag, e.g. "12.4x increase, check pack size". */
    flagNotes: text("flagNotes").array().notNull().default([]),

    matchMethod: text("matchMethod").$type<MatchMethod>(),

    /** Row in the source file, so a user can go and look at it. */
    sourceRowNumber: integer("sourceRowNumber"),

    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("reconciliation_line_run_idx").on(table.runId),
    index("reconciliation_line_category_idx").on(table.runId, table.category),
  ]
);

export type ReconciliationLine = typeof reconciliationLines.$inferSelect;
export type NewReconciliationLine = typeof reconciliationLines.$inferInsert;
