import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getProjectById,
  getProjectsByProponent,
  getProjectsByStage,
  getAllProjects,
  getDocumentsByProject,
  getComplianceChecklistByProject,
  getAgencyRequestsByProject,
  getTasksByProject,
  getSLATimersByProject,
  getEvaluationsByProject,
  getCSWPackageByProject,
  getRiskRegisterByProject,
  getBoardDecisionsByProject,
  getResolutionsByProject,
  getBiddingEventsByProject,
  getAgreementsByProject,
  getInspectionsByProject,
  getNonComplianceFindingsByProject,
  getNotificationsByUser,
  getAuditLogsByEntity,
  getAuditLogsByUser,
  getUserByOpenId,
} from "./db";
import { z } from "zod";
import { getDb } from "./db";
import { eq } from "drizzle-orm";
import { projects, loiSubmissions, auditLogs } from "../drizzle/schema";

// ============================================================================
// RBAC PROCEDURES
// ============================================================================

/**
 * Admin-only procedure - requires admin role
 */
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
  return next({ ctx });
});

/**
 * Evaluator procedure - requires evaluator or admin role
 */
const evaluatorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "evaluator" && ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Evaluator access required",
    });
  }
  return next({ ctx });
});

/**
 * Secretariat procedure - requires secretariat or admin role
 */
const secretariatProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "secretariat" && ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Secretariat access required",
    });
  }
  return next({ ctx });
});

/**
 * Board member procedure - requires board_member or admin role
 */
const boardMemberProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "board_member" && ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Board member access required",
    });
  }
  return next({ ctx });
});

/**
 * Proponent procedure - requires proponent or admin role
 */
const proponentProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "proponent" && ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Proponent access required",
    });
  }
  return next({ ctx });
});

/**
 * Agency reviewer procedure - requires agency_reviewer or admin role
 */
const agencyReviewerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "agency_reviewer" && ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Agency reviewer access required",
    });
  }
  return next({ ctx });
});

/**
 * Enforcement officer procedure - requires enforcement_officer or admin role
 */
const enforcementOfficerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (
    ctx.user.role !== "enforcement_officer" &&
    ctx.user.role !== "admin"
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Enforcement officer access required",
    });
  }
  return next({ ctx });
});

// ============================================================================
// PROJECT ROUTER
// ============================================================================

