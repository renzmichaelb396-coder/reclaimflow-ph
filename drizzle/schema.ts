import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  decimal,
  json,
  longtext,
  datetime,
  uniqueIndex,
  index,
} from "drizzle-orm/mysql-core";

// ============================================================================
// CORE TABLES
// ============================================================================

/**
 * Users table with extended role support for PPP workflow
 */
export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: mysqlEnum("role", [
      "admin",
      "evaluator",
      "secretariat",
      "board_member",
      "proponent",
      "public",
      "agency_reviewer",
      "enforcement_officer",
    ])
      .default("public")
      .notNull(),
    department: varchar("department", { length: 255 }),
    agencyAffiliation: varchar("agencyAffiliation", { length: 255 }),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  },
  (table) => ({
    openIdIdx: uniqueIndex("openId_idx").on(table.openId),
    roleIdx: index("role_idx").on(table.role),
  })
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Projects table - core entity for PPP project lifecycle
 */
export const projects = mysqlTable(
  "projects",
  {
    id: int("id").autoincrement().primaryKey(),
    projectCode: varchar("projectCode", { length: 50 }).notNull().unique(),
    projectName: varchar("projectName", { length: 255 }).notNull(),
    description: longtext("description"),
    proponentId: int("proponentId").notNull(),
    proponentType: mysqlEnum("proponentType", ["lgu", "developer", "ngo", "government"]).notNull(),
    location: varchar("location", { length: 255 }).notNull(),
    mapPolygon: json("mapPolygon"),
    estimatedArea: decimal("estimatedArea", { precision: 12, scale: 2 }),
    estimatedCost: decimal("estimatedCost", { precision: 15, scale: 2 }),
    estimatedTimeline: int("estimatedTimeline"),
    projectPurpose: varchar("projectPurpose", { length: 255 }),
    currentStage: mysqlEnum("currentStage", [
      "intake",
      "pre_qualification",
      "mou",
      "compliance_docs",
      "full_compliance",
      "evaluation",
      "board_review",
      "bidding",
      "agreement",
      "monitoring",
      "closure",
    ])
      .default("intake")
      .notNull(),
    status: mysqlEnum("status", [
      "draft",
      "submitted",
      "in_progress",
      "complete",
      "deficient",
      "approved",
      "rejected",
      "on_hold",
    ])
      .default("draft")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    submittedAt: timestamp("submittedAt"),
    completedAt: timestamp("completedAt"),
    isDemo: boolean("isDemo").default(false).notNull(),
  },
  (table) => ({
    projectCodeIdx: uniqueIndex("projectCode_idx").on(table.projectCode),
    proponentIdx: index("proponentId_idx").on(table.proponentId),
    stageIdx: index("currentStage_idx").on(table.currentStage),
    statusIdx: index("status_idx").on(table.status),
  })
);

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// ============================================================================
// PROJECT LIFECYCLE & TIMING TABLES
// ============================================================================

/**
 * Project stages - tracks progression through workflow with timestamps
 */
export const projectStages = mysqlTable(
  "projectStages",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    stage: mysqlEnum("stage", [
      "intake",
      "pre_qualification",
      "mou",
      "compliance_docs",
      "full_compliance",
      "evaluation",
      "board_review",
      "bidding",
      "agreement",
      "monitoring",
      "closure",
    ]).notNull(),
    enteredAt: timestamp("enteredAt").defaultNow().notNull(),
    completedAt: timestamp("completedAt"),
    notes: longtext("notes"),
    completedBy: int("completedBy"),
  },
  (table) => ({
    projectIdx: index("projectId_idx").on(table.projectId),
    stageIdx: index("stage_idx").on(table.stage),
  })
);

export type ProjectStage = typeof projectStages.$inferSelect;
export type InsertProjectStage = typeof projectStages.$inferInsert;

/**
 * SLA timers - tracks deadlines and escalations for each stage
 */
export const slaTimers = mysqlTable(
  "slaTimers",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    stage: varchar("stage", { length: 100 }).notNull(),
    dueDateDays: int("dueDateDays").notNull(),
    dueDate: datetime("dueDate").notNull(),
    escalationDays: int("escalationDays"),
    escalatedAt: timestamp("escalatedAt"),
    completedAt: timestamp("completedAt"),
    isOverdue: boolean("isOverdue").default(false).notNull(),
    overdueNotifiedAt: timestamp("overdueNotifiedAt"),
    warningNotifiedAt: timestamp("warningNotifiedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("projectId_idx").on(table.projectId),
    dueDateIdx: index("dueDate_idx").on(table.dueDate),
  })
);
export type SLATimer = typeof slaTimers.$inferSelect;
export type InsertSLATimer = typeof slaTimers.$inferInsert;

/**
 * Tasks - assigned work items with deadlines and SLA tracking
 */
export const tasks = mysqlTable(
  "tasks",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: longtext("description"),
    assignedTo: int("assignedTo"),
    taskType: mysqlEnum("taskType", [
      "document_review",
      "checklist_verification",
      "agency_coordination",
      "evaluation",
      "board_preparation",
      "bidding_management",
      "monitoring",
      "other",
    ]).notNull(),
    status: mysqlEnum("status", [
      "pending",
      "in_progress",
      "completed",
      "blocked",
      "cancelled",
    ])
      .default("pending")
      .notNull(),
    priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium").notNull(),
    dueDate: datetime("dueDate"),
    completedAt: timestamp("completedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    projectIdx: index("projectId_idx").on(table.projectId),
    assignedIdx: index("assignedTo_idx").on(table.assignedTo),
    dueDateIdx: index("dueDate_idx").on(table.dueDate),
  })
);

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

// ============================================================================
// LOI & PRE-QUALIFICATION TABLES
// ============================================================================

/**
 * LOI submissions - Letter of Intent for project intake
 */
export const loiSubmissions = mysqlTable(
  "loiSubmissions",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    submittedBy: int("submittedBy").notNull(),
    submittedAt: timestamp("submittedAt").defaultNow().notNull(),
    documentUrl: varchar("documentUrl", { length: 500 }),
    status: mysqlEnum("status", [
      "draft",
      "submitted",
      "received",
      "acknowledged",
      "rejected",
    ])
      .default("draft")
      .notNull(),
    notes: longtext("notes"),
  },
  (table) => ({
    projectIdx: index("projectId_idx").on(table.projectId),
    submittedByIdx: index("submittedBy_idx").on(table.submittedBy),
  })
);

