import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { reconciliationRuns } from "@/db/schema/reconciliation-runs";
import { suppliers } from "@/db/schema/suppliers";
import { uploads } from "@/db/schema/uploads";

const catalogueUpload = alias(uploads, "catalogue_upload");
const supplierUpload = alias(uploads, "supplier_upload");

/**
 * One run, with both of its files.
 *
 * Returns everything needed to explain the run later: which files went in, what
 * the supplier file was declared as, and which sheet and header row were used.
 * That combination is what makes the result reproducible.
 */
export const GET = withAuthRequired(async (req, { session, params }) => {
  try {
    const { id } = (await params) as { id: string };

    const [row] = await db
      .select({
        run: reconciliationRuns,
        supplier: suppliers,
        catalogue: catalogueUpload,
        supplierFile: supplierUpload,
      })
      .from(reconciliationRuns)
      .innerJoin(suppliers, eq(suppliers.id, reconciliationRuns.supplierId))
      .innerJoin(
        catalogueUpload,
        eq(catalogueUpload.id, reconciliationRuns.catalogueUploadId)
      )
      .innerJoin(
        supplierUpload,
        eq(supplierUpload.id, reconciliationRuns.supplierUploadId)
      )
      .where(
        and(
          eq(reconciliationRuns.id, id),
          eq(reconciliationRuns.userId, session.user.id)
        )
      );

    if (!row) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json(row);
  } catch (error) {
    console.error("Error fetching run:", error);
    return NextResponse.json({ error: "Failed to load run" }, { status: 500 });
  }
});
