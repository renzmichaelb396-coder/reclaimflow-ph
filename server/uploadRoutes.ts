/**
 * File Upload Routes
 * Handles multipart file uploads to Supabase Storage.
 * All routes require authentication via session cookie.
 */
import { Router } from "express";
import multer from "multer";
import { uploadFile, getSignedUrl, getBucketForDocumentType, type StorageBucket } from "./supabaseStorage";
import { sdk } from "./_core/sdk";

const router = Router();

// Use memory storage — files are passed directly to Supabase Storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 52 * 1024 * 1024, // 52MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  },
});

// Auth middleware for upload routes
async function requireAuth(req: any, res: any, next: any) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

/**
 * POST /api/upload/document
 * Upload a project document to the project-docs bucket.
 *
 * Form fields:
 *   - file: the file (required)
 *   - documentType: string (optional, used to determine bucket)
 *   - projectId: string (optional, used as folder prefix)
 */
router.post("/document", requireAuth, upload.single("file"), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const documentType = req.body.documentType || "project_document";
    const projectId = req.body.projectId || "general";
    const bucket = getBucketForDocumentType(documentType);
    const folder = `project-${projectId}`;

    const result = await uploadFile(
      bucket,
      req.file.originalname,
      req.file.buffer,
      req.file.mimetype,
      folder
    );

    return res.json({
      success: true,
      key: result.key,
      bucket: result.bucket,
      url: result.url,
      signedUrl: result.signedUrl,
      size: result.size,
      mimeType: result.mimeType,
      originalName: result.originalName,
    });
  } catch (err: any) {
    console.error("[Upload] Document upload failed:", err);
    return res.status(500).json({ error: err.message || "Upload failed" });
  }
});

/**
 * POST /api/upload/photo
 * Upload an inspection photo to the inspection-photos bucket.
 */
router.post("/photo", requireAuth, upload.single("file"), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const projectId = req.body.projectId || "general";
    const inspectionId = req.body.inspectionId || "misc";
    const folder = `project-${projectId}/inspection-${inspectionId}`;

    const result = await uploadFile(
      "inspection-photos",
      req.file.originalname,
      req.file.buffer,
      req.file.mimetype,
      folder
    );

    return res.json({
      success: true,
      key: result.key,
      bucket: result.bucket,
      url: result.url,
      signedUrl: result.signedUrl,
      size: result.size,
      mimeType: result.mimeType,
      originalName: result.originalName,
    });
  } catch (err: any) {
    console.error("[Upload] Photo upload failed:", err);
    return res.status(500).json({ error: err.message || "Upload failed" });
  }
});

/**
 * GET /api/upload/signed-url?bucket=project-docs&key=path/to/file.pdf
 * Generate a fresh signed URL for an existing file (1 hour validity).
 */
router.get("/signed-url", requireAuth, async (req: any, res: any) => {
  try {
    const { bucket, key } = req.query;

    if (!bucket || !key) {
      return res.status(400).json({ error: "bucket and key are required" });
    }

    const validBuckets: StorageBucket[] = ["project-docs", "inspection-photos", "public-files"];
    if (!validBuckets.includes(bucket as StorageBucket)) {
      return res.status(400).json({ error: "Invalid bucket" });
    }

    const signedUrl = await getSignedUrl(bucket as StorageBucket, key as string, 3600);
    return res.json({ signedUrl });
  } catch (err: any) {
    console.error("[Upload] Signed URL generation failed:", err);
    return res.status(500).json({ error: err.message || "Failed to generate signed URL" });
  }
});

export function registerUploadRoutes(app: any) {
  app.use("/api/upload", router);
  console.log("[Upload] Supabase Storage upload routes registered at /api/upload");
}