export type LOISubmission = typeof loiSubmissions.$inferSelect;
export type InsertLOISubmission = typeof loiSubmissions.$inferInsert;

/**
 * Pre-qualification checklist items
 */
export const preQualChecklist = mysqlTable(
  "preQualChecklist",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    itemName: varchar("itemName", { length: 255 }).notNull(),
    isRequired: boolean("isRequired").default(true).notNull(),
    isCompliant: boolean("isCompliant").default(false).notNull(),
    verifiedBy: int("verifiedBy"),
    verifiedAt: timestamp("verifiedAt"),
    notes: longtext("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("projectId_idx").on(table.projectId),
  })
);

export type PreQualChecklist = typeof preQualChecklist.$inferSelect;
export type InsertPreQualChecklist = typeof preQualChecklist.$inferInsert;

/**
 * Deficiency notices - generated when pre-qualification fails
 */
export const deficiencyNotices = mysqlTable(
  "deficiencyNotices",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    noticeNumber: varchar("noticeNumber", { length: 100 }).notNull().unique(),
    issuedBy: int("issuedBy").notNull(),
    issuedAt: timestamp("issuedAt").defaultNow().notNull(),
    deficiencies: json("deficiencies"),
    dueDate: datetime("dueDate").notNull(),
    documentUrl: varchar("documentUrl", { length: 500 }),
    status: mysqlEnum("status", [
      "issued",
      "acknowledged",
      "responded",
      "resolved",
      "expired",
    ])
      .default("issued")
      .notNull(),
    respondedAt: timestamp("respondedAt"),
    responseNotes: longtext("responseNotes"),
  },
  (table) => ({
    projectIdx: index("projectId_idx").on(table.projectId),
    noticeNumberIdx: uniqueIndex("noticeNumber_idx").on(table.noticeNumber),
  })
);

export type DeficiencyNotice = typeof deficiencyNotices.$inferSelect;
export type InsertDeficiencyNotice = typeof deficiencyNotices.$inferInsert;

// ============================================================================
// MOU MANAGEMENT TABLES
// ============================================================================

/**
 * MOU (Memorandum of Understanding) - 24-month agreement window
 */
export const mous = mysqlTable(
  "mous",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    mouNumber: varchar("mouNumber", { length: 100 }).notNull().unique(),
    startDate: datetime("startDate").notNull(),
    endDate: datetime("endDate").notNull(),
    documentUrl: varchar("documentUrl", { length: 500 }),
    status: mysqlEnum("status", [
      "draft",
      "executed",
      "active",
      "extended",
      "expired",
      "terminated",
    ])
      .default("draft")
      .notNull(),
    executedAt: timestamp("executedAt"),
    executedBy: int("executedBy"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    projectIdx: index("projectId_idx").on(table.projectId),
    mouNumberIdx: uniqueIndex("mouNumber_idx").on(table.mouNumber),
    endDateIdx: index("endDate_idx").on(table.endDate),
  })
);

export type MOU = typeof mous.$inferSelect;
export type InsertMOU = typeof mous.$inferInsert;

/**
 * MOU extensions - track extension requests and approvals
 */
export const mouExtensions = mysqlTable(
  "mouExtensions",
  {
    id: int("id").autoincrement().primaryKey(),
    mouId: int("mouId").notNull(),
    requestedBy: int("requestedBy").notNull(),
    requestedAt: timestamp("requestedAt").defaultNow().notNull(),
    extensionDays: int("extensionDays").notNull(),
    newEndDate: datetime("newEndDate").notNull(),
    reason: longtext("reason"),
    approvedBy: int("approvedBy"),
    approvedAt: timestamp("approvedAt"),
    status: mysqlEnum("status", [
      "pending",
      "approved",
      "rejected",
      "cancelled",
    ])
      .default("pending")
      .notNull(),
  },
  (table) => ({
    mouIdx: index("mouId_idx").on(table.mouId),
    requestedByIdx: index("requestedBy_idx").on(table.requestedBy),
  })
);

export type MOUExtension = typeof mouExtensions.$inferSelect;
export type InsertMOUExtension = typeof mouExtensions.$inferInsert;

// ============================================================================
// DOCUMENT MANAGEMENT TABLES
// ============================================================================

/**
 * Document types catalog
 */
export const documentTypes = mysqlTable(
  "documentTypes",
  {
    id: int("id").autoincrement().primaryKey(),
    typeName: varchar("typeName", { length: 255 }).notNull().unique(),
    description: longtext("description"),
    issuingAgency: varchar("issuingAgency", { length: 255 }),
    isRequired: boolean("isRequired").default(false).notNull(),
    validityPeriodDays: int("validityPeriodDays"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    typeNameIdx: uniqueIndex("typeName_idx").on(table.typeName),
  })
);

export type DocumentType = typeof documentTypes.$inferSelect;
export type InsertDocumentType = typeof documentTypes.$inferInsert;

/**
 * Documents - versioned document storage with metadata
 */
export const documents = mysqlTable(
  "documents",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    documentTypeId: int("documentTypeId").notNull(),
    documentName: varchar("documentName", { length: 255 }).notNull(),
    fileUrl: varchar("fileUrl", { length: 500 }).notNull(),
    fileKey: varchar("fileKey", { length: 500 }).notNull(),
    fileMimeType: varchar("fileMimeType", { length: 100 }),
    fileSize: int("fileSize"),
    version: int("version").default(1).notNull(),
    issuedBy: varchar("issuedBy", { length: 255 }),
    issuedDate: datetime("issuedDate"),
    validityStartDate: datetime("validityStartDate"),
    validityEndDate: datetime("validityEndDate"),
    conditions: longtext("conditions"),
    uploadedBy: int("uploadedBy").notNull(),
    uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
    status: mysqlEnum("status", [
      "pending_verification",
      "verified",
      "rejected",
      "expired",
      "superseded",
    ])
      .default("pending_verification")
      .notNull(),
    verifiedBy: int("verifiedBy"),
    verifiedAt: timestamp("verifiedAt"),
    rejectionReason: longtext("rejectionReason"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    projectIdx: index("projectId_idx").on(table.projectId),
    typeIdx: index("documentTypeId_idx").on(table.documentTypeId),
    uploadedByIdx: index("uploadedBy_idx").on(table.uploadedBy),
    statusIdx: index("status_idx").on(table.status),
  })
);

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * Document versions - audit trail for document changes
 */
