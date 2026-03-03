/**
 * ReclaimFlow PH — Demo Seed Data Generator
 *
 * Creates 12 realistic Philippine Reclamation Authority projects, one at each
 * lifecycle stage, with associated SLA timers, MOU records, users, documents,
 * compliance checklist items, evaluations, board decisions, and audit logs.
 *
 * Usage:
 *   node scripts/seed-demo-data.mjs
 *
 * Safe to re-run: checks for existing seed marker before inserting.
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

// ─── Connection ───────────────────────────────────────────────────────────────
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 5,
});
const db = drizzle(pool);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function daysAgo(days) {
  return daysFromNow(-days);
}

function randomCode(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

// ─── Seed Users (one per role) ────────────────────────────────────────────────
const SEED_USERS = [
  { openId: "seed-admin-001",       name: "Maria Santos",       email: "admin@pra.gov.ph",         role: "admin",               department: "Office of the Administrator",    agencyAffiliation: "PRA" },
  { openId: "seed-evaluator-001",   name: "Jose Reyes",         email: "evaluator@pra.gov.ph",     role: "evaluator",           department: "Technical Evaluation Division",  agencyAffiliation: "PRA" },
  { openId: "seed-secretariat-001", name: "Ana Dela Cruz",      email: "secretariat@pra.gov.ph",   role: "secretariat",         department: "Board Secretariat",             agencyAffiliation: "PRA" },
  { openId: "seed-board-001",       name: "Atty. Ramon Bautista", email: "board1@pra.gov.ph",      role: "board_member",        department: "Board of Directors",            agencyAffiliation: "PRA" },
  { openId: "seed-board-002",       name: "Engr. Liza Mendoza", email: "board2@pra.gov.ph",        role: "board_member",        department: "Board of Directors",            agencyAffiliation: "PRA" },
  { openId: "seed-proponent-001",   name: "Carlos Tan",         email: "proponent1@developer.ph",  role: "proponent",           department: null,                            agencyAffiliation: "Tan Development Corp." },
  { openId: "seed-proponent-002",   name: "Grace Lim",          email: "proponent2@lgu.ph",        role: "proponent",           department: "City Planning Office",          agencyAffiliation: "City of Manila" },
  { openId: "seed-agency-001",      name: "Dir. Pedro Villanueva", email: "denr@denr.gov.ph",      role: "agency_reviewer",     department: "Coastal Zone Management",       agencyAffiliation: "DENR" },
  { openId: "seed-agency-002",      name: "Engr. Rosa Aquino",  email: "neda@neda.gov.ph",         role: "agency_reviewer",     department: "Infrastructure Division",       agencyAffiliation: "NEDA" },
  { openId: "seed-enforce-001",     name: "Insp. Miguel Cruz",  email: "enforcement@pra.gov.ph",   role: "enforcement_officer", department: "Compliance & Enforcement",      agencyAffiliation: "PRA" },
  { openId: "seed-public-001",      name: "Barangay Kapitan Nora Flores", email: "public@brgy.ph", role: "public",              department: null,                            agencyAffiliation: null },
];

// ─── 12 Realistic Philippine Reclamation Projects ────────────────────────────
const PROJECTS = [
  {
    projectCode: "PRA-2024-001",
    projectName: "Manila Bay South Reclamation Project",
    description: "A 318-hectare mixed-use reclamation development along the southern shoreline of Manila Bay, intended for commercial, residential, and tourism use. The project will include a waterfront promenade, business district, and affordable housing component.",
    location: "Parañaque City, Metro Manila",
    proponentType: "developer",
    estimatedArea: "318.00",
    estimatedCost: "45000000000.00",
    estimatedTimeline: 84,
    projectPurpose: "Mixed-use commercial and residential development",
    currentStage: "intake",
    status: "submitted",
    submittedDaysAgo: 5,
  },
  {
    projectCode: "PRA-2024-002",
    projectName: "Cebu Port Expansion Reclamation",
    description: "Reclamation of 120 hectares adjacent to the Cebu International Port to accommodate expanded cargo handling facilities, a logistics hub, and a container terminal. Project includes a 4-lane access road and utility infrastructure.",
    location: "Lapu-Lapu City, Cebu",
    proponentType: "government",
    estimatedArea: "120.00",
    estimatedCost: "18500000000.00",
    estimatedTimeline: 60,
    projectPurpose: "Port expansion and logistics hub",
    currentStage: "pre_qualification",
    status: "in_progress",
    submittedDaysAgo: 45,
  },
  {
    projectCode: "PRA-2024-003",
    projectName: "Davao Gulf Eco-Tourism Reclamation",
    description: "A 75-hectare eco-tourism reclamation development on the western shore of Davao Gulf. The project features mangrove buffer zones, a marine sanctuary, boutique resort areas, and a cultural heritage center showcasing Mindanao traditions.",
    location: "Davao City, Davao del Sur",
    proponentType: "developer",
    estimatedArea: "75.00",
    estimatedCost: "9200000000.00",
    estimatedTimeline: 48,
    projectPurpose: "Eco-tourism and cultural heritage development",
    currentStage: "mou",
    status: "in_progress",
    submittedDaysAgo: 120,
    mouStartDaysAgo: 30,
  },
  {
    projectCode: "PRA-2024-004",
    projectName: "Subic Bay Industrial Reclamation",
    description: "A 200-hectare industrial reclamation in the Subic Bay Freeport Zone to support shipbuilding, ship repair, and heavy manufacturing. The development includes a dry dock facility, industrial lots, and worker housing.",
    location: "Subic Bay Freeport Zone, Zambales",
    proponentType: "developer",
    estimatedArea: "200.00",
    estimatedCost: "28000000000.00",
    estimatedTimeline: 72,
    projectPurpose: "Industrial and shipbuilding complex",
    currentStage: "compliance_docs",
    status: "in_progress",
    submittedDaysAgo: 180,
    mouStartDaysAgo: 90,
  },
  {
    projectCode: "PRA-2024-005",
    projectName: "Iloilo City Waterfront District",
    description: "A 95-hectare reclamation project along the Iloilo Strait to create a modern waterfront district with commercial towers, a convention center, a public park, and pedestrian-friendly esplanade. Designed to complement the existing Iloilo Business Park.",
    location: "Iloilo City, Iloilo",
    proponentType: "lgu",
    estimatedArea: "95.00",
    estimatedCost: "12000000000.00",
    estimatedTimeline: 60,
    projectPurpose: "Urban waterfront commercial and civic development",
    currentStage: "full_compliance",
    status: "in_progress",
    submittedDaysAgo: 240,
    mouStartDaysAgo: 150,
  },
  {
    projectCode: "PRA-2024-006",
    projectName: "Batangas Bay Energy Hub Reclamation",
    description: "A 160-hectare reclamation in Batangas Bay to establish a liquefied natural gas (LNG) receiving terminal, a power generation facility, and supporting petrochemical industries. The project is critical to the Luzon grid's energy security.",
    location: "Batangas City, Batangas",
    proponentType: "developer",
    estimatedArea: "160.00",
    estimatedCost: "35000000000.00",
    estimatedTimeline: 96,
    projectPurpose: "LNG terminal and energy hub",
    currentStage: "evaluation",
    status: "in_progress",
    submittedDaysAgo: 300,
    mouStartDaysAgo: 210,
  },
  {
    projectCode: "PRA-2024-007",
    projectName: "Cagayan de Oro Coastal Resilience Reclamation",
    description: "A 55-hectare reclamation project in Macajalar Bay designed to provide coastal flood protection for Cagayan de Oro City, incorporating a seawall, mangrove restoration, and a linear park. The project addresses recurring flooding from typhoons.",
    location: "Cagayan de Oro City, Misamis Oriental",
    proponentType: "lgu",
    estimatedArea: "55.00",
    estimatedCost: "7500000000.00",
    estimatedTimeline: 42,
    projectPurpose: "Coastal flood protection and resilience",
    currentStage: "board_review",
    status: "in_progress",
    submittedDaysAgo: 360,
    mouStartDaysAgo: 270,
  },
  {
    projectCode: "PRA-2024-008",
    projectName: "Zamboanga City Fisheries Modernization Reclamation",
    description: "A 40-hectare reclamation adjacent to the Zamboanga City Fish Port Complex to modernize fish landing, cold storage, and processing facilities. The project will increase fish throughput capacity by 300% and create 5,000 direct jobs.",
    location: "Zamboanga City, Zamboanga del Sur",
    proponentType: "government",
    estimatedArea: "40.00",
    estimatedCost: "5800000000.00",
    estimatedTimeline: 36,
    projectPurpose: "Fisheries modernization and food security",
    currentStage: "bidding",
    status: "in_progress",
    submittedDaysAgo: 420,
    mouStartDaysAgo: 330,
  },
  {
    projectCode: "PRA-2024-009",
    projectName: "Clark Freeport Aerotropolis Reclamation",
    description: "A 250-hectare reclamation adjacent to the Clark International Airport to develop an aerotropolis with logistics parks, aviation-related industries, a hotel district, and a transit-oriented development zone linked to the North-South Commuter Railway.",
    location: "Clark Freeport Zone, Pampanga",
    proponentType: "developer",
    estimatedArea: "250.00",
    estimatedCost: "42000000000.00",
    estimatedTimeline: 120,
    projectPurpose: "Aerotropolis and aviation-related development",
    currentStage: "agreement",
    status: "approved",
    submittedDaysAgo: 480,
    mouStartDaysAgo: 390,
  },
  {
    projectCode: "PRA-2024-010",
    projectName: "Palawan Sustainable Tourism Reclamation",
    description: "A 30-hectare low-impact reclamation in Honda Bay, Palawan, to develop a sustainable tourism village with eco-lodges, a marine research station, and a dive center. The project adheres to strict environmental standards to protect the Palawan Biosphere Reserve.",
    location: "Puerto Princesa City, Palawan",
    proponentType: "developer",
    estimatedArea: "30.00",
    estimatedCost: "3200000000.00",
    estimatedTimeline: 36,
    projectPurpose: "Sustainable eco-tourism development",
    currentStage: "monitoring",
    status: "in_progress",
    submittedDaysAgo: 540,
    mouStartDaysAgo: 450,
    agreementSignedDaysAgo: 60,
  },
  {
    projectCode: "PRA-2024-011",
    projectName: "Laguna Lake Reclamation and Flood Control",
    description: "A 180-hectare reclamation along the northern shore of Laguna Lake to construct a flood retention basin, a pumping station network, and a linear park. The project will reduce flood risk for 12 municipalities in Laguna and Rizal provinces.",
    location: "Bay, Laguna",
    proponentType: "government",
    estimatedArea: "180.00",
    estimatedCost: "22000000000.00",
    estimatedTimeline: 60,
    projectPurpose: "Flood control and water resource management",
    currentStage: "closure",
    status: "complete",
    submittedDaysAgo: 720,
    mouStartDaysAgo: 630,
    agreementSignedDaysAgo: 180,
    completedDaysAgo: 10,
  },
  {
    projectCode: "PRA-2024-012",
    projectName: "Tacloban Yolanda Recovery Reclamation",
    description: "A 65-hectare reclamation in Leyte Gulf as part of the Yolanda recovery and rehabilitation program. The project will relocate informal settlers from high-risk coastal areas to a planned community with complete utilities, schools, and a health center.",
    location: "Tacloban City, Leyte",
    proponentType: "ngo",
    estimatedArea: "65.00",
    estimatedCost: "8900000000.00",
    estimatedTimeline: 48,
    projectPurpose: "Disaster recovery and socialized housing",
    currentStage: "pre_qualification",
    status: "deficient",
    submittedDaysAgo: 60,
  },
];

// ─── Stage SLA days mapping ────────────────────────────────────────────────────
const SLA_DAYS = {
  intake: 30,
  pre_qualification: 60,
  mou: 45,
  compliance_docs: 90,
  full_compliance: 120,
  evaluation: 60,
  board_review: 30,
  bidding: 90,
  agreement: 45,
  monitoring: 365,
  closure: 30,
  mou_expiry: 730, // 24-month MOU validity
};

// ─── Main Seed Function ───────────────────────────────────────────────────────
async function seed() {
  console.log("🌱 ReclaimFlow PH — Demo Seed Data Generator");
  console.log("─".repeat(60));

  // Check if seed has already run
  const [existing] = await pool.execute(
    "SELECT id FROM users WHERE openId = 'seed-admin-001' LIMIT 1"
  );
  if (existing.length > 0) {
    console.log("⚠  Seed data already exists. Use --force to re-seed.");
    if (!process.argv.includes("--force")) {
      await pool.end();
      return;
    }
    console.log("🔄 --force flag detected. Clearing existing seed data...");
    await clearSeedData();
  }

  // ── 1. Insert seed users ───────────────────────────────────────────────────
  console.log("\n👤 Inserting seed users...");
  const userIds = {};
  for (const u of SEED_USERS) {
    const [result] = await pool.execute(
      `INSERT INTO users (openId, name, email, loginMethod, role, department, agencyAffiliation, isActive, createdAt, updatedAt, lastSignedIn)
       VALUES (?, ?, ?, 'seed', ?, ?, ?, 1, NOW(), NOW(), NOW())`,
      [u.openId, u.name, u.email, u.role, u.department || null, u.agencyAffiliation || null]
    );
    userIds[u.role] = userIds[u.role] || result.insertId;
    userIds[u.openId] = result.insertId;
    console.log(`  ✓ ${u.role}: ${u.name} (ID: ${result.insertId})`);
  }

  const adminId = userIds["seed-admin-001"];
  const evaluatorId = userIds["seed-evaluator-001"];
  const proponent1Id = userIds["seed-proponent-001"];
  const proponent2Id = userIds["seed-proponent-002"];

  // ── 2. Insert projects ─────────────────────────────────────────────────────
  console.log("\n📋 Inserting 12 demo projects...");
  const projectIds = [];

  for (let i = 0; i < PROJECTS.length; i++) {
    const p = PROJECTS[i];
    const proponentId = i % 2 === 0 ? proponent1Id : proponent2Id;
    const submittedAt = daysAgo(p.submittedDaysAgo);
    const completedAt = p.completedDaysAgo ? daysAgo(p.completedDaysAgo) : null;

    const [result] = await pool.execute(
      `INSERT INTO projects (projectCode, projectName, description, proponentId, proponentType, location,
        estimatedArea, estimatedCost, estimatedTimeline, projectPurpose, currentStage, status,
        createdAt, updatedAt, submittedAt, completedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?)`,
      [
        p.projectCode, p.projectName, p.description, proponentId, p.proponentType, p.location,
        p.estimatedArea, p.estimatedCost, p.estimatedTimeline, p.projectPurpose,
        p.currentStage, p.status, submittedAt, completedAt
      ]
    );
    const projectId = result.insertId;
    projectIds.push(projectId);
    console.log(`  ✓ [${p.currentStage.padEnd(16)}] ${p.projectCode} — ${p.projectName.substring(0, 50)}`);

    // ── 2a. LOI submission ─────────────────────────────────────────────────
    await pool.execute(
      `INSERT INTO loiSubmissions (projectId, submittedBy, status, submittedAt)
       VALUES (?, ?, 'submitted', ?)`,
      [projectId, proponentId, submittedAt]
    );

    // ── 2b. SLA timer for current stage ───────────────────────────────────
    const stageDays = SLA_DAYS[p.currentStage] || 30;
    const stageStartDaysAgo = Math.floor(p.submittedDaysAgo / 2);
    const dueDate = daysFromNow(stageDays - stageStartDaysAgo);
    const isOverdue = dueDate < new Date();

    await pool.execute(
      `INSERT INTO slaTimers (projectId, stage, dueDateDays, dueDate, isOverdue, createdAt)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [projectId, p.currentStage, stageDays, dueDate, isOverdue ? 1 : 0]
    );

    // ── 2c. MOU record for projects in mou stage or beyond ────────────────
    if (p.mouStartDaysAgo) {
      const mouStart = daysAgo(p.mouStartDaysAgo);
      const mouEnd = new Date(mouStart);
      mouEnd.setDate(mouEnd.getDate() + 730); // 24 months
      const mouStatus = mouEnd < new Date() ? "expired" : "active";
      const mouNumber = `MOU-${p.projectCode}`;

      const [mouResult] = await pool.execute(
        `INSERT INTO mous (projectId, mouNumber, startDate, endDate, status, executedAt, executedBy, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [projectId, mouNumber, mouStart, mouEnd, mouStatus, mouStart, adminId]
      );

      // MOU expiry SLA timer
      const mouExpirySlaDate = mouEnd;
      const mouIsOverdue = mouExpirySlaDate < new Date();
      await pool.execute(
        `INSERT INTO slaTimers (projectId, stage, dueDateDays, dueDate, isOverdue, createdAt)
         VALUES (?, 'mou_expiry', 730, ?, ?, NOW())`,
        [projectId, mouExpirySlaDate, mouIsOverdue ? 1 : 0]
      );
    }

    // ── 2d. Compliance checklist items ─────────────────────────────────────
    const checklistItems = [
      { item: "Environmental Compliance Certificate (ECC)", required: true, verified: p.currentStage !== "intake" && p.currentStage !== "pre_qualification" },
      { item: "Foreshore Lease Agreement", required: true, verified: p.currentStage === "monitoring" || p.currentStage === "closure" || p.currentStage === "agreement" },
      { item: "DENR Clearance", required: true, verified: ["evaluation", "board_review", "bidding", "agreement", "monitoring", "closure"].includes(p.currentStage) },
      { item: "NEDA Investment Coordination Committee Endorsement", required: true, verified: ["board_review", "bidding", "agreement", "monitoring", "closure"].includes(p.currentStage) },
      { item: "Local Government Unit Resolution of Support", required: false, verified: p.currentStage !== "intake" },
    ];

    // Use documentTypeId=1 as placeholder for seed data (ECC, FLA, DENR, NEDA, LGU)
    const docTypeIds = [1, 2, 3, 4, 5];
    for (let ci_i = 0; ci_i < checklistItems.length; ci_i++) {
      const ci = checklistItems[ci_i];
      await pool.execute(
        `INSERT INTO complianceChecklist (projectId, documentTypeId, isRequired, isVerified, verifiedBy, verifiedAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          projectId, docTypeIds[ci_i] || 1, ci.required ? 1 : 0, ci.verified ? 1 : 0,
          ci.verified ? evaluatorId : null,
          ci.verified ? daysAgo(Math.floor(p.submittedDaysAgo / 3)) : null
        ]
      );
    }

    // ── 2e. Evaluation record for evaluation+ stages ───────────────────────
    if (["evaluation", "board_review", "bidding", "agreement", "monitoring", "closure"].includes(p.currentStage)) {
      await pool.execute(
        `INSERT INTO evaluations (projectId, evaluationType, evaluatedBy, score, maxScore, status, notes)
         VALUES (?, 'technical', ?, ?, 100, 'approved', ?)`,
        [
          projectId, evaluatorId,
          (65 + Math.floor(Math.random() * 30)).toFixed(2),
          `Technical evaluation completed. Project demonstrates compliance with PRA technical standards. Environmental impact assessment reviewed and found acceptable. Coastal engineering design meets minimum specifications.`
        ]
      );
    }

    // ── 2f. Board decision for board_review+ stages ────────────────────────
    if (["board_review", "bidding", "agreement", "monitoring", "closure"].includes(p.currentStage)) {
      const boardMeetingDate = daysAgo(Math.floor(p.submittedDaysAgo / 4));
      const meetingNumber = `BM-${p.projectCode}-${Date.now()}`;
      const [bmResult] = await pool.execute(
        `INSERT INTO boardMeetings (meetingNumber, meetingDate, status)
         VALUES (?, ?, 'held')`,
        [meetingNumber, boardMeetingDate]
      );
      const boardMeetingId = bmResult.insertId;

      await pool.execute(
        `INSERT INTO boardDecisions (projectId, boardMeetingId, decision, decisionDate, conditions, recordedBy)
         VALUES (?, ?, 'approved', ?, ?, ?)`,
        [
          projectId, boardMeetingId, boardMeetingDate,
          `The Board of Directors of the Philippine Reclamation Authority hereby approves the ${p.projectName} for proceeding to the next stage of the reclamation approval process, subject to compliance with all applicable laws, rules, and regulations.`,
          userIds["seed-secretariat-001"]
        ]
      );
    }

    // ── 2g. Audit log for project creation ────────────────────────────────
    await pool.execute(
      `INSERT INTO auditLogs (userId, entityType, entityId, action, changeDescription, ipAddress, userAgent, createdAt)
       VALUES (?, 'project', ?, 'submit', ?, '127.0.0.1', 'seed-script/1.0', ?)`,
      [
        proponentId, projectId,
        `[SEED] LOI submitted for ${p.projectName} (${p.projectCode}) by ${i % 2 === 0 ? "Carlos Tan" : "Grace Lim"}`,
        submittedAt
      ]
    );

    // Stage transition audit log
    if (p.currentStage !== "intake") {
      await pool.execute(
        `INSERT INTO auditLogs (userId, entityType, entityId, action, changeDescription, ipAddress, userAgent)
         VALUES (?, 'project', ?, 'update', ?, '127.0.0.1', 'seed-script/1.0')`,
        [
          evaluatorId, projectId,
          `[SEED] Project advanced to stage: ${p.currentStage}`
        ]
      );
    }
  }

  // ── 3. SLA Configurations ──────────────────────────────────────────────────
  console.log("\n⏱  Inserting SLA configurations...");
  const slaConfigs = [
    { stage: "intake",           defaultDays: 30,  escalationDays: 7,  description: "Letter of Intent review and initial assessment" },
    { stage: "pre_qualification", defaultDays: 60, escalationDays: 14, description: "Pre-qualification assessment and checklist verification" },
    { stage: "mou",              defaultDays: 45,  escalationDays: 10, description: "MOU drafting, negotiation, and execution" },
    { stage: "compliance_docs",  defaultDays: 90,  escalationDays: 14, description: "Compliance documentation submission and review" },
    { stage: "full_compliance",  defaultDays: 120, escalationDays: 21, description: "Full compliance verification and agency clearances" },
    { stage: "evaluation",       defaultDays: 60,  escalationDays: 14, description: "Technical, financial, and environmental evaluation" },
    { stage: "board_review",     defaultDays: 30,  escalationDays: 7,  description: "Board of Directors review and decision" },
    { stage: "bidding",          defaultDays: 90,  escalationDays: 14, description: "Competitive bidding process" },
    { stage: "agreement",        defaultDays: 45,  escalationDays: 10, description: "Agreement drafting, review, and execution" },
    { stage: "monitoring",       defaultDays: 365, escalationDays: 30, description: "Annual compliance monitoring and inspection" },
    { stage: "closure",          defaultDays: 30,  escalationDays: 7,  description: "Project closure and final documentation" },
  ];

  for (const sc of slaConfigs) {
    await pool.execute(
      `INSERT INTO slaConfigurations (stageName, defaultDays, escalationDays, description, isActive)
       VALUES (?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE defaultDays = VALUES(defaultDays), escalationDays = VALUES(escalationDays)`,
      [sc.stage, sc.defaultDays, sc.escalationDays, sc.description]
    );
  }
  console.log(`  ✓ ${slaConfigs.length} SLA configurations inserted`);

  // ── 4. Summary ─────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(60));
  console.log("✅ Seed complete!");
  console.log(`   Users:    ${SEED_USERS.length}`);
  console.log(`   Projects: ${PROJECTS.length} (one per lifecycle stage)`);
  console.log(`   SLA Configs: ${slaConfigs.length}`);
  console.log("\nStage distribution:");
  PROJECTS.forEach(p => {
    console.log(`  ${p.currentStage.padEnd(18)} → ${p.projectCode}`);
  });

  await pool.end();
}

async function clearSeedData() {
  // Delete in dependency order
  const tables = [
    "auditLogs", "boardDecisions", "boardMeetings", "evaluations",
    "complianceChecklist", "slaTimers", "mous", "loiSubmissions",
    "projects", "users"
  ];
  for (const table of tables) {
    try {
      if (table === "users") {
        await pool.execute(`DELETE FROM users WHERE openId LIKE 'seed-%'`);
      } else if (table === "projects") {
        await pool.execute(`DELETE FROM projects WHERE projectCode LIKE 'PRA-2024-%'`);
      } else {
        // Cascade via FK or delete orphaned rows
        await pool.execute(
          `DELETE FROM ${table} WHERE projectId IN (SELECT id FROM projects WHERE projectCode LIKE 'PRA-2024-%') OR userAgent = 'seed-script/1.0'`
        );
      }
    } catch {
      // Ignore errors for tables without projectId or userAgent
    }
  }
  console.log("  ✓ Existing seed data cleared");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
