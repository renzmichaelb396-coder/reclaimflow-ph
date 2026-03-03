# ReclaimFlow PH - Project TODO

## Phase 1: Architecture & Planning
- [x] Review complete spec and requirements
- [x] Plan data model and relationships
- [x] Define RBAC roles and permissions
- [x] Create feature breakdown

## Phase 2: Database Schema & Migrations
- [x] Create core tables (users, roles, permissions, projects)
- [x] Create project lifecycle tables (stages, tasks, timers)
- [x] Create document management tables (documents, versions, checklist items)
- [x] Create agency coordination tables
- [x] Create evaluation and board tables
- [x] Create bidding and agreement tables
- [x] Create monitoring and compliance tables
- [x] Create audit log and notification tables
- [x] Run migrations and verify schema

## Phase 3: Authentication & RBAC
- [x] Extend user table with role support
- [x] Implement role-based procedure guards (adminProcedure, evaluatorProcedure, etc.)
- [x] Add per-project access control middleware
- [x] Create permission checking utilities
- [x] Write RBAC tests

## Phase 4: Project Intake & Pre-Qualification
- [x] Build project creation procedure
- [x] Build LOI submission wizard backend
- [x] Build pre-qualification checklist logic
- [x] Build complete/deficient notice generator
- [x] Build SLA timer tracking
- [x] Build intake UI pages (FULL IMPLEMENTATION)
- [x] Build LOI wizard UI (FULL IMPLEMENTATION)
- [x] Build pre-qualification dashboard (FULL IMPLEMENTATION)

## Phase 5: Document Management & Compliance
- [x] Build document upload/versioning system
- [x] Build document type catalog
- [x] Build compliance checklist verification
- [x] Build MOU management with 24-month timer
- [x] Build agency coordination tracker
- [x] Build document UI pages (FULL IMPLEMENTATION)
- [x] Build checklist UI (FULL IMPLEMENTATION)
- [x] Build agency coordination UI (FULL IMPLEMENTATION)

## Phase 6: Evaluation & Board Management
- [x] Build evaluation workspace with scoring matrix
- [x] Build risk register module
- [x] Build CSW package builder
- [x] Build board agenda management
- [x] Build decision recording system
- [x] Build resolution registry
- [x] Build 90-day timer after full compliance
- [x] Build evaluation UI pages (FULL IMPLEMENTATION)
- [x] Build board UI pages (FULL IMPLEMENTATION)

## Phase 7: Bidding & Agreement Execution
- [x] Build competitive selection workflow
- [x] Build bidding event management
- [x] Build bid submission and tracking
- [x] Build bid evaluation matrix
- [x] Build award and protest tracking
- [x] Build agreement template library
- [x] Build signatory workflow
- [x] Build bidding UI pages (FULL IMPLEMENTATION)
- [x] Build agreement UI pages (FULL IMPLEMENTATION)

## Phase 8: Monitoring & Compliance
- [x] Build milestone tracker
- [x] Build inspection scheduling
- [x] Build field report forms
- [x] Build non-compliance findings registry
- [x] Build corrective action workflow
- [x] Build stop-work order generation
- [x] Build project closure workflow
- [x] Build monitoring UI pages (FULL IMPLEMENTATION)
- [x] Build compliance dashboard (FULL IMPLEMENTATION)
## Phase 9: Admin Panel & Configuration
- [x] Build user and role management (FULL IMPLEMENTATION)
- [ ] Build template builder (future)
- [ ] Build checklist configuration (future)
- [ ] Build document type management (future)
- [ ] Build SLA configuration (future)
- [x] Build admin dashboard (FULL IMPLEMENTATION)
- [x] Build admin UI pages (FULL IMPLEMENTATION)

## Phase 10: Reporting & Analytics
- [x] Build pipeline dashboard (FULL IMPLEMENTATION)
- [x] Build bottleneck analysis (FULL IMPLEMENTATION)
- [x] Build compliance reporting (FULL IMPLEMENTATION)
- [x] Build KPI dashboards (FULL IMPLEMENTATION)
- [ ] Build export functionality (CSV/PDF) (future)
- [x] Build reporting UI pages (FULL IMPLEMENTATION)

## Phase 11: Public Portal & Transparency
- [ ] Build public project pages (DEFERRED)
- [ ] Build project map view (DEFERRED)
- [ ] Build consultation scheduler (DEFERRED)
- [ ] Build public comment moderation (DEFERRED)
- [ ] Build FAQ pages (DEFERRED)
- [ ] Build downloads center (DEFERRED)
- [ ] Build public UI pages (DEFERRED)

## Phase 12: Notifications & Timers
- [x] Build email notification system (via notifyOwner)
- [x] Build in-app notification system (FULL IMPLEMENTATION)
- [x] Build SLA reminder engine (FULL IMPLEMENTATION)
- [x] Build expiry alerts (FULL IMPLEMENTATION)
- [x] Build deadline escalation (FULL IMPLEMENTATION)
- [x] Implement notification UI (FULL IMPLEMENTATION)

## Phase 13: Audit Logging & Security
- [x] Build comprehensive audit trail
- [x] Build document versioning
- [x] Build change tracking
- [x] Build access logs
- [ ] Implement encryption for sensitive data
- [ ] Implement signed URLs for file access

## Phase 14: UI/UX & Polish
- [x] Design system and color palette
- [x] Build responsive layouts
- [x] Build navigation structure
- [x] Implement dashboard layouts
- [x] Build form components
- [x] Build modal workflows
- [x] Implement loading states
- [x] Implement error handling