export const documentVersions = mysqlTable(
  "documentVersions",
  {
    id: int("id").autoincrement().primaryKey(),
    documentId: int("documentId").notNull(),
    version: int("version").notNull(),
    fileUrl: varchar("fileUrl", { length: 500 }).notNull(),
    fileKey: varchar("fileKey", { length: 500 }).notNull(),
    uploadedBy: int("uploadedBy").notNull(),
    uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
    changeDescription: longtext("changeDescription"),
  },
  (table) => ({
    documentIdx: index("documentId_idx").on(table.documentId),
  })
);

export type DocumentVersion = typeof documentVersions.$inferSelect;
export type InsertDocumentVersion = typeof documentVersions.$inferInsert;

/**
 * Compliance checklist items - required documents per project
 */
export const complianceChecklist = mysqlTable(
  "complianceChecklist",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    documentTypeId: int("documentTypeId").notNull(),
    isRequired: boolean("isRequired").default(true).notNull(),
    isConditional: boolean("isConditional").default(false).notNull(),
    condition: longtext("condition"),
    documentId: int("documentId"),
    isVerified: boolean("isVerified").default(false).notNull(),
    verifiedBy: int("verifiedBy"),
    verifiedAt: timestamp("verifiedAt"),
    notes: longtext("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("projectId_idx").on(table.projectId),
    typeIdx: index("documentTypeId_idx").on(table.documentTypeId),
  })
);

export type ComplianceChecklist = typeof complianceChecklist.$inferSelect;
export type InsertComplianceChecklist = typeof complianceChecklist.$inferInsert;

/**
 * Full compliance notice - issued when all documents verified
 */
export const fullComplianceNotices = mysqlTable(
  "fullComplianceNotices",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    noticeNumber: varchar("noticeNumber", { length: 100 }).notNull().unique(),
    issuedBy: int("issuedBy").notNull(),
    issuedAt: timestamp("issuedAt").defaultNow().notNull(),
    documentUrl: varchar("documentUrl", { length: 500 }),
    status: mysqlEnum("status", [
      "issued",
      "acknowledged",
      "superseded",
    ])
      .default("issued")
      .notNull(),
    acknowledgedAt: timestamp("acknowledgedAt"),
  },
  (table) => ({
    projectIdx: index("projectId_idx").on(table.projectId),
    noticeNumberIdx: uniqueIndex("noticeNumber_idx").on(table.noticeNumber),
  })
);

export type FullComplianceNotice = typeof fullComplianceNotices.$inferSelect;
export type InsertFullComplianceNotice = typeof fullComplianceNotices.$inferInsert;

// ============================================================================
// INTER-AGENCY COORDINATION TABLES
// ============================================================================

/**
 * Agency requests - track requests to external agencies (DENR, NEDA, etc.)
 */
export const agencyRequests = mysqlTable(
  "agencyRequests",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    agencyName: varchar("agencyName", { length: 255 }).notNull(),
    requestType: mysqlEnum("requestType", [
      "environmental_clearance",
      "social_clearance",
      "technical_review",
      "legal_review",
      "financial_review",
      "other",
    ]).notNull(),
    requestedBy: int("requestedBy").notNull(),
    requestedAt: timestamp("requestedAt").defaultNow().notNull(),
    dueDate: datetime("dueDate").notNull(),
    details: longtext("details"),
    followUpCount: int("followUpCount").default(0).notNull(),
    lastFollowUpAt: timestamp("lastFollowUpAt"),
    responseReceivedAt: timestamp("responseReceivedAt"),
    responseDocumentUrl: varchar("responseDocumentUrl", { length: 500 }),
    responseNotes: longtext("responseNotes"),
    status: mysqlEnum("status", [
      "pending",
      "sent",
      "acknowledged",
      "in_review",
      "responded",
      "resolved",
      "overdue",
    ])
      .default("pending")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    projectIdx: index("projectId_idx").on(table.projectId),
    agencyIdx: index("agencyName_idx").on(table.agencyName),
    dueDateIdx: index("dueDate_idx").on(table.dueDate),
  })
);

export type AgencyRequest = typeof agencyRequests.$inferSelect;
export type InsertAgencyRequest = typeof agencyRequests.$inferInsert;

/**
 * Agency reconciliation log - track discrepancies between agencies
 */
export const agencyReconciliation = mysqlTable(
  "agencyReconciliation",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    agency1: varchar("agency1", { length: 255 }).notNull(),
    agency2: varchar("agency2", { length: 255 }).notNull(),
    discrepancyType: varchar("discrepancyType", { length: 255 }).notNull(),
    description: longtext("description").notNull(),
    reportedAt: timestamp("reportedAt").defaultNow().notNull(),
    reportedBy: int("reportedBy").notNull(),
    resolution: longtext("resolution"),
    resolvedAt: timestamp("resolvedAt"),
    resolvedBy: int("resolvedBy"),
    status: mysqlEnum("status", [
      "reported",
      "under_review",
      "resolved",
      "escalated",
    ])
      .default("reported")
      .notNull(),
  },
  (table) => ({
    projectIdx: index("projectId_idx").on(table.projectId),
  })
);

export type AgencyReconciliation = typeof agencyReconciliation.$inferSelect;
export type InsertAgencyReconciliation = typeof agencyReconciliation.$inferInsert;

// ============================================================================
// EVALUATION & ASSESSMENT TABLES
// ============================================================================

/**
 * Evaluations - technical and legal assessment of projects
 */
export const evaluations = mysqlTable(
  "evaluations",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    evaluationType: mysqlEnum("evaluationType", [
      "technical",
      "legal",
      "financial",
      "environmental",
      "social",
    ]).notNull(),
    evaluatedBy: int("evaluatedBy").notNull(),
    evaluatedAt: timestamp("evaluatedAt").defaultNow().notNull(),
    score: decimal("score", { precision: 5, scale: 2 }),
    maxScore: decimal("maxScore", { precision: 5, scale: 2 }),
    notes: longtext("notes"),
    status: mysqlEnum("status", [
      "draft",
      "submitted",
      "reviewed",
      "approved",
      "rejected",
    ])
      .default("draft")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    projectIdx: index("projectId_idx").on(table.projectId),
    evaluatedByIdx: index("evaluatedBy_idx").on(table.evaluatedBy),
  })
);

