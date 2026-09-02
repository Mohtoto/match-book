import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { uploads } from "@/db/schema/uploads";
import { deleteRawUpload } from "@/lib/matchbook/storage";

/**
 * Purge the raw file while keeping everything derived from it.
 *
 * A customer who is nervous about their cost prices sitting in someone else's
 * bucket can clear the files and still keep their column mappings, their SKU
 * mappings and their run history — none of which contain file contents. That
 * makes the security conversation an easy one, so the capability has to exist.
 *
 * Once purged, the upload can no longer be re-previewed or re-run. That is the
 * trade, and the UI says so before asking.
 */
export const DELETE = withAuthRequired(async (req, { session, params }) => {
  try {
    const { id } = (await params) as { id: string };

    const [upload] = await db
      .select()
      .from(uploads)
      .where(
        and(
          eq(uploads.id, id),
          eq(uploads.userId, session.user.id),
          isNull(uploads.rawDeletedAt)
        )
      );

    if (!upload) {
      return NextResponse.json(
        { error: "Upload not found, or its raw file is already deleted" },
        { status: 404 }
      );
    }

    await deleteRawUpload(upload.storedObjectKey);

    const [updated] = await db
      .update(uploads)
      .set({ rawDeletedAt: new Date() })
      .where(eq(uploads.id, id))
      .returning();

    return NextResponse.json({ upload: updated });
  } catch (error) {
    console.error(
      "Error deleting raw upload:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: "Failed to delete the stored file" },
      { status: 500 }
    );
  }
});
