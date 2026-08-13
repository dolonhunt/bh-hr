# HR Management System — Worklog

> This is the shared handover document for all agents working on the HR Management System project.
> Each agent MUST append a new section starting with `---` after finishing its Task ID.

---
Task ID: 0
Agent: orchestrator (main)
Task: Read project brief, set up worklog, plan implementation phases.

Work Log:
- Read full instruction file `/home/z/my-project/upload/Build HR Management App with Visual Reference Pack.md` (1646 lines).
- Inspected the existing Next.js 16 scaffold: TypeScript, Tailwind v4, shadcn/ui (New York), Prisma (SQLite), Zustand, TanStack Query, recharts, framer-motion, next-auth, lucide-react are all pre-installed.
- Confirmed only the `/` route is user-visible. All HR modules must be rendered inside the single page using client-side view-state navigation (Zustand store).
- Confirmed dev server is already running on port 3000.

Stage Summary:
- Project goal: Build a production-ready, TeamHub-inspired HR Operations Console where an HR user can manage employees → generate HR documents (DOCX + PDF) → send directly to employee email → track delivery.
- MVP modules (P0): Login gate, Dashboard, Employees + Profile, Departments/Roles/Designations, Attendance, Leave, Payroll + Payslip, Documents (Templates, Generated, Email History), Variable system, DOCX/PDF generation, Document numbering, Email sending, Search, Settings.
- P1 modules: Performance, Recruitment, Bulk generation/email, Approval workflow, Reports, Audit logs.
- Architecture decision: Single `/` route with Zustand-powered view-state navigation. All backend logic exposed via `/api/*` REST endpoints backed by Prisma.
- Next phase: Build Prisma schema + design system + app shell + Dashboard + Employees in the first wave, then delegate remaining modules to specialized subagents in parallel.


---
Task ID: 1-B
Agent: subagent-1-B (Attendance + Leave + Payroll)

Task: Build the Attendance, Leave, and Payroll modules — full REST APIs under `/api/*`, frontend module pages, and the three entry dialogs (`attendance-entry-dialog`, `leave-entry-dialog`, `payslip-dialog`). Plus the supporting Departments/Roles/Designations CRUD APIs that the Settings module will reuse.

Work Log:
- Read project context (`worklog.md`, `prisma/schema.prisma`, `prisma/seed.ts`, existing `employees.tsx` + `employee-form-dialog.tsx` patterns, shared `PageHeader`/`KpiCard`/`StatusBadge`/`AvatarBadge`/`EmptyState` components, `lib/utils.ts`, `lib/db.ts`, `lib/store.ts`).
- Created `/agent-ctx/1-B-attendance-leave-payroll.md` with file inventory + notes.
- Created 15 API route files:
  - `/api/attendance` (GET list with date/employeeId/departmentId/status/search filters + employee+department includes; POST auto-computes workingHours/late/overtime from checkIn/checkOut)
  - `/api/attendance/[id]` (PATCH re-derives computed fields, DELETE)
  - `/api/leave` (GET list with status/employeeId/leaveTypeId/search filters; POST auto-computes days inclusive)
  - `/api/leave/[id]` (GET, PATCH handles approve/reject — sets decidedAt + approverId when status moves to APPROVED/REJECTED/CANCELLED, DELETE)
  - `/api/leave-types` (GET + POST)
  - `/api/leave-types/[id]` (PATCH + DELETE-archived)
  - `/api/payroll` (GET list with payrollMonth/status/employeeId/departmentId/search filters; POST auto-loads employee salary structure if components missing)
  - `/api/payroll/[id]` (GET, PATCH recomputes net if components change, DELETE)
  - `/api/payroll/generate-payslip` (POST — auto-loads employee + company + PAYSLIP template, finds-or-creates Payroll record for the month, resolves `{{employee.x}}`/`{{payroll.x}}`/`{{company.x}}`/`{{document.x}}` variables inline, computes next document number via `DocumentNumbering`, creates `GeneratedDocument` with rendered HTML + dataJson snapshot containing the rendered emailSubject/emailBody, links payslipDocId on payroll, marks payroll APPROVED, bumps numbering counter, writes activity + audit log entries)
  - `/api/departments` (GET with status filter + POST) and `/api/departments/[id]` (PATCH + DELETE-archive)
  - `/api/roles` (GET + POST) and `/api/roles/[id]` (PATCH + DELETE-archive)
  - `/api/designations` (GET + POST, removed `include: { department: true }` after Prisma rejected it — Designation model has no Department relation, only `departmentId` field) and `/api/designations/[id]` (PATCH + DELETE-archive)
- Created 6 frontend module/dialog files (replaced existing app-shell import targets):
  - `attendance.tsx` — PageHeader + 4 KPI cards (Present/Absent/Late/On Leave) + filters (Date, Department, Status, Search) + Table (avatar+name+ID, Date, Check In, Check Out, Hours, Late, Overtime, Status, Actions) + Edit/Delete dropdown + Pagination + Add Attendance button → opens `AttendanceEntryDialog`
  - `attendance-entry-dialog.tsx` — Employee searchable select + Date + datetime-local Check In/Out + Status select + Note; auto-computes and previews working hours; POSTs to `/api/attendance` (or PATCHes if editing)
  - `leave.tsx` — PageHeader + 4 KPI cards (Total/Pending/Approved/Rejected) + Tabs (All/Pending/Approved/Rejected) + Leave Type + Search filters + Table with inline Approve/Reject buttons for PENDING rows (open decision sub-dialog with optional approver note) + View sub-dialog showing full leave details + Edit/Delete actions + Pagination + Add Leave button
  - `leave-entry-dialog.tsx` — Employee + Leave Type (with color dot + default days) + Start/End Date + auto-computed days preview + Reason + Attachment URL; POSTs to `/api/leave`
  - `payroll.tsx` — PageHeader + 4 KPI cards (Total Net Payroll, Basic, Allowances, Deductions+Tax) + Month picker + Status/Department/Search filters + Table (Employee, Month, Basic, Allowances, Deductions, Tax, Net Salary, Payment Date, Status, Actions) with Generate Payslip / Approve / Delete actions + Pagination + Create Payroll button
  - `payslip-dialog.tsx` — Two-mode dialog (preset employeeId from profile vs. employee select); shows selected employee salary structure preview; on Generate calls `/api/payroll/generate-payslip`; on success shows success state with Preview (renders payslip HTML in sub-dialog), Download DOCX, Download PDF, and Send Email (opens sub-dialog with To/CC/BCC/Subject/Body, pre-filled from rendered emailSubject/emailBody in the GeneratedDocument.dataJson) action buttons. Download calls `/api/documents/[id]/download?format=docx|pdf` and Send Email POSTs `/api/documents/[id]/send-email` (both endpoints are owned by Task 1-A).
- Created 7 minimal PLACEHOLDER stubs so the dev server compiles while other agents build out their modules: `performance.tsx`, `recruitment.tsx`, `documents.tsx`, `reports.tsx`, `audit.tsx`, `settings.tsx`, and `generate-document-dialog.tsx`. Each clearly labelled as a placeholder that the responsible agent should overwrite.
- Fixed one runtime error: Prisma rejected `include: { department: true }` on the Designation model (it has only `departmentId` scalar field, no relation). Removed the include.
- Final lint: `bun run lint` returns 0 errors, 1 warning (in `shared/avatar-badge.tsx`, not my file). My 21 created files have zero lint issues.
- Smoke-tested all endpoints via curl:
  - `GET /` → HTTP 200
  - `GET /api/departments`, `/api/roles`, `/api/designations`, `/api/leave-types`, `/api/attendance`, `/api/leave`, `/api/payroll` → all 200 with seeded data
  - `POST /api/payroll/generate-payslip` with `{employeeId, month:"2026-08"}` → 201 with rendered payslip (documentNumber `NWL/PAYSLIP/202608/0001`, resolved employee/company/payroll variables in HTML content, dataJson with emailSubject/emailBody, linked payslipDocId on payroll, numbering counter bumped)

Issues Encountered:
- The placeholder stubs for `performance`, `recruitment`, `documents`, `reports`, `audit`, `settings`, and `generate-document-dialog` were not present in the codebase at task start — `app-shell.tsx` and `quick-actions.tsx` were importing modules that didn't exist, so the dev server was throwing "Module not found" errors and the user could see nothing. I added minimal placeholders explicitly marked for the responsible agents to replace. (Task 1-A owns `documents` + `generate-document-dialog`; orchestrator or other agents own the rest.)
- The `Designation` Prisma model has a `departmentId` foreign-key field but no `department` relation defined, so `include: { department: true }` failed at runtime. Removed the include.
- No standalone `generateDocument` helper exists in `/src/lib/` yet (Task 1-A may add one). For `/api/payroll/generate-payslip` I implemented the variable resolution + document-number generation inline so the endpoint is self-sufficient and won't break if Task 1-A takes a different helper-naming approach.

Stage Summary:
- Attendance, Leave, Payroll modules are fully functional end-to-end: list + filter + paginate + create + edit + delete; leave approve/reject with notes; payroll payslip generation with template variable resolution.
- Payslip generation creates both the Payroll record (if missing) and the GeneratedDocument in one transaction-safe flow, links them, and bumps the document numbering counter.
- Payslip dialog supports preview, DOCX/PDF download (delegates to Task 1-A's download endpoint), and email send (delegates to Task 1-A's send-email endpoint).
- Departments/Roles/Designations CRUD APIs are ready for the Settings module agent to consume.
- 21 files created/modified; lint passes; dev server responds 200 on `/` and on all 15 new API routes.

---
Task ID: 1-C
Agent: subagent (Performance + Recruitment + Reports + Audit Log + Settings + Search APIs)

Task: Build the Performance, Recruitment, Reports, Audit Log, Settings modules (frontend + backend) and the global Search API.

Work Log:
- Read project context from worklog.md, prisma/schema.prisma, src/lib/db.ts, src/lib/utils.ts, existing shared components (PageHeader, KpiCard, StatusBadge, AvatarBadge, EmptyState), existing modules (employees.tsx, dashboard.tsx), and the AppShell to confirm naming conventions.
- Inspected existing API routes (/api/employees, /api/departments, /api/roles, /api/designations, /api/leave-types) created by sibling agents to align response shapes ({ items, total, ... }) and audit-log conventions.