export type Evaluation = typeof evaluations.$inferSelect;
export type InsertEvaluation = typeof evaluations.$inferInsert;

/**
 * Risk register - track identified risks and mitigation strategies
 */
export const riskRegister = mysqlTable(
  "riskRegister",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    riskCategory: mysqlEnum("riskCategory", [
      "environmental",
      "social",
      "legal",
      "engineering",
      "financial",
      "reputational",
    ]).notNull(),
    riskDescription: longtext("riskDescription").notNull(),
    likelihood: mysqlEnum("likelihood", [
      "low",
      "medium",
      "high",
      "critical",
    ]).notNull(),
    impact: mysqlEnum("impact", [
      "low",
      "medium",
      "high",
      "critical",
    ]).notNull(),
    mitigationStrategy: longtext("mitigationStrategy"),
    owner: int("owner"),
    status: mysqlEnum("status", [
      "identified",
      "mitigated",
      "monitored",
      "escalated",
      "resolved",
    ])
      .default("identified")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    projectIdx: index("projectId_idx").on(table.projectId),
    categoryIdx: index("riskCategory_idx").on(table.riskCategory),
  })
);

export type RiskRegister = typeof riskRegister.$inferSelect;
export type InsertRiskRegister = typeof riskRegister.$inferInsert;

/**
 * CSW (Comprehensive Sustainability Worksheet) - evaluation summary
 */
export const cswPackages = mysqlTable(
  "cswPackages",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    cswNumber: varchar("cswNumber", { length: 100 }).notNull().unique(),
    preparedBy: int("preparedBy").notNull(),
    preparedAt: timestamp("preparedAt").defaultNow().notNull(),
    technicalScore: decimal("technicalScore", { precision: 5, scale: 2 }),
    legalScore: decimal("legalScore", { precision: 5, scale: 2 }),
    financialScore: decimal("financialScore", { precision: 5, scale: 2 }),
    environmentalScore: decimal("environmentalScore", { precision: 5, scale: 2 }),
    socialScore: decimal("socialScore", { precision: 5, scale: 2 }),
    overallScore: decimal("overallScore", { precision: 5, scale: 2 }),
    recommendation: mysqlEnum("recommendation", [
      "approve",
      "approve_with_conditions",
      "defer",
      "reject",
    ]).notNull(),
    documentUrl: varchar("documentUrl", { length: 500 }),
    status: mysqlEnum("status", [
      "draft",
      "submitted",
      "reviewed",
      "finalized",
    ])
      .default("draft")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    projectIdx: index("projectId_idx").on(table.projectId),
    cswNumberIdx: uniqueIndex("cswNumber_idx").on(table.cswNumber),
  })
);

export type CSWPackage = typeof cswPackages.$inferSelect;
export type InsertCSWPackage = typeof cswPackages.$inferInsert;

// ============================================================================
// BOARD MANAGEMENT TABLES
// ============================================================================

/**
 * Board meetings
 */
export const boardMeetings = mysqlTable(
  "boardMeetings",
  {
    id: int("id").autoincrement().primaryKey(),
    meetingNumber: varchar("meetingNumber", { length: 100 }).notNull().unique(),
    meetingDate: datetime("meetingDate").notNull(),
    location: varchar("location", { length: 255 }),
    agendaUrl: varchar("agendaUrl", { length: 500 }),
    minutesUrl: varchar("minutesUrl", { length: 500 }),
    status: mysqlEnum("status", [
      "scheduled",
      "held",
      "cancelled",
      "postponed",
    ])
      .default("scheduled")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    meetingNumberIdx: uniqueIndex("meetingNumber_idx").on(table.meetingNumber),
    meetingDateIdx: index("meetingDate_idx").on(table.meetingDate),
  })
);

export type BoardMeeting = typeof boardMeetings.$inferSelect;
export type InsertBoardMeeting = typeof boardMeetings.$inferInsert;

/**
 * Board decisions - records of board approvals/rejections
 */
export const boardDecisions = mysqlTable(
  "boardDecisions",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    boardMeetingId: int("boardMeetingId").notNull(),
    decision: mysqlEnum("decision", [
      "approved",
      "approved_with_conditions",
      "deferred",
      "rejected",
      "returned_for_revision",
    ]).notNull(),
    decisionDate: datetime("decisionDate").notNull(),
    conditions: longtext("conditions"),
    recordedBy: int("recordedBy").notNull(),
    recordedAt: timestamp("recordedAt").defaultNow().notNull(),
    documentUrl: varchar("documentUrl", { length: 500 }),
    status: mysqlEnum("status", [
      "recorded",
      "implemented",
      "superseded",
    ])
      .default("recorded")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("projectId_idx").on(table.projectId),
    meetingIdx: index("boardMeetingId_idx").on(table.boardMeetingId),
  })
);

export type BoardDecision = typeof boardDecisions.$inferSelect;
export type InsertBoardDecision = typeof boardDecisions.$inferInsert;

/**
 * Resolutions - formal board resolutions
 */
export const resolutions = mysqlTable(
  "resolutions",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    resolutionNumber: varchar("resolutionNumber", { length: 100 }).notNull().unique(),
    boardMeetingId: int("boardMeetingId").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    content: longtext("content").notNull(),
    approvedBy: int("approvedBy").notNull(),
    approvedAt: timestamp("approvedAt").defaultNow().notNull(),
    documentUrl: varchar("documentUrl", { length: 500 }),
    status: mysqlEnum("status", [
      "drafted",
      "approved",
      "signed",
      "implemented",
      "superseded",
    ])
      .default("drafted")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    projectIdx: index("projectId_idx").on(table.projectId),
    resolutionNumberIdx: uniqueIndex("resolutionNumber_idx").on(table.resolutionNumber),
  })
);

export type Resolution = typeof resolutions.$inferSelect;
export type InsertResolution = typeof resolutions.$inferInsert;

/**
 * 90-day timer after full compliance - tracks deadline for board review
 */