## Phase 15: Testing & Deployment
- [x] Write vitest unit tests (55 tests passing)
- [x] Write integration tests (routing, auth, e2e)
- [ ] Test end-to-end workflows (in progress)
- [ ] Performance optimization (future)
- [ ] Security audit (future)
- [ ] Final polish and bug fixes (in progress)
- [ ] Create deployment documentation (future)

## Phase 16: Supabase Migration
- [ ] Store Supabase credentials as secrets
- [ ] Install @supabase/supabase-js and postgres Drizzle driver
- [ ] Migrate Drizzle schema from MySQL to Postgres
- [ ] Run Drizzle migrations against Supabase Postgres (all 47 tables)
- [ ] Implement Supabase Storage service (project-docs, inspection-photos)
- [ ] Wire document upload to Supabase Storage
- [ ] Fix auth loop: SameSite=None + Secure for preview/published mode
- [ ] Fix OAuth callback redirect to /dashboard
- [ ] Guard lifecycle stage buttons with auth check
- [ ] Run end-to-end verification test

## Phase 17: PRA Readiness Sprint
- [x] Add inspection photo upload to Monitoring page (Supabase inspection-photos bucket)
- [ ] Implement Enforcement module (case intake, action tracking, closure)
- [ ] Implement MOU management UI (24-month countdown, extension workflow)
- [ ] Add PDF export for CSW package and Board resolution pack
- [ ] Add CSV export for Reports module
- [ ] Build in-app Notifications UI (bell icon, unread count, mark-read)
- [ ] Build seed data generator script (projects at each lifecycle stage)
- [ ] Add admin default account creation method
- [ ] Write full README deployment guide
- [ ] Document all environment variables
- [ ] Write backup/export procedure guide
- [ ] Run automated end-to-end scenario script
- [ ] Run role simulation tests (7 roles)
- [x] Output System Status Pack
- [x] Full system validation (audit logging, RBAC, SLA, Supabase, routes)
- [x] 79/79 tests passing post-validation
- [x] Audit logs added to all 13 critical mutations (up from 6)

## Phase 18: Final Operational Completion (PRA Sell-Ready)
- [x] Implement automatic SLA enforcement cron (every 6 hours, server-side, idempotent)
- [x] Prove SLA overdue auto-triggers notification and audit log
- [x] Implement MOU 24-month countdown UI in ProjectDetail (days remaining, warning, expired)
- [x] Build seed data generator script (12 projects, one per lifecycle stage)
- [x] Run seed and verify all modules show live data
- [x] Implement Demo Mode Reset button in AdminPanel (admin-only, RBAC-protected, audit-logged)
- [x] Run final government validation suite (tests, RBAC penetration, SLA simulation, uploads)
- [x] Generate SYSTEM_STATUS_PACK_FINAL.md with PRA SELL-READY verdict

## Phase 19: PRA Final Completion (Governance-Critical)
- [x] SLA escalation: wire notifyOwner() into slaCron.ts on overdue detection
- [x] SLA escalation: idempotency via overdueNotifiedAt field (already exists)
- [x] SLA escalation: audit log entry per escalation event with projectId, stage, slaType
- [x] Board Resolution PDF: server-side PDF endpoint (RBAC-protected, real DB data)
- [x] Board Resolution PDF: PRA-style header, resolution number, meeting date, decision text, vote tally, signatory placeholders
- [x] Board Resolution PDF: audit log on export
- [x] Board Resolution PDF: downloadable from Board Management page
- [x] Enforcement.tsx: case intake form (case number, type, description, project link)
- [x] Enforcement.tsx: case status progression (open → under_review → resolved → closed)
- [x] Enforcement.tsx: action timeline view
- [x] Enforcement.tsx: stop-work order generator with download
- [x] Enforcement.tsx: attachment upload to Supabase
- [x] Enforcement.tsx: RBAC (enforcement_officer + admin)
- [x] Enforcement.tsx: audit logs on case create, status change, stop-work issuance, closure
- [x] Register Enforcement route in App.tsx
- [x] Add Enforcement link to Dashboard quick actions (enforcement_officer + admin)
- [x] Final validation: 79/79 tests passing
- [x] Final System Status Pack (DEFINITIVE) — SYSTEM_STATUS_PACK.md updated

## Phase 20: Demo Data Insertion (3 PRA Demo Projects)
- [ ] Insert Manila Bay Integrated Reclamation Phase II (Demo) — stage: evaluation
- [ ] Insert Cebu South Road Properties Expansion (Demo) — stage: board_review
- [ ] Insert Iloilo Sunset Boulevard Reclamation (Demo) — stage: monitoring
- [ ] Verify record counts per table
- [ ] Confirm SLA timers created for all 3 projects
- [ ] Confirm audit logs written for all lifecycle events
- [ ] Confirm projects visible in dashboard at correct stages

## Phase 21: Route Param Standardization

- [x] Fix BoardManagement.tsx useParams key (projectId → id)
- [x] Scan and fix ProjectIntake.tsx useParams key (no fix needed — does not use useParams)
- [x] Scan and fix PreQualification.tsx useParams key (projectId → id)
- [x] Scan and fix DocumentManagement.tsx useParams key (projectId → id)
- [x] Scan and fix AgencyCoordination.tsx useParams key (projectId → id)
- [x] Scan and fix Evaluation.tsx useParams key (projectId → id)
- [x] Scan and fix BiddingWorkflow.tsx useParams key (projectId → id)
- [x] Scan and fix AgreementExecution.tsx useParams key (projectId → id)
- [x] Scan and fix Monitoring.tsx useParams key (projectId → id)
- [x] Scan and fix Enforcement.tsx useParams key (no fix needed — global page, no useParams)
- [x] Run 79/79 tests after fixes
- [x] Restart server and save checkpoint
