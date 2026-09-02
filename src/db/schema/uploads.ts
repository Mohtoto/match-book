import {
  pgTable,
  text,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./user";
import { suppliers } from "./suppliers";
import type { UploadKind, DeclaredType } from "@/lib/matchbook/domain";

/**
 * One uploaded file, stored immutably.
 *
 * The raw object in S3 is never modified — all parsing reads from it, so any
 * run can be reproduced exactly. `rawDeletedAt` lets a customer purge the
 * sensitive file while keeping their mappings and run history intact.
 */
export const uploads = pgTable(
  "upload",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    /** Null for catalogue uploads — the customer's own export isn't supplier-specific. */
    supplierId: text("supplierId").references(() => suppliers.id, {
      onDelete: "set null",
    }),

    kind: text("kind").$type<UploadKind>().notNull(),

    originalFilename: text("originalFilename").notNull(),
    storedObjectKey: text("storedObjectKey").notNull(),
    contentType: text("contentType"),
    byteSize: integer("byteSize"),

    /** Chosen sheet and detected (or user-overridden) header row, 0-indexed. */
    sheetName: text("sheetName"),
    headerRowIndex: integer("headerRowIndex").notNull().default(0),

    /**
     * Only meaningful for supplier price files. Defaults to `delta` because
     * that is the assumption that cannot cause a customer to deactivate a
     * product they still sell.
     */
    declaredType: text("declaredType").$type<DeclaredType>(),

    /** If in the future, the report and export must say so prominently. */
    effectiveDate: timestamp("effectiveDate", { mode: "date" }),

    rowCount: integer("rowCount"),
    parseError: text("parseError"),

    uploadedAt: timestamp("uploadedAt", { mode: "date" }).defaultNow().notNull(),
    /** Set when the customer purges the raw file; mappings and runs survive. */
    rawDeletedAt: timestamp("rawDeletedAt", { mode: "date" }),
  },
  (table) => [
    index("upload_user_idx").on(table.userId),
    index("upload_user_supplier_idx").on(table.userId, table.supplierId),
  ]
);

export type Upload = typeof uploads.$inferSelect;
export type NewUpload = typeof uploads.$inferInsert;