export const complianceTimers = mysqlTable(
  "complianceTimers",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    fullComplianceNoticeId: int("fullComplianceNoticeId").notNull(),
    startDate: datetime("startDate").notNull(),
    dueDate: datetime("dueDate").notNull(),
    timerType: mysqlEnum("timerType", [
      "board_review_90days",
      "bidding_preparation",
      "other",
    ]).notNull(),
    status: mysqlEnum("status", [
      "active",
      "completed",
      "extended",
      "expired",
    ])
      .default("active")
      .notNull(),
    completedAt: timestamp("completedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("projectId_idx").on(table.projectId),
    dueDateIdx: index("dueDate_idx").on(table.dueDate),
  })
);

export type ComplianceTimer = typeof complianceTimers.$inferSelect;
export type InsertComplianceTimer = typeof complianceTimers.$inferInsert;

// ============================================================================
// BIDDING & COMPETITIVE SELECTION TABLES
// ============================================================================

/**
 * Bidding events - competitive selection process
 */
export const biddingEvents = mysqlTable(
  "biddingEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    biddingNumber: varchar("biddingNumber", { length: 100 }).notNull().unique(),
    selectionMode: mysqlEnum("selectionMode", [
      "solicited",
      "unsolicited",
      "hybrid",
    ]).notNull(),
    publicationDate: datetime("publicationDate").notNull(),
    preBidDate: datetime("preBidDate"),
    bidSubmissionDeadline: datetime("bidSubmissionDeadline").notNull(),
    bidOpeningDate: datetime("bidOpeningDate").notNull(),
    evaluationDeadline: datetime("evaluationDeadline"),
    awardDate: datetime("awardDate"),
    status: mysqlEnum("status", [
      "published",
      "pre_bid_held",
      "bids_received",
      "bids_opened",
      "under_evaluation",
      "awarded",
      "failed",
      "cancelled",
    ])
      .default("published")
      .notNull(),
    documentUrl: varchar("documentUrl", { length: 500 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    projectIdx: index("projectId_idx").on(table.projectId),
    biddingNumberIdx: uniqueIndex("biddingNumber_idx").on(table.biddingNumber),
  })
);

export type BiddingEvent = typeof biddingEvents.$inferSelect;
export type InsertBiddingEvent = typeof biddingEvents.$inferInsert;

/**
 * Bids - submitted bids from bidders
 */
export const bids = mysqlTable(
  "bids",
  {
    id: int("id").autoincrement().primaryKey(),
    biddingEventId: int("biddingEventId").notNull(),
    bidderName: varchar("bidderName", { length: 255 }).notNull(),
    bidderId: int("bidderId"),
    bidAmount: decimal("bidAmount", { precision: 15, scale: 2 }).notNull(),
    bidDocumentUrl: varchar("bidDocumentUrl", { length: 500 }).notNull(),
    submittedAt: datetime("submittedAt").notNull(),
    status: mysqlEnum("status", [
      "submitted",
      "opened",
      "qualified",
      "disqualified",
      "awarded",
      "rejected",
    ])
      .default("submitted")
      .notNull(),
    disqualificationReason: longtext("disqualificationReason"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    biddingEventIdx: index("biddingEventId_idx").on(table.biddingEventId),
    bidderIdx: index("bidderId_idx").on(table.bidderId),
  })
);

export type Bid = typeof bids.$inferSelect;
export type InsertBid = typeof bids.$inferInsert;

/**
 * Bid evaluations - scoring and evaluation of bids
 */
export const bidEvaluations = mysqlTable(
  "bidEvaluations",
  {
    id: int("id").autoincrement().primaryKey(),
    bidId: int("bidId").notNull(),
    evaluatedBy: int("evaluatedBy").notNull(),
    evaluatedAt: timestamp("evaluatedAt").defaultNow().notNull(),
    technicalScore: decimal("technicalScore", { precision: 5, scale: 2 }),
    financialScore: decimal("financialScore", { precision: 5, scale: 2 }),
    overallScore: decimal("overallScore", { precision: 5, scale: 2 }),
    notes: longtext("notes"),
    recommendation: mysqlEnum("recommendation", [
      "award",
      "reject",
      "defer",
    ]).notNull(),
    status: mysqlEnum("status", [
      "draft",
      "submitted",
      "reviewed",
      "finalized",
    ])
      .default("draft")
      .notNull(),
  },
  (table) => ({
    bidIdx: index("bidId_idx").on(table.bidId),
    evaluatedByIdx: index("evaluatedBy_idx").on(table.evaluatedBy),
  })
);

export type BidEvaluation = typeof bidEvaluations.$inferSelect;
export type InsertBidEvaluation = typeof bidEvaluations.$inferInsert;

/**
 * Bid awards - record of winning bids
 */
export const bidAwards = mysqlTable(
  "bidAwards",
  {
    id: int("id").autoincrement().primaryKey(),
    biddingEventId: int("biddingEventId").notNull(),
    bidId: int("bidId").notNull(),
    awardedTo: varchar("awardedTo", { length: 255 }).notNull(),
    awardDate: datetime("awardDate").notNull(),
    awardedBy: int("awardedBy").notNull(),
    awardAmount: decimal("awardAmount", { precision: 15, scale: 2 }).notNull(),
    documentUrl: varchar("documentUrl", { length: 500 }),
    status: mysqlEnum("status", [
      "awarded",
      "protested",
      "upheld",
      "overturned",
      "implemented",
    ])
      .default("awarded")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    biddingEventIdx: index("biddingEventId_idx").on(table.biddingEventId),
    bidIdx: index("bidId_idx").on(table.bidId),
  })
);

export type BidAward = typeof bidAwards.$inferSelect;
export type InsertBidAward = typeof bidAwards.$inferInsert;

/**
 * Bid protests - track protests and appeals
 */
export const bidProtests = mysqlTable(
  "bidProtests",
  {
    id: int("id").autoincrement().primaryKey(),
    bidAwardId: int("bidAwardId").notNull(),
    protestorName: varchar("protestorName", { length: 255 }).notNull(),
    protestDate: datetime("protestDate").notNull(),
    grounds: longtext("grounds").notNull(),
    documentUrl: varchar("documentUrl", { length: 500 }),
    status: mysqlEnum("status", [
      "filed",
      "acknowledged",
      "under_review",
      "upheld",
      "denied",
      "withdrawn",
    ])
      .default("filed")
      .notNull(),
    resolution: longtext("resolution"),
    resolvedAt: timestamp("resolvedAt"),
    resolvedBy: int("resolvedBy"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    bidAwardIdx: index("bidAwardId_idx").on(table.bidAwardId),
  })
);