const projectRouter = router({
  /**
   * Get all projects (admin/evaluator only, with pagination)
   */
  list: evaluatorProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      return await getAllProjects(input.limit, input.offset);
    }),

  /**
   * Get project by ID with full details
   */
  getById: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const project = await getProjectById(input.projectId);
      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }
      return project;
    }),

  /**
   * Get projects by proponent (for proponent users)
   */
  getByProponent: proponentProcedure
    .input(z.object({ proponentId: z.number() }))
    .query(async ({ input, ctx }) => {
      // Proponents can only view their own projects
      if (ctx.user.role === "proponent" && ctx.user.id !== input.proponentId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot view other proponent's projects",
        });
      }
      return await getProjectsByProponent(input.proponentId);
    }),

  /**
   * Get projects by stage (evaluator/admin only)
   */
  getByStage: evaluatorProcedure
    .input(
      z.object({
        stage: z.string(),
      })
    )
    .query(async ({ input }) => {
      return await getProjectsByStage(input.stage);
    }),

  /**
   * Get project dashboard overview
   */
  getDashboard: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const project = await getProjectById(input.projectId);
      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      const [documents, checklist, tasks, slaTimers, evaluations] =
        await Promise.all([
          getDocumentsByProject(input.projectId),
          getComplianceChecklistByProject(input.projectId),
          getTasksByProject(input.projectId),
          getSLATimersByProject(input.projectId),
          getEvaluationsByProject(input.projectId),
        ]);

      return {
        project,
        documents,
        checklist,
        tasks,
        slaTimers,
        evaluations,
      };
    }),

  /**
   * Create project intake (LOI submission)
   */
  createIntake: proponentProcedure
    .input(
      z.object({
        projectName: z.string(),
        description: z.string(),
        location: z.string(),
        estimatedCost: z.number(),
        proponentName: z.string(),
        proponentEmail: z.string(),
        contactPerson: z.string().optional(),
        contactPhone: z.string().optional(),
        documentCount: z.number().default(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Create project
      const projectCode = `PRJ-${Date.now()}`;
      const result = await db.insert(projects).values({
        projectCode,
        projectName: input.projectName,
        description: input.description,
        proponentId: ctx.user.id,
        proponentType: "developer",
        location: input.location,
        estimatedCost: input.estimatedCost.toString(),
        currentStage: "intake",
        status: "submitted",
      });

      const projectId = result[0].insertId;

      // Create intake record
      await db.insert(loiSubmissions).values({
        projectId: projectId as number,
        submittedBy: ctx.user.id,
        status: "submitted",
        submittedAt: new Date(),
      });

      // Audit log
      await db.insert(auditLogs).values({
        userId: ctx.user.id,
        entityType: "project",
        entityId: projectId as number,
        action: "submit",
        changeDescription: `LOI submitted by ${input.proponentName}`,
      });

      return { projectId };
    }),

  getPreQualChecklist: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const { preQualChecklist } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      return await db.select().from(preQualChecklist).where(eq(preQualChecklist.projectId, input.projectId));
    }),

  addPreQualItem: evaluatorProcedure
    .input(z.object({ projectId: z.number(), itemName: z.string(), isRequired: z.boolean().default(true), notes: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { preQualChecklist } = await import("../drizzle/schema");
      const result = await db.insert(preQualChecklist).values({ projectId: input.projectId, itemName: input.itemName, isRequired: input.isRequired, notes: input.notes || null });
      return { success: true, id: result[0].insertId };
    }),

  verifyPreQualItem: evaluatorProcedure
    .input(z.object({ itemId: z.number(), isCompliant: z.boolean(), notes: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { preQualChecklist } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(preQualChecklist).set({ isCompliant: input.isCompliant, verifiedBy: ctx.user.id, verifiedAt: new Date(), notes: input.notes || null }).where(eq(preQualChecklist.id, input.itemId));
      return { success: true };
    }),

  generateDeficiencyNotice: evaluatorProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { deficiencyNotices } = await import("../drizzle/schema");
      const noticeNumber = `DEF-${Date.now()}`;
      const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 15);
      const result = await db.insert(deficiencyNotices).values({ projectId: input.projectId, noticeNumber, issuedBy: ctx.user.id, issuedAt: new Date(), dueDate, status: "issued" as any });
      await db.insert(auditLogs).values({ userId: ctx.user.id, entityType: "project", entityId: input.projectId, action: "other", changeDescription: `Deficiency notice ${noticeNumber} issued` });
      return { success: true, noticeNumber };
    }),

  advanceStage: evaluatorProcedure
    .input(z.object({ projectId: z.number(), targetStage: z.string(), notes: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      // Use the workflow engine for validated, audited stage transitions
      const { transitionProjectStage } = await import("./workflow");
      await transitionProjectStage(
        input.projectId,
        input.targetStage as any,
        ctx.user.id,
        ctx.user.role,
        input.notes
      );
      return { success: true };
    }),
  getValidTransitions: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { currentStage: null, validNext: [], slaInfo: [] };
      const { eq } = await import("drizzle-orm");
      const [project] = await db.select({ currentStage: projects.currentStage }).from(projects).where(eq(projects.id, input.projectId)).limit(1);
      if (!project) return { currentStage: null, validNext: [], slaInfo: [] };
      const { getValidNextStages, getStageSlaInfo } = await import("./workflow");
      const validNext = getValidNextStages(project.currentStage as any);
      const slaInfo = validNext.map(s => ({ stage: s, ...getStageSlaInfo(s as any) }));
      return { currentStage: project.currentStage, validNext, slaInfo };
    }),

  getMOUs: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const { mous } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      return await db.select().from(mous).where(eq(mous.projectId, input.projectId));
    }),

  createMOU: secretariatProcedure
    .input(z.object({ projectId: z.number(), mouNumber: z.string(), startDate: z.date(), endDate: z.date(), documentUrl: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { mous } = await import("../drizzle/schema");
      const result = await db.insert(mous).values({ projectId: input.projectId, mouNumber: input.mouNumber, startDate: input.startDate, endDate: input.endDate, documentUrl: input.documentUrl || null, status: "draft" as any });
      await db.insert(auditLogs).values({ userId: ctx.user.id, entityType: "mou", entityId: result[0].insertId as number, action: "create", changeDescription: `MOU ${input.mouNumber} created` });
      return { success: true, id: result[0].insertId };
    }),

  updateMOUStatus: secretariatProcedure
    .input(z.object({ mouId: z.number(), status: z.enum(["draft", "executed", "active", "extended", "expired", "terminated"]) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { mous } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(mous).set({ status: input.status as any, ...(input.status === "executed" ? { executedAt: new Date(), executedBy: ctx.user.id } : {}) }).where(eq(mous.id, input.mouId));
      return { success: true };
    }),

  getSLATimers: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await getSLATimersByProject(input.projectId);
    }),

  updateStatus: evaluatorProcedure
    .input(z.object({ projectId: z.number(), status: z.enum(["draft", "submitted", "in_progress", "complete", "deficient", "approved", "rejected", "on_hold"]) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { eq } = await import("drizzle-orm");
      await db.update(projects).set({ status: input.status as any }).where(eq(projects.id, input.projectId));
      await db.insert(auditLogs).values({ userId: ctx.user.id, entityType: "project", entityId: input.projectId, action: "update", changeDescription: `Status updated to ${input.status}` });
      return { success: true };
    }),
});

// ============================================================================
// DOCUMENT ROUTER
// ============================================================================

