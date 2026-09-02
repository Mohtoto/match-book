import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { uploads } from "@/db/schema/uploads";
import { suppliers } from "@/db/schema/suppliers";
import { uploadMetadataSchema } from "@/lib/validations/matchbook.schema";
import { buildUploadKey, putRawUpload } from "@/lib/matchbook/storage";
import {
  hasAcceptedExtension,
  MAX_UPLOAD_BYTES,
  ACCEPTED_UPLOAD_EXTENSIONS,
} from "@/lib/matchbook/domain";
import {
  parseUploadBuffer,
  ParseError,
  PREVIEW_ROW_LIMIT,
} from "@/lib/matchbook/parse";

/**
 * Accept one file, store it immutably, and return a preview.
 *
 * Order matters: the raw bytes are written to storage *before* parsing is
 * attempted. If parsing fails — a header row we guessed wrong, an unexpected
 * sheet — the upload row survives with the error on it, and the user can
 * correct the header row or pick a different sheet and re-preview without
 * re-uploading. The stored file is never touched again.
 *
 * Parsing runs synchronously. A 100k-row file completes in a couple of seconds,
 * and a queue or worker would be a lot of moving parts for no gain at this size.
 */
export const POST = withAuthRequired(async (req, { session }) => {
  const userId = session.user.id;

  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file was uploaded" }, { status: 400 });
    }

    const parsedMeta = uploadMetadataSchema.safeParse({
      kind: form.get("kind"),
      supplierId: form.get("supplierId") || null,
      declaredType: form.get("declaredType") || null,
      effectiveDate: form.get("effectiveDate") || null,
      sheetName: form.get("sheetName") || null,
      headerRowIndex: form.get("headerRowIndex") ?? null,
    });

    if (!parsedMeta.success) {
      return NextResponse.json(
        {
          error: "Invalid upload details",
          issues: parsedMeta.error.flatten(),
        },
        { status: 400 }
      );
    }

    const meta = parsedMeta.data;

    if (!hasAcceptedExtension(file.name)) {
      return NextResponse.json(
        {
          error: `Upload a ${ACCEPTED_UPLOAD_EXTENSIONS.join(", ")} file. If you have a .xls, open it in Excel and use Save As first.`,
        },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "That file is empty" }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          error: `That file is larger than ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB. Price lists are not usually this big — check you picked the right file.`,
        },
        { status: 413 }
      );
    }

    if (meta.supplierId) {
      const [supplier] = await db
        .select({ id: suppliers.id })
        .from(suppliers)
        .where(
          and(eq(suppliers.id, meta.supplierId), eq(suppliers.userId, userId))
        );

      if (!supplier) {
        return NextResponse.json(
          { error: "Supplier not found" },
          { status: 404 }
        );
      }
    }

    const uploadId = crypto.randomUUID();
    const storedObjectKey = buildUploadKey({
      userId,
      uploadId,
      originalFilename: file.name,
    });

    const buffer = Buffer.from(await file.arrayBuffer());

    await putRawUpload({
      key: storedObjectKey,
      body: buffer,
      contentType: file.type || undefined,
    });

    const [created] = await db
      .insert(uploads)
      .values({
        id: uploadId,
        userId,
        supplierId: meta.supplierId,
        kind: meta.kind,
        originalFilename: file.name,
        storedObjectKey,
        contentType: file.type || null,
        byteSize: file.size,
        declaredType: meta.kind === "supplier_price" ? meta.declaredType : null,
        effectiveDate: meta.effectiveDate
          ? new Date(`${meta.effectiveDate}T00:00:00Z`)
          : null,
        sheetName: meta.sheetName,
        headerRowIndex: meta.headerRowIndex ?? 0,
      })
      .returning();

    try {
      const parsed = await parseUploadBuffer(file.name, buffer, {
        sheetName: meta.sheetName ?? undefined,
        headerRowIndex: meta.headerRowIndex ?? undefined,
        maxRows: PREVIEW_ROW_LIMIT,
      });

      const [updated] = await db
        .update(uploads)
        .set({
          rowCount: parsed.totalDataRows,
          sheetName: parsed.sheetName,
          headerRowIndex: parsed.headerRowIndex,
          parseError: null,
        })
        .where(eq(uploads.id, uploadId))
        .returning();

      return NextResponse.json({ upload: updated, preview: parsed }, { status: 201 });
    } catch (error) {
      const message =
        error instanceof ParseError
          ? error.message
          : "We couldn't read this file.";

      // Row counts and errors only — never file contents or prices.
      console.error("Upload parse failed", {
        uploadId,
        byteSize: file.size,
        message,
      });

      await db
        .update(uploads)
        .set({ parseError: message })
        .where(eq(uploads.id, uploadId));

      return NextResponse.json(
        { upload: { ...created, parseError: message }, error: message },
        { status: 422 }
      );
    }
  } catch (error) {
    console.error("Error handling upload:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
});