export type BidProtest = typeof bidProtests.$inferSelect;
export type InsertBidProtest = typeof bidProtests.$inferInsert;

// ============================================================================
// AGREEMENT EXECUTION TABLES
// ============================================================================

/**
 * Agreement templates - library of reusable agreement templates
 */
export const agreementTemplates = mysqlTable(
  "agreementTemplates",
  {
    id: int("id").autoincrement().primaryKey(),
    templateName: varchar("templateName", { length: 255 }).notNull().unique(),
    description: longtext("description"),
    templateType: mysqlEnum("templateType", [
      "moa",
      "implementing_agreement",
      "concession",
      "lease",
      "other",
    ]).notNull(),
    content: longtext("content").notNull(),
    createdBy: int("createdBy").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    templateNameIdx: uniqueIndex("templateName_idx").on(table.templateName),
  })
);

export type AgreementTemplate = typeof agreementTemplates.$inferSelect;
export type InsertAgreementTemplate = typeof agreementTemplates.$inferInsert;

/**
 * Agreements - executed agreements for projects
 */
export const agreements = mysqlTable(
  "agreements",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    agreementNumber: varchar("agreementNumber", { length: 100 }).notNull().unique(),
    templateId: int("templateId"),
    agreementType: mysqlEnum("agreementType", [
      "moa",
      "implementing_agreement",
      "concession",
      "lease",
      "other",
    ]).notNull(),
    draftUrl: varchar("draftUrl", { length: 500 }),
    executedUrl: varchar("executedUrl", { length: 500 }),
    effectiveDate: datetime("effectiveDate"),
    expiryDate: datetime("expiryDate"),
    status: mysqlEnum("status", [
      "draft",
      "under_review",
      "pending_signatures",
      "executed",
      "active",
      "expired",
      "terminated",
    ])
      .default("draft")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    projectIdx: index("projectId_idx").on(table.projectId),
    agreementNumberIdx: uniqueIndex("agreementNumber_idx").on(table.agreementNumber),
  })
);

export type Agreement = typeof agreements.$inferSelect;
export type InsertAgreement = typeof agreements.$inferInsert;

/**
 * Agreement signatories - track who needs to sign and has signed
 */
export const agreementSignatories = mysqlTable(
  "agreementSignatories",
  {
    id: int("id").autoincrement().primaryKey(),
    agreementId: int("agreementId").notNull(),
    signatoryName: varchar("signatoryName", { length: 255 }).notNull(),
    signatoryRole: varchar("signatoryRole", { length: 255 }).notNull(),
    signatoryOrganization: varchar("signatoryOrganization", { length: 255 }),
    signatureOrder: int("signatureOrder").notNull(),
    signedAt: timestamp("signedAt"),
    signatureUrl: varchar("signatureUrl", { length: 500 }),
    status: mysqlEnum("status", [
      "pending",
      "signed",
      "rejected",
      "cancelled",
    ])
      .default("pending")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    agreementIdx: index("agreementId_idx").on(table.agreementId),
  })
);

export type AgreementSignatory = typeof agreementSignatories.$inferSelect;
export type InsertAgreementSignatory = typeof agreementSignatories.$inferInsert;

/**
 * Conditions precedent - conditions that must be met before proceeding
 */
export const conditionsPrecedent = mysqlTable(
  "conditionsPrecedent",
  {
    id: int("id").autoincrement().primaryKey(),
    agreementId: int("agreementId").notNull(),
    conditionDescription: longtext("conditionDescription").notNull(),
    isRequired: boolean("isRequired").default(true).notNull(),
    isMet: boolean("isMet").default(false).notNull(),
    verifiedBy: int("verifiedBy"),
    verifiedAt: timestamp("verifiedAt"),
    notes: longtext("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    agreementIdx: index("agreementId_idx").on(table.agreementId),
  })
);

export type ConditionsPrecedent = typeof conditionsPrecedent.$inferSelect;
export type InsertConditionsPrecedent = typeof conditionsPrecedent.$inferInsert;

// ============================================================================
// MONITORING & COMPLIANCE TABLES
// ============================================================================

/**
 * Project milestones - key implementation milestones
 */
export const projectMilestones = mysqlTable(
  "projectMilestones",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    milestoneName: varchar("milestoneName", { length: 255 }).notNull(),
    description: longtext("description"),
    milestoneType: mysqlEnum("milestoneType", [
      "dredging",
      "filling",
      "seawall",
      "utilities",
      "construction",
      "other",
    ]).notNull(),
    plannedStartDate: datetime("plannedStartDate"),
    plannedEndDate: datetime("plannedEndDate"),
    actualStartDate: datetime("actualStartDate"),
    actualEndDate: datetime("actualEndDate"),
    status: mysqlEnum("status", [
      "planned",
      "in_progress",
      "completed",
      "delayed",
      "on_hold",
      "cancelled",
    ])
      .default("planned")
      .notNull(),
    completionPercentage: int("completionPercentage").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    projectIdx: index("projectId_idx").on(table.projectId),
  })
);

export type ProjectMilestone = typeof projectMilestones.$inferSelect;
export type InsertProjectMilestone = typeof projectMilestones.$inferInsert;

/**
 * Inspections - scheduled site inspections
 */
export const inspections = mysqlTable(
  "inspections",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    inspectionNumber: varchar("inspectionNumber", { length: 100 }).notNull().unique(),
    inspectionType: mysqlEnum("inspectionType", [
      "routine",
      "compliance_check",
      "incident_response",
      "final_inspection",
      "other",
    ]).notNull(),
    scheduledDate: datetime("scheduledDate").notNull(),
    actualDate: datetime("actualDate"),
    inspectedBy: int("inspectedBy"),
    location: varchar("location", { length: 255 }),
    findings: longtext("findings"),
    photosUrl: varchar("photosUrl", { length: 500 }),
    status: mysqlEnum("status", [
      "scheduled",
      "completed",
      "cancelled",
      "postponed",
    ])
      .default("scheduled")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    projectIdx: index("projectId_idx").on(table.projectId),
    inspectionNumberIdx: uniqueIndex("inspectionNumber_idx").on(table.inspectionNumber),
  })
);

