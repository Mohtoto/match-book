import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { uploads } from "@/db/schema/uploads";
import { previewQuerySchema } from "@/lib/validations/matchbook.schema";
import { getRawUpload } from "@/lib/matchbook/storage";
import {
  parseUploadBuffer,
  ParseError,
  PREVIEW_ROW_LIMIT,
} from "@/lib/matchbook/parse";

/**
 * Re-parse a stored upload with a different sheet or header row.
 *
 * This is how the user corrects a bad header guess without re-uploading. The
 * stored file is read-only, so the same bytes plus the same options always give
 * the same result — which is what makes a run explainable months later.
 *
 * The chosen sheet and header row are persisted on the upload, so the next
 * step of the flow uses what the user confirmed rather than the guess.
 */
export const GET = withAuthRequired(async (req, { session, params }) => {
  try {
    const { id } = (await params) as { id: string };
    const { searchParams } = new URL(req.url);

    const parsedQuery = previewQuerySchema.safeParse({
      sheetName: searchParams.get("sheetName") || null,
      headerRowIndex: searchParams.get("headerRowIndex") ?? null,
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        { error: "Invalid preview options", issues: parsedQuery.error.flatten() },
        { status: 400 }
      );
    }

    const [upload] = await db
      .select()
      .from(uploads)
      .where(
        and(
          eq(uploads.id, id),
          eq(uploads.userId, session.user.id),
          // A purged raw file cannot be re-parsed; the run history remains.
          isNull(uploads.rawDeletedAt)
        )
      );

    if (!upload) {
      return NextResponse.json(
        { error: "Upload not found, or its raw file has been deleted" },
        { status: 404 }
      );
    }

    const buffer = await getRawUpload(upload.storedObjectKey);

    const parsed = await parseUploadBuffer(upload.originalFilename, buffer, {
      sheetName: parsedQuery.data.sheetName ?? upload.sheetName ?? undefined,
      // A sheet change invalidates the old header row, so fall back to detection.
      headerRowIndex:
        parsedQuery.data.headerRowIndex ??
        (parsedQuery.data.sheetName && parsedQuery.data.sheetName !== upload.sheetName
          ? undefined
          : upload.headerRowIndex),
      maxRows: PREVIEW_ROW_LIMIT,
    });

    const [updated] = await db
      .update(uploads)
      .set({
        sheetName: parsed.sheetName,
        headerRowIndex: parsed.headerRowIndex,
        rowCount: parsed.totalDataRows,
        parseError: null,
      })
      .where(eq(uploads.id, id))
      .returning();

    return NextResponse.json({ upload: updated, preview: parsed });
  } catch (error) {
    if (error instanceof ParseError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }

    console.error(
      "Error previewing upload:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json({ error: "Failed to preview file" }, { status: 500 });
  }
});