const documentRouter = router({
  getByProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await getDocumentsByProject(input.projectId);
    }),

  getChecklist: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await getComplianceChecklistByProject(input.projectId);
    }),

  getVersions: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .query(async ({ input }) => {
      const { getDocumentVersions } = await import("./db");
      return await getDocumentVersions(input.documentId);
    }),

  upload: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      documentTypeId: z.number(),
      documentName: z.string(),
      fileUrl: z.string(),
      fileKey: z.string(),
      fileMimeType: z.string().optional(),
      fileSize: z.number().optional(),
      issuedBy: z.string().optional(),
      issuedDate: z.date().optional(),
      validityStartDate: z.date().optional(),
      validityEndDate: z.date().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { documents } = await import("../drizzle/schema");
      const result = await db.insert(documents).values({
        projectId: input.projectId,
        documentTypeId: input.documentTypeId,
        documentName: input.documentName,
        fileUrl: input.fileUrl,
        fileKey: input.fileKey,
        fileMimeType: input.fileMimeType || null,
        fileSize: input.fileSize || null,
        issuedBy: input.issuedBy || null,
        issuedDate: input.issuedDate || null,
        validityStartDate: input.validityStartDate || null,
        validityEndDate: input.validityEndDate || null,
        uploadedBy: ctx.user.id,
        status: "pending_verification" as any,
      });
      await db.insert(auditLogs).values({ userId: ctx.user.id, entityType: "document", entityId: result[0].insertId as number, action: "create", changeDescription: `Document uploaded: ${input.documentName}` });
      return { success: true, id: result[0].insertId };
    }),

  verify: evaluatorProcedure
    .input(z.object({ documentId: z.number(), status: z.enum(["verified", "rejected"]), notes: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { documents } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(documents).set({ status: input.status as any }).where(eq(documents.id, input.documentId));
      return { success: true };
    }),

  getDocumentTypes: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const { documentTypes } = await import("../drizzle/schema");
    return await db.select().from(documentTypes);
  }),

  updateChecklistItem: evaluatorProcedure
    .input(z.object({ itemId: z.number(), isVerified: z.boolean(), notes: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { complianceChecklist } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(complianceChecklist).set({
        isVerified: input.isVerified,
        verifiedBy: ctx.user.id,
        verifiedAt: new Date(),
        notes: input.notes || null,
      }).where(eq(complianceChecklist.id, input.itemId));
      return { success: true };
    }),
});

// ============================================================================
// AGENCY COORDINATION ROUTER
// ============================================================================

const agencyRouter = router({
  getRequests: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await getAgencyRequestsByProject(input.projectId);
    }),

  updateRequest: evaluatorProcedure
    .input(z.object({
      requestId: z.number(),
      status: z.enum(["pending", "sent", "acknowledged", "in_review", "responded", "resolved", "overdue"]),
      responseNotes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { agencyRequests } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const updateData: Record<string, unknown> = { status: input.status as any };
      if (input.responseNotes) updateData.responseNotes = input.responseNotes;
      if (input.status === "responded") updateData.responseReceivedAt = new Date();
      await db.update(agencyRequests).set(updateData as any).where(eq(agencyRequests.id, input.requestId));
      return { success: true };
    }),

  submitRequest: evaluatorProcedure
    .input(
      z.object({
        projectId: z.number(),
        agencyName: z.string(),
        requestType: z.string(),
        details: z.string(),
        dueDate: z.date(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { agencyRequests } = await import("../drizzle/schema");
      const result = await db.insert(agencyRequests).values({
        projectId: input.projectId,
        agencyName: input.agencyName,
        requestType: input.requestType as any,
        requestedBy: ctx.user.id,
        requestedAt: new Date(),
        dueDate: input.dueDate,
        details: input.details || null,
        status: "pending" as any,
      });

      return { success: true, id: result[0].insertId };
    }),
});

// ============================================================================
// TASK ROUTER
// ============================================================================

const taskRouter = router({
  /**
   * Get tasks by project
   */
  getByProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await getTasksByProject(input.projectId);
    }),

  /**
   * Get tasks assigned to current user
   */
  getAssignedToMe: protectedProcedure.query(async ({ ctx }) => {
    const { getTasksAssignedToUser } = await import("./db");
    return await getTasksAssignedToUser(ctx.user.id);
  }),

  /**
   * Create task (evaluator/admin only)
   */
  create: evaluatorProcedure
    .input(
      z.object({
        projectId: z.number(),
        title: z.string(),
        description: z.string().optional(),
        taskType: z.string(),
        priority: z.enum(["low", "medium", "high", "critical"]),
        dueDate: z.date().optional(),
        assignedTo: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { tasks } = await import("../drizzle/schema");
      const result = await db.insert(tasks).values({
        projectId: input.projectId,
        title: input.title,
        description: input.description || null,
        taskType: input.taskType as any,
        priority: input.priority as any,
        dueDate: input.dueDate || null,
        assignedTo: input.assignedTo || null,
        status: "pending" as any,
      });

      return { success: true, id: result[0].insertId };
    }),
});

// ============================================================================
// EVALUATION ROUTER
// ============================================================================