export type Inspection = typeof inspections.$inferSelect;
export type InsertInspection = typeof inspections.$inferInsert;

/**
 * Non-compliance findings - identified violations or issues
 */
export const nonComplianceFindings = mysqlTable(
  "nonComplianceFindings",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    inspectionId: int("inspectionId"),
    findingNumber: varchar("findingNumber", { length: 100 }).notNull().unique(),
    findingType: varchar("findingType", { length: 255 }).notNull(),
    severity: mysqlEnum("severity", [
      "low",
      "medium",
      "high",
      "critical",
    ]).notNull(),
    description: longtext("description").notNull(),
    reportedAt: timestamp("reportedAt").defaultNow().notNull(),
    reportedBy: int("reportedBy").notNull(),
    evidenceUrl: varchar("evidenceUrl", { length: 500 }),
    status: mysqlEnum("status", [
      "reported",
      "acknowledged",
      "under_correction",
      "corrected",
      "verified",
      "escalated",
    ])
      .default("reported")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    projectIdx: index("projectId_idx").on(table.projectId),
    inspectionIdx: index("inspectionId_idx").on(table.inspectionId),
    findingNumberIdx: uniqueIndex("findingNumber_idx").on(table.findingNumber),
  })
);

export type NonComplianceFinding = typeof nonComplianceFindings.$inferSelect;
export type InsertNonComplianceFinding = typeof nonComplianceFindings.$inferInsert;

/**
 * Corrective actions - actions to address non-compliance findings
 */
export const correctiveActions = mysqlTable(
  "correctiveActions",
  {
    id: int("id").autoincrement().primaryKey(),
    findingId: int("findingId").notNull(),
    actionDescription: longtext("actionDescription").notNull(),
    assignedTo: int("assignedTo"),
    dueDate: datetime("dueDate").notNull(),
    completedAt: timestamp("completedAt"),
    completionNotes: longtext("completionNotes"),
    verifiedBy: int("verifiedBy"),
    verifiedAt: timestamp("verifiedAt"),
    status: mysqlEnum("status", [
      "assigned",
      "in_progress",
      "completed",
      "verified",
      "failed",
    ])
      .default("assigned")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    findingIdx: index("findingId_idx").on(table.findingId),
    assignedToIdx: index("assignedTo_idx").on(table.assignedTo),
  })
);

export type CorrectiveAction = typeof correctiveActions.$inferSelect;
export type InsertCorrectiveAction = typeof correctiveActions.$inferInsert;

/**
 * Stop-work orders - internal orders to halt work
 */
export const stopWorkOrders = mysqlTable(
  "stopWorkOrders",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    orderNumber: varchar("orderNumber", { length: 100 }).notNull().unique(),
    issuedBy: int("issuedBy").notNull(),
    issuedAt: timestamp("issuedAt").defaultNow().notNull(),
    reason: longtext("reason").notNull(),
    effectiveDate: datetime("effectiveDate").notNull(),
    liftedDate: datetime("liftedDate"),
    liftedBy: int("liftedBy"),
    documentUrl: varchar("documentUrl", { length: 500 }),
    status: mysqlEnum("status", [
      "issued",
      "acknowledged",
      "active",
      "lifted",
      "expired",
    ])
      .default("issued")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("projectId_idx").on(table.projectId),
    orderNumberIdx: uniqueIndex("orderNumber_idx").on(table.orderNumber),
  })
);

export type StopWorkOrder = typeof stopWorkOrders.$inferSelect;
export type InsertStopWorkOrder = typeof stopWorkOrders.$inferInsert;

/**
 * Project closure - final closure and handover
 */
export const projectClosures = mysqlTable(
  "projectClosures",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    closureNumber: varchar("closureNumber", { length: 100 }).notNull().unique(),
    closureDate: datetime("closureDate").notNull(),
    closedBy: int("closedBy").notNull(),
    finalReportUrl: varchar("finalReportUrl", { length: 500 }),
    lessonsLearned: longtext("lessonsLearned"),
    recommendations: longtext("recommendations"),
    status: mysqlEnum("status", [
      "initiated",
      "in_progress",
      "completed",
      "verified",
    ])
      .default("initiated")
      .notNull(),
    verifiedAt: timestamp("verifiedAt"),
    verifiedBy: int("verifiedBy"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("projectId_idx").on(table.projectId),
    closureNumberIdx: uniqueIndex("closureNumber_idx").on(table.closureNumber),
  })
);

export type ProjectClosure = typeof projectClosures.$inferSelect;
export type InsertProjectClosure = typeof projectClosures.$inferInsert;

// ============================================================================
// COMMUNICATION & NOTIFICATION TABLES
// ============================================================================

/**
 * Messages - in-app messaging per project thread
 */
export const messages = mysqlTable(
  "messages",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    senderId: int("senderId").notNull(),
    messageType: mysqlEnum("messageType", [
      "general",
      "document_submission",
      "deficiency_notice",
      "approval",
      "rejection",
      "other",
    ]).notNull(),
    subject: varchar("subject", { length: 255 }),
    content: longtext("content").notNull(),
    attachmentUrl: varchar("attachmentUrl", { length: 500 }),
    sentAt: timestamp("sentAt").defaultNow().notNull(),
    isRead: boolean("isRead").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("projectId_idx").on(table.projectId),
    senderIdx: index("senderId_idx").on(table.senderId),
  })
);

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Notifications - email and in-app notifications
 */
export const notifications = mysqlTable(
  "notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    projectId: int("projectId"),
    notificationType: mysqlEnum("notificationType", [
      "deficiency_notice",
      "due_date_reminder",
      "document_expiry",
      "board_meeting",
      "deadline_escalation",
      "task_assignment",
      "status_change",
      "other",
    ]).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    message: longtext("message").notNull(),
    relatedEntityId: int("relatedEntityId"),
    relatedEntityType: varchar("relatedEntityType", { length: 100 }),
    isRead: boolean("isRead").default(false).notNull(),
    sentViaEmail: boolean("sentViaEmail").default(false).notNull(),
    sentAt: timestamp("sentAt").defaultNow().notNull(),
    readAt: timestamp("readAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("userId_idx").on(table.userId),
    projectIdx: index("projectId_idx").on(table.projectId),
  })
);

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ============================================================================
// PUBLIC PORTAL TABLES
// ============================================================================

