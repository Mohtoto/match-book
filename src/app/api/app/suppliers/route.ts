import { NextResponse } from "next/server";
import { and, asc, eq, sql } from "drizzle-orm";
import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { suppliers } from "@/db/schema/suppliers";
import { skuMappings } from "@/db/schema/sku-mappings";
import { supplierFormSchema } from "@/lib/validations/matchbook.schema";

/**
 * Every query in here is scoped to the session user, which is the tenant key in
 * V1. Strict per-tenant isolation is not optional — this data is the customer's
 * supplier list and buying terms.
 */
export const GET = withAuthRequired(async (req, { session }) => {
  try {
    // The saved-mapping count is what tells the user a supplier is "warmed up",
    // so it belongs on the list rather than behind a click.
    const rows = await db
      .select({
        id: suppliers.id,
        name: suppliers.name,
        defaultCurrency: suppliers.defaultCurrency,
        notes: suppliers.notes,
        createdAt: suppliers.createdAt,
        savedMappingCount: sql<number>`count(${skuMappings.id})`,
      })
      .from(suppliers)
      .leftJoin(skuMappings, eq(skuMappings.supplierId, suppliers.id))
      .where(eq(suppliers.userId, session.user.id))
      .groupBy(suppliers.id)
      .orderBy(asc(suppliers.name));

    return NextResponse.json({
      suppliers: rows.map((row) => ({
        ...row,
        savedMappingCount: Number(row.savedMappingCount),
      })),
    });
  } catch (error) {
    console.error("Error listing suppliers:", error);
    return NextResponse.json(
      { error: "Failed to load suppliers" },
      { status: 500 }
    );
  }
});

export const POST = withAuthRequired(async (req, { session }) => {
  try {
    const parsed = supplierFormSchema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid supplier", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(
        and(
          eq(suppliers.userId, session.user.id),
          eq(suppliers.name, parsed.data.name)
        )
      );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: `You already have a supplier called "${parsed.data.name}".` },
        { status: 409 }
      );
    }

    const [created] = await db
      .insert(suppliers)
      .values({
        userId: session.user.id,
        name: parsed.data.name,
        defaultCurrency: parsed.data.defaultCurrency,
        notes: parsed.data.notes,
      })
      .returning();

    return NextResponse.json({ supplier: created }, { status: 201 });
  } catch (error) {
    console.error("Error creating supplier:", error);
    return NextResponse.json(
      { error: "Failed to create supplier" },
      { status: 500 }
    );
  }
});