const evaluationRouter = router({
  /**
   * Get evaluations by project
   */
  getByProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await getEvaluationsByProject(input.projectId);
    }),

  /**
   * Get CSW package for project
   */
  getCSWPackage: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await getCSWPackageByProject(input.projectId);
    }),

  /**
   * Get risk register for project
   */
  getRiskRegister: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await getRiskRegisterByProject(input.projectId);
    }),

  /**
   * Create evaluation (evaluator/admin only)
   */
  create: evaluatorProcedure
    .input(
      z.object({
        projectId: z.number(),
        evaluationType: z.string(),
        score: z.number().optional(),
        maxScore: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { evaluations } = await import("../drizzle/schema");
      const result = await db.insert(evaluations).values({
        projectId: input.projectId,
        evaluationType: input.evaluationType as any,
        evaluatedBy: ctx.user.id,
        evaluatedAt: new Date(),
        score: input.score ? (input.score as any) : null,
        maxScore: input.maxScore ? (input.maxScore as any) : null,
        notes: input.notes || null,
        status: "draft",
      });
      await db.insert(auditLogs).values({ userId: ctx.user.id, entityType: "evaluation", entityId: result[0].insertId as number, action: "create", changeDescription: `Evaluation created for project ${input.projectId}` } as any);

      return { success: true, id: result[0].insertId };
    }),

  addScore: evaluatorProcedure
    .input(z.object({ projectId: z.number(), category: z.string(), score: z.number(), maxScore: z.number().default(100), notes: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { evaluations } = await import("../drizzle/schema");
      const result = await db.insert(evaluations).values({ projectId: input.projectId, evaluationType: "technical" as any, evaluatedBy: ctx.user.id, evaluatedAt: new Date(), score: input.score as any, maxScore: input.maxScore as any, notes: input.notes || null, status: "draft" });
      return { success: true, id: result[0].insertId };
    }),

  getRisks: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const { riskRegister } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      return await db.select().from(riskRegister).where(eq(riskRegister.projectId, input.projectId));
    }),

  addRisk: evaluatorProcedure
    .input(z.object({ projectId: z.number(), riskTitle: z.string(), riskLevel: z.enum(["low", "medium", "high", "critical"]), description: z.string().optional(), mitigationPlan: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { riskRegister } = await import("../drizzle/schema");
      const result = await db.insert(riskRegister).values({ projectId: input.projectId, riskCategory: "financial" as any, riskDescription: input.riskTitle + (input.description ? ": " + input.description : ""), likelihood: input.riskLevel as any, impact: input.riskLevel as any, mitigationStrategy: input.mitigationPlan || null, status: "identified" });
      return { success: true, id: result[0].insertId };
    }),

  updateRiskStatus: evaluatorProcedure
    .input(z.object({ riskId: z.number(), status: z.enum(["identified", "mitigated", "monitored", "escalated", "resolved"]) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { riskRegister } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(riskRegister).set({ status: input.status }).where(eq(riskRegister.id, input.riskId));
      return { success: true };
    }),
});

// ============================================================================
// BOARD ROUTER
// ============================================================================

