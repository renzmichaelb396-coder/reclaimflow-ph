import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  projects,
  documents,
  documentVersions,
  complianceChecklist,
  agencyRequests,
  tasks,
  slaTimers,
  evaluations,
  cswPackages,
  riskRegister,
  boardDecisions,
  resolutions,
  boardMeetings,
  biddingEvents,
  bids,
  agreements,
  agreementSignatories,
  inspections,
  nonComplianceFindings,
  correctiveActions,
  notifications,
  auditLogs,
  enforcementCases,
  stopWorkOrders,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// PROJECT QUERIES
// ============================================================================

export async function getProjectById(projectId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  return result[0];
}

export async function getProjectsByProponent(proponentId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(projects).where(eq(projects.proponentId, proponentId));
}

export async function getProjectsByStage(stage: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(projects).where(eq(projects.currentStage, stage as any));
}

export async function getAllProjects(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(projects).limit(limit).offset(offset);
}

// ============================================================================
// DOCUMENT QUERIES
// ============================================================================

export async function getDocumentsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(documents).where(eq(documents.projectId, projectId));
}

export async function getComplianceChecklistByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(complianceChecklist).where(eq(complianceChecklist.projectId, projectId));
}

export async function getDocumentVersions(documentId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(documentVersions).where(eq(documentVersions.documentId, documentId));
}

// ============================================================================
// AGENCY COORDINATION QUERIES
// ============================================================================

export async function getAgencyRequestsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(agencyRequests).where(eq(agencyRequests.projectId, projectId));
}

export async function getOverdueAgencyRequests() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(agencyRequests).where(eq(agencyRequests.status, 'overdue'));
}

// ============================================================================
// TASK QUERIES
// ============================================================================

export async function getTasksByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(tasks).where(eq(tasks.projectId, projectId));
}

export async function getTasksAssignedToUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(tasks).where(eq(tasks.assignedTo, userId));
}

export async function getOverdueTasks() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(tasks).where(eq(tasks.status, 'pending'));
}

// ============================================================================
// SLA TIMER QUERIES
// ============================================================================

export async function getSLATimersByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(slaTimers).where(eq(slaTimers.projectId, projectId));
}

export async function getOverdueSLATimers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(slaTimers).where(eq(slaTimers.isOverdue, true));
}

// ============================================================================
// EVALUATION QUERIES
// ============================================================================

export async function getEvaluationsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(evaluations).where(eq(evaluations.projectId, projectId));
}

export async function getCSWPackageByProject(projectId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(cswPackages).where(eq(cswPackages.projectId, projectId)).limit(1);
  return result[0];
}

export async function getRiskRegisterByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(riskRegister).where(eq(riskRegister.projectId, projectId));
}

// ============================================================================
// BOARD QUERIES
// ============================================================================

export async function getBoardDecisionsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(boardDecisions).where(eq(boardDecisions.projectId, projectId));
}

export async function getResolutionsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(resolutions).where(eq(resolutions.projectId, projectId));
}

export async function getBoardMeetings(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(boardMeetings).limit(limit);
}

// ============================================================================
// BIDDING QUERIES
// ============================================================================

export async function getBiddingEventsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(biddingEvents).where(eq(biddingEvents.projectId, projectId));
}

export async function getBidsByBiddingEvent(biddingEventId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(bids).where(eq(bids.biddingEventId, biddingEventId));
}

// ============================================================================
// AGREEMENT QUERIES
// ============================================================================

export async function getAgreementsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(agreements).where(eq(agreements.projectId, projectId));
}

export async function getAgreementSignatories(agreementId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(agreementSignatories).where(eq(agreementSignatories.agreementId, agreementId));
}

// ============================================================================
// MONITORING QUERIES
// ============================================================================

export async function getInspectionsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(inspections).where(eq(inspections.projectId, projectId));
}

export async function getNonComplianceFindingsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(nonComplianceFindings).where(eq(nonComplianceFindings.projectId, projectId));
}

export async function getCorrectiveActionsByFinding(findingId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(correctiveActions).where(eq(correctiveActions.findingId, findingId));
}

// ============================================================================
// NOTIFICATION QUERIES
// ============================================================================

export async function getNotificationsByUser(userId: number, unreadOnly = false) {
  const db = await getDb();
  if (!db) return [];
  if (unreadOnly) {
    return await db.select().from(notifications).where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    );
  }
  return await db.select().from(notifications).where(eq(notifications.userId, userId));
}

// ============================================================================
// ENFORCEMENT QUERIES
// ============================================================================

export async function getAllEnforcementCases(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const { desc } = await import("drizzle-orm");
  return await db.select().from(enforcementCases).orderBy(desc(enforcementCases.createdAt)).limit(limit);
}

export async function getEnforcementCaseById(caseId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(enforcementCases).where(eq(enforcementCases.id, caseId)).limit(1);
  return result[0];
}

export async function getStopWorkOrdersByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(stopWorkOrders).where(eq(stopWorkOrders.projectId, projectId));
}

export async function getAllStopWorkOrders(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const { desc } = await import("drizzle-orm");
  return await db.select().from(stopWorkOrders).orderBy(desc(stopWorkOrders.createdAt)).limit(limit);
}

// ============================================================================
// AUDIT LOG QUERIES
// ============================================================================

export async function getAuditLogsByEntity(entityType: string, entityId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(auditLogs).where(
    and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityId, entityId))
  );
}

export async function getAuditLogsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(auditLogs).where(eq(auditLogs.userId, userId));
}
