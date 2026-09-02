import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./user";

/**
 * A supplier the distributor buys from.
 *
 * `userId` is the tenant key throughout Matchbook. V1 is one account per
 * company, so user and tenant are the same thing; when organisations arrive
 * this column becomes an organisation reference and nothing else changes.
 */
export const suppliers = pgTable(
  "supplier",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    defaultCurrency: text("defaultCurrency").notNull().default("AUD"),
    notes: text("notes"),

    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("supplier_user_name_idx").on(table.userId, table.name),
    index("supplier_user_idx").on(table.userId),
  ]
);

export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;