const boardRouter = router({
  getDecisions: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await getBoardDecisionsByProject(input.projectId);
    }),

  getResolutions: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await getResolutionsByProject(input.projectId);
    }),

  getMeetings: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const { boardMeetings } = await import("../drizzle/schema");
    const { desc } = await import("drizzle-orm");
    return await db.select().from(boardMeetings).orderBy(desc(boardMeetings.meetingDate)).limit(50);
  }),

  createMeeting: secretariatProcedure
    .input(z.object({
      meetingNumber: z.string(),
      meetingDate: z.date(),
      location: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { boardMeetings } = await import("../drizzle/schema");
      const result = await db.insert(boardMeetings).values({
        meetingNumber: input.meetingNumber,
        meetingDate: input.meetingDate,
        location: input.location || null,
        status: "scheduled" as any,
      });
      return { success: true, id: result[0].insertId };
    }),

  /**
   * Record board decision (board member/admin only)
   */
  createResolution: secretariatProcedure
    .input(z.object({
      projectId: z.number(),
      boardMeetingId: z.number(),
      resolutionNumber: z.string(),
      title: z.string(),
      content: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { resolutions } = await import("../drizzle/schema");
      const result = await db.insert(resolutions).values({
        projectId: input.projectId,
        boardMeetingId: input.boardMeetingId,
        resolutionNumber: input.resolutionNumber,
        title: input.title,
        content: input.content,
        approvedBy: ctx.user.id,
        approvedAt: new Date(),
        status: "drafted" as any,
      });
      await db.insert(auditLogs).values({ userId: ctx.user.id, entityType: "resolution", entityId: result[0].insertId as number, action: "create", changeDescription: `Resolution ${input.resolutionNumber} created for project ${input.projectId}` } as any);
      return { success: true, id: result[0].insertId };
    }),
  recordDecision: boardMemberProcedure
    .input(
      z.object({
        projectId: z.number(),
        boardMeetingId: z.number(),
        decision: z.enum([
          "approved",
          "approved_with_conditions",
          "deferred",
          "rejected",
          "returned_for_revision",
        ]),
        conditions: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { boardDecisions } = await import("../drizzle/schema");
      const result = await db.insert(boardDecisions).values({
        projectId: input.projectId,
        boardMeetingId: input.boardMeetingId,
        decision: input.decision as any,
        decisionDate: new Date(),
        conditions: input.conditions || null,
        recordedBy: ctx.user.id,
        recordedAt: new Date(),
        status: "recorded" as any,
      });
      await db.insert(auditLogs).values({ userId: ctx.user.id, entityType: "board_decision", entityId: result[0].insertId as number, action: "create", changeDescription: `Board decision: ${input.decision} for project ${input.projectId}` } as any);

      return { success: true, id: result[0].insertId };
    }),
});

// ============================================================================
// BIDDING ROUTER
// ============================================================================

const biddingRouter = router({
  getEvents: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await getBiddingEventsByProject(input.projectId);
    }),

  getBids: protectedProcedure
    .input(z.object({ biddingEventId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const { bids } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      return await db.select().from(bids).where(eq(bids.biddingEventId, input.biddingEventId));
    }),

  submitBid: proponentProcedure
    .input(z.object({
      biddingEventId: z.number(),
      bidderName: z.string(),
      bidAmount: z.number(),
      bidDocumentUrl: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { bids } = await import("../drizzle/schema");
      const result = await db.insert(bids).values({
        biddingEventId: input.biddingEventId,
        bidderName: input.bidderName,
        bidderId: ctx.user.id,
        bidAmount: input.bidAmount.toString() as any,
        bidDocumentUrl: input.bidDocumentUrl,
        submittedAt: new Date(),
        status: "submitted" as any,
      });
      await db.insert(auditLogs).values({ userId: ctx.user.id, entityType: "bid", entityId: result[0].insertId as number, action: "submit", changeDescription: `Bid submitted by ${input.bidderName} for event ${input.biddingEventId}` } as any);
      return { success: true, id: result[0].insertId };
    }),

  /**
   * Create bidding event (evaluator/admin only)
   */
  createEvent: evaluatorProcedure
    .input(
      z.object({
        projectId: z.number(),
        selectionMode: z.enum(["solicited", "unsolicited", "hybrid"]),
        publicationDate: z.date(),
        bidSubmissionDeadline: z.date(),
        bidOpeningDate: z.date(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { biddingEvents } = await import("../drizzle/schema");
      const biddingNumber = `BID-${Date.now()}`;
      const result = await db.insert(biddingEvents).values({
        projectId: input.projectId,
        biddingNumber,
        selectionMode: input.selectionMode as any,
        publicationDate: input.publicationDate,
        bidSubmissionDeadline: input.bidSubmissionDeadline,
        bidOpeningDate: input.bidOpeningDate,
        status: "published" as any,
      });

      return { success: true, id: result[0].insertId };
    }),
});

// ============================================================================
// AGREEMENT ROUTER
// ============================================================================

const agreementRouter = router({
  /**
   * Get agreements for project
   */
  getByProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await getAgreementsByProject(input.projectId);
    }),

  /**
   * Create agreement (secretariat/admin only)
   */
  create: secretariatProcedure
    .input(
      z.object({
        projectId: z.number(),
        agreementType: z.enum([
          "moa",
          "implementing_agreement",
          "concession",
          "lease",
          "other",
        ]),
        templateId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { agreements } = await import("../drizzle/schema");
      const agreementNumber = `AGR-${Date.now()}`;
      const result = await db.insert(agreements).values({
        projectId: input.projectId,
        agreementNumber,
        templateId: input.templateId || null,
        agreementType: input.agreementType as any,
        status: "draft" as any,
      });
      await db.insert(auditLogs).values({ userId: ctx.user.id, entityType: "agreement", entityId: result[0].insertId as number, action: "create", changeDescription: `Agreement ${agreementNumber} created for project ${input.projectId}` } as any);

      return { success: true, id: result[0].insertId };
    }),
});

// ============================================================================
// MONITORING ROUTER
// ============================================================================

const monitoringRouter = router({
  /**
   * Get inspections for project
   */
  getInspections: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await getInspectionsByProject(input.projectId);
    }),

  /**
   * Get non-compliance findings for project
   */
  getFindings: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return await getNonComplianceFindingsByProject(input.projectId);
    }),

  /**
   * Create inspection (evaluator/admin only)
   */
  createInspection: evaluatorProcedure
    .input(
      z.object({
        projectId: z.number(),
        inspectionType: z.enum([
          "routine",
          "compliance_check",
          "incident_response",
          "final_inspection",
          "other",
        ]),
        scheduledDate: z.date(),
        location: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { inspections } = await import("../drizzle/schema");
      const inspectionNumber = `INS-${Date.now()}`;
      const result = await db.insert(inspections).values({
        projectId: input.projectId,
        inspectionNumber,
        inspectionType: input.inspectionType as any,
        scheduledDate: input.scheduledDate,
        location: input.location || null,
        status: "scheduled" as any,
      });
      await db.insert(auditLogs).values({ userId: ctx.user.id, entityType: "inspection", entityId: result[0].insertId as number, action: "create", changeDescription: `Inspection ${inspectionNumber} scheduled for project ${input.projectId}` } as any);

      return { success: true, id: result[0].insertId };
    }),

  /**
   * Record non-compliance finding
   */
  recordFinding: evaluatorProcedure
    .input(
      z.object({
        projectId: z.number(),
        inspectionId: z.number().optional(),
        findingType: z.string(),
        severity: z.enum(["low", "medium", "high", "critical"]),
        description: z.string().min(1),
        location: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { nonComplianceFindings } = await import("../drizzle/schema");
      const findingNumber = `NCF-${Date.now()}`;
      const result = await db.insert(nonComplianceFindings).values({
        projectId: input.projectId,
        inspectionId: input.inspectionId || null,
        findingNumber,
        findingType: input.findingType,
        severity: input.severity,
        description: input.description,
        reportedBy: ctx.user.id,
        status: "reported" as any,
      });
      await db.insert(auditLogs).values({ userId: ctx.user.id, entityType: "finding", entityId: result[0].insertId as number, action: "create", changeDescription: `Non-compliance finding ${findingNumber} recorded for project ${input.projectId}: ${input.severity} severity` } as any);
      return { success: true, id: result[0].insertId };
    }),

  /**
   * Add corrective action to a finding
   */
  addCorrectiveAction: evaluatorProcedure
    .input(
      z.object({
        findingId: z.number(),
        description: z.string().min(1),
        dueDate: z.date(),
        responsibleParty: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { correctiveActions, nonComplianceFindings } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db.insert(correctiveActions).values({
        findingId: input.findingId,
        actionDescription: input.description,
        dueDate: input.dueDate,
        status: "assigned" as any,
      });
      await db
        .update(nonComplianceFindings)
        .set({ status: "under_correction" as any })
        .where(eq(nonComplianceFindings.id, input.findingId));
      return { success: true };
    }),
});

// ============================================================================
// NOTIFICATION ROUTER
// ============================================================================

const notificationRouter = router({
  /**
   * Get notifications for current user
   */
  getMyNotifications: protectedProcedure
    .input(z.object({ unreadOnly: z.boolean().default(false) }))
    .query(async ({ input, ctx }) => {
      return await getNotificationsByUser(ctx.user.id, input.unreadOnly);
    }),

  /**
   * Mark notification as read
   */
  markAsRead: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { notifications } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db
        .update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(eq(notifications.id, input.notificationId));

      return { success: true };
    }),
});