/**
 * Public comments - moderated comments from public on projects
 */
export const publicComments = mysqlTable(
  "publicComments",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    commenterName: varchar("commenterName", { length: 255 }).notNull(),
    commenterEmail: varchar("commenterEmail", { length: 320 }),
    commentText: longtext("commentText").notNull(),
    submittedAt: timestamp("submittedAt").defaultNow().notNull(),
    moderationStatus: mysqlEnum("moderationStatus", [
      "pending",
      "approved",
      "rejected",
      "flagged",
    ])
      .default("pending")
      .notNull(),
    moderatedBy: int("moderatedBy"),
    moderatedAt: timestamp("moderatedAt"),
    moderationNotes: longtext("moderationNotes"),
    isPublished: boolean("isPublished").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("projectId_idx").on(table.projectId),
    moderationIdx: index("moderationStatus_idx").on(table.moderationStatus),
  })
);

export type PublicComment = typeof publicComments.$inferSelect;
export type InsertPublicComment = typeof publicComments.$inferInsert;

/**
 * Consultations - public consultation events
 */
export const consultations = mysqlTable(
  "consultations",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    consultationNumber: varchar("consultationNumber", { length: 100 }).notNull().unique(),
    consultationType: varchar("consultationType", { length: 255 }).notNull(),
    scheduledDate: datetime("scheduledDate").notNull(),
    location: varchar("location", { length: 255 }),
    description: longtext("description"),
    status: mysqlEnum("status", [
      "scheduled",
      "held",
      "cancelled",
      "postponed",
    ])
      .default("scheduled")
      .notNull(),
    minutesUrl: varchar("minutesUrl", { length: 500 }),
    attendanceCount: int("attendanceCount"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    projectIdx: index("projectId_idx").on(table.projectId),
    consultationNumberIdx: uniqueIndex("consultationNumber_idx").on(table.consultationNumber),
  })
);

export type Consultation = typeof consultations.$inferSelect;
export type InsertConsultation = typeof consultations.$inferInsert;

/**
 * Enforcement cases - unauthorized reclamation cases
 */
export const enforcementCases = mysqlTable(
  "enforcementCases",
  {
    id: int("id").autoincrement().primaryKey(),
    caseNumber: varchar("caseNumber", { length: 100 }).notNull().unique(),
    complaintType: varchar("complaintType", { length: 255 }).notNull(),
    location: varchar("location", { length: 255 }).notNull(),
    suspectedParties: longtext("suspectedParties"),
    reportedAt: timestamp("reportedAt").defaultNow().notNull(),
    reportedBy: int("reportedBy"),
    evidence: longtext("evidence"),
    verificationStatus: mysqlEnum("verificationStatus", [
      "pending",
      "verified",
      "not_verified",
      "escalated",
    ])
      .default("pending")
      .notNull(),
    verifiedAt: timestamp("verifiedAt"),
    verifiedBy: int("verifiedBy"),
    enforcementActions: longtext("enforcementActions"),
    caseStatus: mysqlEnum("caseStatus", [
      "intake",
      "investigation",
      "enforcement",
      "resolved",
      "closed",
    ])
      .default("intake")
      .notNull(),
    closedAt: timestamp("closedAt"),
    closedBy: int("closedBy"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    caseNumberIdx: uniqueIndex("caseNumber_idx").on(table.caseNumber),
  })
);

export type EnforcementCase = typeof enforcementCases.$inferSelect;
export type InsertEnforcementCase = typeof enforcementCases.$inferInsert;

// ============================================================================
// AUDIT & LOGGING TABLES
// ============================================================================

/**
 * Audit logs - comprehensive audit trail of all changes
 */
export const auditLogs = mysqlTable(
  "auditLogs",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    entityType: varchar("entityType", { length: 100 }).notNull(),
    entityId: int("entityId").notNull(),
    action: mysqlEnum("action", [
      "create",
      "read",
      "update",
      "delete",
      "approve",
      "reject",
      "submit",
      "verify",
      "other",
    ]).notNull(),
    oldValues: json("oldValues"),
    newValues: json("newValues"),
    changeDescription: longtext("changeDescription"),
    ipAddress: varchar("ipAddress", { length: 45 }),
    userAgent: varchar("userAgent", { length: 500 }),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("userId_idx").on(table.userId),
    entityIdx: index("entityType_idx").on(table.entityType),
    timestampIdx: index("timestamp_idx").on(table.timestamp),
  })
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ============================================================================
// ADMIN & CONFIGURATION TABLES
// ============================================================================

/**
 * SLA configurations - configurable SLA rules per stage
 */
export const slaConfigurations = mysqlTable(
  "slaConfigurations",
  {
    id: int("id").autoincrement().primaryKey(),
    stageName: varchar("stageName", { length: 100 }).notNull().unique(),
    defaultDays: int("defaultDays").notNull(),
    escalationDays: int("escalationDays"),
    description: longtext("description"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    stageNameIdx: uniqueIndex("stageName_idx").on(table.stageName),
  })
);

export type SLAConfiguration = typeof slaConfigurations.$inferSelect;
export type InsertSLAConfiguration = typeof slaConfigurations.$inferInsert;

/**
 * Project access control - per-project role assignments
 */
export const projectAccess = mysqlTable(
  "projectAccess",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    userId: int("userId").notNull(),
    role: mysqlEnum("role", [
      "admin",
      "evaluator",
      "secretariat",
      "board_member",
      "proponent",
      "agency_reviewer",
      "enforcement_officer",
      "viewer",
    ]).notNull(),
    grantedBy: int("grantedBy").notNull(),
    grantedAt: timestamp("grantedAt").defaultNow().notNull(),
    revokedAt: timestamp("revokedAt"),
    revokedBy: int("revokedBy"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("projectId_idx").on(table.projectId),
    userIdx: index("userId_idx").on(table.userId),
  })
);

export type ProjectAccess = typeof projectAccess.$inferSelect;
export type InsertProjectAccess = typeof projectAccess.$inferInsert;
