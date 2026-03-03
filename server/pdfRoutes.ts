/**
 * PDF Generation Routes
 * Server-side PDF generation for Board Resolutions.
 * All routes require authentication via session cookie.
 * RBAC: board_member, secretariat, admin only.
 */
import { Router } from "express";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const PdfPrinter = require("pdfmake/build/pdfmake");
const pdfFonts = require("pdfmake/build/vfs_fonts");
import { sdk } from "./_core/sdk";
import { getDb } from "./db";

const router = Router();

// Auth + RBAC middleware
async function requireBoardAccess(req: any, res: any, next: any) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const allowedRoles = ["admin", "board_member", "secretariat"];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: "Forbidden: board access required" });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

// pdfmake font definitions (using built-in Roboto via vfs_fonts)
const fonts = {
  Roboto: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
};

/**
 * GET /api/pdf/resolution/:resolutionId
 * Generate and download a Board Resolution PDF.
 * RBAC: board_member, secretariat, admin
 * Audit logged on every export.
 */
router.get("/resolution/:resolutionId", requireBoardAccess, async (req: any, res: any) => {
  try {
    const resolutionId = parseInt(req.params.resolutionId, 10);
    if (isNaN(resolutionId)) {
      return res.status(400).json({ error: "Invalid resolution ID" });
    }

    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database unavailable" });

    const {
      resolutions,
      boardMeetings,
      boardDecisions,
      projects,
      users,
      auditLogs,
    } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");

    // Fetch resolution
    const [resolution] = await db
      .select()
      .from(resolutions)
      .where(eq(resolutions.id, resolutionId))
      .limit(1);

    if (!resolution) {
      return res.status(404).json({ error: "Resolution not found" });
    }

    // Fetch related meeting
    const [meeting] = await db
      .select()
      .from(boardMeetings)
      .where(eq(boardMeetings.id, resolution.boardMeetingId))
      .limit(1);

    // Fetch related project
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, resolution.projectId))
      .limit(1);

    // Fetch board decisions for this meeting + project (for vote tally)
    const decisions = await db
      .select()
      .from(boardDecisions)
      .where(eq(boardDecisions.boardMeetingId, resolution.boardMeetingId));

    // Fetch approver
    const [approver] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, resolution.approvedBy))
      .limit(1);

    // Vote tally from decisions
    const voteTally = {
      approved: decisions.filter((d) => d.decision === "approved" || d.decision === "approved_with_conditions").length,
      rejected: decisions.filter((d) => d.decision === "rejected").length,
      deferred: decisions.filter((d) => d.decision === "deferred" || d.decision === "returned_for_revision").length,
    };

    const meetingDate = meeting
      ? new Date(meeting.meetingDate).toLocaleDateString("en-PH", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "N/A";

    const exportDate = new Date().toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // ── Build PDF document definition ────────────────────────────────────────
    const docDefinition: any = {
      pageSize: "LETTER",
      pageMargins: [72, 72, 72, 72],
      defaultStyle: { font: "Roboto", fontSize: 11, lineHeight: 1.4 },
      content: [
        // PRA Header
        {
          columns: [
            {
              stack: [
                {
                  text: "PHILIPPINE RECLAMATION AUTHORITY",
                  style: "headerTitle",
                  alignment: "center",
                },
                {
                  text: "Board of Directors",
                  style: "headerSubtitle",
                  alignment: "center",
                },
                {
                  text: "Bonifacio Technology Center, 31st Street corner 2nd Avenue,\nBonifacio Global City, Taguig City 1634",
                  style: "headerAddress",
                  alignment: "center",
                },
              ],
            },
          ],
        },
        { canvas: [{ type: "line", x1: 0, y1: 5, x2: 468, y2: 5, lineWidth: 2, lineColor: "#1a3a6b" }] },
        { text: "\n" },

        // Resolution Title Block
        {
          text: "BOARD RESOLUTION",
          style: "resolutionTitle",
          alignment: "center",
        },
        {
          text: `No. ${resolution.resolutionNumber}`,
          style: "resolutionNumber",
          alignment: "center",
        },
        {
          text: `Series of ${new Date(resolution.approvedAt).getFullYear()}`,
          style: "resolutionSeries",
          alignment: "center",
        },
        { text: "\n" },

        // Subject
        {
          text: `SUBJECT: ${resolution.title.toUpperCase()}`,
          style: "subject",
          alignment: "center",
        },
        { text: "\n" },

        // Meeting Info Table
        {
          style: "infoTable",
          table: {
            widths: ["35%", "65%"],
            body: [
              [
                { text: "Board Meeting No.:", style: "tableLabel" },
                { text: meeting?.meetingNumber || "N/A", style: "tableValue" },
              ],
              [
                { text: "Date of Meeting:", style: "tableLabel" },
                { text: meetingDate, style: "tableValue" },
              ],
              [
                { text: "Location:", style: "tableLabel" },
                { text: meeting?.location || "PRA Board Room", style: "tableValue" },
              ],
              [
                { text: "Project:", style: "tableLabel" },
                {
                  text: project
                    ? `${project.projectName} (${project.projectCode})`
                    : "N/A",
                  style: "tableValue",
                },
              ],
              [
                { text: "Status:", style: "tableLabel" },
                {
                  text: resolution.status.toUpperCase(),
                  style: "tableValue",
                  color: resolution.status === "approved" || resolution.status === "signed" ? "#16a34a" : "#1a3a6b",
                },
              ],
            ],
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0,
            hLineColor: () => "#d1d5db",
            paddingLeft: () => 4,
            paddingRight: () => 4,
            paddingTop: () => 4,
            paddingBottom: () => 4,
          },
        },
        { text: "\n" },

        // Resolution Content
        { text: "RESOLUTION TEXT", style: "sectionHeader" },
        { canvas: [{ type: "line", x1: 0, y1: 2, x2: 468, y2: 2, lineWidth: 0.5, lineColor: "#9ca3af" }] },
        { text: "\n" },
        { text: resolution.content, style: "bodyText" },
        { text: "\n" },

        // Vote Tally
        { text: "VOTE TALLY", style: "sectionHeader" },
        { canvas: [{ type: "line", x1: 0, y1: 2, x2: 468, y2: 2, lineWidth: 0.5, lineColor: "#9ca3af" }] },
        { text: "\n" },
        {
          table: {
            widths: ["*", "*", "*"],
            body: [
              [
                { text: "IN FAVOR", style: "voteLabelHeader", alignment: "center" },
                { text: "AGAINST", style: "voteLabelHeader", alignment: "center" },
                { text: "ABSTAIN / DEFERRED", style: "voteLabelHeader", alignment: "center" },
              ],
              [
                { text: String(voteTally.approved), style: "voteCount", alignment: "center", color: "#16a34a" },
                { text: String(voteTally.rejected), style: "voteCount", alignment: "center", color: "#dc2626" },
                { text: String(voteTally.deferred), style: "voteCount", alignment: "center", color: "#d97706" },
              ],
            ],
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => "#d1d5db",
            vLineColor: () => "#d1d5db",
            paddingLeft: () => 8,
            paddingRight: () => 8,
            paddingTop: () => 6,
            paddingBottom: () => 6,
          },
        },
        { text: "\n\n" },

        // Signatory Block
        { text: "CERTIFIED CORRECT:", style: "sectionHeader" },
        { canvas: [{ type: "line", x1: 0, y1: 2, x2: 468, y2: 2, lineWidth: 0.5, lineColor: "#9ca3af" }] },
        { text: "\n\n\n" },
        {
          columns: [
            {
              stack: [
                { canvas: [{ type: "line", x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 0.5, lineColor: "#374151" }] },
                { text: approver?.name || "Board Secretary", style: "signatoryName", alignment: "center" },
                { text: "Board Secretary / Corporate Secretary", style: "signatoryTitle", alignment: "center" },
              ],
              width: "50%",
            },
            { width: "50%", text: "" },
          ],
        },
        { text: "\n\n\n" },
        {
          columns: [
            {
              stack: [
                { canvas: [{ type: "line", x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 0.5, lineColor: "#374151" }] },
                { text: "Chairperson, Board of Directors", style: "signatoryName", alignment: "center" },
                { text: "Philippine Reclamation Authority", style: "signatoryTitle", alignment: "center" },
              ],
              width: "50%",
            },
            {
              stack: [
                { canvas: [{ type: "line", x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 0.5, lineColor: "#374151" }] },
                { text: "General Manager", style: "signatoryName", alignment: "center" },
                { text: "Philippine Reclamation Authority", style: "signatoryTitle", alignment: "center" },
              ],
              width: "50%",
            },
          ],
        },

        // Footer
        { text: "\n\n" },
        { canvas: [{ type: "line", x1: 0, y1: 0, x2: 468, y2: 0, lineWidth: 0.5, lineColor: "#9ca3af" }] },
        {
          columns: [
            { text: `Resolution No. ${resolution.resolutionNumber}`, style: "footerText" },
            { text: `Generated: ${exportDate}`, style: "footerText", alignment: "right" },
          ],
          margin: [0, 4, 0, 0],
        },
        {
          text: "This document is system-generated by ReclaimFlow PH. Verify authenticity with the PRA Board Secretariat.",
          style: "footerDisclaimer",
          alignment: "center",
        },
      ],
      styles: {
        headerTitle: { fontSize: 14, bold: true, color: "#1a3a6b" },
        headerSubtitle: { fontSize: 11, bold: true, color: "#1a3a6b" },
        headerAddress: { fontSize: 9, color: "#6b7280" },
        resolutionTitle: { fontSize: 16, bold: true, color: "#1a3a6b", margin: [0, 8, 0, 4] },
        resolutionNumber: { fontSize: 14, bold: true, color: "#1a3a6b" },
        resolutionSeries: { fontSize: 11, color: "#6b7280", margin: [0, 2, 0, 0] },
        subject: { fontSize: 11, bold: true, color: "#111827" },
        infoTable: { margin: [0, 0, 0, 0] },
        tableLabel: { bold: true, fontSize: 10, color: "#374151" },
        tableValue: { fontSize: 10, color: "#111827" },
        sectionHeader: { fontSize: 11, bold: true, color: "#1a3a6b", margin: [0, 4, 0, 2] },
        bodyText: { fontSize: 11, color: "#111827", lineHeight: 1.6 },
        voteLabelHeader: { bold: true, fontSize: 10, color: "#374151" },
        voteCount: { fontSize: 18, bold: true },
        signatoryName: { bold: true, fontSize: 10, color: "#111827", margin: [0, 4, 0, 0] },
        signatoryTitle: { fontSize: 9, color: "#6b7280" },
        footerText: { fontSize: 8, color: "#9ca3af" },
        footerDisclaimer: { fontSize: 8, color: "#9ca3af", italics: true, margin: [0, 2, 0, 0] },
      },
    };

    // Generate PDF buffer using pdfmake browser build (getBuffer callback)
    PdfPrinter.vfs = pdfFonts.vfs;
    const pdfDoc = PdfPrinter.createPdf(docDefinition);
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      pdfDoc.getBuffer((buffer: Uint8Array) => {
        resolve(Buffer.from(buffer));
      }, (err: Error) => reject(err));
    });

    // ── Write audit log ───────────────────────────────────────────────────────
    await db.insert(auditLogs).values({
      userId: req.user.id,
      entityType: "resolution",
      entityId: resolutionId,
      action: "other",
      changeDescription: `Board Resolution PDF exported: No. ${resolution.resolutionNumber} by user ${req.user.id} (${req.user.name || req.user.email})`,
      ipAddress: req.ip || "unknown",
      userAgent: req.headers["user-agent"] || "unknown",
    } as any);

    // ── Send PDF ──────────────────────────────────────────────────────────────
    const filename = `PRA-Resolution-${resolution.resolutionNumber.replace(/[^a-zA-Z0-9-]/g, "_")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error("[PDF] Resolution generation failed:", err);
    return res.status(500).json({ error: err.message || "PDF generation failed" });
  }
});

export function registerPdfRoutes(app: any) {
  app.use("/api/pdf", router);
  console.log("[PDF] Board Resolution PDF routes registered at /api/pdf");
}
