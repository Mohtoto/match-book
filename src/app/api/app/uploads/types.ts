import type { Upload } from "@/db/schema/uploads";
import type { ParsedFile } from "@/lib/matchbook/parse/types";

/** Dates arrive as JSON strings over the wire. */
export type UploadRecord = Omit<
  Upload,
  "uploadedAt" | "effectiveDate" | "rawDeletedAt"
> & {
  uploadedAt: string;
  effectiveDate: string | null;
  rawDeletedAt: string | null;
};

export type UploadResponse = {
  upload: UploadRecord;
  preview: ParsedFile;
};

export type UploadErrorResponse = {
  upload?: UploadRecord;
  error: string;
};
