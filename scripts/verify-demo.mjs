import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config({ path: "/home/ubuntu/reclaimflow-ph/.env" });

const pool = await mysql.createPool(process.env.DATABASE_URL);

const [p] = await pool.execute(
  "SELECT id, projectCode, projectName, currentStage, isDemo FROM projects WHERE projectCode IN ('PRA-DEMO-001','PRA-DEMO-002','PRA-DEMO-003') ORDER BY projectCode"
);
console.log("=== PROJECTS ===");
for (const r of p) {
  console.log(`  ${r.projectCode}  ${r.currentStage.padEnd(15)} isDemo=${r.isDemo}  ID=${r.id}`);
}

const ids = p.map(x => x.id).join(",");

const [s] = await pool.execute(
  `SELECT projectId, stage, dueDate, isOverdue FROM slaTimers WHERE projectId IN (${ids})`
);
console.log("\n=== SLA TIMERS ===");
for (const r of s) {
  const days = Math.round((new Date(r.dueDate) - new Date()) / 86400000);
  console.log(`  Project ${r.projectId}  ${r.stage.padEnd(15)} due=${new Date(r.dueDate).toISOString().slice(0,10)}  (${days} days remaining)`);
}

const [al] = await pool.execute(
  `SELECT COUNT(*) as cnt FROM auditLogs WHERE entityId IN (${ids}) AND changeDescription LIKE '[DEMO]%'`
);
console.log(`\n=== AUDIT LOGS: ${al[0].cnt} demo events ===`);

for (const proj of p) {
  const pid = proj.id;
  const q = (t, col) => pool.execute(`SELECT COUNT(*) as c FROM ${t} WHERE ${col}=?`, [pid]).then(([r]) => r[0].c);
  const loi  = await q("loiSubmissions", "projectId");
  const pq   = await q("preQualChecklist", "projectId");
  const mou  = await q("mous", "projectId");
  const doc  = await q("documents", "projectId");
  const ag   = await q("agencyRequests", "projectId");
  const ev   = await q("evaluations", "projectId");
  const bd   = await q("boardDecisions", "projectId");
  const insp = await q("inspections", "projectId");
  const ncf  = await q("nonComplianceFindings", "projectId");
  const agr  = await q("agreements", "projectId");
  const bid  = await q("biddingEvents", "projectId");
  const [ca] = await pool.execute(
    `SELECT COUNT(*) as c FROM correctiveActions ca JOIN nonComplianceFindings ncf ON ca.findingId=ncf.id WHERE ncf.projectId=?`, [pid]
  );
  const [enf] = await pool.execute(
    `SELECT COUNT(*) as c FROM enforcementCases WHERE caseNumber LIKE 'EC-PRA-DEMO-003%'`
  );
  console.log(`\n  ${proj.projectCode} (${proj.currentStage}):`);
  console.log(`    LOI:${loi} PreQual:${pq} MOU:${mou} Docs:${doc} Agency:${ag} Eval:${ev} BoardDecision:${bd} Bidding:${bid} Agreement:${agr} Inspections:${insp} NCF:${ncf} CA:${ca[0].c} Enforcement:${enf[0].c}`);
}

await pool.end();
