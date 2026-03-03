# ReclaimFlow PH — Frozen Design Authority Dossier

**Version:** v1.0 (Phase 21)
**Checkpoint:** d1915e5d
**Verified:** 2026-03-03
**Status:** AUTHORITATIVE — DO NOT MODIFY WITHOUT FROZEN DESIGN AUTHORITY APPROVAL

---

## Authoritative Technology Stack

| Component | Technology | Version |
|---|---|---|
| Frontend Framework | React | ^19.2.1 |
| Build Tool | Vite | ^7.1.7 |
| Client Router | Wouter | 3.7.1 |
| Backend Runtime | Node.js + Express | ^4.21.2 |
| API Layer | tRPC | ^11.6.0 |
| ORM | Drizzle ORM | ^0.44.7 |
| Database + Storage | Supabase (MySQL-compatible + S3) | ^2.98.0 |
| Authentication | Manus OAuth (custom SDKServer, JWT via jose) | jose 6.1.0 |
| Package Manager | pnpm | lockfile-pinned |

---

## Authoritative Lifecycle: 11 Stages

> Correction from prior dossier: "12-stage lifecycle" was DOCUMENTATION DRIFT.
> The authoritative implementation count is **11 stages**.
> The AdminPanel UI label "12 projects" refers to seed data row count (one stage
> duplicated in seed), not to a 12th distinct stage.

| # | Stage Enum | Label |
|---|---|---|
| 1 | `intake` | LOI / Intake |
| 2 | `pre_qualification` | Pre-Qualification |
| 3 | `mou` | MOU Execution |
| 4 | `compliance_docs` | Compliance Documents |
| 5 | `full_compliance` | Full Compliance |
| 6 | `evaluation` | Evaluation |
| 7 | `board_review` | Board Review |
| 8 | `bidding` | Competitive Selection |
| 9 | `agreement` | Agreement Execution |
| 10 | `monitoring` | Monitoring |
| 11 | `closure` | Closure |

---

## Authoritative Global Role List (`users.role`): 8 Roles

> Correction from prior dossier: `monitoring_officer` was listed but was NEVER
> implemented at any point in the project's git history. It does not appear in
> any migration SQL, schema file, router, page, component, seed script, or test.
> It has been removed from the authoritative role list.

| Role | Scope |
|---|---|
| `admin` | System-wide administrator |
| `evaluator` | Technical/financial evaluator |
| `secretariat` | PRA secretariat staff |
| `board_member` | Board of Directors member |
| `proponent` | Project proponent (applicant) |
| `agency_reviewer` | External agency reviewer |
| `enforcement_officer` | Enforcement and compliance officer |
| `public` | Default unauthenticated/unassigned user |

---

## Authoritative Project-Scoped Role List (`projectAccess.role`): 8 Values

> Addition to prior dossier: `viewer` was present in the first migration that
> created the `projectAccess` table. It is an intentional, project-scoped
> read-only permission — NOT a system-level role. It does not appear in
> `users.role` and has no UI or router logic as a system role.

| Role | Scope |
|---|---|
| `admin` | Project-level admin |
| `evaluator` | Project-level evaluator |
| `secretariat` | Project-level secretariat |
| `board_member` | Project-level board member |
| `proponent` | Project-level proponent |
| `agency_reviewer` | Project-level agency reviewer |
| `enforcement_officer` | Project-level enforcement officer |
| `viewer` | Project-scoped read-only access (not a system role) |

---

## Confirmed Non-Features (Must Remain Absent)

| Non-Feature | Status |
|---|---|
| Public portal | ABSENT — confirmed |
| Notification bell UI | ABSENT — confirmed |
| MFA / TOTP | ABSENT — confirmed |
| Rate limiting | ABSENT — confirmed |
| CSRF tokens | ABSENT — confirmed |

---

## Infrastructure Invariants

| Invariant | Specification |
|---|---|
| SLA Cron | `setInterval` at `6 * 60 * 60 * 1000` ms (6 hours) |
| Audit Logs | Primary DB only — `mysqlTable("auditLogs")` in `drizzle/schema.ts` |
| Base Docker Image | `node:20-slim` (Debian Bookworm) |
| Port | 3000 |
| Auth Provider | Manus OAuth — do not replace |
| Package Manager | pnpm — do not replace |

---

## Discrepancy Resolution Log

| # | Item | Prior Dossier | Authoritative Finding | Classification |
|---|---|---|---|---|
| 1 | Lifecycle stage count | "12-stage lifecycle" | 11 stages | Documentation Drift |
| 2 | `monitoring_officer` role | Listed as preserved | Never implemented | Documentation Drift |
| 3 | `viewer` in `projectAccess` | Not documented | Intentional, origin-present, project-scoped | Documentation Drift |

---

*Frozen Design Authority Updated — 2026-03-03*
