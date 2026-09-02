import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { reconciliationRuns } from "@/db/schema/reconciliation-runs";
import { suppliers } from "@/db/schema/suppliers";
import { uploads } from "@/db/schema/uploads";
import { alias } from "drizzle-orm/pg-core";

const catalogueUpload = alias(uploads, "catalogue_upload");
const supplierUpload = alias(uploads, "supplier_upload");

/**
 * Run history: what the customer imported last month, and why.
 *
 * Cheap to record as it happens, impossible to reconstruct afterwards. When
 * someone asks in three months why a price is what it is, this answers it.
 */
export const GET = withAuthRequired(async (req, { session }) => {
  try {
    const rows = await db
      .select({
        id: reconciliationRuns.id,
        status: reconciliationRuns.status,
        summaryJson: reconciliationRuns.summaryJson,
        createdAt: reconciliationRuns.createdAt,
        completedAt: reconciliationRuns.completedAt,
        exportedAt: reconciliationRuns.exportedAt,
        exportedLineCount: reconciliationRuns.exportedLineCount,
        supplierId: suppliers.id,
        supplierName: suppliers.name,
        supplierFilename: supplierUpload.originalFilename,
        declaredType: supplierUpload.declaredType,
        effectiveDate: supplierUpload.effectiveDate,
        supplierRowCount: supplierUpload.rowCount,
        catalogueFilename: catalogueUpload.originalFilename,
        catalogueRowCount: catalogueUpload.rowCount,
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
      .where(eq(reconciliationRuns.userId, session.user.id))
      .orderBy(desc(reconciliationRuns.createdAt))
      .limit(100);

    return NextResponse.json({ runs: rows });
  } catch (error) {
    console.error("Error listing runs:", error);
    return NextResponse.json({ error: "Failed to load runs" }, { status: 500 });
  }
});

const createRunSchema = z.object({
  supplierId: z.string().trim().min(1),
  catalogueUploadId: z.string().trim().min(1),
  supplierUploadId: z.string().trim().min(1),
});

/**
 * Tie a catalogue upload and a supplier price file together into a run.
 *
 * The run starts at `awaiting_mapping`. Column mapping, matching and the diff
 * advance it from there — see the build order in the project skill.
 */
export const POST = withAuthRequired(async (req, { session }) => {
  const userId = session.user.id;

  try {
    const parsed = createRunSchema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid run", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { supplierId, catalogueUploadId, supplierUploadId } = parsed.data;

    // Ownership is checked on all three references, not assumed from the ids.
    const [supplier] = await db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(and(eq(suppliers.id, supplierId), eq(suppliers.userId, userId)));

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    const ownedUploads = await db
      .select({
        id: uploads.id,
        kind: uploads.kind,
        parseError: uploads.parseError,
        declaredType: uploads.declaredType,
      })
      .from(uploads)
      .where(eq(uploads.userId, userId));

    const catalogue = ownedUploads.find((u) => u.id === catalogueUploadId);
    const supplierFile = ownedUploads.find((u) => u.id === supplierUploadId);

    if (!catalogue || !supplierFile) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 });
    }

    if (catalogue.kind !== "catalogue" || supplierFile.kind !== "supplier_price") {
      return NextResponse.json(
        { error: "One file must be your catalogue export and the other the supplier's price file" },
        { status: 400 }
      );
    }

    if (catalogue.parseError || supplierFile.parseError) {
      return NextResponse.json(
        { error: "Both files need to parse cleanly before you can compare them" },
        { status: 400 }
      );
    }

    // The safe default is applied at upload time; refuse rather than infer it
    // here, because a wrong answer marks products discontinued that are not.
    if (!supplierFile.declaredType) {
      return NextResponse.json(
        { error: "Say whether the supplier file is a full catalogue or a delta" },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(reconciliationRuns)
      .values({
        userId,
        supplierId,
        catalogueUploadId,
        supplierUploadId,
        status: "awaiting_mapping",
      })
      .returning();

    return NextResponse.json({ run: created }, { status: 201 });
  } catch (error) {
    console.error("Error creating run:", error);
    return NextResponse.json({ error: "Failed to create run" }, { status: 500 });
  }
});