// ============================================================================
// AUDIT ROUTER
// ============================================================================

const auditRouter = router({
  /**
   * Get audit logs for entity
   */
  getEntityLogs: adminProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return await getAuditLogsByEntity(input.entityType, input.entityId);
    }),

  /**
   * Get audit logs for user
   */
  getUserLogs: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return await getAuditLogsByUser(input.userId);
    }),
});

// ============================================================================
// STATS / REPORTS ROUTER
// ============================================================================

const statsRouter = router({
  getDashboardStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { total: 0, byStage: [], byStatus: [], recentProjects: [] };
    const { projects, slaTimers } = await import("../drizzle/schema");
    const { sql, count } = await import("drizzle-orm");
    const total = await db.select({ count: count() }).from(projects);
    const byStage = await db.select({ stage: projects.currentStage, count: count() }).from(projects).groupBy(projects.currentStage);
    const byStatus = await db.select({ status: projects.status, count: count() }).from(projects).groupBy(projects.status);
    const recentProjects = await db.select().from(projects).orderBy(sql`${projects.id} DESC`).limit(5);
    const overdueTimers = await db.select({ count: count() }).from(slaTimers).where(sql`${slaTimers.isOverdue} = 1`);
    return { total: total[0]?.count ?? 0, byStage, byStatus, recentProjects, overdueTimers: overdueTimers[0]?.count ?? 0 };
  }),

  getProjectStats: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const { documents, tasks, agencyRequests, evaluations } = await import("../drizzle/schema");
      const { eq, count } = await import("drizzle-orm");
      const [docCount, taskCount, agencyCount, evalCount] = await Promise.all([
        db.select({ count: count() }).from(documents).where(eq(documents.projectId, input.projectId)),
        db.select({ count: count() }).from(tasks).where(eq(tasks.projectId, input.projectId)),
        db.select({ count: count() }).from(agencyRequests).where(eq(agencyRequests.projectId, input.projectId)),
        db.select({ count: count() }).from(evaluations).where(eq(evaluations.projectId, input.projectId)),
      ]);
      return { documents: docCount[0]?.count ?? 0, tasks: taskCount[0]?.count ?? 0, agencyRequests: agencyCount[0]?.count ?? 0, evaluations: evalCount[0]?.count ?? 0 };
    }),
});

// ============================================================================
// ADMIN ROUTER
// ============================================================================

