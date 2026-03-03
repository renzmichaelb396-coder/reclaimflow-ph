/**
 * ReclaimFlow PH - Workflow Engine
 * Enforces stage transitions, creates SLA timers, and triggers notifications.
 * All business rules for PPP project lifecycle are encoded here.
 */

import { TRPCError } from "@trpc/server";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { notifyOwner } from "./_core/notification";

// ─── Stage Definitions ──────────────────────────────────────────────────────

export type ProjectStage =
  | "intake"
  | "pre_qualification"
  | "mou"
  | "compliance_docs"
  | "full_compliance"
  | "evaluation"
  | "board_review"
  | "bidding"
  | "agreement"
  | "monitoring"
  | "closure";

// SLA durations in days for each stage
export const STAGE_SLA_DAYS: Record<ProjectStage, number> = {
  intake: 15,
  pre_qualification: 30,
  mou: 30,
  compliance_docs: 60,
  full_compliance: 90,   // 90-day board compliance timer
  evaluation: 45,
  board_review: 30,
  bidding: 90,
  agreement: 30,
  monitoring: 0,         // Ongoing
  closure: 0,            // Terminal
};

// MOU validity period in months
export const MOU_VALIDITY_MONTHS = 24;

// Valid stage transitions (from → to[])
export const VALID_TRANSITIONS: Record<ProjectStage, ProjectStage[]> = {
  intake: ["pre_qualification"],
  pre_qualification: ["mou", "intake"],           // can go back if deficient
  mou: ["compliance_docs"],
  compliance_docs: ["full_compliance"],
  full_compliance: ["evaluation"],
  evaluation: ["board_review"],
  board_review: ["bidding", "evaluation"],         // can return for re-evaluation
  bidding: ["agreement"],
  agreement: ["monitoring"],
  monitoring: ["closure"],
  closure: [],                                     // terminal
};

// Roles allowed to trigger each transition
export const TRANSITION_ROLES: Record<string, string[]> = {
  "intake→pre_qualification": ["admin", "secretariat", "evaluator"],
  "pre_qualification→mou": ["admin", "evaluator"],
  "pre_qualification→intake": ["admin", "evaluator"],
  "mou→compliance_docs": ["admin", "secretariat"],
  "compliance_docs→full_compliance": ["admin", "evaluator"],
  "full_compliance→evaluation": ["admin", "evaluator"],
  "evaluation→board_review": ["admin", "evaluator"],
  "board_review→bidding": ["admin", "secretariat", "board_member"],
  "board_review→evaluation": ["admin", "board_member"],
  "bidding→agreement": ["admin", "secretariat"],
  "agreement→monitoring": ["admin", "secretariat"],
  "monitoring→closure": ["admin"],
};

// ─── Stage Transition Engine ─────────────────────────────────────────────────

export async function transitionProjectStage(
  projectId: number,
  toStage: ProjectStage,
  userId: number,
  userRole: string,
  notes?: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

  const { projects, slaTimers, auditLogs } = await import("../drizzle/schema");

  // Get current project
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

  const fromStage = project.currentStage as ProjectStage;

  // Validate transition is allowed
  const allowedNext = VALID_TRANSITIONS[fromStage] || [];
  if (!allowedNext.includes(toStage)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Invalid stage transition: ${fromStage} → ${toStage}. Allowed: ${allowedNext.join(", ") || "none (terminal state)"}`,
    });
  }

  // Validate role permission
  const transitionKey = `${fromStage}→${toStage}`;
  const allowedRoles = TRANSITION_ROLES[transitionKey] || ["admin"];
  if (!allowedRoles.includes(userRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Role '${userRole}' is not allowed to perform transition: ${transitionKey}. Allowed roles: ${allowedRoles.join(", ")}`,
    });
  }

  // Perform the transition
  await db.update(projects)
    .set({
      currentStage: toStage,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId));

  // Create SLA timer for the new stage
  const slaDays = STAGE_SLA_DAYS[toStage];
  if (slaDays > 0) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + slaDays);

    await db.insert(slaTimers).values({
      projectId,
      stage: toStage,
      dueDateDays: slaDays,
      dueDate,
      isOverdue: false,
    });
  }

  // Log audit trail
  await db.insert(auditLogs).values({
    projectId,
    userId,
    action: "status_change",
    entityType: "project",
    entityId: projectId,
    oldValue: fromStage,
    newValue: toStage,
    notes: notes || `Stage transition: ${fromStage} → ${toStage}`,
    ipAddress: "system",
    userAgent: "workflow-engine",
  } as any);

  // Notify owner of stage change
  try {
    await notifyOwner({
      title: `Project Stage Advanced: ${project.projectName}`,
      content: `Project "${project.projectName}" (${project.projectCode}) has advanced from "${fromStage.replace(/_/g, " ")}" to "${toStage.replace(/_/g, " ")}". ${notes ? `Notes: ${notes}` : ""}`,
    });
  } catch {
    // Non-critical
  }
}

// ─── SLA Timer Engine ────────────────────────────────────────────────────────

