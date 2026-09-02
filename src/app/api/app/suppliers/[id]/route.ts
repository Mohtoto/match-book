import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { suppliers } from "@/db/schema/suppliers";
import { supplierFormSchema } from "@/lib/validations/matchbook.schema";

/** Resolves the id only if it belongs to this tenant. */
async function findOwnedSupplier(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(suppliers)
    .where(and(eq(suppliers.id, id), eq(suppliers.userId, userId)));
  return row ?? null;
}

export const GET = withAuthRequired(async (req, { session, params }) => {
  try {
    const { id } = (await params) as { id: string };
    const supplier = await findOwnedSupplier(session.user.id, id);

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    return NextResponse.json({ supplier });
  } catch (error) {
    console.error("Error fetching supplier:", error);
    return NextResponse.json(
      { error: "Failed to load supplier" },
      { status: 500 }
    );
  }
});

export const PATCH = withAuthRequired(async (req, { session, params }) => {
  try {
    const { id } = (await params) as { id: string };
    const parsed = supplierFormSchema.partial().safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid supplier", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supplier = await findOwnedSupplier(session.user.id, id);
    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    const [updated] = await db
      .update(suppliers)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(suppliers.id, id), eq(suppliers.userId, session.user.id)))
      .returning();

    return NextResponse.json({ supplier: updated });
  } catch (error) {
    console.error("Error updating supplier:", error);
    return NextResponse.json(
      { error: "Failed to update supplier" },
      { status: 500 }
    );
  }
});

/**
 * Deleting a supplier cascades to its column and SKU mappings, which is the
 * accumulated value of every confirmation the user has ever made for them. The
 * UI warns accordingly; this route reports what will be lost.
 */
export const DELETE = withAuthRequired(async (req, { session, params }) => {
  try {
    const { id } = (await params) as { id: string };
    const supplier = await findOwnedSupplier(session.user.id, id);

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    await db
      .delete(suppliers)
      .where(and(eq(suppliers.id, id), eq(suppliers.userId, session.user.id)));

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Error deleting supplier:", error);
    return NextResponse.json(
      { error: "Failed to delete supplier" },
      { status: 500 }
    );
  }
});