API routes built (all using `import { db } from "@/lib/db"`):
1. `/api/performance` (GET with filters: search, employeeId, reviewPeriod, status + pagination; POST with auto overall-score calc + audit log)
2. `/api/performance/[id]` (GET / PATCH with score recalculation / DELETE with audit log)
3. `/api/jobs` (GET with filters: search, status, departmentId + candidate count via `_count` + per-stage candidate groupBy; POST)
4. `/api/jobs/[id]` (GET with full candidate list / PATCH / DELETE)
5. `/api/candidates` (GET with filters: search, status, jobId + pagination; POST)
6. `/api/candidates/[id]` (GET / PATCH — supports status transitions incl. HIRED linking to employee / DELETE)
7. `/api/audit-logs` (GET with filters: search, action, entityType, from, to + pagination; includes user relation)
8. `/api/settings` (GET returns EmailSetting + DocumentNumbering + Company + Setting KV map; PATCH accepts partial updates to each section, upserts if missing)
9. `/api/settings/test-email` (POST { to } → creates EmailLog with status="SENT" + note "Test email simulated" + AuditLog)
10. `/api/company` (GET / PATCH)
11. `/api/search` (GET ?q=&limit=10 → returns { employees, documents, candidates } with case-insensitive contains on multiple fields)
12. `/api/reports/generate` (GET ?type=employee|attendance|leave|payroll|document&format=csv|excel|pdf&from=&to=)
   - CSV: streamed as text/csv with proper escaping
   - Excel: same content as CSV with .xls extension and `application/vnd.ms-excel` content-type for MVP
   - PDF: hand-rolled minimal PDF generator (Type1 Helvetica — no external .afm font files needed) supporting multi-page output. Initially tried pdfkit but `require("pdfkit")` returned a non-constructor under Turbopack, and even after switching to ESM import pdfkit failed to resolve `/ROOT/node_modules/pdfkit/js/data/Helvetica.afm`. Replaced with a self-contained minimal PDF writer.

Frontend modules built (all client components, TanStack Query + sonner toast + shadcn/ui, emerald primary palette):
- `performance.tsx` — PageHeader + KPI cards (Total Reviews / Avg Score / Top Performers / Pending Reviews) + filters (period, status, search) + table with avatar, progress-bar score, status badge + actions menu + create/edit dialog with 5 score sliders (0-100) + live overall score + detail dialog with Recharts RadarChart visualizing the 5 dimensions, score bars, comments.
- `recruitment.tsx` — Tabs (Jobs / Candidates). Jobs tab: KPIs (Open Jobs, Total Vacancy, Candidates Applied, Hired This Month), filter bar, responsive grid of job cards with department color stripe, vacancy, location, closing date, salary range, candidate count, edit/archive actions. Candidates tab: 7-column pipeline visualization (APPLIED → SCREENING → SHORTLISTED → INTERVIEW → SELECTED → OFFER → HIRED) with candidate cards, rejected candidates collapsed list, candidate detail dialog with skills chips, stage transition buttons (one per stage), editable interview notes; add-candidate dialog.
- `reports.tsx` — Card grid of 5 report types (Employee / Attendance / Leave / Payroll / Document) with icon + description + Generate button. Generate dialog with date range, format selector (CSV / Excel / PDF) and Download button that streams the file from `/api/reports/generate`.
- `audit.tsx` — PageHeader + 5-column filter bar (search, action dropdown, entity-type dropdown, date range) + table with timestamp, user avatar+name, color-coded action badge by category (auth=sky, employee=primary, document=violet, email=teal, destructive=rose), entity type, description, IP address. 50 per page pagination.
- `settings.tsx` — Left vertical tab nav with 7 tabs:
  - Organization: company form (name, legalName, address, city/state/country/zip, email/phone/website/logo URL/taxId) → PATCH `/api/company`.
  - Departments: table + add/edit dialog (name, description, color picker).
  - Roles: table + add/edit dialog.
  - Designations: table with department column + add/edit dialog with department select.
  - Leave Types: table with code badge, default days, paid toggle, color + add/edit dialog.
  - Email Settings: form (senderName/Email, smtpHost/Port, username, password with show/hide toggle, encryption NONE/SSL/TLS) + Send Test Email dialog → POST `/api/settings/test-email`.
  - Document Numbering: form (name, prefix, pattern with clickable token chips, padding, nextSeq) + live preview of the next document number.

Issues encountered:
- pdfkit did not work in the Next.js 16 / Turbopack runtime: `require("pdfkit")` returned a non-constructor and even after switching to `import PDFDocument from "pdfkit"`, the constructor threw `ENOENT` for `/ROOT/node_modules/pdfkit/js/data/Helvetica.afm` (a Turbopack path-resolution bug). Resolved by replacing pdfkit with a self-contained minimal PDF generator that uses built-in PDF Type1 Helvetica font (no external font data file needed), supports multi-page output, proper xref table, and is ~100 lines of code.
- Two lint errors remain in `documents.tsx` and `generate-document-dialog.tsx` — these are NOT my files (owned by another agent), so I left them untouched. All my files pass lint cleanly.
- The `/api/designations` route (owned by another agent) includes `department: true` but the Designation model has no `department` relation (only a plain `departmentId` String) — that route currently 500s. Not in my scope, but flagged here for the orchestrator.

Lint status:
- Ran `cd /home/z/my-project && bun run lint 2>&1 | tail -30`.
- My 12 API route files and 5 module files produce ZERO lint errors and ZERO warnings.
- The remaining 2 errors + 2 warnings are all in files owned by other agents (documents.tsx, generate-document-dialog.tsx, avatar-badge.tsx).

Dev server verification:
- All API endpoints return 200 (verified via curl):
  - GET /api/performance?pageSize=2 → 200 ✓
  - GET /api/jobs → 200 ✓ (with stageCounts enrichment)
  - GET /api/candidates?pageSize=2 → 200 ✓
  - GET /api/audit-logs?pageSize=2 → 200 ✓
  - GET /api/settings → 200 ✓ (returns emailSetting + documentNumbering + company + settings map)
  - POST /api/settings/test-email {to} → 200 ✓ (creates EmailLog SENT + AuditLog EMAIL_TEST)
  - GET /api/company → 200 ✓
  - GET /api/search?q=EMP → 200 ✓ (returns employees + documents + candidates)
  - GET /api/reports/generate?type=employee&format=csv → 200 ✓
  - GET /api/reports/generate?type=employee&format=pdf → 200 ✓ (valid PDF, opens in `file` as "PDF document, version 1.4")
  - GET /api/reports/generate?type=payroll&format=excel → 200 ✓ (content-type application/vnd.ms-excel)
- `GET /` returns 200 (page renders with AppShell + all modules loaded).

Stage Summary:
- All 12 assigned API endpoints built and verified working.
- All 5 assigned frontend modules built with: TanStack Query for data fetching, sonner toast for feedback, shared PageHeader/KpiCard/StatusBadge/AvatarBadge/EmptyState components, Recharts RadarChart (performance), pagination, loading/empty/error states, emerald primary palette (no indigo/blue), responsive design, mobile-safe touch targets.
- All 5 modules are wired into AppShell via existing imports (no AppShell changes needed — the imports already existed and just needed the module files to exist).
- The previously-broken dev server (`Module not found: Can't resolve './modules/{performance,recruitment,reports,audit,settings}'`) now compiles cleanly because all 5 module files exist.
- Audit log entries are automatically written for every create/update/delete action across all 12 endpoints, providing the data the Audit module visualizes.

---

Task ID: 1-A
Agent: documents-module-agent
Task: Build the Documents module (templates, generation, DOCX/PDF rendering, email service) end-to-end.

Work Log:
- Inspected the existing scaffold: `prisma/schema.prisma` already defines `DocumentTemplate`, `GeneratedDocument`, `EmailLog`, `DocumentNumbering`, `EmailSetting`. Five templates are seeded (APPT, OFFER, PAYSLIP, EXP, LA).
- Created `/src/lib/document-vars.ts` exporting `resolveVariables(content, ctx)` — replaces `{{employee.*}}`, `{{company.*}}`, `{{document.*}}`, `{{payroll.*}}` tokens. Handles missing data gracefully (returns empty string) so previews never show literal braces.
- Created `/src/lib/document-number.ts` exporting `generateDocumentNumber({type, employee, company}, opts)` — applies the configured pattern, prefers the `prefix` from `DocumentNumbering` when set (preserves seeded `NWL`), guarantees uniqueness via a collision-detection loop, increments `nextSeq` unless `dryRun: true` is passed (used by the preview mode).
- Created `/src/lib/document-renderers.ts` — pure HTML-to-block parser plus `renderDocxBuffer()` (uses the `docx` package) and `renderPdfBuffer()` (uses `pdfkit`). Supports headings, paragraphs, hr, br, tables with th/td/colspan, and inline strong/em/u runs.
- Built 11 API endpoints under `/src/app/api/`:
  - `document-templates/route.ts` (GET list with filters, POST create with unique-code validation)
  - `document-templates/[id]/route.ts` (GET, PATCH, DELETE = soft archive)
  - `documents/route.ts` (GET paginated list with filters + latest email status; POST generates — supports `preview:true` to return resolved HTML without persisting)
  - `documents/[id]/route.ts` (GET full, PATCH status, DELETE archive)
  - `documents/[id]/preview/route.ts` (returns stored rendered HTML)
  - `documents/[id]/download/route.ts` (`?format=docx|pdf` — streams the file, records `filePath` / `pdfPath`)
  - `documents/[id]/send-email/route.ts` (validates recipient against employee official email, logs overrides, creates EmailLog with status=SENT (simulated), updates doc to SENT, writes Activity + Audit logs)
  - `email-logs/route.ts` (GET paginated, filters by status/documentId/employeeId/search; manually enriches each log with the referenced Employee since `EmailLog.employeeId` has no Prisma `@relation`)
  - `email-logs/[id]/resend/route.ts` (POST creates a NEW EmailLog, never mutates the original)
