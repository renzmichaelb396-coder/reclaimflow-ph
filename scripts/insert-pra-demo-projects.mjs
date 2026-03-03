/**
 * PRA Demo Projects Insertion Script
 * ─────────────────────────────────────────────────────────────────────────────
 * Inserts 3 realistic Philippine Reclamation Authority demo projects:
 *   1. Manila Bay Integrated Reclamation Phase II  — stage: evaluation
 *   2. Cebu South Road Properties Expansion        — stage: board_review
 *   3. Iloilo Sunset Boulevard Reclamation         — stage: monitoring
 *
 * All projects are marked isDemo = true.
 * Description includes: "This is simulated data for demonstration purposes only."
 *
 * Usage:
 *   node scripts/insert-pra-demo-projects.mjs
 *   node scripts/insert-pra-demo-projects.mjs --force   (re-insert even if exists)
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const pool = await mysql.createPool(process.env.DATABASE_URL);

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
function fmt(d) {
  return d.toISOString().slice(0, 19).replace("T", " ");
}

const counts = {
  projects: 0, loiSubmissions: 0, preQualChecklist: 0, mous: 0,
  documentTypes: 0, documents: 0, agencyRequests: 0, evaluations: 0,
  boardMeetings: 0, boardDecisions: 0, biddingEvents: 0, bids: 0,
  agreements: 0, inspections: 0, nonComplianceFindings: 0,
  correctiveActions: 0, enforcementCases: 0, slaTimers: 0, auditLogs: 0,
};

const DEMO_USERS = [
  { openId: "demo-admin-001",    name: "Dir. Maribel Santos",       email: "msantos@pra.gov.ph",      role: "admin",              agency: "PRA",                         dept: "Office of the General Manager" },
  { openId: "demo-eval-001",     name: "Engr. Jose Reyes",          email: "jreyes@pra.gov.ph",       role: "evaluator",          agency: "PRA",                         dept: "Technical Evaluation Division" },
  { openId: "demo-sec-001",      name: "Atty. Carmen Villanueva",   email: "cvillanueva@pra.gov.ph",  role: "secretariat",        agency: "PRA",                         dept: "Board Secretariat" },
  { openId: "demo-board-001",    name: "Comm. Ricardo Dela Cruz",   email: "rdelacruz@pra.gov.ph",    role: "board_member",       agency: "PRA",                         dept: "Board of Commissioners" },
  { openId: "demo-board-002",    name: "Comm. Amelia Bautista",     email: "abautista@pra.gov.ph",    role: "board_member",       agency: "PRA",                         dept: "Board of Commissioners" },
  { openId: "demo-prop-mla-001", name: "Arch. Fernando Aquino",     email: "faquino@maniladev.ph",    role: "proponent",          agency: "Manila Bay Consortium Inc.",  dept: null },
  { openId: "demo-prop-ceb-001", name: "Engr. Lourdes Tan",         email: "ltan@cebucity.gov.ph",    role: "proponent",          agency: "City Government of Cebu",     dept: "City Planning Office" },
  { openId: "demo-prop-ilo-001", name: "Mr. Rodrigo Fernandez",     email: "rfernandez@sunsetdev.ph", role: "proponent",          agency: "Sunset Boulevard Properties", dept: null },
  { openId: "demo-denr-001",     name: "Dir. Angelica Morales",     email: "amorales@denr.gov.ph",    role: "agency_reviewer",    agency: "DENR",                        dept: "Environmental Management Bureau" },
  { openId: "demo-neda-001",     name: "Dir. Benjamin Cruz",        email: "bcruz@neda.gov.ph",       role: "agency_reviewer",    agency: "NEDA",                        dept: "Public Investment Staff" },
  { openId: "demo-enforce-001",  name: "Insp. Danilo Ramos",        email: "dramos@pra.gov.ph",       role: "enforcement_officer",agency: "PRA",                         dept: "Compliance & Enforcement" },
];

async function main() {
  console.log("🌊 PRA Demo Projects Insertion Script");
  console.log("─".repeat(60));
  console.log("⚠  These are simulated Philippine reclamation scenarios");
  console.log("   modeled for demo purposes. Not official PRA records.");
  console.log("─".repeat(60));

  const [existing] = await pool.execute(
    "SELECT id FROM projects WHERE projectCode IN ('PRA-DEMO-001','PRA-DEMO-002','PRA-DEMO-003') LIMIT 1"
  );
  if (existing.length > 0) {
    if (!process.argv.includes("--force")) {
      console.log("⚠  Demo projects already exist. Use --force to re-insert.");
      await pool.end();
      return;
    }
    console.log("🔄 --force flag detected. Removing existing demo projects...");
    await clearDemoData();
  }

  // ── 1. Insert demo users ──────────────────────────────────────────────────
  console.log("\n👤 Inserting demo users...");
  const uid = {};
  for (const u of DEMO_USERS) {
    await pool.execute(
      `INSERT INTO users (openId, name, email, loginMethod, role, department, agencyAffiliation, isActive, createdAt, updatedAt, lastSignedIn)
       VALUES (?, ?, ?, 'demo', ?, ?, ?, 1, NOW(), NOW(), NOW())
       ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role)`,
      [u.openId, u.name, u.email, u.role, u.dept || null, u.agency || null]
    );
    const [rows] = await pool.execute("SELECT id FROM users WHERE openId = ?", [u.openId]);
    uid[u.openId] = rows[0].id;
    console.log(`  ✓ ${u.role.padEnd(20)} ${u.name} (ID: ${uid[u.openId]})`);
  }

  const adminId   = uid["demo-admin-001"];
  const evalId    = uid["demo-eval-001"];
  const secId     = uid["demo-sec-001"];
  const propMlaId = uid["demo-prop-mla-001"];
  const propCebId = uid["demo-prop-ceb-001"];
  const propIloId = uid["demo-prop-ilo-001"];
  const enforceId = uid["demo-enforce-001"];

  // ── 2. Ensure document types ──────────────────────────────────────────────
  const docTypes = [
    { name: "Environmental Compliance Certificate (ECC)", agency: "DENR-EMB", required: true },
    { name: "Foreshore Lease Agreement", agency: "DENR-MGB", required: true },
    { name: "NEDA Investment Coordination Committee Clearance", agency: "NEDA", required: true },
    { name: "HLURB/DHSUD Land Use Clearance", agency: "DHSUD", required: true },
    { name: "PRA Technical Evaluation Report", agency: "PRA", required: true },
    { name: "Hydrographic Survey Report", agency: "NAMRIA", required: true },
    { name: "Coastal Environment Profile", agency: "DENR-PAWB", required: false },
    { name: "Social Impact Assessment", agency: "NEDA", required: true },
  ];
  const dtId = {};
  for (const dt of docTypes) {
    await pool.execute(
      `INSERT INTO documentTypes (typeName, description, issuingAgency, isRequired, createdAt)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE issuingAgency = VALUES(issuingAgency)`,
      [dt.name, `Required clearance: ${dt.name}`, dt.agency, dt.required ? 1 : 0]
    );
    const [rows] = await pool.execute("SELECT id FROM documentTypes WHERE typeName = ?", [dt.name]);
    dtId[dt.name] = rows[0].id;
    counts.documentTypes++;
  }
  console.log(`\n📄 Document types ensured: ${Object.keys(dtId).length}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // PROJECT 1: Manila Bay Integrated Reclamation Phase II
  // Stage: evaluation
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n" + "═".repeat(60));
  console.log("📋 PROJECT 1: Manila Bay Integrated Reclamation Phase II");
  console.log("   Stage: evaluation | Area: 180 ha | Cost: PHP 120B");
  console.log("═".repeat(60));

  const p1Sub = daysAgo(210);
  const p1MouStart = daysAgo(150);
  const p1MouEnd = daysFromNow(580); // 18 months remaining
  const p1EvalStart = daysAgo(20);

  const [p1r] = await pool.execute(
    `INSERT INTO projects (projectCode, projectName, description, proponentId, proponentType, location,
      estimatedArea, estimatedCost, estimatedTimeline, projectPurpose, currentStage, status,
      isDemo, createdAt, updatedAt, submittedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW(), ?)`,
    [
      "PRA-DEMO-001",
      "Manila Bay Integrated Reclamation Phase II (Demo)",
      "A 180-hectare integrated reclamation development along the northern shoreline of Manila Bay, encompassing a mixed-use urban district with commercial towers, a waterfront esplanade, a convention center, and a 25-hectare public park. The project is a joint undertaking of the City of Manila and a private consortium, designed to complement the existing Manila Bay Rehabilitation Program. This is simulated data for demonstration purposes only.",
      propMlaId, "lgu", "Manila Bay, National Capital Region",
      "180.00", "120000000000.00", 96,
      "Mixed-use urban reclamation with commercial, residential, and public open space components",
      "evaluation", "in_progress", fmt(p1Sub),
    ]
  );
  const p1Id = p1r.insertId;
  counts.projects++;
  console.log(`  ✓ Project created (ID: ${p1Id})`);

  // LOI
  await pool.execute(
    `INSERT INTO loiSubmissions (projectId, submittedBy, status, submittedAt, notes) VALUES (?, ?, 'submitted', ?, ?)`,
    [p1Id, propMlaId, fmt(p1Sub), "Letter of Intent submitted by Manila Bay Consortium Inc. for 180-hectare mixed-use reclamation."]
  );
  counts.loiSubmissions++;

  // Pre-qual (7 items, all compliant)
  for (const item of [
    "Corporate registration and SEC certificate",
    "Audited financial statements (last 3 years)",
    "Technical capability documentation",
    "Environmental track record",
    "LGU endorsement resolution",
    "Proof of financial capacity (minimum PHP 12B)",
    "Preliminary project concept plan",
  ]) {
    await pool.execute(
      `INSERT INTO preQualChecklist (projectId, itemName, isRequired, isCompliant, verifiedBy, verifiedAt, notes, createdAt)
       VALUES (?, ?, 1, 1, ?, ?, 'Verified and compliant.', NOW())`,
      [p1Id, item, evalId, fmt(daysAgo(160))]
    );
    counts.preQualChecklist++;
  }
  console.log(`  ✓ Pre-qualification: 7 checklist items (all compliant)`);

  // MOU (18 months remaining)
  await pool.execute(
    `INSERT INTO mous (projectId, mouNumber, startDate, endDate, status, executedAt, executedBy, createdAt, updatedAt)
     VALUES (?, 'MOU-PRA-DEMO-001', ?, ?, 'active', ?, ?, NOW(), NOW())`,
    [p1Id, fmt(p1MouStart), fmt(p1MouEnd), fmt(p1MouStart), adminId]
  );
  counts.mous++;
  const p1MouDays = Math.round((p1MouEnd - new Date()) / 86400000);
  console.log(`  ✓ MOU active — ${p1MouDays} days remaining (expires ${p1MouEnd.toISOString().slice(0,10)})`);

  // 5 compliance documents (status: verified)
  for (const [name, typeKey, issuer] of [
    ["ECC Application — Manila Bay Phase II",          "Environmental Compliance Certificate (ECC)",            "DENR-EMB NCR"],
    ["NEDA ICC Pre-Investment Study",                  "NEDA Investment Coordination Committee Clearance",      "NEDA"],
    ["DHSUD Land Use Conformity Certificate",          "HLURB/DHSUD Land Use Clearance",                       "DHSUD"],
    ["Hydrographic Survey — Manila Bay North Shore",   "Hydrographic Survey Report",                           "NAMRIA"],
    ["Social Impact Assessment Report",                "Social Impact Assessment",                              "NEDA"],
  ]) {
    await pool.execute(
      `INSERT INTO documents (projectId, documentTypeId, documentName, fileUrl, fileKey, fileMimeType, fileSize, version, issuedBy, uploadedBy, uploadedAt, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 'application/pdf', 2048000, 1, ?, ?, ?, 'verified', NOW(), NOW())`,
      [p1Id, dtId[typeKey] || 1, name,
       `https://storage.pra.gov.ph/demo/p1/${name.replace(/\s+/g,"-").toLowerCase()}.pdf`,
       `demo/p1/${name.replace(/\s+/g,"-").toLowerCase()}.pdf`,
       issuer, propMlaId, fmt(daysAgo(120))]
    );
    counts.documents++;
  }
  console.log(`  ✓ Documents: 5 compliance documents (verified)`);

  // Agency requests: 2 DENR + 1 NEDA
  for (const [agency, type, details, ago, responded] of [
    ["DENR-EMB NCR",     "environmental_clearance", "Request for ECC for 180-hectare Manila Bay reclamation. EIA study submitted.",           130, true],
    ["DENR-MGB Region III","technical_review",      "Request for foreshore and foreshore land technical review and clearance from DENR-MGB.", 120, true],
    ["NEDA",             "financial_review",        "NEDA ICC pre-investment study review and endorsement.",                                  110, false],
  ]) {
    await pool.execute(
      `INSERT INTO agencyRequests (projectId, agencyName, requestType, requestedBy, requestedAt, dueDate, details, followUpCount, responseReceivedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [p1Id, agency, type, evalId, fmt(daysAgo(ago)), fmt(daysAgo(ago-30)), details,
       responded ? 0 : 2, responded ? fmt(daysAgo(ago-25)) : null]
    );
    counts.agencyRequests++;
  }
  console.log(`  ✓ Agency coordination: 2 DENR + 1 NEDA`);

  // Evaluation
  await pool.execute(
    `INSERT INTO evaluations (projectId, evaluationType, evaluatedBy, evaluatedAt, score, maxScore, notes, status, createdAt, updatedAt)
     VALUES (?, 'technical', ?, ?, 87.50, 100.00, ?, 'submitted', NOW(), NOW())`,
    [p1Id, evalId, fmt(p1EvalStart),
     "Technical evaluation: score 87.50/100. Strong technical feasibility, robust engineering design, adequate financial backing, alignment with Manila Bay Rehabilitation Program. Recommended for board review pending NEDA ICC clearance."]
  );
  counts.evaluations++;
  console.log(`  ✓ Evaluation: technical score 87.50/100 (submitted)`);

  // SLA timer (evaluation, 40 days remaining)
  await pool.execute(
    `INSERT INTO slaTimers (projectId, stage, dueDateDays, dueDate, isOverdue, createdAt) VALUES (?, 'evaluation', 60, ?, 0, ?)`,
    [p1Id, fmt(daysFromNow(40)), fmt(p1EvalStart)]
  );
  counts.slaTimers++;
  console.log(`  ✓ SLA timer: evaluation — 40 days remaining`);

  // Audit logs
  for (const [userId, action, desc, ts] of [
    [propMlaId, "submit", "[DEMO] LOI submitted for Manila Bay Integrated Reclamation Phase II by Arch. Fernando Aquino", p1Sub],
    [evalId,    "update", "[DEMO] Project advanced to stage: pre_qualification", daysAgo(190)],
    [evalId,    "update", "[DEMO] Pre-qualification checklist completed — all 7 items compliant", daysAgo(160)],
    [adminId,   "update", "[DEMO] Project advanced to stage: mou", daysAgo(155)],
    [adminId,   "create", "[DEMO] MOU executed — MOU-PRA-DEMO-001, validity 24 months", p1MouStart],
    [evalId,    "update", "[DEMO] Project advanced to stage: compliance_docs", daysAgo(140)],
    [propMlaId, "create", "[DEMO] 5 compliance documents uploaded", daysAgo(120)],
    [evalId,    "update", "[DEMO] Project advanced to stage: full_compliance", daysAgo(100)],
    [evalId,    "update", "[DEMO] Project advanced to stage: evaluation", p1EvalStart],
    [evalId,    "create", "[DEMO] Technical evaluation submitted — score 87.50/100", p1EvalStart],
  ]) {
    await pool.execute(
      `INSERT INTO auditLogs (userId, entityType, entityId, action, changeDescription, ipAddress, userAgent, createdAt)
       VALUES (?, 'project', ?, ?, ?, '127.0.0.1', 'demo-insert-script/1.0', ?)`,
      [userId, p1Id, action, desc, fmt(ts)]
    );
    counts.auditLogs++;
  }
  console.log(`  ✓ Audit logs: 10 events written`);

  // ═══════════════════════════════════════════════════════════════════════════
  // PROJECT 2: Cebu South Road Properties Expansion
  // Stage: board_review
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n" + "═".repeat(60));
  console.log("📋 PROJECT 2: Cebu South Road Properties Expansion");
  console.log("   Stage: board_review | Area: 120 ha | Cost: PHP 65B");
  console.log("═".repeat(60));

  const p2Sub = daysAgo(320);
  const p2MouStart = daysAgo(250);
  const p2MouEnd = daysFromNow(480);
  const p2BoardDate = daysFromNow(7);

  const [p2r] = await pool.execute(
    `INSERT INTO projects (projectCode, projectName, description, proponentId, proponentType, location,
      estimatedArea, estimatedCost, estimatedTimeline, projectPurpose, currentStage, status,
      isDemo, createdAt, updatedAt, submittedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW(), ?)`,
    [
      "PRA-DEMO-002",
      "Cebu South Road Properties Expansion (Demo)",
      "A 120-hectare reclamation expansion of the existing South Road Properties (SRP) in Cebu City, extending the mixed-use urban district southward to accommodate additional commercial, residential, and institutional developments. The project is a City Government of Cebu initiative in partnership with PRA, designed to address the growing demand for prime urban land in Metro Cebu. This is simulated data for demonstration purposes only.",
      propCebId, "lgu", "Cebu City, Cebu Province",
      "120.00", "65000000000.00", 84,
      "Extension of the South Road Properties mixed-use urban district",
      "board_review", "in_progress", fmt(p2Sub),
    ]
  );
  const p2Id = p2r.insertId;
  counts.projects++;
  console.log(`  ✓ Project created (ID: ${p2Id})`);

  await pool.execute(
    `INSERT INTO loiSubmissions (projectId, submittedBy, status, submittedAt, notes) VALUES (?, ?, 'submitted', ?, ?)`,
    [p2Id, propCebId, fmt(p2Sub), "Letter of Intent submitted by City Government of Cebu for 120-hectare SRP expansion."]
  );
  counts.loiSubmissions++;

  for (const item of [
    "LGU Sangguniang Panlungsod Resolution authorizing project",
    "City Government financial statements (last 3 years)",
    "Technical feasibility study",
    "Environmental pre-assessment",
    "DILG endorsement",
    "Proof of LGU financial capacity",
    "Preliminary engineering design",
    "Stakeholder consultation records",
  ]) {
    await pool.execute(
      `INSERT INTO preQualChecklist (projectId, itemName, isRequired, isCompliant, verifiedBy, verifiedAt, notes, createdAt)
       VALUES (?, ?, 1, 1, ?, ?, 'Verified and compliant.', NOW())`,
      [p2Id, item, evalId, fmt(daysAgo(290))]
    );
    counts.preQualChecklist++;
  }
  console.log(`  ✓ Pre-qualification: 8 checklist items (all compliant)`);

  await pool.execute(
    `INSERT INTO mous (projectId, mouNumber, startDate, endDate, status, executedAt, executedBy, createdAt, updatedAt)
     VALUES (?, 'MOU-PRA-DEMO-002', ?, ?, 'active', ?, ?, NOW(), NOW())`,
    [p2Id, fmt(p2MouStart), fmt(p2MouEnd), fmt(p2MouStart), adminId]
  );
  counts.mous++;
  const p2MouDays = Math.round((p2MouEnd - new Date()) / 86400000);
  console.log(`  ✓ MOU active — ${p2MouDays} days remaining`);

  for (const [name, typeKey, issuer] of [
    ["ECC — Cebu SRP Expansion Phase 1",           "Environmental Compliance Certificate (ECC)",        "DENR-EMB Region VII"],
    ["NEDA ICC Clearance — Cebu SRP Expansion",    "NEDA Investment Coordination Committee Clearance",  "NEDA"],
    ["DHSUD Land Use Certificate — Cebu SRP",      "HLURB/DHSUD Land Use Clearance",                   "DHSUD"],
    ["Hydrographic Survey — Cebu Strait South",    "Hydrographic Survey Report",                        "NAMRIA"],
    ["Social Impact Assessment — SRP Expansion",   "Social Impact Assessment",                          "NEDA"],
    ["Foreshore Lease Application — Cebu SRP",     "Foreshore Lease Agreement",                         "DENR-MGB"],
  ]) {
    await pool.execute(
      `INSERT INTO documents (projectId, documentTypeId, documentName, fileUrl, fileKey, fileMimeType, fileSize, version, issuedBy, uploadedBy, uploadedAt, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 'application/pdf', 3145728, 1, ?, ?, ?, 'verified', NOW(), NOW())`,
      [p2Id, dtId[typeKey] || 1, name,
       `https://storage.pra.gov.ph/demo/p2/${name.replace(/\s+/g,"-").toLowerCase()}.pdf`,
       `demo/p2/${name.replace(/\s+/g,"-").toLowerCase()}.pdf`,
       issuer, propCebId, fmt(daysAgo(200))]
    );
    counts.documents++;
  }
  console.log(`  ✓ Documents: 6 compliance documents (all verified)`);

  for (const [agency, type, details, ago] of [
    ["DENR-EMB Region VII", "environmental_clearance", "ECC application for 120-hectare Cebu SRP expansion. Full EIA submitted.", 220],
    ["NEDA",                "financial_review",        "ICC pre-investment study and clearance for LGU-led reclamation project.", 210],
    ["DHSUD Region VII",    "legal_review",            "Land use conformity and zoning clearance for SRP expansion area.",       200],
  ]) {
    await pool.execute(
      `INSERT INTO agencyRequests (projectId, agencyName, requestType, requestedBy, requestedAt, dueDate, details, followUpCount, responseReceivedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, NOW(), NOW())`,
      [p2Id, agency, type, evalId, fmt(daysAgo(ago)), fmt(daysAgo(ago-30)), details, fmt(daysAgo(ago-20))]
    );
    counts.agencyRequests++;
  }
  console.log(`  ✓ Agency coordination: 3 requests (all responded)`);

  await pool.execute(
    `INSERT INTO evaluations (projectId, evaluationType, evaluatedBy, evaluatedAt, score, maxScore, notes, status, createdAt, updatedAt)
     VALUES (?, 'technical', ?, ?, 91.00, 100.00, ?, 'reviewed', NOW(), NOW())`,
    [p2Id, evalId, fmt(daysAgo(40)),
     "Technical evaluation: score 91.00/100. Excellent technical design, strong LGU financial capacity, clear alignment with Cebu City CLUP. All agency clearances received. Recommended for Board of Commissioners approval."]
  );
  counts.evaluations++;
  console.log(`  ✓ Evaluation: technical score 91.00/100 (reviewed)`);

  const [p2bm] = await pool.execute(
    `INSERT INTO boardMeetings (meetingNumber, meetingDate, location, status) VALUES (?, ?, ?, 'scheduled')`,
    [`BM-PRA-${new Date().getFullYear()}-DEMO-002-${Date.now()}`, fmt(p2BoardDate), "PRA Board Room, Bonifacio Drive, Port Area, Manila"]
  );
  const p2BmId = p2bm.insertId;
  counts.boardMeetings++;

  // Board decision: deferred (draft, not yet approved) — 'deferred' is valid enum
  await pool.execute(
    `INSERT INTO boardDecisions (projectId, boardMeetingId, decision, decisionDate, conditions, recordedBy)
     VALUES (?, ?, 'deferred', ?, ?, ?)`,
    [p2Id, p2BmId, fmt(p2BoardDate),
     "Draft resolution pending board deliberation. Proposed conditions: (1) Submission of final foreshore lease agreement within 30 days of approval; (2) Compliance with DENR ECC conditions; (3) Submission of updated financial model incorporating current construction cost indices.",
     secId]
  );
  counts.boardDecisions++;
  console.log(`  ✓ Board meeting scheduled: ${p2BoardDate.toISOString().slice(0,10)} — decision deferred (draft pending)`);

  await pool.execute(
    `INSERT INTO slaTimers (projectId, stage, dueDateDays, dueDate, isOverdue, createdAt) VALUES (?, 'board_review', 30, ?, 0, ?)`,
    [p2Id, fmt(daysFromNow(25)), fmt(daysAgo(5))]
  );
  counts.slaTimers++;
  console.log(`  ✓ SLA timer: board_review — 25 days remaining`);

  for (const [userId, action, desc, ts] of [
    [propCebId, "submit", "[DEMO] LOI submitted for Cebu South Road Properties Expansion by Engr. Lourdes Tan", p2Sub],
    [evalId,    "update", "[DEMO] Project advanced to stage: pre_qualification", daysAgo(300)],
    [evalId,    "update", "[DEMO] Pre-qualification checklist completed — all 8 items compliant", daysAgo(290)],
    [adminId,   "update", "[DEMO] Project advanced to stage: mou", daysAgo(255)],
    [adminId,   "create", "[DEMO] MOU executed — MOU-PRA-DEMO-002", p2MouStart],
    [evalId,    "update", "[DEMO] Project advanced to stage: compliance_docs", daysAgo(240)],
    [propCebId, "create", "[DEMO] 6 compliance documents uploaded", daysAgo(200)],
    [evalId,    "update", "[DEMO] Project advanced to stage: full_compliance", daysAgo(180)],
    [evalId,    "update", "[DEMO] Project advanced to stage: evaluation", daysAgo(45)],
    [evalId,    "create", "[DEMO] Technical evaluation submitted — score 91.00/100", daysAgo(40)],
    [evalId,    "update", "[DEMO] Evaluation reviewed and approved for board submission", daysAgo(35)],
    [adminId,   "update", "[DEMO] Project advanced to stage: board_review", daysAgo(5)],
    [secId,     "create", "[DEMO] Board meeting scheduled — draft decision prepared (deferred pending deliberation)", daysAgo(3)],
  ]) {
    await pool.execute(
      `INSERT INTO auditLogs (userId, entityType, entityId, action, changeDescription, ipAddress, userAgent, createdAt)
       VALUES (?, 'project', ?, ?, ?, '127.0.0.1', 'demo-insert-script/1.0', ?)`,
      [userId, p2Id, action, desc, fmt(ts)]
    );
    counts.auditLogs++;
  }
  console.log(`  ✓ Audit logs: 13 events written`);

  // ═══════════════════════════════════════════════════════════════════════════
  // PROJECT 3: Iloilo Sunset Boulevard Reclamation
  // Stage: monitoring
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n" + "═".repeat(60));
  console.log("📋 PROJECT 3: Iloilo Sunset Boulevard Reclamation");
  console.log("   Stage: monitoring | Area: 75 ha | Cost: PHP 32B");
  console.log("═".repeat(60));

  const p3Sub = daysAgo(480);
  const p3MouStart = daysAgo(420);
  const p3MouEnd = daysFromNow(310);
  const p3AgreementDate = daysAgo(60);
  const p3AgreementExpiry = new Date(p3AgreementDate);
  p3AgreementExpiry.setFullYear(p3AgreementExpiry.getFullYear() + 50);
  const p3Insp1 = daysAgo(30);
  const p3Insp2 = daysAgo(10);

  const [p3r] = await pool.execute(
    `INSERT INTO projects (projectCode, projectName, description, proponentId, proponentType, location,
      estimatedArea, estimatedCost, estimatedTimeline, projectPurpose, currentStage, status,
      isDemo, createdAt, updatedAt, submittedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW(), ?)`,
    [
      "PRA-DEMO-003",
      "Iloilo Sunset Boulevard Reclamation (Demo)",
      "A 75-hectare reclamation development along the Iloilo Strait, creating the Sunset Boulevard mixed-use waterfront district featuring a 3.5-kilometer esplanade, boutique hotels, a cultural arts center, commercial retail, and mid-rise residential towers. The project is a private developer initiative by Sunset Boulevard Properties Inc., designed to complement the Iloilo Business Park and the Iloilo Convention Center complex. This is simulated data for demonstration purposes only.",
      propIloId, "developer", "Iloilo City, Western Visayas",
      "75.00", "32000000000.00", 72,
      "Waterfront mixed-use development with esplanade, commercial, and residential components",
      "monitoring", "in_progress", fmt(p3Sub),
    ]
  );
  const p3Id = p3r.insertId;
  counts.projects++;
  console.log(`  ✓ Project created (ID: ${p3Id})`);

  await pool.execute(
    `INSERT INTO loiSubmissions (projectId, submittedBy, status, submittedAt, notes) VALUES (?, ?, 'submitted', ?, ?)`,
    [p3Id, propIloId, fmt(p3Sub), "Letter of Intent submitted by Sunset Boulevard Properties Inc. for 75-hectare Iloilo waterfront reclamation."]
  );
  counts.loiSubmissions++;

  for (const item of [
    "SEC registration and articles of incorporation",
    "Audited financial statements (last 3 years)",
    "Technical capability and track record",
    "Environmental compliance history",
    "Iloilo City LGU endorsement",
    "Proof of financial capacity (minimum PHP 3.2B equity)",
    "Preliminary project design and specifications",
  ]) {
    await pool.execute(
      `INSERT INTO preQualChecklist (projectId, itemName, isRequired, isCompliant, verifiedBy, verifiedAt, notes, createdAt)
       VALUES (?, ?, 1, 1, ?, ?, 'Verified and compliant.', NOW())`,
      [p3Id, item, evalId, fmt(daysAgo(450))]
    );
    counts.preQualChecklist++;
  }
  console.log(`  ✓ Pre-qualification: 7 checklist items (all compliant)`);

  await pool.execute(
    `INSERT INTO mous (projectId, mouNumber, startDate, endDate, status, executedAt, executedBy, createdAt, updatedAt)
     VALUES (?, 'MOU-PRA-DEMO-003', ?, ?, 'active', ?, ?, NOW(), NOW())`,
    [p3Id, fmt(p3MouStart), fmt(p3MouEnd), fmt(p3MouStart), adminId]
  );
  counts.mous++;
  const p3MouDays = Math.round((p3MouEnd - new Date()) / 86400000);
  console.log(`  ✓ MOU active — ${p3MouDays} days remaining`);

  for (const [name, typeKey, issuer] of [
    ["ECC — Iloilo Sunset Boulevard",              "Environmental Compliance Certificate (ECC)",        "DENR-EMB Region VI"],
    ["NEDA ICC Clearance — Sunset Boulevard",      "NEDA Investment Coordination Committee Clearance",  "NEDA"],
    ["DHSUD Clearance — Iloilo Waterfront",        "HLURB/DHSUD Land Use Clearance",                   "DHSUD"],
    ["Hydrographic Survey — Iloilo Strait West",   "Hydrographic Survey Report",                        "NAMRIA"],
    ["Social Impact Assessment — Sunset Boulevard","Social Impact Assessment",                          "NEDA"],
  ]) {
    await pool.execute(
      `INSERT INTO documents (projectId, documentTypeId, documentName, fileUrl, fileKey, fileMimeType, fileSize, version, issuedBy, uploadedBy, uploadedAt, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 'application/pdf', 2621440, 1, ?, ?, ?, 'verified', NOW(), NOW())`,
      [p3Id, dtId[typeKey] || 1, name,
       `https://storage.pra.gov.ph/demo/p3/${name.replace(/\s+/g,"-").toLowerCase()}.pdf`,
       `demo/p3/${name.replace(/\s+/g,"-").toLowerCase()}.pdf`,
       issuer, propIloId, fmt(daysAgo(360))]
    );
    counts.documents++;
  }
  console.log(`  ✓ Documents: 5 compliance documents (verified)`);

  for (const [agency, type, details, ago] of [
    ["DENR-EMB Region VI", "environmental_clearance", "ECC for Iloilo Strait reclamation. Full EIA with mangrove impact assessment submitted.", 380],
    ["NEDA",               "financial_review",        "ICC clearance for private developer reclamation project in Iloilo City.",               370],
  ]) {
    await pool.execute(
      `INSERT INTO agencyRequests (projectId, agencyName, requestType, requestedBy, requestedAt, dueDate, details, followUpCount, responseReceivedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, NOW(), NOW())`,
      [p3Id, agency, type, evalId, fmt(daysAgo(ago)), fmt(daysAgo(ago-30)), details, fmt(daysAgo(ago-20))]
    );
    counts.agencyRequests++;
  }
  console.log(`  ✓ Agency coordination: 2 requests (both responded)`);

  await pool.execute(
    `INSERT INTO evaluations (projectId, evaluationType, evaluatedBy, evaluatedAt, score, maxScore, notes, status, createdAt, updatedAt)
     VALUES (?, 'technical', ?, ?, 88.00, 100.00, ?, 'reviewed', NOW(), NOW())`,
    [p3Id, evalId, fmt(daysAgo(200)),
     "Technical evaluation: score 88.00/100. Sound technical design with appropriate coastal engineering measures, adequate financial capacity, strong market demand. ECC conditions satisfactorily addressed. Recommended for Board approval."]
  );
  counts.evaluations++;

  // Board meeting (held) + decision (approved_with_conditions)
  const [p3bm] = await pool.execute(
    `INSERT INTO boardMeetings (meetingNumber, meetingDate, location, status) VALUES (?, ?, ?, 'held')`,
    [`BM-PRA-${new Date().getFullYear()-1}-DEMO-003-${Date.now()}`, fmt(daysAgo(150)), "PRA Board Room, Bonifacio Drive, Port Area, Manila"]
  );
  const p3BmId = p3bm.insertId;
  counts.boardMeetings++;

  await pool.execute(
    `INSERT INTO boardDecisions (projectId, boardMeetingId, decision, decisionDate, conditions, recordedBy)
     VALUES (?, ?, 'approved_with_conditions', ?, ?, ?)`,
    [p3Id, p3BmId, fmt(daysAgo(150)),
     "Approved subject to: (1) Execution of Reclamation Agreement within 45 days; (2) Submission of performance bond equivalent to 5% of project cost; (3) Compliance with all ECC conditions; (4) Quarterly progress reporting to PRA.",
     secId]
  );
  counts.boardDecisions++;
  console.log(`  ✓ Board decision: approved_with_conditions (${daysAgo(150).toISOString().slice(0,10)})`);

  // Bidding event (awarded)
  const [p3bid] = await pool.execute(
    `INSERT INTO biddingEvents (projectId, biddingNumber, selectionMode, publicationDate, bidSubmissionDeadline, bidOpeningDate, status, createdAt, updatedAt)
     VALUES (?, ?, 'unsolicited', ?, ?, ?, 'awarded', NOW(), NOW())`,
    [p3Id, `BID-PRA-DEMO-003`, fmt(daysAgo(130)), fmt(daysAgo(100)), fmt(daysAgo(98))]
  );
  const p3BidId = p3bid.insertId;
  counts.biddingEvents++;

  await pool.execute(
    `INSERT INTO bids (biddingEventId, bidderName, bidAmount, bidDocumentUrl, status, submittedAt, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, 'awarded', ?, NOW(), NOW())`,
    [p3BidId, "Sunset Boulevard Properties Inc.", "32000000000.00",
     "https://storage.pra.gov.ph/demo/p3/bid-sunset-boulevard.pdf",
     fmt(daysAgo(100))]
  );
  counts.bids++;
  console.log(`  ✓ Bidding: unsolicited bid awarded to Sunset Boulevard Properties Inc.`);

  // Agreement (executed)
  await pool.execute(
    `INSERT INTO agreements (projectId, agreementNumber, agreementType, effectiveDate, expiryDate, status, createdAt, updatedAt)
     VALUES (?, 'RA-PRA-DEMO-003', 'implementing_agreement', ?, ?, 'executed', NOW(), NOW())`,
    [p3Id, fmt(p3AgreementDate), fmt(p3AgreementExpiry)]
  );
  counts.agreements++;
  console.log(`  ✓ Agreement executed: 50-year implementing agreement (effective ${p3AgreementDate.toISOString().slice(0,10)})`);

  // 2 inspections
  const [i1] = await pool.execute(
    `INSERT INTO inspections (projectId, inspectionNumber, inspectionType, scheduledDate, actualDate, inspectedBy, status, findings, createdAt, updatedAt)
     VALUES (?, 'INSP-PRA-DEMO-003-001', 'routine', ?, ?, ?, 'completed', ?, NOW(), NOW())`,
    [p3Id, fmt(p3Insp1), fmt(p3Insp1), enforceId,
     "Routine inspection of reclamation fill operations. Site mobilization complete. Dredging equipment deployed. Fill material quality within specifications. No major violations observed. Recommendation: Continue monitoring fill compaction levels. Ensure silt curtains are maintained in operational condition."]
  );
  counts.inspections++;

  const [i2] = await pool.execute(
    `INSERT INTO inspections (projectId, inspectionNumber, inspectionType, scheduledDate, actualDate, inspectedBy, status, findings, createdAt, updatedAt)
     VALUES (?, 'INSP-PRA-DEMO-003-002', 'compliance_check', ?, ?, ?, 'completed', ?, NOW(), NOW())`,
    [p3Id, fmt(p3Insp2), fmt(p3Insp2), enforceId,
     "Compliance check inspection. Fill operations at 12% completion. Silt curtain on the northern boundary found to have a 15-meter gap, allowing minor sediment dispersion into the adjacent navigation channel. Recommendation: Immediate repair of silt curtain gap required. Submit corrective action plan within 5 working days."]
  );
  const insp2Id = i2.insertId;
  counts.inspections++;
  console.log(`  ✓ Inspections: 2 completed (routine + compliance check)`);

  // 1 non-compliance finding (low severity)
  const [nf] = await pool.execute(
    `INSERT INTO nonComplianceFindings (projectId, inspectionId, findingNumber, findingType, severity, description, reportedAt, reportedBy, status, createdAt, updatedAt)
     VALUES (?, ?, 'NCF-PRA-DEMO-003-001', 'Environmental Non-Compliance — Silt Curtain Gap', 'low', ?, ?, ?, 'reported', NOW(), NOW())`,
    [p3Id, insp2Id,
     "15-meter gap detected in the northern boundary silt curtain during compliance check inspection on " + p3Insp2.toISOString().slice(0,10) + ". Minor sediment dispersion observed in the adjacent navigation channel. Immediate repair required per ECC Condition No. 7 (Sediment Control Measures).",
     fmt(p3Insp2), enforceId]
  );
  const findingId = nf.insertId;
  counts.nonComplianceFindings++;
  console.log(`  ✓ Non-compliance finding: 1 (low severity — silt curtain gap)`);

  // 1 corrective action (assigned, open)
  await pool.execute(
    `INSERT INTO correctiveActions (findingId, actionDescription, assignedTo, dueDate, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, 'assigned', NOW(), NOW())`,
    [findingId,
     "Repair the 15-meter gap in the northern boundary silt curtain. Install additional anchor points to prevent future displacement. Submit photographic evidence of completed repair and updated silt curtain maintenance log to PRA Compliance & Enforcement Division.",
     propIloId, fmt(daysFromNow(5))]
  );
  counts.correctiveActions++;
  console.log(`  ✓ Corrective action: 1 assigned (due ${daysFromNow(5).toISOString().slice(0,10)})`);

  // Enforcement case (linked to finding)
  await pool.execute(
    `INSERT INTO enforcementCases (caseNumber, complaintType, location, suspectedParties, reportedAt, reportedBy, evidence, verificationStatus, caseStatus, createdAt, updatedAt)
     VALUES (?, 'Environmental Non-Compliance', ?, ?, ?, ?, ?, 'verified', 'investigation', NOW(), NOW())`,
    [
      "EC-PRA-DEMO-003-001",
      "Iloilo City, Western Visayas — Northern boundary of PRA-DEMO-003 reclamation site",
      "Sunset Boulevard Properties Inc. (Contractor: IloiloCoastal Construction Corp.)",
      fmt(p3Insp2), enforceId,
      "Silt curtain gap detected during compliance inspection INSP-PRA-DEMO-003-002. Finding NCF-PRA-DEMO-003-001 filed. Corrective action plan required within 5 working days per ECC Condition No. 7.",
    ]
  );
  counts.enforcementCases++;
  console.log(`  ✓ Enforcement case: EC-PRA-DEMO-003-001 (investigation — linked to finding)`);

  // SLA timer (monitoring, 305 days remaining)
  await pool.execute(
    `INSERT INTO slaTimers (projectId, stage, dueDateDays, dueDate, isOverdue, createdAt) VALUES (?, 'monitoring', 365, ?, 0, ?)`,
    [p3Id, fmt(daysFromNow(305)), fmt(p3AgreementDate)]
  );
  counts.slaTimers++;
  console.log(`  ✓ SLA timer: monitoring — 305 days remaining`);

  // Audit logs
  for (const [userId, action, desc, ts] of [
    [propIloId, "submit", "[DEMO] LOI submitted for Iloilo Sunset Boulevard Reclamation by Mr. Rodrigo Fernandez", p3Sub],
    [evalId,    "update", "[DEMO] Project advanced to stage: pre_qualification", daysAgo(460)],
    [evalId,    "update", "[DEMO] Pre-qualification checklist completed — all 7 items compliant", daysAgo(450)],
    [adminId,   "update", "[DEMO] Project advanced to stage: mou", daysAgo(425)],
    [adminId,   "create", "[DEMO] MOU executed — MOU-PRA-DEMO-003", p3MouStart],
    [evalId,    "update", "[DEMO] Project advanced to stage: compliance_docs", daysAgo(410)],
    [propIloId, "create", "[DEMO] 5 compliance documents uploaded", daysAgo(360)],
    [evalId,    "update", "[DEMO] Project advanced to stage: full_compliance", daysAgo(340)],
    [evalId,    "update", "[DEMO] Project advanced to stage: evaluation", daysAgo(205)],
    [evalId,    "create", "[DEMO] Technical evaluation submitted — score 88.00/100", daysAgo(200)],
    [adminId,   "update", "[DEMO] Project advanced to stage: board_review", daysAgo(160)],
    [secId,     "create", "[DEMO] Board decision recorded — APPROVED WITH CONDITIONS", daysAgo(150)],
    [adminId,   "update", "[DEMO] Project advanced to stage: bidding", daysAgo(140)],
    [propIloId, "submit", "[DEMO] Unsolicited bid submitted by Sunset Boulevard Properties Inc.", daysAgo(100)],
    [adminId,   "update", "[DEMO] Project advanced to stage: agreement", daysAgo(90)],
    [secId,     "create", "[DEMO] Implementing agreement executed — RA-PRA-DEMO-003", p3AgreementDate],
    [adminId,   "update", "[DEMO] Project advanced to stage: monitoring", p3AgreementDate],
    [enforceId, "create", "[DEMO] Routine inspection completed — INSP-PRA-DEMO-003-001", p3Insp1],
    [enforceId, "create", "[DEMO] Compliance check inspection completed — INSP-PRA-DEMO-003-002", p3Insp2],
    [enforceId, "create", "[DEMO] Non-compliance finding filed — NCF-PRA-DEMO-003-001 (silt curtain gap, low severity)", p3Insp2],
    [enforceId, "create", "[DEMO] Corrective action assigned — due in 5 days", p3Insp2],
    [enforceId, "create", "[DEMO] Enforcement case opened — EC-PRA-DEMO-003-001 (investigation)", p3Insp2],
  ]) {
    await pool.execute(
      `INSERT INTO auditLogs (userId, entityType, entityId, action, changeDescription, ipAddress, userAgent, createdAt)
       VALUES (?, 'project', ?, ?, ?, '127.0.0.1', 'demo-insert-script/1.0', ?)`,
      [userId, p3Id, action, desc, fmt(ts)]
    );
    counts.auditLogs++;
  }
  console.log(`  ✓ Audit logs: 22 events written`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(60));
  console.log("✅ PRA DEMO PROJECTS INSERTION COMPLETE");
  console.log("═".repeat(60));
  console.log("\n📊 Records inserted per table:");
  const rows = [
    ["projects",               counts.projects],
    ["loiSubmissions",         counts.loiSubmissions],
    ["preQualChecklist",       counts.preQualChecklist],
    ["mous",                   counts.mous],
    ["documentTypes",          counts.documentTypes],
    ["documents",              counts.documents],
    ["agencyRequests",         counts.agencyRequests],
    ["evaluations",            counts.evaluations],
    ["boardMeetings",          counts.boardMeetings],
    ["boardDecisions",         counts.boardDecisions],
    ["biddingEvents",          counts.biddingEvents],
    ["bids",                   counts.bids],
    ["agreements",             counts.agreements],
    ["inspections",            counts.inspections],
    ["nonComplianceFindings",  counts.nonComplianceFindings],
    ["correctiveActions",      counts.correctiveActions],
    ["enforcementCases",       counts.enforcementCases],
    ["slaTimers",              counts.slaTimers],
    ["auditLogs",              counts.auditLogs],
  ];
  for (const [t, n] of rows) console.log(`   ${t.padEnd(26)} ${n}`);
  const total = rows.reduce((s,[,n]) => s+n, 0);
  console.log(`   ${"─".repeat(34)}`);
  console.log(`   ${"TOTAL".padEnd(26)} ${total}`);

  console.log("\n📍 Dashboard visibility:");
  console.log(`   PRA-DEMO-001  Manila Bay Integrated Reclamation Phase II  → evaluation`);
  console.log(`   PRA-DEMO-002  Cebu South Road Properties Expansion        → board_review`);
  console.log(`   PRA-DEMO-003  Iloilo Sunset Boulevard Reclamation         → monitoring`);

  console.log("\n⏱  SLA timers:");
  console.log(`   PRA-DEMO-001  evaluation   — 40 days remaining`);
  console.log(`   PRA-DEMO-002  board_review — 25 days remaining`);
  console.log(`   PRA-DEMO-003  monitoring   — 305 days remaining`);

  console.log("\n📝 Audit logs: " + counts.auditLogs + " events across all 3 projects");

  console.log("\n⚠  REMINDER: These are simulated Philippine reclamation scenarios");
  console.log("   modeled for demo purposes. Not official PRA records.");

  await pool.end();
}

async function clearDemoData() {
  const [projects] = await pool.execute(
    "SELECT id FROM projects WHERE projectCode IN ('PRA-DEMO-001','PRA-DEMO-002','PRA-DEMO-003')"
  );
  const ids = projects.map(p => p.id);
  if (ids.length === 0) return;
  const idList = ids.join(",");
  for (const t of [
    "auditLogs","correctiveActions","nonComplianceFindings","inspections",
    "enforcementCases","agreements","bids","biddingEvents",
    "boardDecisions","evaluations","agencyRequests","documents",
    "mous","preQualChecklist","slaTimers","loiSubmissions",
  ]) {
    await pool.execute(`DELETE FROM ${t} WHERE projectId IN (${idList})`).catch(() => {});
  }
  // boardMeetings have no projectId — delete via boardDecisions (already done above via cascade or manual)
  await pool.execute(`DELETE FROM projects WHERE id IN (${idList})`).catch(() => {});
  await pool.execute(`DELETE FROM users WHERE openId LIKE 'demo-%'`).catch(() => {});
  console.log(`  ✓ Cleared demo data for project IDs: ${idList}`);
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