const adminRouter = router({
  getUsers: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const { users } = await import("../drizzle/schema");
    return await db.select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn }).from(users).limit(200);
  }),

  updateUserRole: adminProcedure
    .input(z.object({ userId: z.number(), role: z.enum(["admin", "evaluator", "secretariat", "board_member", "proponent", "public", "agency_reviewer", "enforcement_officer"]) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { users } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(users).set({ role: input.role as any }).where(eq(users.id, input.userId));
      await db.insert(auditLogs).values({ entityType: "user", entityId: input.userId, action: "update", changeDescription: `User role updated to ${input.role}` } as any);
      return { success: true };
    }),

  getSLAConfigs: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const { slaConfigurations } = await import("../drizzle/schema");
    return await db.select().from(slaConfigurations);
  }),

  upsertSLAConfig: adminProcedure
    .input(z.object({ stageName: z.string(), defaultDays: z.number(), escalationDays: z.number().optional(), description: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { slaConfigurations } = await import("../drizzle/schema");
      await db.insert(slaConfigurations).values({
        stageName: input.stageName,
        defaultDays: input.defaultDays,
        escalationDays: input.escalationDays || null,
        description: input.description || null,
        isActive: true,
      }).onDuplicateKeyUpdate({ set: { defaultDays: input.defaultDays, escalationDays: input.escalationDays || null, description: input.description || null } });
      return { success: true };
    }),
  checkSla: adminProcedure.mutation(async () => {
    // Delegates to the same cron tick function used by the automatic scheduler
    const { runSlaCronTick } = await import("./slaCron");
    const stats = await runSlaCronTick();
    return {
      overdue: stats.overdueProcessed,
      warnings: stats.warningProcessed,
      auditLogsWritten: stats.auditLogsWritten,
      notificationsCreated: stats.notificationsCreated,
    };
  }),
  getActiveSlaTimers: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const { slaTimers, projects } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    return await db
      .select({ id: slaTimers.id, projectId: slaTimers.projectId, stage: slaTimers.stage, dueDate: slaTimers.dueDate, isOverdue: slaTimers.isOverdue, projectName: projects.projectName, projectCode: projects.projectCode })
      .from(slaTimers)
      .innerJoin(projects, eq(slaTimers.projectId, projects.id))
      .where(eq(slaTimers.isOverdue, false))
      .limit(100);
  }),

  /**
   * Demo Mode Reset — admin-only, RBAC-protected
   * Clears all seed data (users with openId LIKE 'seed-%' and projects with
   * projectCode LIKE 'PRA-2024-%') and re-runs the seed script in-process.
   * Returns counts of deleted and re-created records.
   */
  resetDemo: adminProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    // Safety: only allow if requester is admin (already enforced by adminProcedure)
    const { sql } = await import("drizzle-orm");

    // Collect seed project IDs before deletion
    const seedProjects = await db.execute(
      sql`SELECT id FROM projects WHERE projectCode LIKE 'PRA-2024-%'`
    );
    const seedProjectIds: number[] = ((seedProjects as unknown as any[][])[0] || []).map((r: any) => r.id);

    // Delete in dependency order (FK-safe)
    const deletionTables = [
      "auditLogs",
      "notifications",
      "boardDecisions",
      "boardMeetings",
      "evaluations",
      "complianceChecklist",
      "slaTimers",
      "mous",
      "loiSubmissions",
    ];

    let deletedRows = 0;
    for (const table of deletionTables) {
      if (seedProjectIds.length > 0) {
        const ids = seedProjectIds.join(",");
        try {
          const result = await db.execute(
            sql.raw(`DELETE FROM \`${table}\` WHERE projectId IN (${ids})`)
          );
          deletedRows += (result[0] as any).affectedRows || 0;
        } catch {
          // Table may not have projectId — skip
        }
      }
    }

    // Delete seed projects
    const projResult = await db.execute(
      sql`DELETE FROM projects WHERE projectCode LIKE 'PRA-2024-%'`
    );
    deletedRows += (projResult[0] as any).affectedRows || 0;

    // Delete seed users
    const userResult = await db.execute(
      sql`DELETE FROM users WHERE openId LIKE 'seed-%'`
    );
    deletedRows += (userResult[0] as any).affectedRows || 0;

    // Delete SLA configurations seeded
    await db.execute(
      sql`DELETE FROM slaConfigurations WHERE stageName IN ('intake','pre_qualification','mou','compliance_docs','full_compliance','evaluation','board_review','bidding','agreement','monitoring','closure')`
    );

    // Audit log the reset action
    await db.insert(auditLogs).values({
      userId: ctx.user.id,
      entityType: "system",
      entityId: 0,
      action: "other",
      changeDescription: `Demo Mode Reset executed by admin user ${ctx.user.id}. Deleted ${deletedRows} rows.`,
      ipAddress: ctx.req.ip || "unknown",
      userAgent: ctx.req.headers["user-agent"] || "unknown",
    });

    // Re-run seed script via child_process
    const { execSync } = await import("child_process");
    let seedOutput = "";
    try {
      seedOutput = execSync(
        `node ${process.cwd()}/scripts/seed-demo-data.mjs`,
        { timeout: 120000, encoding: "utf8" }
      );
    } catch (err: any) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Demo reset: data cleared but re-seed failed: ${err.message}`,
      });
    }

    return {
      success: true,
      deletedRows,
      seedOutput: seedOutput.slice(-500), // Last 500 chars of seed output
    };
  }),
});

// ============================================================================
// ENFORCEMENT ROUTER
// ============================================================================
const enforcementRouter = router({
  getCases: protectedProcedure.query(async () => {
    const { getAllEnforcementCases } = await import("./db");
    return await getAllEnforcementCases();
  }),
  getCaseById: protectedProcedure
    .input(z.object({ caseId: z.number() }))
    .query(async ({ input }) => {
      const { getEnforcementCaseById } = await import("./db");
      return await getEnforcementCaseById(input.caseId);
    }),
  getStopWorkOrders: protectedProcedure.query(async () => {
    const { getAllStopWorkOrders } = await import("./db");
    return await getAllStopWorkOrders();
  }),
  createCase: enforcementOfficerProcedure
    .input(z.object({
      caseNumber: z.string(),
      complaintType: z.string(),
      location: z.string(),
      suspectedParties: z.string().optional(),
      evidence: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { enforcementCases } = await import("../drizzle/schema");
      const result = await db.insert(enforcementCases).values({
        caseNumber: input.caseNumber,
        complaintType: input.complaintType,
        location: input.location,
        suspectedParties: input.suspectedParties || null,
        evidence: input.evidence || null,
        reportedBy: ctx.user.id,
        reportedAt: new Date(),
        verificationStatus: "pending" as any,
        caseStatus: "intake" as any,
      });
      await db.insert(auditLogs).values({ userId: ctx.user.id, entityType: "enforcement_case", entityId: result[0].insertId as number, action: "create", changeDescription: `Enforcement case ${input.caseNumber} created: ${input.complaintType} at ${input.location}` } as any);
      return { success: true, id: result[0].insertId };
    }),
  updateCaseStatus: enforcementOfficerProcedure
    .input(z.object({
      caseId: z.number(),
      caseStatus: z.enum(["intake", "investigation", "enforcement", "resolved", "closed"]),
      enforcementActions: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { enforcementCases } = await import("../drizzle/schema");
      const updateData: Record<string, unknown> = { caseStatus: input.caseStatus };
      if (input.enforcementActions) updateData.enforcementActions = input.enforcementActions;
      if (input.caseStatus === "closed") { updateData.closedAt = new Date(); updateData.closedBy = ctx.user.id; }
      await db.update(enforcementCases).set(updateData as any).where(eq(enforcementCases.id, input.caseId));
      await db.insert(auditLogs).values({ userId: ctx.user.id, entityType: "enforcement_case", entityId: input.caseId, action: "update", changeDescription: `Case status updated to ${input.caseStatus}` } as any);
      return { success: true };
    }),
  issueStopWorkOrder: enforcementOfficerProcedure
    .input(z.object({
      projectId: z.number(),
      orderNumber: z.string(),
      reason: z.string(),
      effectiveDate: z.date(),
      documentUrl: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { stopWorkOrders } = await import("../drizzle/schema");
      const result = await db.insert(stopWorkOrders).values({
        projectId: input.projectId,
        orderNumber: input.orderNumber,
        issuedBy: ctx.user.id,
        issuedAt: new Date(),
        reason: input.reason,
        effectiveDate: input.effectiveDate,
        documentUrl: input.documentUrl || null,
        status: "issued" as any,
      });
      await db.insert(auditLogs).values({ userId: ctx.user.id, entityType: "stop_work_order", entityId: result[0].insertId as number, action: "create", changeDescription: `Stop Work Order ${input.orderNumber} issued for project ${input.projectId}: ${input.reason.slice(0, 100)}` } as any);
      return { success: true, id: result[0].insertId };
    }),
  liftStopWorkOrder: enforcementOfficerProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { stopWorkOrders } = await import("../drizzle/schema");
      await db.update(stopWorkOrders).set({ status: "lifted" as any, liftedDate: new Date(), liftedBy: ctx.user.id } as any).where(eq(stopWorkOrders.id, input.orderId));
      await db.insert(auditLogs).values({ userId: ctx.user.id, entityType: "stop_work_order", entityId: input.orderId, action: "update", changeDescription: `Stop Work Order ${input.orderId} lifted by user ${ctx.user.id}` } as any);
      return { success: true };
    }),
});

// ============================================================================
// MAIN APP ROUTER
// ============================================================================
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Feature routers
  project: projectRouter,
  document: documentRouter,
  agency: agencyRouter,
  task: taskRouter,
  evaluation: evaluationRouter,
  board: boardRouter,
  bidding: biddingRouter,
  agreement: agreementRouter,
  monitoring: monitoringRouter,
  notification: notificationRouter,
  audit: auditRouter,
  stats: statsRouter,
  admin: adminRouter,
  enforcement: enforcementRouter,
});

export type AppRouter = typeof appRouter;