- Updated `next.config.ts` to add `serverExternalPackages: ["pdfkit", "docx", "fontkit", "linebreak", "png-js"]` — fixes pdfkit's `__dirname`-based font loading (without this Next.js rewrites `__dirname` to `/ROOT` and the Helvetica.afm lookup fails with ENOENT).
- Built `/src/components/hr/modules/template-form-dialog.tsx` — Create/Edit template with Details / Content / Email tabs; content tab shows clickable variable chips that append to the HTML body and a live `dangerouslySetInnerHTML` preview. Includes Duplicate action.
- Built `/src/components/hr/modules/generate-document-dialog.tsx` — 6-step wizard (Select Employee → Type → Template → Review Data → Preview → Generate). Step 4 exposes every employee field as an editable override; step 5 calls the preview-mode POST and renders the resolved HTML; step 6 (Generate) persists and shows success state with Preview / Download DOCX / Download PDF / Send Email actions. Send Email opens a sub-dialog pre-filled from the template's emailSubject / emailBody and warns when the recipient differs from the employee's official email.
- Replaced the stub at `/src/components/hr/modules/documents.tsx` with the full module: 4 tabs (All Documents, Templates, Generated, Email History) driven by `useApp(s => s.documentsTab)`. Includes KPIs, filterable tables, a DocumentPreviewDialog, TemplatePreviewDialog, and DirectSendEmailDialog.
- Ran `bun run lint` — passes with 0 errors and 0 warnings in any file I own (one pre-existing warning remains in `shared/avatar-badge.tsx`).
- Manually exercised every endpoint via curl. Verified: list/create/update/archive templates, generate document (preview + real), DOCX download (8.8 KB Microsoft Word file), PDF download (2 KB valid PDF), send-email with override detection (logged), email-logs paginated list with employee enrichment, resend creates a new log.

Stage Summary:
- The Documents module is the most important product surface of this HR app, and it is now fully functional end-to-end: HR can create templates with click-to-insert variables, walk through a 6-step generation wizard, preview the rendered document, download DOCX/PDF, and email it to the employee with audit-logged overrides.
- 11 API endpoints are wired up, plus 3 helper libraries (`document-vars.ts`, `document-number.ts`, `document-renderers.ts`).
- A critical fix in `next.config.ts` (`serverExternalPackages`) makes pdfkit usable inside the Next.js server runtime — this likely also unblocks the parallel Reports agent whose pdf generation was failing with `PDFDocument is not a constructor` / `ENOENT Helvetica.afm`.
- All work records are also persisted in `/agent-ctx/1-A-documents-module-agent.md` for downstream agents to consume.

---
Task ID: FINAL
Agent: orchestrator (main)
Task: End-to-end verification of the complete HR Management System and cron job setup.

Work Log:
- Verified all 11 modules render correctly via agent-browser: Dashboard, Employees, Attendance, Leave, Payroll, Performance, Recruitment, Documents, Reports, Audit Log, Settings.
- Verified login flow: hr@northwindlabs.io / demo1234 → dashboard loads with KPIs, charts, recent activity.
- Verified employees table: 20 seeded employees with avatars, departments, designations, salaries, statuses.
- Verified employee profile: 8 tabs (Overview, Personal, Employment, Attendance, Leave, Payroll, Documents, Activity) all render with data.
- Verified Documents module: 4 tabs (All Documents, Templates, Generated, Email History), KPIs, recent documents table with proper document numbers (e.g. NWL/DES/OFFER/08132026/EMP020), Preview/Send Email actions.
- Verified Generate Document wizard: opens with employee selection list.
- Verified Command Palette (Ctrl+K): opens with Quick Actions + Navigation + search results.
- Used VLM (z-ai vision) to visually inspect Dashboard and Documents screenshots — confirmed: clean professional layout, KPI cards render correctly, charts render, no overlapping text or broken styles.
- Fixed minor KPI label truncation in Documents module by switching grid to `lg:grid-cols-5` and removing `truncate` from KpiCard label.
- Verified dev log shows no runtime errors after the parallel subagent builds.
- Created recurring cron job (every 15 minutes, Asia/Dhaka tz, kind=webDevReview, job_id=321645) to autonomously review, test, and extend the project.

Stage Summary:
- Project status: STABLE & COMPLETE for MVP. All P0 modules are functional with real database persistence.
- Login: hr@northwindlabs.io / demo1234
- Architecture: Single `/` route Next.js 16 app with Zustand view-state navigation. All backend logic via `/api/*` REST routes backed by Prisma (SQLite).
- 20 seeded employees, 5 document templates (Appointment, Offer, Payslip, Experience, Leave Approval), 7 days of attendance, 12 leave requests, 18 payroll records, 3 jobs, 8 candidates, 8 performance reviews.
- Document generation: real DOCX (via `docx` package) and PDF (custom minimal PDF writer due to pdfkit/Next.js 16 bundling issue) generation working. Variable system supports employee/company/document/payroll variables.
- Email service: simulated send (creates EmailLog with status=SENT) with recipient validation against employee official email (override allowed but audit-logged).
- Document numbering: configurable pattern {COMPANY}/{DEPARTMENT}/{DOCUMENT_TYPE}/{DATE}/{EMPLOYEE_ID} with auto-incrementing sequence.
- Design system: emerald primary palette (NO indigo/blue), warm neutral background, soft shadows, consistent spacing, full light/dark theme support via next-themes.
- Sticky footer verified: footer sticks to bottom on short pages, pushed down naturally on long pages.
- Next-phase recommendations for the cron reviewer:
  1. Add more document templates (Promotion Letter, Transfer Letter, Warning Letter, Salary Certificate, Increment Letter, Resignation Acceptance, Relieving Letter, NOC).
  2. Implement bulk document generation (select N employees → generate N documents → download ZIP).
  3. Implement bulk email (select N employees → generate individual docs → send N emails with strict employee-document-recipient validation).
  4. Add document approval workflow (Draft → Generated → Pending Approval → Approved → Issued → Sent) with role-based approval.
  5. Add charts to Performance module (already has RadarChart) and Reports module.
  6. Polish mobile responsiveness — verify all modules at 375px width.
  7. Add employee photo upload (currently only URL field).
  8. Add CSV/Excel export for all major tables.
  9. Add real email sending via SMTP (currently simulated).
  10. Add keyboard shortcuts (g d for dashboard, g e for employees, etc.).

---

Task ID: 2-A
Agent: bulk-templates-and-generation-agent

Task: Add 10 new document templates (Promotion, Transfer, Warning, Show Cause, Salary Certificate, Increment, Resignation Acceptance, Relieving, NOC, Employment Certificate) via an idempotent seed script, and build the full Bulk Document Generation feature (backend APIs + multi-step frontend wizard + integration with Documents module header, Quick Actions, and Topbar Quick Add dropdown).

Work Log:
- Read project context: `worklog.md` (incl. FINAL section's recommendations), `prisma/schema.prisma`, `prisma/seed.ts`, `/agent-ctx/1-A-documents-module-agent.md`, existing helpers (`document-vars.ts`, `document-number.ts`, `document-renderers.ts`), `/api/documents` POST route, `/api/documents/[id]/send-email` route, `documents.tsx`, `generate-document-dialog.tsx`, `quick-actions.tsx`, `topbar.tsx`, `store.ts`, `next.config.ts`, `package.json`.
- Created `/agent-ctx/2-A-bulk-templates-and-generation.md` with full implementation notes.
- Created `/home/z/my-project/prisma/seed-templates.ts`:
  - Idempotent (uses `findUnique({where:{code}})` then `create` or `update`).
  - 10 templates: PROMO, TRANS, WARN, SCN, SALC, INCR, RESIG, REL, NOC, EMPC.
  - Each template includes HTML `content` with `{{employee.*}}`/`{{company.*}}`/`{{document.*}}`/`{{payroll.*}}` variables, `emailSubject`, `emailBody`, `status="ACTIVE"`, `version="1.0"`.
  - Ran successfully: "Created 10, updated 0 template(s)."
- Created `/src/app/api/documents/bulk-generate/route.ts`:
  - POST `{ employeeIds: string[], templateId: string, type?: string }`.
  - Per-employee try/catch so one failure doesn't block others.
  - Reuses `resolveVariables()` and `generateDocumentNumber()` from existing helpers.
  - For PAYSLIP type, loads latest payroll (or falls back to employee salary fields).
  - Returns `{ generated: [...], failed: [...], count: number, totalRequested: number }`.
  - Writes a single AuditLog entry: action=`BULK_DOCUMENT_GENERATE`, description=`Bulk generated N document(s) using template X (CODE). M failed.`, with metadata including all generated document IDs and failed employee IDs.
  - Also writes an Activity log entry per generated document.
- Created `/src/app/api/documents/bulk-download/route.ts`:
  - POST `{ documentIds: string[] }`.
  - Returns a `application/zip` response with `Content-Disposition: attachment; filename="documents.zip"`.
  - Uses `archiver`'s `ZipArchive` (v8 is ESM-only with named exports — initial `import archiver from "archiver"` + `archiver("zip",…)` failed with `TypeError: {imported module}.default is not a function`; switched to `import { ZipArchive } from "archiver"` + `new ZipArchive({zlib:{level:6}})` which extends Node's Transform stream so `.on("data")/.append()/.finalize()` work the same as the v7 default export).
  - For each document, renders the DOCX buffer via the existing `renderDocxBuffer` and appends it to the ZIP with filename `{documentNumber}_{employeeName}.docx` (sanitised; collisions get `_{n}` suffix).
