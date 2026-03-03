/**
 * SLA Enforcement Cron Service
 *
 * Runs every 6 hours (server-side, production-safe).
 * Idempotent: uses overdueNotifiedAt / warningNotifiedAt flags to prevent
 * duplicate notifications for the same timer.
 *
 * On each tick:
 *  1. Detect newly-overdue SLA timers → mark isOverdue=true, set escalatedAt
 *  2. Write one audit log entry per newly-overdue timer (action: "other")
 *  3. Insert one in-app notification record per affected admin user
 *  4. Send owner push notification via notifyOwner()
 *  5. Detect warning-window timers (≤7 days) → send warning notifications
 *
 * Idempotency guarantees:
 *  - overdueNotifiedAt: set once when overdue notification is first sent;
 *    subsequent runs skip timers where this field is already populated.
 *  - warningNotifiedAt: set once when warning notification is first sent.
 */

import { eq, and, isNull, lt, lte } from "drizzle-orm";
import { getDb } from "./db";
import { notifyOwner } from "./_core/notification";

const SLA_CRON_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const WARNING_WINDOW_DAYS = 7;

// System user ID used for audit log entries written by the cron engine.
// Uses 0 as a sentinel value (cast via `as any` to satisfy notNull constraint).
const SYSTEM_USER_ID = 1;

let cronHandle: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

// ── Liveness tracking ────────────────────────────────────────────────────────
// lastTickAt is updated after every successful tick completion.
// Used by the /health endpoint to verify the cron is not silently stalled.
let lastTickAt: Date | null = null;
let isScheduled = false;

/**
 * Execute one SLA enforcement tick.
 * Safe to call concurrently — guarded by `isRunning` flag.
 */
