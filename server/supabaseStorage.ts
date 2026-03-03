/**
 * Supabase Storage Service
 * Handles file uploads to Supabase Storage buckets for ReclaimFlow PH.
 *
 * Buckets:
 *   - project-docs:      PDFs, clearances, MOAs, resolutions (max 50MB)
 *   - inspection-photos: Field inspection images (max 10MB)
 *   - public-files:      Publicly accessible downloads (max 10MB)
 */
import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Lazily initialised so unit tests that don't need storage can skip it
let _supabase: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!_supabase) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("[Supabase] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
    }
    _supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  }
  return _supabase;
}

export type StorageBucket = "project-docs" | "inspection-photos" | "public-files";

export interface UploadResult {
  key: string;
  bucket: StorageBucket;
  url: string;
  signedUrl?: string;
  size: number;
  mimeType: string;
  originalName: string;
}

/**
 * Upload a file buffer to a Supabase Storage bucket.
 * Returns the storage key, public/signed URL, and metadata.
 */
export async function uploadFile(
  bucket: StorageBucket,
  originalName: string,
  fileBuffer: Buffer | Uint8Array,
  mimeType: string,
  folder?: string
): Promise<UploadResult> {
  const supabase = getSupabaseClient();

  // Build a collision-safe path: folder/timestamp-nanoid-filename
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = folder
    ? `${folder}/${Date.now()}-${nanoid(8)}-${safeName}`
    : `${Date.now()}-${nanoid(8)}-${safeName}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(key, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`[Supabase Storage] Upload failed: ${error.message}`);
  }

  const storagePath = data.path;

  // For public buckets, get a permanent public URL
  // For private buckets, generate a 1-hour signed URL
  let url: string;
  let signedUrl: string | undefined;

  if (bucket === "public-files") {
    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    url = publicData.publicUrl;
  } else {
    // Generate a 1-hour signed URL for immediate access
    const { data: signedData, error: signedError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, 3600);

    if (signedError || !signedData) {
      throw new Error(`[Supabase Storage] Failed to create signed URL: ${signedError?.message}`);
    }
    signedUrl = signedData.signedUrl;
    url = signedUrl;
  }

  return {
    key: storagePath,
    bucket,
    url,
    signedUrl,
    size: fileBuffer.byteLength,
    mimeType,
    originalName,
  };
}

/**
 * Generate a fresh signed URL for an existing file (valid for 1 hour by default).
 */
export async function getSignedUrl(
  bucket: StorageBucket,
  key: string,
  expiresInSeconds = 3600
): Promise<string> {
  const supabase = getSupabaseClient();

  if (bucket === "public-files") {
    const { data } = supabase.storage.from(bucket).getPublicUrl(key);
    return data.publicUrl;
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(key, expiresInSeconds);

  if (error || !data) {
    throw new Error(`[Supabase Storage] Failed to generate signed URL: ${error?.message}`);
  }

  return data.signedUrl;
}

/**
 * Delete a file from a Supabase Storage bucket.
 */
export async function deleteFile(bucket: StorageBucket, key: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.storage.from(bucket).remove([key]);
  if (error) {
    throw new Error(`[Supabase Storage] Delete failed: ${error.message}`);
  }
}

/**
 * List files in a bucket folder.
 */
export async function listFiles(bucket: StorageBucket, folder?: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage.from(bucket).list(folder ?? "", {
    limit: 100,
    sortBy: { column: "created_at", order: "desc" },
  });

  if (error) {
    throw new Error(`[Supabase Storage] List failed: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Determine the correct bucket for a given document type.
 */
export function getBucketForDocumentType(documentType: string): StorageBucket {
  const photoTypes = ["inspection_photo", "site_photo", "evidence_photo"];
  const publicTypes = ["public_notice", "bid_publication", "press_release"];

  if (photoTypes.includes(documentType)) return "inspection-photos";
  if (publicTypes.includes(documentType)) return "public-files";
  return "project-docs";
}