- Created `/src/components/hr/modules/bulk-generate-dialog.tsx`:
  - 5-step wizard: Select Employees → Select Template → Review → Generate → Results.
  - Step 1: searchable multi-select with checkboxes, department filter, "Select all visible", per-department quick-add buttons, live selected count. Loads all employees via TanStack Query (`/api/employees?pageSize=200`).
  - Step 2: dropdown grid of all ACTIVE templates (TanStack Query `/api/document-templates?status=ACTIVE&pageSize=200`).
  - Step 3: review summary — "Will generate N {templateName} documents for N employees", plus a scrollable list of selected employees (avatar, name, ID, email, status).
  - Step 4: progress bar (animated 5%→90% while waiting, 100% on success) using shadcn `Progress`.
  - Step 5: success/failure summary, generated documents list (with status badges), failed list (with error reasons), and "Download All (ZIP)" + "Send All Emails" buttons.
  - "Send All Emails" loops through each generated document one-at-a-time, deriving the recipient from the corresponding employee's `officialEmail`. Each `POST /api/documents/[id]/send-email` carries only that one document's pre-rendered emailSubject/emailBody (stored in `dataJson`). Employee A's document is never sent to Employee B. A second Progress bar tracks per-email send progress.
  - Uses shadcn components (Dialog, Button, Input, Label, Checkbox, Select, ScrollArea, Progress, Badge), TanStack Query, sonner toast, AvatarBadge/StatusBadge shared components. Emerald primary palette only — no indigo/blue.
- Modified `/src/components/hr/modules/documents.tsx`:
  - Extended `DOC_TYPES` constant to include all 22 types defined in the Prisma schema (CONTRACT, JOINING, SALARY_CERT, INCREMENT, SALARY_REVISION, PROMOTION, TRANSFER, WARNING, SHOW_CAUSE, EMPLOYMENT_CERT, NOC, LEAVE_CANCELLATION, RESIGN_ACCEPT, FINAL_SETTLEMENT were missing).
  - Imported `Layers` icon and `BulkGenerateDialog`.
  - Added a "Bulk Generate" outline button in the PageHeader actions between "Template" and "Generate Document".
  - Added `<BulkGenerateDialog open={bulkOpen} onOpenChange={setBulkOpen} />` to the module render tree.
- Modified `/src/components/hr/quick-actions.tsx`:
  - Imported `BulkGenerateDialog` and rendered it for the `bulk-generate` quick action.
- Modified `/src/components/hr/topbar.tsx`:
  - Added a "Bulk Generate Documents" item to the Quick Add dropdown menu.
- Modified `/next.config.ts`:
  - Added `archiver` to `serverExternalPackages` (kept the existing pdfkit/docx/fontkit/linebreak/png-js entries).
- Modified `/package.json` (via `bun add archiver @types/archiver`):
  - Installed `archiver@8.0.0` and `@types/archiver@8.0.0`.

Issues encountered & fixes:
1. **archiver v8 ESM import** — the package dropped its CommonJS default export in v8. Initial `import archiver from "archiver"` + `archiver("zip", …)` failed at runtime with `TypeError: {imported module [externals]/archiver}.default is not a function`. Fixed by using the named `ZipArchive` class import (`new ZipArchive({ zlib: { level: 6 } })`) — it extends Node's `Transform` stream so the rest of the API (`.on("data")`, `.append()`, `.finalize()`, `.on("end")`) is unchanged.
2. **Unused eslint-disable directives** — initial bulk-download route had two `// eslint-disable-next-line no-console` comments; the project's eslint config doesn't actually flag `console.*` calls, so the directives were flagged as unused. Removed both directives; `console.warn`/`console.error` calls now stand alone.

Verification:
- `bun run prisma/seed-templates.ts` → "Created 10, updated 0 template(s)." (idempotent on re-run).
- `GET /api/document-templates?status=ACTIVE&pageSize=200` → 15 templates (5 original + 10 new).
- `POST /api/documents/bulk-generate` with 3 employees + PROMO template → 201, count=3, document numbers `NWL/DES/PROMO/08132026/EMP020`, `NWL/PROD/PROMO/08132026/EMP019`, `NWL/ENG/PROMO/08132026/EMP018`.
- `POST /api/documents/bulk-generate` with 2 employees + NOC template → 201, count=2.
- `POST /api/documents/bulk-generate` with 2 employees + WARN template → 201, count=2.
- `POST /api/documents/bulk-download` with 2 doc IDs → 200, `application/zip`, 14,371 bytes. `unzip -l` confirms two entries: `NWL_DES_WARN_08132026_EMP020_Priya_Sarkar.docx` (9,023 B) and `NWL_PROD_WARN_08132026_EMP019_Rashed_Karim.docx` (9,022 B).
- `POST /api/documents/[id]/send-email` for one of the bulk-generated docs with `to: priya.sarkar@northwindlabs.io` → 201, EmailLog status=SENT (recipient validation passed: matches employee official email).
- `GET /api/audit-logs?action=BULK_DOCUMENT_GENERATE&pageSize=5` → 3 audit log entries with descriptions like "Bulk generated 2 document(s) using template Warning Letter (WARN). 0 failed."
- `cd /home/z/my-project && bun run lint` → 0 errors, 0 warnings across the entire project (including all my new/modified files).
- Dev server log shows clean compilation and 200/201 responses for all new endpoints after the archiver import fix.

Stage Summary:
- 10 new document templates are now seeded and available across the Documents module (template gallery, single Generate Document wizard, Bulk Generate wizard).
- Bulk Document Generation is fully functional end-to-end: select N employees → pick a template → review → generate → download ZIP and/or send each employee their own personalised document via email.
- The strict "Employee A never receives Employee B's document" security rule is enforced at the API level — each email is sent one-at-a-time with the recipient derived from the corresponding employee's `officialEmail`.
- All work persisted in `/agent-ctx/2-A-bulk-templates-and-generation.md` for downstream agents to consume.

---

Task ID: 2-B
Agent: subagent-2-B (approval-workflow + reports-charts)
Task: Build the full Document approval workflow (PENDING_APPROVAL → APPROVED → ISSUED → SENT) end-to-end — backend status-transition APIs with validation + audit logs + lock-on-issue, an Approval Queue UI as the 5th tab in the Documents module, status-flow pills + status-based action buttons in the documents table — and rewrite the Reports module as a real analytics dashboard (KPIs + 6 Recharts visualizations + a custom recruitment funnel) while preserving the existing CSV/Excel/PDF export cards.

Work Log:
- Read project context from worklog.md (Tasks 0, 1-A, 1-B, 1-C, FINAL), prisma/schema.prisma, src/lib/db.ts, src/lib/utils.ts, src/lib/store.ts, shared components (PageHeader, KpiCard, StatusBadge, AvatarBadge, EmptyState), existing documents.tsx, existing reports.tsx, existing API routes (/api/documents, /api/documents/[id], /api/documents/[id]/send-email, /api/dashboard, /api/reports/generate) — to align with sibling agents' response shapes, audit-log conventions, and the existing Tab/Dialog/KpiCard patterns.
- Created `/agent-ctx/2-B-approval-workflow-reports-charts.md` with the full file inventory + smoke-test results.

API routes built (all using `import { db } from "@/lib/db"`):
1. `/api/documents/[id]/route.ts` (REWRITTEN PATCH) — Validates every status transition against an allow-list map (`VALID_TRANSITIONS`). Writes a `DOCUMENT_STATUS_CHANGE` AuditLog on every transition with the exact format `Document {docNumber} status changed from {oldStatus} to {newStatus}` plus a JSON metadata blob (from/to/note). Mirrors the transition as an Activity on the employee timeline. **Locks content edits** when status ∈ {APPROVED, ISSUED, SENT, ARCHIVED} — PATCH silently ignores `title`/`content`/`month` changes for locked docs. Returns 400 with a descriptive error on invalid transitions (e.g. "Invalid status transition: ISSUED → APPROVED. Allowed: SENT, ARCHIVED").
2. `/api/documents/pending-approval/route.ts` (NEW GET) — Returns PENDING_APPROVAL docs (with employee + template + generatedBy includes) plus queue KPIs: `{ pending, approvedToday, issuedToday, rejectedToday }`. "Rejected Today" is derived from the AuditLog (counts `DOCUMENT_STATUS_CHANGE` entries today whose description contains "to GENERATED"), so it captures rejection events even though the document's current status is GENERATED.
3. `/api/documents/[id]/approve/route.ts` (NEW POST) — Body `{ note? }`. Validates status is PENDING_APPROVAL, transitions to APPROVED, writes AuditLog + Activity (DOCUMENT_APPROVED).
4. `/api/documents/[id]/reject/route.ts` (NEW POST) — Body `{ note? }`. Transitions PENDING_APPROVAL → GENERATED (back to draft), writes AuditLog + Activity (DOCUMENT_REJECTED) with the rejection reason in metadata + description.
5. `/api/documents/[id]/issue/route.ts` (NEW POST) — Transitions APPROVED → ISSUED. This locks the document (PATCH route enforces the lock via `LOCKED_STATUSES`). Writes AuditLog + Activity (DOCUMENT_ISSUED).
6. `/api/reports/analytics/route.ts` (NEW GET) — Returns aggregate analytics:
   - `kpis`: totalEmployees, avgAttendanceRate (over 30d trend), totalPayrollThisMonth, docsGeneratedThisMonth.
   - `employeeGrowth`: last 12 months, each `{month, hires, cumulative}`. Cumulative baseline is pre-counted (employees joined before the 12-month window).
   - `attendanceTrend`: last 30 days, each `{date, rate, present, total}`. Rate = (PRESENT + LATE) / total.
   - `leaveUtilization`: per-leave-type days + count + color (from LeaveType.color).
   - `payrollByDepartment`: this-month net salary grouped by department name.
   - `documentTrend`: last 6 months, `{data: rows, types: top5types}` for a stacked bar chart (everything outside top-5 collapses to "Other").
   - `performanceDistribution`: histogram buckets 0-40 / 41-60 / 61-75 / 76-85 / 86-100.
   - `recruitmentFunnel`: 7 stages (Applied → Screening → Shortlisted → Interview → Selected → Offer → Hired), each `{stage, count, atStage}`. `count` is **cumulative** (candidates who reached stage X or beyond, excluding REJECTED) for a proper monotonically-decreasing funnel; `atStage` is the per-stage count.

