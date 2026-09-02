import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getS3Client } from "@/lib/s3/client";

/**
 * Immutable storage for raw uploads.
 *
 * Deliberately separate from `lib/s3/uploadFromServer`, which writes to a
 * `public/` prefix with no encryption. Cost prices and supplier terms are among
 * the most commercially sensitive data a distributor has, and "is my pricing
 * safe with you" is a real sales objection, so the posture here has to be real:
 *
 *   - private prefix, never served publicly
 *   - server-side encryption at rest
 *   - written once and never modified, so any run can be reproduced exactly
 *   - contents and prices are never logged; only row counts and errors are
 */

/**
 * Where a raw upload lives.
 *
 * The tenant id is in the path so that a misconfigured policy fails closed
 * rather than leaking across tenants, and the upload id makes the key unique
 * even when the same file is uploaded twice.
 */
export function buildUploadKey({
  userId,
  uploadId,
  originalFilename,
}: {
  userId: string;
  uploadId: string;
  originalFilename: string;
}): string {
  const extension = originalFilename.match(/\.[a-z0-9]+$/i)?.[0] ?? "";
  // The original name is not used in the key — supplier filenames contain
  // customer names and dates, and keys turn up in logs.
  return `private/matchbook/${userId}/uploads/${uploadId}${extension.toLowerCase()}`;
}

export async function putRawUpload({
  key,
  body,
  contentType,
}: {
  key: string;
  body: Buffer;
  contentType?: string;
}): Promise<void> {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
      ServerSideEncryption: "AES256",
    })
  );
}

/**
 * Read a raw upload back for parsing. Read-only by construction — nothing in
 * this module ever writes to an existing key.
 */
export async function getRawUpload(key: string): Promise<Buffer> {
  const result = await getS3Client().send(
    new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    })
  );

  if (!result.Body) {
    throw new Error("Stored upload could not be read");
  }

  const bytes = await result.Body.transformToByteArray();
  return Buffer.from(bytes);
}

/**
 * Purge the raw file at the customer's request. Their mappings and run history
 * survive — those are the asset, and they contain no file contents.
 */
export async function deleteRawUpload(key: string): Promise<void> {
  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    })
  );
}