export async function checkOverdueSlaTimers(): Promise<{
  overdueProjectIds: number[];
  warningProjectIds: number[];
}> {
  const db = await getDb();
  if (!db) return { overdueProjectIds: [], warningProjectIds: [] };

  const { slaTimers } = await import("../drizzle/schema");
  const { and, lt, lte } = await import("drizzle-orm");

  const now = new Date();
  const warningDate = new Date();
  warningDate.setDate(warningDate.getDate() + 7); // 7-day warning window

  // Get all non-overdue timers
  const activeTimers = await db
    .select()
    .from(slaTimers)
    .where(eq(slaTimers.isOverdue, false));

  const overdueProjectIds: number[] = [];
  const warningProjectIds: number[] = [];

  for (const timer of activeTimers) {
    const dueDate = new Date(timer.dueDate);
    if (dueDate < now) {
      overdueProjectIds.push(timer.projectId);
      // Mark as overdue
      await db.update(slaTimers)
        .set({ isOverdue: true, escalatedAt: new Date() })
        .where(eq(slaTimers.id, timer.id));
    } else if (dueDate <= warningDate) {
      warningProjectIds.push(timer.projectId);
    }
  }

  return { overdueProjectIds, warningProjectIds };
}

export async function createMouTimer(projectId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const { slaTimers } = await import("../drizzle/schema");

  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + MOU_VALIDITY_MONTHS);
  const totalDays = MOU_VALIDITY_MONTHS * 30;

  await db.insert(slaTimers).values({
    projectId,
    stage: "mou_expiry",
    dueDateDays: totalDays,
    dueDate: expiryDate,
    isOverdue: false,
  });
}

export async function createBoardComplianceTimer(projectId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const { slaTimers } = await import("../drizzle/schema");

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 90);

  await db.insert(slaTimers).values({
    projectId,
    stage: "board_compliance",
    dueDateDays: 90,
    dueDate,
    isOverdue: false,
  });
}

// ─── Stage Validation Helpers ─────────────────────────────────────────────────

export function getValidNextStages(currentStage: ProjectStage): ProjectStage[] {
  return VALID_TRANSITIONS[currentStage] || [];
}

export function canTransition(
  fromStage: ProjectStage,
  toStage: ProjectStage,
  userRole: string
): boolean {
  const allowedNext = VALID_TRANSITIONS[fromStage] || [];
  if (!allowedNext.includes(toStage)) return false;

  const transitionKey = `${fromStage}→${toStage}`;
  const allowedRoles = TRANSITION_ROLES[transitionKey] || ["admin"];
  return allowedRoles.includes(userRole);
}

export function getStageSlaInfo(stage: ProjectStage): {
  days: number;
  label: string;
  description: string;
} {
  const days = STAGE_SLA_DAYS[stage];
  const labels: Record<ProjectStage, { label: string; description: string }> = {
    intake: { label: "LOI / Intake", description: "Letter of Intent review and processing" },
    pre_qualification: { label: "Pre-Qualification", description: "Assessment of proponent qualifications" },
    mou: { label: "MOU Execution", description: "Memorandum of Understanding signing (24-month validity)" },
    compliance_docs: { label: "Compliance Documents", description: "Submission of required compliance documents" },
    full_compliance: { label: "Full Compliance", description: "90-day board compliance notice period" },
    evaluation: { label: "Evaluation", description: "Technical and financial evaluation" },
    board_review: { label: "Board Review", description: "Board of Directors review and decision" },
    bidding: { label: "Competitive Selection", description: "Bidding and competitive selection process" },
    agreement: { label: "Agreement Execution", description: "Concession agreement signing" },
    monitoring: { label: "Monitoring", description: "Project implementation monitoring" },
    closure: { label: "Closure", description: "Project completed or terminated" },
  };

  return { days, ...labels[stage] };
}

// ─── Notification Helpers ─────────────────────────────────────────────────────

export async function sendSlaWarningNotifications(projectIds: number[]): Promise<void> {
  if (projectIds.length === 0) return;

  const db = await getDb();
  if (!db) return;

  const { projects } = await import("../drizzle/schema");

  const projectList = await db
    .select({ id: projects.id, projectName: projects.projectName, projectCode: projects.projectCode, currentStage: projects.currentStage })
    .from(projects)
    .where(inArray(projects.id, projectIds));

  for (const project of projectList) {
    try {
      await notifyOwner({
        title: `⚠️ SLA Warning: ${project.projectName}`,
        content: `Project "${project.projectName}" (${project.projectCode}) is approaching its SLA deadline in the "${project.currentStage?.replace(/_/g, " ")}" stage. Immediate action required.`,
      });
    } catch {
      // Non-critical
    }
  }
}

export async function sendSlaOverdueNotifications(projectIds: number[]): Promise<void> {
  if (projectIds.length === 0) return;

  const db = await getDb();
  if (!db) return;

  const { projects } = await import("../drizzle/schema");

  const projectList = await db
    .select({ id: projects.id, projectName: projects.projectName, projectCode: projects.projectCode, currentStage: projects.currentStage })
    .from(projects)
    .where(inArray(projects.id, projectIds));

  for (const project of projectList) {
    try {
      await notifyOwner({
        title: `🚨 SLA OVERDUE: ${project.projectName}`,
        content: `URGENT: Project "${project.projectName}" (${project.projectCode}) has EXCEEDED its SLA deadline in the "${project.currentStage?.replace(/_/g, " ")}" stage. Escalation required.`,
      });
    } catch {
      // Non-critical
    }
  }
}