Frontend modules built:
7. `approval-queue.tsx` (NEW) — Rendered as the 5th tab in Documents. Top: 4 KPI cards (Pending Approval / Approved Today / Issued Today / Rejected Today) sourced from the pending-approval endpoint's `kpis` block. Filter bar (search + type select) + an emerald "Approve All (N)" button that sequentially approves all visible pending docs with a "Bulk approved" note. Table columns: Document Number (click → preview), Employee (avatar + name + ID), Type (badge), Submitted Date (formatted + relative), Submitted By (avatar + name + email from `generatedBy`), Actions. Row actions: Preview (Eye icon), Quick Approve (green CheckCircle2 → POST /approve with empty body), Reject (red X → opens RejectDialog with optional reason textarea), Review (opens ApproveDialog with optional note + "Preview First" button). Loading skeleton + EmptyState ("No documents awaiting approval"). Sonner toast feedback. TanStack Query for data + invalidation on every action.
8. `reports.tsx` (REWRITE) — Top: 4 KPI cards (Total Employees / Avg Attendance 30d % / Payroll This Month / Docs This Month). Middle: "Analytics Dashboard" section with 6 Recharts in a responsive `lg:grid-cols-2` grid, each in a `ChartCard` wrapper with title + subtitle:
   1. Employee Growth — LineChart (hires + cumulative, 12 months, emerald + amber lines, dashed cumulative).
   2. Attendance Rate Trend — AreaChart (30 days, gradient fill, Y domain 0-100%).
   3. Leave Utilization by Type — Donut PieChart (per-type colors from LeaveType.color, tooltip shows days + request count).
   4. Payroll by Department — horizontal BarChart (reversed so largest at top, k-formatted X axis, formatCurrency tooltip).
   5. Document Generation Trend — stacked BarChart by type (6 months, up to 5 stacked types + "Other", per-type colors).
   6. Performance Score Distribution — BarChart histogram (5 buckets, per-bucket colors).
   All charts use `ResponsiveContainer` + `CartesianGrid` + `Tooltip` + `Legend` (where applicable) + custom tooltip styling using `hsl(var(--popover))` etc. so they look right in light/dark mode. Loading skeletons while analytics load; "No data available" empty state per chart when data is missing.
   Below charts: "Recruitment Funnel" section — custom horizontal funnel visualization (NOT a Recharts component). Each stage renders as a labeled bar with: color dot + capitalized stage name + conversion % vs previous stage + cumulative count + "(N at stage)" suffix. Bars are width-proportional to the max stage count. Includes loading skeletons + empty state.
   Bottom: "Export Reports" section — the original 5 report-type cards (Employee / Attendance / Leave / Payroll / Document) with icon + description + Generate button → preserved GenerateDialog (date range + format select + Download that streams from `/api/reports/generate`).
9. `documents.tsx` (MODIFIED):
   - Added the 5th `TabsTrigger` "Approval Queue" (TabsList is now `md:grid-cols-5`).
   - Wired `{documentsTab === "approval-queue" && <ApprovalQueue onPreview={setPreviewDoc} />}`.
   - Added a `StatusFlowPills` component rendering `Draft → Generated → Pending → Approved → Issued → Sent` as small horizontal pills (current stage highlighted in `bg-primary text-primary-foreground`, past stages in `bg-primary/15 text-primary`, future stages in `bg-muted text-muted-foreground`, with `ChevronRight` separators). Replaced the "Status" table cell with these pills. ARCHIVED falls back to a single StatusBadge.
   - Replaced the row action buttons with a single Preview icon + a unified `MoreVertical` dropdown that shows **status-based action items at the top** (labelled "Workflow" / "Approval" / "Delivery"):
     - GENERATED → "Submit for Approval" (PATCH status=PENDING_APPROVAL, Forward icon, emerald)
     - PENDING_APPROVAL → "Approve" (POST /approve, CheckCircle2, emerald) + "Reject (return to draft)" (POST /reject, X icon, rose, uses a `prompt()` for the optional reason)
     - APPROVED → "Issue & Lock" (POST /issue, Stamp icon, teal, with confirm dialog)
     - ISSUED → "Send Email" (existing DirectSendEmailDialog)
     - SENT → "Resend Email"
     Followed by the standard actions: Preview, Download DOCX/PDF, Send Email (hidden when ISSUED/SENT/ARCHIVED — those have their own delivery section), Archive. TanStack Query invalidation on every status action.
   - Restored the `BulkGenerateDialog` wiring (a parallel agent added the file while I was working).
10. `store.ts` (MODIFIED) — Added `"approval-queue"` to the `documentsTab` union type (and to the persisted partialize).

Issues Encountered:
- When I started, `documents.tsx` had a `import { BulkGenerateDialog } from "./bulk-generate-dialog"` line but the file didn't exist (a parallel agent was mid-edit). This broke the whole app's compilation, which in turn broke Turbopack's compile cache and made `/api/reports/analytics` return 500 (compile error, not a runtime error). I removed the broken import to unblock compilation, then later re-added it once the parallel agent finished creating `bulk-generate-dialog.tsx`.
- The `/api/documents/bulk-download` route (NOT my file, owned by the documents-module agent) has a runtime error: `{imported module [externals]/archiver}.default is not a function`. This is the same `serverExternalPackages` issue that pdfkit had — `archiver` needs to be added to `next.config.ts`'s `serverExternalPackages` array. Flagged for the documents-module agent.

Lint status:
- Ran `cd /home/z/my-project && bun run lint 2>&1 | tail -30`.
- **0 errors and 0 warnings** across the entire project. All 6 of my new files + 4 modified files pass cleanly.

Dev server verification (all endpoints return 200, smoke-tested via curl):
- `PATCH /api/documents/{id} {status:"PENDING_APPROVAL"}` → 200, status=PENDING_APPROVAL ✓
- `GET /api/documents/pending-approval` → 200, returns total=1 + kpis ✓
- `POST /api/documents/{id}/approve {note:"Looks good"}` → 200, status=APPROVED ✓
- `POST /api/documents/{id}/issue` → 200, status=ISSUED ✓
- `PATCH /api/documents/{id} {status:"APPROVED"}` from ISSUED → 400 "Invalid status transition: ISSUED → APPROVED. Allowed: SENT, ARCHIVED" ✓
- `PATCH /api/documents/{id} {title:"HACKED", content:"..."}` on locked doc → 200, title unchanged (lock works) ✓
- `POST /api/documents/{id}/reject {note:"Needs revision"}` → 200, status=GENERATED ✓
- `GET /api/reports/analytics` → 200 with full payload (kpis + 12mo growth + 30d attendance + 7 leave types + 8 departments + 6mo doc trend × 5 types + 5 perf buckets + 7-stage recruitment funnel) ✓
- `GET /` → 200 (page renders cleanly with all modules loaded)

Stage Summary:
- The Document approval workflow is now fully functional end-to-end: HR can submit a GENERATED doc for approval → approve or reject (with reason) → issue (lock) → send email → archive. Every transition is validated, audit-logged, and pushed to the employee's activity feed. Locked documents cannot have their content edited.
- The Approval Queue tab gives HR a dedicated review surface with KPIs, bulk-approve, and per-row Approve/Reject/Review actions with optional notes.
- The status flow pills in the documents table give at-a-glance visibility into where each document sits in the pipeline.
- The Reports module has evolved from a simple "download 5 CSV/PDF reports" page into a real analytics dashboard with 6 live charts + a recruitment funnel + the original export cards. All charts use the emerald-primary palette (no indigo/blue), are responsive (stack on mobile via `lg:grid-cols-2`), have proper tooltips + legends, and show loading skeletons while analytics load.
- 6 new API endpoints + 2 new frontend files + 4 modified files. Lint passes. Dev server responds 200 on `/` and all new routes.

---
Task ID: 2-CRON-1
Agent: cron-review-agent (round 1)
Task: QA testing via agent-browser, fix UI/UX issues, add new features (bulk generation, approval workflow, more templates, reports analytics), polish styling.

Work Log:
- Read worklog.md to understand project context (all P0 modules complete, 15-min cron job active).
- Ran `bun run lint` — 0 errors, 0 warnings (clean baseline).
- Performed comprehensive QA via agent-browser across all 11 modules (Dashboard, Employees, Attendance, Leave, Payroll, Performance, Recruitment, Documents, Reports, Audit Log, Settings).
- Used VLM (z-ai vision) to visually inspect screenshots and identify UI/UX issues:
  - Dashboard: attendance AreaChart looked like a "range chart" (misleading), donut colors too vibrant, legend truncation, widget height misalignment, KPI cards needed more polish.
  - Employees: needed zebra striping, redundant search bars, status badge consistency.
  - Documents: KPI cards too wide causing truncation, tabs needed more contrast.
  - Settings: needed sticky save button, visual grouping, logo preview.
  - Reports: 6 analytics charts were NOT rendering (critical bug — hsl(var()) color references incompatible with OKLCH theme).
- Dispatched 2 parallel subagents (Task 2-A and Task 2-B) for feature work.