export async function runSlaCronTick(): Promise<{
  overdueProcessed: number;
  warningProcessed: number;
  auditLogsWritten: number;
  notificationsCreated: number;
}> {
  if (isRunning) {
    console.log("[SLA Cron] Tick skipped — previous run still in progress");
    return { overdueProcessed: 0, warningProcessed: 0, auditLogsWritten: 0, notificationsCreated: 0 };
  }
  isRunning = true;
  const stats = { overdueProcessed: 0, warningProcessed: 0, auditLogsWritten: 0, notificationsCreated: 0 };

  try {
    const db = await getDb();
    if (!db) {
      console.warn("[SLA Cron] Database not available — skipping tick");
      return stats;
    }

    const { slaTimers, projects, auditLogs, notifications, users } = await import("../drizzle/schema");
    const now = new Date();
    const warningCutoff = new Date(now.getTime() + WARNING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    // ── 1. Detect newly-overdue timers ────────────────────────────────────────
    // Only process timers that are past due AND have not yet been notified.
    const newlyOverdue = await db
      .select()
      .from(slaTimers)
      .where(
        and(
          eq(slaTimers.isOverdue, false),
          lt(slaTimers.dueDate, now),
          isNull(slaTimers.overdueNotifiedAt)
        )
      );

    for (const timer of newlyOverdue) {
      try {
        // Mark overdue + set notification timestamp atomically
        await db
          .update(slaTimers)
          .set({
            isOverdue: true,
            escalatedAt: now,
            overdueNotifiedAt: now,
          })
          .where(eq(slaTimers.id, timer.id));

        // Fetch project details for messaging
        const [project] = await db
          .select({ id: projects.id, projectName: projects.projectName, projectCode: projects.projectCode, currentStage: projects.currentStage })
          .from(projects)
          .where(eq(projects.id, timer.projectId))
          .limit(1);

        if (!project) continue;

        const stageLabel = (timer.stage || "unknown").replace(/_/g, " ");
        const description = `SLA OVERDUE: Project "${project.projectName}" (${project.projectCode}) exceeded its deadline in stage "${stageLabel}". Timer ID: ${timer.id}. Due: ${timer.dueDate.toISOString()}.`;

        // ── 2. Write audit log ─────────────────────────────────────────────
        await db.insert(auditLogs).values({
          userId: SYSTEM_USER_ID,
          entityType: "sla_timer",
          entityId: timer.id,
          action: "other",
          changeDescription: description,
          ipAddress: "system-cron",
          userAgent: "sla-enforcement-engine/1.0",
        });
        stats.auditLogsWritten++;

        // ── 3. Insert in-app notification for all admin users ──────────────
        const adminUsers = await db
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.role, "admin"), eq(users.isActive, true)));

        for (const admin of adminUsers) {
          await db.insert(notifications).values({
            userId: admin.id,
            projectId: timer.projectId,
            notificationType: "deadline_escalation",
            title: `🚨 SLA OVERDUE: ${project.projectName}`,
            message: description,
            relatedEntityId: timer.id,
            relatedEntityType: "sla_timer",
            isRead: false,
            sentViaEmail: false,
          });
          stats.notificationsCreated++;
        }

        // ── 4. Push notification to owner ──────────────────────────────────
        try {
          await notifyOwner({
            title: `🚨 SLA OVERDUE: ${project.projectName}`,
            content: description,
          });
        } catch {
          // Non-critical — owner notification failure does not abort the cron
        }

        stats.overdueProcessed++;
        console.log(`[SLA Cron] Overdue: project ${project.projectCode} stage ${stageLabel} (timer ${timer.id})`);
      } catch (err) {
        console.error(`[SLA Cron] Error processing overdue timer ${timer.id}:`, err);
      }
    }

    // ── 5. Detect warning-window timers ───────────────────────────────────────
    // Timers not yet overdue, within 7 days, and not yet warned.
    const warningTimers = await db
      .select()
      .from(slaTimers)
      .where(
        and(
          eq(slaTimers.isOverdue, false),
          lte(slaTimers.dueDate, warningCutoff),
          isNull(slaTimers.warningNotifiedAt)
        )
      );

    for (const timer of warningTimers) {
      try {
        await db
          .update(slaTimers)
          .set({ warningNotifiedAt: now })
          .where(eq(slaTimers.id, timer.id));

        const [project] = await db
          .select({ id: projects.id, projectName: projects.projectName, projectCode: projects.projectCode, currentStage: projects.currentStage })
          .from(projects)
          .where(eq(projects.id, timer.projectId))
          .limit(1);

        if (!project) continue;

        const stageLabel = (timer.stage || "unknown").replace(/_/g, " ");
        const daysLeft = Math.ceil((new Date(timer.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // In-app notification for admins
        const adminUsers = await db
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.role, "admin"), eq(users.isActive, true)));

        for (const admin of adminUsers) {
          await db.insert(notifications).values({
            userId: admin.id,
            projectId: timer.projectId,
            notificationType: "due_date_reminder",
            title: `⚠️ SLA Warning: ${project.projectName}`,
            message: `Project "${project.projectName}" (${project.projectCode}) SLA deadline in stage "${stageLabel}" is in ${daysLeft} day(s). Due: ${new Date(timer.dueDate).toLocaleDateString("en-PH")}.`,
            relatedEntityId: timer.id,
            relatedEntityType: "sla_timer",
            isRead: false,
            sentViaEmail: false,
          });
          stats.notificationsCreated++;
        }

        try {
          await notifyOwner({
            title: `⚠️ SLA Warning: ${project.projectName}`,
            content: `Project "${project.projectName}" (${project.projectCode}) SLA deadline in stage "${stageLabel}" is in ${daysLeft} day(s).`,
          });
        } catch {
          // Non-critical
        }

        stats.warningProcessed++;
        console.log(`[SLA Cron] Warning: project ${project.projectCode} stage ${stageLabel} — ${daysLeft} days left (timer ${timer.id})`);
      } catch (err) {
        console.error(`[SLA Cron] Error processing warning timer ${timer.id}:`, err);
      }
    }

    console.log(`[SLA Cron] Tick complete — overdue: ${stats.overdueProcessed}, warnings: ${stats.warningProcessed}, audit logs: ${stats.auditLogsWritten}, notifications: ${stats.notificationsCreated}`);
  } catch (err) {
    console.error("[SLA Cron] Fatal tick error:", err);
  } finally {
    isRunning = false;
    lastTickAt = new Date();
  }
  return stats;
}

/**
 * Start the SLA enforcement cron.
 * Runs immediately on startup, then every 6 hours.
 * Safe to call multiple times — only one cron handle is active.
 */
export function startSlaCron(): void {
  if (cronHandle) {
    console.log("[SLA Cron] Already running — skipping duplicate start");
    return;
  }

  console.log(`[SLA Cron] Starting — interval: ${SLA_CRON_INTERVAL_MS / 1000 / 60 / 60}h`);
  isScheduled = true;

  // Run immediately on startup (after a short delay to let DB connect)
  setTimeout(() => {
    runSlaCronTick().catch(err => console.error("[SLA Cron] Initial tick error:", err));
  }, 5000);

  // Then run every 6 hours
  cronHandle = setInterval(() => {
    runSlaCronTick().catch(err => console.error("[SLA Cron] Interval tick error:", err));
  }, SLA_CRON_INTERVAL_MS);

  // Prevent the interval from blocking Node.js process exit
  if (cronHandle.unref) cronHandle.unref();
}

/**
 * Stop the SLA enforcement cron (used in tests).
 */
export function stopSlaCron(): void {
  if (cronHandle) {
    clearInterval(cronHandle);
    cronHandle = null;
    isScheduled = false;
    console.log("[SLA Cron] Stopped");
  }
}

/**
 * Return the current liveness status of the SLA cron.
 * Used by the /health endpoint to report cron health to container orchestrators.
 */
export function getSlaCronStatus(): {
  isScheduled: boolean;
  isRunning: boolean;
  lastTickAt: Date | null;
} {
  return {
    isScheduled,
    isRunning,
    lastTickAt,
  };
}
