import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./user";
import { suppliers } from "./suppliers";
import { uploads } from "./uploads";
import { exportTemplates } from "./export-templates";
import type { RunStatus } from "@/lib/matchbook/domain";

/**
 * The counts behind the change report's summary block. Every percentage is
 * stored alongside the count it came from — the report never shows one without
 * the other.
 */
export type RunSummary = {
  supplierLineCount: number;
  internalSkuCount: number;

  attention: {
    flagged: number;
    unmatchedSupplierLines: number;
    conflicts: number;
    uomUnresolved: number;
  };

  movements: {
    increased: number;
    increasedAveragePercent: number | null;
    increasedLargestPercent: number | null;
    decreased: number;
    decreasedAveragePercent: number | null;
    unchanged: number;
  };

  other: {
    notStocked: number;
    /** `possibly_discontinued` for a full catalogue, `not_in_this_update` for a delta. */
    absentFromUpdate: number;
  };

  /**
   * Set when the unmatched share exceeds the warning ratio. The report is
   * replaced by a mapping warning rather than shown, because the user's
   * instinct will be to distrust the tool instead of checking the mapping.
   */
  mappingWarning: { unmatchedRatio: number } | null;
};

/**
 * One comparison of a catalogue export against a supplier price file.
 *
 * Same inputs plus same mappings must produce the same output, and the user
 * must always be able to see why a line was categorised as it was. The export
 * fields at the bottom answer "why is this price what it is?" three months
 * later — cheap to record now, impossible to reconstruct after the fact.
 */
export const reconciliationRuns = pgTable(
  "reconciliation_run",
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

    catalogueUploadId: text("catalogueUploadId")
      .notNull()
      .references(() => uploads.id),
    supplierUploadId: text("supplierUploadId")
      .notNull()
      .references(() => uploads.id),

    status: text("status").$type<RunStatus>().notNull().default("parsing"),
    summaryJson: jsonb("summaryJson").$type<RunSummary>(),
    failureReason: text("failureReason"),

    exportTemplateId: text("exportTemplateId").references(
      () => exportTemplates.id,
      { onDelete: "set null" }
    ),
    exportedLineCount: integer("exportedLineCount"),
    exportChecksum: text("exportChecksum"),
    exportedAt: timestamp("exportedAt", { mode: "date" }),

    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    completedAt: timestamp("completedAt", { mode: "date" }),
  },
  (table) => [
    index("reconciliation_run_user_idx").on(table.userId, table.createdAt),
    index("reconciliation_run_supplier_idx").on(table.userId, table.supplierId),
  ]
);

export type ReconciliationRun = typeof reconciliationRuns.$inferSelect;
export type NewReconciliationRun = typeof reconciliationRuns.$inferInsert;