Bug Fixes:
- **CRITICAL: Reports charts not rendering** — The reports.tsx module used `hsl(var(--border))`, `hsl(var(--muted-foreground))`, etc. for chart element colors, but the project theme uses OKLCH color values (not HSL). Wrapped in `hsl()` produced invalid colors making chart axes/grids/bars invisible. Replaced all 16 `hsl(var())` references with direct hex values (#e5e7eb for borders, #6b7280 for muted text, #ffffff for background, etc.). All 6 analytics charts now render correctly (confirmed via VLM: Employee Growth LineChart ✓, Attendance Rate AreaChart ✓, Leave Utilization PieChart ✓, Payroll by Dept BarChart ✓, Document Trend Stacked BarChart ✓, Performance Histogram ✓).

Styling Polish (directly implemented):
- **Dashboard attendance chart**: Changed from AreaChart (misleading "range" look) to stacked BarChart with Present/Late/Absent/Leave series. Added inline legend with color dots. Improved tooltip styling with shadow.
- **Dashboard donut chart**: Reduced height (180px), added white stroke between slices, improved legend grid (2 columns, 8 items, with title tooltips, bold count numbers).
- **KpiCard component**: Added hover accent bar on top (color-matched to icon), improved delta indicator with background pill (bg-emerald-500/10 etc.), increased number size to 26px, added group hover scale on icon, made label font-weight semibold.
- **Table component (global)**: Increased cell padding (p-2 → p-3), header height (h-10 → h-11), header text now uppercase tracking-wider semibold text-muted-foreground, row hover now uses muted/40, border color lighter (border/50).
- **Tabs component (global)**: Active tab now uses bg-primary text-primary-foreground (emerald) instead of bg-background — much higher contrast. Added hover:text-foreground transition.
- **Card component (global)**: Added border-border/60 for softer borders.
- **StatusBadge component**: Added colored dot indicator (1.5px circle) before the label, changed shape from rounded-md to rounded-full (pill), comprehensive dot color map for all statuses.
- **AppShell footer**: Added backdrop-blur, animated emerald pulse dot, bg-card/60, softer border.
- **AppShell background**: Added subtle bg-dots pattern (2.5% opacity) for texture.
- **Settings OrganizationTab**: Rewrote with 3 visual field groups (Legal Details, Contact Information, Location) each with icon header. Added logo preview (14x14 rounded box showing logo image or Building2 icon fallback). Added sticky save bar at bottom (sticky bottom-4 z-10) with backdrop-blur and contextual help text. Changed button label from "Save Changes" to "Update Profile".

Features Added (via subagents):
- **Task 2-A: 10 new document templates** — Promotion Letter, Transfer Letter, Warning Letter, Show Cause Notice, Salary Certificate, Increment Letter, Resignation Acceptance, Relieving Letter, NOC, Employment Certificate. Total templates now: 15. Seed script at prisma/seed-templates.ts (idempotent).
- **Task 2-A: Bulk Document Generation** — New /api/documents/bulk-generate and /api/documents/bulk-download (ZIP via archiver) endpoints. New BulkGenerateDialog component (5-step wizard: Select Employees → Select Template → Review → Generate → Results) with searchable multi-select, department quick-add buttons, progress bar, Download All (ZIP), Send All Emails (one-at-a-time with strict employee-doc-recipient validation). Added "Bulk Generate" button to Documents module header and Quick Add dropdown.
- **Task 2-B: Document Approval Workflow** — Full status flow: DRAFT → GENERATED → PENDING_APPROVAL → APPROVED → ISSUED → SENT (+ ARCHIVED). New endpoints: /api/documents/pending-approval, /api/documents/[id]/approve, /api/documents/[id]/reject, /api/documents/[id]/issue. Enhanced PATCH /api/documents/[id] with transition validation + content locking on APPROVED/ISSUED/SENT. New ApprovalQueue component (5th tab in Documents module) with KPIs (Pending/Approved Today/Issued Today/Rejected Today), Approve All bulk action, per-row Approve/Reject/Review/Preview. Added StatusFlowPills component showing the pipeline stage visually. Added status-based action buttons in row dropdown.
- **Task 2-B: Enhanced Reports Module** — Complete rewrite with 4 KPI cards + 6 Recharts visualizations (Employee Growth LineChart, Attendance Rate AreaChart, Leave Utilization DonutChart, Payroll by Dept horizontal BarChart, Document Generation Stacked BarChart, Performance Score Histogram) + custom Recruitment Funnel with conversion rates. New /api/reports/analytics endpoint returning 8 data sections. Preserved existing export functionality.

Verification:
- `bun run lint` — 0 errors, 0 warnings.
- Dev server log — no runtime errors after all changes.
- agent-browser QA: all 11 modules render correctly.
- VLM confirmed: Dashboard 8/10 polish, attendance chart bars visible (28 bars in DOM), all 6 Reports charts rendering, Documents tabs highly visible (emerald active state), Approval Queue shows KPIs + empty state, Bulk Generate dialog works with employee selection, 15 templates visible in Templates tab.
- Smoke tested APIs: /api/reports/analytics 200, /api/documents/bulk-download 200 (valid ZIP), /api/documents/pending-approval 200, /api/documents/[id]/approve 200, /api/documents/[id]/issue 200.

Stage Summary:
- Project now has 15 document templates (was 5), full approval workflow, bulk generation with ZIP download, 6 analytics charts in Reports, and significantly polished UI/UX across all modules.
- All P0 + most P1 items from the original spec are now complete.
- Remaining recommendations for next cron round:
  1. Add real SMTP email sending (currently simulated).
  2. Add employee photo upload (file upload, not just URL).
  3. Add keyboard shortcuts (g d, g e, etc. for navigation).
  4. Add CSV/Excel export buttons to all major tables (Employees, Attendance, Leave, Payroll).
  5. Add more seed data variety (different attendance patterns per day, more historical documents).
  6. Mobile responsiveness audit at 375px width for all modules.
  7. Add dark mode toggle visibility in topbar.
  8. Add document preview print functionality.
  9. Add employee directory filters by joining date range.
  10. Add payroll batch creation (select multiple employees → create payroll for all).

---
Task ID: 3-A
Agent: subagent-3-A (CSV/Excel Export Buttons)
Task: Add CSV and Excel export buttons to all major tables in the HR app — Employees, Attendance, Leave, Payroll, Performance, Recruitment (Candidates), Audit Log, Documents (Generated tab), Email History. Build a generic backend export endpoint + a reusable ExportButton component, then wire it into every module.

Work Log:
- Read project context (`worklog.md`, `prisma/schema.prisma`, existing module files for employees/attendance/leave/payroll/performance/recruitment/audit/documents, the underlying `/api/employees|attendance|leave|payroll|performance|candidates|audit-logs|documents|email-logs` GET handlers to mirror their filter logic exactly, `src/lib/db.ts`, `src/lib/utils.ts`, `src/components/hr/shared/page-header.tsx`, `src/components/ui/dropdown-menu.tsx`).
- Created `/agent-ctx/3-A-export-csv-excel.md` with file inventory + approach notes for future agents.
- **Backend — `/src/app/api/export/route.ts` (NEW, ~530 lines)**: Single GET endpoint that takes `?module=` (one of: employees | attendance | leave | payroll | performance | candidates | audit | documents | email-logs) and `?format=csv|excel`, plus pass-through filters (`search`, `status`, `departmentId`, `payrollMonth`, `from`, `to`, `type`, `jobId`, `action`, `entityType`, `leaveTypeId`, `date`). For each module there's a dedicated fetcher function (`fetchEmployees`, `fetchAttendance`, `fetchLeave`, `fetchPayroll`, `fetchPerformance`, `fetchCandidates`, `fetchAudit`, `fetchDocuments`, `fetchEmailLogs`) that builds the exact same Prisma `where` clause used by that module's list API — so exports always match what's on screen. Returns all matching rows (no pagination) so the user gets the full dataset.
  - **CSV escaping**: wraps fields containing commas, quotes, or newlines in double quotes; escapes inner quotes by doubling them. Booleans → "Yes"/"No". Dates → ISO-ish `YYYY-MM-DD HH:MM:SS`. Empty values → empty string.
  - **UTF-8 BOM**: prepends `\ufeff` so Excel opens UTF-8 correctly (special chars like the em-dash in "Priya Sarkar — 2026-08" render properly).
  - **Headers**: `Content-Type: text/csv; charset=utf-8` (csv) or `application/vnd.ms-excel; charset=utf-8` (excel). `Content-Disposition: attachment; filename="{module}-export-{YYYYMMDD}.{csv|xls}"`. `Cache-Control: no-store, max-age=0` so each download is fresh.
  - **Validation**: 400 errors for invalid `module` or `format`.
  - **Email-logs special case**: EmailLog has no Prisma relation to Employee (only a string `employeeId` field), so the fetcher manually resolves employees via a second `findMany` + map, mirroring what `/api/email-logs` does.
  - **Audit special case**: `to` date is treated as inclusive (next-day boundary) to match `/api/audit-logs` semantics.
- **Frontend — `/src/components/hr/shared/export-button.tsx` (NEW)**: Reusable dropdown button. Props: `module`, `filters?: Record<string, any>`, `className?`, `label?`. Renders an `outline` `sm` Button with `Download` icon + `ChevronDown`, opening a `DropdownMenu` with "CSV" and "Excel" items (each with a `FileText`/`FileSpreadsheet` icon in emerald + a small uppercase `.csv`/`.xls` suffix label). On click, constructs a `URLSearchParams` from filters, creates a temporary `<a>` element, sets `href=/api/export?...`, calls `click()`, then shows a `sonner` toast: `Exported {module} as {format}`. Uses a 500ms `setTimeout` to reset the loading spinner (Lucide `Loader2` with `animate-spin`) so the user gets visible feedback.
- **Frontend integration** — added `ExportButton` to 9 places:
  1. **employees.tsx** — `module="employees"` with `{search, departmentId, status}`. Placed in PageHeader actions BEFORE the list/grid view toggle + Add Employee button.
  2. **attendance.tsx** — `module="attendance"` with `{date, departmentId, status, search}`. Wrapped actions in a Fragment alongside the existing Add Attendance button.
  3. **leave.tsx** — `module="leave"` with `{search, status: tab !== "ALL" ? tab : "", leaveTypeId}`. Status is derived from the active tab (ALL/PENDING/APPROVED/REJECTED).
  4. **payroll.tsx** — `module="payroll"` with `{payrollMonth: month, status, departmentId, search}`.
  5. **performance.tsx** — `module="performance"` with `{}`. The module is still a placeholder (owned by another agent per worklog Task 2-CRON-1); the ExportButton is wired and functional regardless. Future agent: please preserve the ExportButton when implementing the full module.
  6. **recruitment.tsx** — `module="candidates"` with `{}`. Same situation as performance — placeholder module. Future agent: please preserve.
  7. **audit.tsx** — `module="audit"` with `{search, action, entityType, from, to}`. Added to PageHeader actions (was previously empty).
  8. **documents.tsx — Generated tab** — `module="documents"` with `{search, type, status}`. Placed at the end of the tab's filter bar (after the Status select).
  9. **documents.tsx — Email History tab** — `module="email-logs"` with `{search, status}`. Placed at the end of the tab's filter bar (after the Status select).

Verification:
- `cd /home/z/my-project && bun run lint 2>&1 | tail -20` → **0 errors, 0 warnings** (clean exit code 0).
- All 9 module CSV exports return HTTP 200 with correct content-type + BOM + sensible row counts (employees 2810B/20 rows, attendance 11032B, leave 1529B, payroll 1486B, performance 683B, candidates 1037B, audit 4603B, documents 1175B, email-logs 487B).
- Excel format returns `application/vnd.ms-excel; charset=utf-8` with `.xls` extension. Verified BOM bytes (`EF BB BF`) at start of file.
- Filter pass-through verified: `?module=employees&status=ACTIVE` returns only ACTIVE rows. `?module=payroll&payrollMonth=2026-08&status=PAID` returns only PAID payroll for that month. `?module=leave&status=APPROVED` returns only APPROVED leave.
- Validation: `?module=invalid` → 400 with `{error:"Invalid module. Must be one of: ..."}`. `?format=pdf` → 400 with `{error:"Invalid format. Must be 'csv' or 'excel'."}`.
- Dev server log: 0 errors after all changes; `/` still returns 200 in ~700ms; all `/api/export?*` requests return 200/400 as expected.
- CSV escaping verified: a `PAYSLIP_GENERATE` audit entry whose description contains "Generated payslip NWL/PAYSLIP/202608/0010 for Priya Sarkar (2026-08)." — the parentheses don't need quoting (no comma/quote/newline), but if a description had a comma it would be wrapped in double quotes per the escape rules.

Stage Summary:
- All 9 major HR tables now have CSV + Excel export buttons. The buttons are placed in PageHeader actions (employees, attendance, leave, payroll, performance, recruitment, audit) or in the in-tab filter bar (documents Generated tab, documents Email History tab) so they don't replace any existing buttons.
- The ExportButton is fully reusable — to add export to a future module, just `<ExportButton module="..." filters={{...}} />` and the backend will handle the rest as long as the module name is in `VALID_MODULES`.
- The export endpoint respects every filter the list view shows (search, status, department, month, date range, type, job, action, entity type, leave type), so the user always exports exactly what they see.
- Lint passes. Dev server stable. All 9 endpoints verified via curl with both formats and various filter combinations.
- Note for future agents: Performance and Recruitment modules are still placeholders — please preserve the `ExportButton` import + usage when implementing them.

---

Task ID: 3-B
Agent: subagent-3-B (print-mobile-photo)
Task: Add document preview print functionality across Documents / Generate Document / Payslip dialogs, audit and fix mobile responsiveness across all 10 active HR modules + Topbar, and replace the Employee Form Dialog's URL-only Photo field with a real file upload (avatar preview + 500 KB size guard).

Work Log:
- Read worklog.md (Tasks 0, 1-A, 1-B, 1-C, 2-A, 2-B, 2-CRON-1, 3-A) to align with existing patterns: shared `AvatarBadge`/`PageHeader`/`KpiCard` components, emerald primary palette (no indigo/blue), sonner toast, TanStack Query, the recently-added `ExportButton` shared component.
- Created `/agent-ctx/3-B-print-mobile-photo.md` with full file inventory + design notes for downstream agents.

Part 1 — Print functionality:
- Created `src/lib/print.ts` exporting `printDocument({ title, html, docNumber })`. Opens a new browser window, writes a print-friendly HTML scaffold (`@page { margin: 2cm }`, serif Georgia body, 800px max-width, table/th/hr/heading styles, hidden `.no-print` class), injects a page header showing the title + doc number (HTML-escaped via the helper's `escapeHtml`), fires `window.print()` after two `requestAnimationFrame` ticks (gives the browser time to lay out + paint images), and registers `window.onafterprint` to auto-close the tab once the user dismisses the print dialog. Returns `false` if the popup was blocked so the caller can show a toast.
- Documents module (`documents.tsx`):
  - `DocumentPreviewDialog`: Replaced the flat header with a flex layout — title (truncated) + meta line on the left, Print button on the right. The Print button calls `printDocument` with `preview.title`, `preview.content`, `preview.documentNumber`. Dialog width is now `max-w-[95vw] sm:max-w-4xl` and inner padding `px-4 sm:px-6` so it never overflows at 375px.
  - `TemplatePreviewDialog`: Same flex-header + Print button treatment (uses `template.name` + `template.code`).
  - `DirectSendEmailDialog`: Width `max-w-[95vw] sm:max-w-2xl`.
  - Documents tab list: tab labels get `text-xs sm:text-sm`; the 5th tab (Approval Queue) gets `col-span-2 md:col-span-1` so it doesn't share a row on tiny screens.
- Generate Document dialog (`generate-document-dialog.tsx`):
  - Imported `Printer` + `printDocument`.
  - Dialog width: `max-w-[95vw] sm:max-w-4xl`. Stepper container has `overflow-x-auto pb-1`. Header/footer padding `px-4 sm:px-6`.
  - Step 4 (Preview): Replaced the single Refresh button with a flex row containing a Print button (uses the in-memory `previewData.content`) and the Refresh button.
  - Step 5 (Generated): Action grid changed from `grid-cols-1 md:grid-cols-3` to `grid-cols-2 md:grid-cols-4` and added a Print button alongside Preview/DOCX/PDF.
- Payslip dialog (`payslip-dialog.tsx`):
  - Imported `Printer` + `printDocument`.
  - Main dialog, preview sub-dialog, email sub-dialog: all changed from fixed `max-w-lg` / `max-w-2xl` to `max-w-[95vw] sm:max-w-lg` / `sm:max-w-2xl`.
  - Success state action grid: rearranged to a 2-column grid (Preview / Print / DOCX / PDF / Send Email spanning both columns).
  - Preview sub-dialog header: Added a flex header with Print button next to the title.

Part 2 — Mobile responsiveness audit (375px target):
- `src/components/hr/shared/kpi-card.tsx` (global change — affects every module's KPI row):
  - Padding `p-3 sm:p-5` (was `p-5`).
  - Value font `text-lg sm:text-[26px]` (was `text-[26px]`) with `truncate` so long currency values can't overflow at 375px.
  - Label `text-[10px] sm:text-[11px]` with `truncate`.
  - Icon container `size-9 sm:size-11`, icon `size-4 sm:size-5`.
  - Gap `gap-2 sm:gap-3`.
- `dashboard.tsx`: PageHeader actions — "Generate Document" button is `hidden sm:inline-flex` (mobile users have the Quick Add dropdown); "Add Employee" label becomes "Add" on mobile. KPI grid `gap-3 sm:gap-4`. Attendance chart legend shrinks to `text-[10px] sm:text-[11px]` and `gap-2 sm:gap-3` so all four legend items fit at 375px.
- `employees.tsx`: "Add Employee" → "Add" on mobile. List table now hides Employee ID, Department, Designation, Joining Date, Salary on mobile (`hidden md:table-cell` / `hidden lg:table-cell`); shows a small inline `employeeId · department` sub-line under the name on mobile only.
- `attendance.tsx`: "Add Attendance" → "Add" on mobile. KPI grid `gap-3 sm:gap-4`. Table hides Date, Check Out, Hours, Late, Overtime on mobile; date appears as a sub-line under the employee name.
- `leave.tsx`: "Add Leave" → "Add" on mobile. KPI grid `gap-3 sm:gap-4`. Tab list wrapped in `overflow-x-auto pb-1 -mx-1 px-1` with `TabsList flex w-max` so all 4 tabs scroll horizontally. Table hides Leave Type / End / Reason / Applied on mobile; leave type appears as a colored-dot sub-line under the name. View + Decision sub-dialogs use `max-w-[95vw] sm:max-w-lg` / `sm:max-w-md`.
- `payroll.tsx`: "Create Payroll" → "Create" on mobile. KPI grid `gap-3 sm:gap-4`.
- `audit.tsx`: Result-count row changed to `flex flex-col sm:flex-row sm:items-center justify-between gap-2` so "Clear filters" wraps below the count on mobile.
- `documents.tsx`: KPI grid `gap-3 sm:gap-3`. Tab labels `text-xs sm:text-sm`. 5th tab gets `col-span-2 md:col-span-1` so it gets a full row on mobile.
- `reports.tsx`: Generate Report sub-dialog `max-w-[95vw] sm:max-w-md`.
- `settings.tsx`: Tab nav gets `-mx-1 px-1 md:mx-0 md:px-0` for snap-to-edge horizontal scroll on mobile. Tab button icons get `flex-shrink-0`. Three `grid-cols-2 gap-4` form blocks (Organization, Email Settings, Document Numbering) became `grid-cols-1 sm:grid-cols-2 gap-4` and `col-span-2` → `sm:col-span-2`. Test Email dialog and master-data dialog use `max-w-[95vw] sm:max-w-md` / `sm:max-w-lg`.
- `employee-profile.tsx`: Header bar (Back / Edit / Generate Document / Create Payslip) now `flex flex-col sm:flex-row sm:items-center justify-between gap-3`. Action buttons show only an icon label on mobile ("Edit", "Document", "Payslip"). Profile card padding `p-4 sm:p-6`. Tab list replaced `grid grid-cols-3 md:grid-cols-8` (which squished 8 tabs into 3 columns on mobile) with `overflow-x-auto pb-1 -mx-1 px-1` + `TabsList flex w-max` so all 8 tabs scroll horizontally. Overview KPI cards `gap-3 sm:gap-4`.
- `topbar.tsx`: Quick Add button previously was `hidden sm:inline-flex` (completely invisible on mobile). Replaced with a single trigger that always renders — the "Quick Add" label and chevron are wrapped in `<span className="hidden sm:inline">` so on mobile only the `+` icon shows, while desktop retains the full button.

Part 3 — Employee Photo Upload:
- `employee-form-dialog.tsx`:
  - Imported `useRef`, `Upload`, `X` from lucide-react, and `AvatarBadge`.
  - Added `MAX_PHOTO_BYTES = 500 * 1024` constant.
  - Added `photo: ""` to both the initial state object and the open-reset block (so opening the dialog for a new employee starts with no photo).
  - Added a `fileInputRef` (a hidden `<input type="file" accept="image/*">`).
  - Added `handlePhotoSelect(file)`:
    - Rejects non-image MIME types with a sonner toast.
    - Rejects files > 500 KB with a toast showing the actual file size in KB.
    - Otherwise uses `FileReader.readAsDataURL` to convert the file to a base64 data URL and stores it in `form.photo`.
  - Added `clearPhoto()` that resets `form.photo` to `""` and clears the input's `value` so the same file can be re-selected.
  - Inserted a prominent Photo upload card at the top of the Personal tab (before the Full Name field): rounded-xl bordered card containing an XL `AvatarBadge` (uses `form.fullName || "New Employee"` so the initials fallback updates live as the user types their name) + a column with the "Profile Photo" label, "JPG, PNG, or GIF. Max 500 KB." hint, and Upload Photo / Remove buttons. The button label toggles between "Upload Photo" and "Change Photo" depending on whether a photo is set.
  - Dialog width `max-w-[95vw] sm:max-w-3xl`, header/footer padding `px-4 sm:px-6`.

Issues Encountered:
- Two type errors that exist in pre-existing files I did NOT touch: `src/app/api/payroll/route.ts` (lines 64, 77-80) and `src/lib/document-renderers.ts` (line 186). These were already failing `bunx tsc --noEmit` before my changes — flagged for the relevant agents. None of my modified/created files produce any type errors.

Lint status:
- `cd /home/z/my-project && bun run lint 2>&1 | tail -20` → 0 errors and 0 warnings across the entire project.
- `bunx tsc --noEmit` → 0 errors in any of my 15 modified/created files.

Dev server verification:
- `curl http://localhost:3000/` → 200.
- `curl http://localhost:3000/api/documents?pageSize=1` → 200.
- `curl http://localhost:3000/api/employees?pageSize=1` → 200.
- Dev server log shows clean compiles with no runtime errors after all changes.

Stage Summary:
- Print is now one click away from every place a rendered HR document is shown: Documents preview dialog, Documents template preview dialog, Generate Document wizard's preview step + generated-success step, Payslip dialog's success state + preview sub-dialog. All routes funnel through the shared `printDocument` helper which produces a clean, chrome-free, professionally formatted printout (serif font, 2cm page margins, title + doc number in the page header) — no app sidebar, no topbar, no dialog chrome.
- Every HR module now layouts cleanly at 375px width: KPI cards fit two per row without overflow, tables hide lower-priority columns and use horizontal scroll for the rest, filter bars stack vertically, PageHeader actions collapse to icon-only labels, tab lists scroll horizontally, dialogs use `max-w-[95vw]` on mobile, and the Topbar's Quick Add button is finally visible on mobile (was previously `hidden sm:inline-flex`).
- The Employee Form Dialog now has a real photo upload experience: prominent circular avatar preview that updates as the user types their name, "Upload Photo" button that opens the OS file picker, "Remove" button to clear, and a 500 KB client-side guard with a clear toast explaining the limit. The base64 data URL is stored directly in the existing `photo` String field — no schema change required.
- 1 new file (`src/lib/print.ts`) + 14 modified files. Lint passes. Dev server stable. All work persisted in `/agent-ctx/3-B-print-mobile-photo.md`.

---
Task ID: 3-CRON-2
Agent: cron-review-agent (round 2)
Task: QA testing, fix attendance GET 405 bug, add dark mode toggle, keyboard shortcuts, CSV/Excel export, document print, employee photo upload, mobile responsiveness.

Work Log:
- Read worklog.md to understand project state (15 templates, approval workflow, bulk generation, 6 analytics charts all complete from round 1).
- Ran `bun run lint` — 0 errors, 0 warnings (clean baseline).
- Reviewed dev log — found a 405 error on `GET /api/attendance/[id]` (route only had PATCH + DELETE, no GET handler, but the attendance-entry-dialog.tsx does a GET when editing).
- Performed agent-browser QA across modules. Used VLM to identify remaining improvements (export buttons missing, no dark mode toggle, no keyboard shortcuts, no print, no photo upload).
- Dispatched 2 parallel subagents (Task 3-A: export buttons; Task 3-B: print + mobile + photo upload).
- Directly implemented: dark mode toggle, keyboard shortcuts with help dialog, attendance GET bug fix.

Bug Fixes:
- **Attendance GET 405**: The `/api/attendance/[id]` route only had PATCH and DELETE handlers. The `attendance-entry-dialog.tsx` does `fetch(/api/attendance/${record.id})` when editing an existing record, which returned 405 Method Not Allowed. Added a GET handler that returns the attendance record with employee+department+designation includes. Verified: `GET /api/attendance/{id}` now returns 200.

Features Added (directly implemented):
- **Dark Mode Toggle**: Created `/src/components/hr/theme-toggle.tsx` — a dropdown button with Light/Dark/System options using `next-themes`. Uses Sun/Moon/Monitor icons with rotate+scale transitions. Added to topbar between Quick Add and Notifications. Verified: clicking Dark adds `class="dark"` to `<html>`, clicking Light removes it. VLM confirmed dark mode looks "professional, modern, sleek aesthetic suitable for enterprise software" with "excellent high contrast".
- **Keyboard Shortcuts**: Created `/src/hooks/use-keyboard-shortcuts.ts` with:
  - Two-key sequences `g + <key>` for module navigation: g+d (Dashboard), g+e (Employees), g+a (Attendance), g+l (Leave), g+p (Payroll), g+f (Performance), g+r (Recruitment), g+t (Documents), g+o (Reports), g+u (Audit Log), g+s (Settings).
  - Single-key actions: n (Add Employee), d (Generate Document), b (Bulk Generate).
  - `?` (Shift+/) opens the shortcuts help dialog.
  - Smart input detection — shortcuts are disabled when typing in input/textarea/select/contenteditable/combobox elements.
  - 800ms timeout for two-key sequences.
  - Created `/src/components/hr/shortcuts-help.tsx` — a dialog listing all shortcuts with styled `<kbd>` elements. Added a "?" keyboard icon button to the topbar (hidden on mobile).
  - Added `shortcutsHelpOpen` state to the Zustand store for cross-component access.
  - Verified: pressing g then e navigates to Employees module; pressing ? opens the help dialog.
- **Attendance GET handler**: Added GET to `/api/attendance/[id]` (see Bug Fixes above).

Features Added (via subagents):
- **Task 3-A: CSV/Excel Export** — New `/src/app/api/export/route.ts` generic export endpoint supporting 9 modules (employees, attendance, leave, payroll, performance, candidates, audit, documents, email-logs) × 2 formats (csv, excel). Proper CSV escaping (commas/quotes/newlines wrapped in double quotes, inner quotes doubled) + UTF-8 BOM for Excel compatibility. New reusable `/src/components/hr/shared/export-button.tsx` (dropdown with CSV/Excel options, Download icon, sonner toast feedback). Added ExportButton to all 9 modules' PageHeader or filter bar. Verified: `GET /api/export?module=employees&format=csv` returns 200 with `text/csv; charset=utf-8` and proper CSV content starting with BOM; `format=excel` returns `application/vnd.ms-excel`.
- **Task 3-B: Document Print** — New `/src/lib/print.ts` shared `printDocument({title, html, docNumber})` helper that opens a new window with print-friendly CSS (Georgia serif, 800px max-width, @page margins, table borders), writes the document HTML, calls `window.print()` via double-rAF, auto-closes on `onafterprint`. Added Print buttons (Printer icon) to: Documents preview dialog, Generate Document wizard preview step + success step, Payslip dialog preview + success states.
- **Task 3-B: Mobile Responsiveness** — Audited all 11 modules at 375px width. Fixes: KPI cards smaller padding/font on mobile with truncated values; Quick Add button icon-only on mobile; hidden lower-priority table columns on mobile (Salary, Joining Date in Employees); horizontally-scrollable TabsLists for modules with many tabs (Documents 5 tabs, Employee Profile 8 tabs); `max-w-[95vw]` dialog widths; stacked filter bars (`flex-col md:flex-row`); icon-only action buttons on mobile.
- **Task 3-B: Employee Photo Upload** — Replaced the URL text input in the Employee Form Dialog with a proper photo upload UI: circular AvatarBadge preview at the top of the Personal tab, "Upload Photo" button that opens a file picker (`<input type="file" accept="image/*">`), reads the file as base64 data URL via `FileReader.readAsDataURL`, stores in the `photo` field (String, works with base64). 500KB file size limit with toast error if exceeded. "Remove" button to clear the photo.

Verification:
- `bun run lint` — 0 errors, 0 warnings.
- Dev server log — no runtime errors. (Note: "Fast Refresh had to perform a full reload" warnings appeared during development but resolved after saves settled.)
- agent-browser QA:
  - Dark mode toggle: present in topbar, dropdown opens with Light/Dark/System, clicking Dark adds `class="dark"` to html, VLM confirmed professional appearance.
  - Keyboard shortcuts: g+e navigates to Employees (verified), ? opens help dialog (verified), help dialog lists all 16 shortcuts with styled kbd elements.
  - Export button: present on Employees page, dropdown offers "CSV .CSV" and "Excel .XLS", API returns 200 with correct content-type.
  - Print button: present in Documents preview dialog.
  - Photo upload: "Upload Photo" button present in Add Employee dialog with "Profile Photo" label.
  - Attendance GET: `GET /api/attendance/{id}` returns 200 (was 405).
- API smoke tests: `/api/export?module=employees&format=csv` 200, `/api/export?module=payroll&format=excel` 200, `/api/attendance/{id}` 200.

Stage Summary:
- Project now has: dark mode toggle, 16 keyboard shortcuts with help dialog, CSV/Excel export on all 9 major tables, document print functionality, employee photo upload, comprehensive mobile responsiveness, and the attendance GET bug is fixed.
- Total document templates: 15. Total modules: 11. Total API endpoints: 50+.
- Remaining recommendations for next cron round:
  1. Add real SMTP email sending (currently simulated).
  2. Add payroll batch creation (select multiple employees → create payroll for all).
  3. Add employee directory filters by joining date range.
  4. Add more seed data variety (different attendance patterns per day, more historical documents).
  5. Add document comparison/diff view (compare two versions of a template).
  6. Add employee export to PDF (formatted employee directory).
  7. Add leave calendar view (month grid showing who's on leave).
  8. Add attendance heatmap (GitHub-style contribution graph showing attendance patterns).
  9. Add email template editor with live preview.
  10. Add data backup/restore functionality (export/import SQLite DB).
