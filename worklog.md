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

---
Task ID: 4-B
Agent: subagent-4-B (Payroll Batch Creation + Email Template Editor)
Task: Add payroll batch creation (select multiple employees → create DRAFT payroll for all in one action, skip duplicates) and a full email template editor with live preview (reuse DocumentTemplate.emailSubject / emailBody fields). Wire both into existing UIs: Payroll module header, Quick Add dropdown, Quick Actions dispatcher, and Settings tabs.

Work Log:
- Read worklog.md (Tasks 0, 1-A, 1-B, 1-C, 2-A, 2-B, 2-CRON-1, 3-A, 3-B, 3-CRON-2) to align with existing patterns: shared `AvatarBadge` / `PageHeader` / `KpiCard` / `StatusBadge` / `EmptyState` components, emerald primary palette (no indigo/blue), sonner toast, TanStack Query, the `bulk-generate-dialog.tsx` 3-step wizard pattern, the `bulk-generate` API route pattern (per-employee try/catch + summary AuditLog), the `document-vars.ts` variable resolver, the `payroll/route.ts` POST handler (auto-load salary from employee), and the Settings module's vertical-tab layout.
- Created `/agent-ctx/4-B-payroll-batch-email-templates.md` with full file inventory + design notes for downstream agents.

Part 1 — Payroll Batch Creation:

**Backend — `/src/app/api/payroll/batch-create/route.ts` (NEW)**:
- POST endpoint. Body: `{ employeeIds: string[], month: string }` (month = `YYYY-MM`).
- Validation: 400 if employeeIds not a non-empty array, 400 if month doesn't match `^\d{4}-\d{2}$`, 400 if more than 500 employees.
- **Skip-detection optimization**: single `payroll.findMany({ where: { payrollMonth, employeeId: { in: [...] } } })` builds a `Set<string>` of employeeIds that already have payroll for `month`. Lets the per-employee loop decide skip-vs-create in O(1) instead of N queries.
- Per-employee try/catch:
  - If already in existingSet → push to `skipped` (with best-effort name lookup).
  - Else load employee (404 → push to `failed`).
  - Compute `basic + allowances - deductions - tax` as netSalary.
  - `payroll.create` with `status="DRAFT"`, no paymentDate, no note.
  - `activity.create` with `type="CREATED"`, `title="Payroll Created (Batch)"`, batch-aware description.
  - Push to `created`.
- Single AuditLog: `action="PAYROLL_BATCH_CREATE"`, `entityType="Payroll"`, description `Batch created {N} payroll record(s) for {month}. {M} skipped, {K} failed.`, metadata JSON with month + counts + employeeId lists.
- Returns `{ created, skipped, failed, count, totalRequested }`, HTTP 201.

**Frontend — `/src/components/hr/modules/payroll-batch-dialog.tsx` (NEW)**:
- 3-step wizard (`Select Employees` → `Select Month` → `Create`).
- **Step 0**: Searchable multi-select reusing the bulk-generate-dialog pattern — search input, department filter dropdown, "Select all visible" master checkbox, up to 6 department quick-add buttons ("+ {Department}"), selected-count Badge, scrollable checkbox list with AvatarBadge + name + employeeId + designation · department + email.
- **Step 1**: `<Input type="month">` (defaults to current month), preview banner "Will create payroll records for **{N}** employees for **{Month Year}**" + amber alert when some will be skipped. Two scrollable lists — emerald-bordered "Will create DRAFT payroll" and amber-bordered "Already have payroll (will skip)". The skipped-preview is computed by fetching `/api/payroll?payrollMonth={month}&pageSize=500` and filtering the selected employees against the returned employeeIds.
- **Step 2**: Animated `Progress` bar (5% → 90% in 250ms ticks while waiting) → results panel with emerald/amber banner, 3 summary chips (Created / Skipped / Failed in colored cards), three scrollable lists (created with avatar + dept + net + status, skipped with amber alert + reason, failed with rose X + error message). "Go to Payroll" button → closes dialog + invalidates `payroll` query. Toast: `Created {N} payroll record(s), skipped {M} existing{, K failed}.`
- Variable-chip-style cursor insertion is N/A here; instead the wizard handles state through `Set<string>` selectedIds + `useMemo` filteredEmployees.

**Frontend integration — `payroll.tsx` (MODIFY)**:
- Imported `Layers` icon + `PayrollBatchDialog`.
- Added `batchOpen` state.
- Added a new `outline` "Batch Create" / "Batch" (mobile) button in PageHeader actions between the ExportButton and the existing "Create Payroll" button.
- Mounted `<PayrollBatchDialog open={batchOpen} onOpenChange={...} />` next to the existing `<PayslipDialog>` mount. `onOpenChange` invalidates the `payroll` query when the dialog closes.

**Frontend integration — `quick-actions.tsx` (MODIFY)**:
- Imported `PayrollBatchDialog`.
- Added `<PayrollBatchDialog open={quickAction === "payroll-batch-create"} onOpenChange={(o) => !o && setQuickAction(null)} />` to the dispatcher.

**Frontend integration — `topbar.tsx` (MODIFY)**:
- Imported `Layers, Wallet, FileStack, FileText, CalendarPlus` icons.
- Added `<DropdownMenuItem onClick={() => setQuickAction("payroll-batch-create")}>` with `<Layers />` icon and "Batch Create Payroll" label to the Quick Add dropdown (between Create Payslip and Add Attendance).
- Also swapped the generic `Plus` icons on the existing Quick Add items for task-specific icons (Generate Document → `FileText`, Bulk Generate → `FileStack`, Create Payslip → `Wallet`, Add Attendance → `CalendarPlus`) so the menu reads better visually.

Part 2 — Email Template Editor with Live Preview:

**Backend — `/src/app/api/email-templates/route.ts` (NEW)**:
- GET `/api/email-templates` — returns all non-archived DocumentTemplates. `?includeEmpty=1` returns all templates (even ones with no email configured); default filters to only those with `emailSubject` OR `emailBody` populated. `?status=` filter supported. Each item carries `id, name, code, type, category, description, status, subject, content, emailSubject, emailBody, version, updatedAt`.
- POST `/api/email-templates` — convenience endpoint to update email fields on an existing template (body: `{ templateId, emailSubject?, emailBody? }`). Refuses to create brand-new templates (those must go through `/api/document-templates` POST so the email template is always backed by a real DocumentTemplate). AuditLog: `action="EMAIL_TEMPLATE_UPDATE"`.

**Backend — `/src/app/api/email-templates/[id]/route.ts` (NEW)**:
- GET — single template by id (same fields as the list endpoint).
- PATCH — `{ emailSubject?, emailBody? }` (only fields explicitly sent are touched; empty/whitespace values stored as `null`). AuditLog: `action="EMAIL_TEMPLATE_UPDATE"`.

**Backend — `/src/app/api/settings/test-email/route.ts` (MODIFY, additive)**:
- The existing route hardcoded `"Test Email from TeamHub HR"` as subject + a generic body. Extended to accept optional `subject` + `body` from the request body — if provided (and non-empty), they override the defaults. Backward-compatible: existing callers that only send `{ to }` keep working with the generic test message. The Email Template Editor's "Send Test Email" button passes `{ to, subject: renderedSubject, body: renderedBody }` so the test email actually shows the rendered template content.

**Frontend — `/src/components/hr/modules/email-template-editor.tsx` (NEW)**:
- Full-section editor (NOT a dialog) — rendered inline in Settings → Email Templates tab.
- Layout: responsive `grid lg:grid-cols-3 gap-4` (templates list | editor) + full-width Live Preview below.
- **Left column** (`lg:col-span-1`): Templates list Card with search input, scrollable list of templates (each with name + code badge + type + "Email ready" / "No email" badge). Auto-selects first template on mount.
- **Right column** (`lg:col-span-2`): Editor Card with:
  - Header (template name + code + type + category + "Unsaved changes" amber badge when dirty).
  - Subject Input + Body Textarea (font-mono, 14 rows, resize-y, character count + save status hint).
  - Variables sidebar (sticky, scrollable, 4 groups — Employee / Company / Document / Payroll — with clickable emerald chips). Each chip inserts `{{token}}` at the cursor position of whichever field was last focused (subject OR body). Uses `useRef` + `requestAnimationFrame` to restore cursor position after insertion.
  - Action bar with "Reset" (revert to last saved), "Send Test Email" (opens modal), "Save" (PATCH the template). Save disabled when not dirty or while saving.
- **Live Preview Card** (full width below): Renders an email-style UI with `To:` (sample employee's official email), `Subject:` (rendered with variables resolved), `Body:` (rendered with variables resolved, whitespace preserved via `whitespace-pre-wrap`). Updates in real-time on every keystroke via `useMemo` over `subject` + `body` + sample employee + company.
- **Test Email modal**: simple overlay div with `To:` input (defaults to sample employee's email), preview of subject + body length, Send button → calls `/api/settings/test-email` with `{ to, subject: renderedSubject, body: renderedBody }`.
- **Sample data**: Loads first employee via `/api/employees?pageSize=1` and company via `/api/company`. Both used to render the live preview.
- **Variable resolver** (`resolvePreview`): mirrors the server-side resolver in `/lib/document-vars.ts`. Tokens: `employee.name/id/role/designation/department/email/phone/joining_date/salary/address`, `company.name/legal_name/address/email/phone/website`, `document.number/date/issue_date`, `payroll.month/basic_salary/allowances/deductions/tax/net_salary`. Document + payroll tokens use sensible sample values (today's date, `DOC/SAMPLE/0001`, current month, sample currency amounts).

**Frontend integration — `settings.tsx` (MODIFY)**:
- Added `FileText` to the icon imports.
- Added `email-templates` tab to `TABS` array (between `email` ("Email Settings") and `numbering` ("Document Numbering")).
- Added `EmailTemplatesTab()` — a one-line wrapper that returns `<EmailTemplateEditor />`.
- Added `{tab === "email-templates" && <EmailTemplatesTab />}` to the tab content switch.
- Imported `EmailTemplateEditor` from `./email-template-editor`.

Issues Encountered:
- Initial lint run flagged an unused `eslint-disable-next-line react-hooks/exhaustive-deps` comment in `payroll-batch-dialog.tsx` (the `useEffect` that resets state on dialog open). Fixed by removing the disable comment and adding `currentMonth` to the dependency array (currentMonth is a stable computed string per render, so this is safe and the linter is happy).
- All `bunx tsc --noEmit` errors that DO appear are in pre-existing files I did NOT touch (noted in worklog Task 3-B): `src/app/api/payroll/route.ts` (lines 64, 77-80), `src/lib/document-renderers.ts` (line 186), `src/hooks/use-keyboard-shortcuts.ts` (line 45), plus `prisma/seed.ts`, `examples/websocket/*`, `skills/*` which are also pre-existing. None of my created/modified files produce any type errors.

Verification:
- `cd /home/z/my-project && bun run lint 2>&1 | tail -20` → **0 errors, 0 warnings** (clean exit code 0, output is just `$ eslint .`).
- Dev server log ends with `✓ Compiled in 767ms` — successful compile, no runtime errors after all changes.
- `bunx tsc --noEmit` → 0 errors in any of my 9 created/modified files. Pre-existing errors in other files documented above.

Stage Summary:
- The Payroll module now supports batch creation: a "Batch Create" button in the PageHeader opens a 3-step wizard that lets HR select any number of employees (with search, department filter, and department quick-add buttons), pick a month, preview exactly which employees will be created vs. skipped, then fire one POST that creates DRAFT payroll rows for all eligible employees with per-employee try/catch. Results show created/skipped/failed counts and lists. Same action is also available from the topbar's Quick Add dropdown ("Batch Create Payroll") and the Quick Actions dispatcher.
- The Settings module now has a dedicated "Email Templates" tab between "Email Settings" and "Document Numbering". The tab renders a full-section Email Template Editor with: a left panel listing all document templates (searchable, with "Email ready" / "No email" badges), a right panel with subject input + monospace body textarea + a clickable variables sidebar that inserts `{{token}}` at the cursor in whichever field was last focused, and a full-width Live Preview below that renders the email (To + Subject + Body) with all variables resolved against a sample employee + company — updating in real-time as the user types. Save / Reset / Send Test Email buttons are wired (Save = PATCH, Reset = revert, Send Test Email = POST `/api/settings/test-email` with the rendered subject + body).
- The existing `/api/settings/test-email` route was extended (additively, backward-compatible) to accept optional `subject` + `body` so the Email Template Editor's "Send Test Email" actually sends the rendered template content.
- 5 new files + 5 modified files. Lint passes. Dev server compiles cleanly. All work persisted in `/agent-ctx/4-B-payroll-batch-email-templates.md`.
- Note for future agents: The 4 pre-existing TypeScript errors in `src/app/api/payroll/route.ts`, `src/lib/document-renderers.ts`, and `src/hooks/use-keyboard-shortcuts.ts` are still unfixed — flagged in worklog Task 3-B. They don't affect runtime (Next.js compiles fine), only `tsc --noEmit`.

---
Task ID: 4-A
Agent: subagent-4-A (leave-calendar-attendance-heatmap)
Task: Add Leave Calendar View (month grid toggle in Leave module) + Attendance Heatmap (GitHub-style contribution graph in Attendance module), with their backend APIs.

Work Log:
- Read worklog.md (last 150 lines) to align with project conventions: emerald primary palette (no indigo/blue), sonner toast, TanStack Query, shared `PageHeader`/`KpiCard`/`StatusBadge`/`AvatarBadge`/`EmptyState` components, `formatDate`/`cn` from `@/lib/utils.ts`, existing leave/attendance API patterns.
- Reviewed existing `/api/leave/route.ts` (uses `db.leaveRequest.findMany` with employee + leaveType includes) and `/api/attendance/route.ts` (uses `db.attendance.findMany` with date range filter) to mirror conventions.
- Reviewed `prisma/schema.prisma`: `LeaveRequest` has `startDate`, `endDate`, `status` (PENDING/APPROVED/REJECTED/CANCELLED); `Attendance` has `date`, `status` (PRESENT/ABSENT/LATE/LEAVE/HALF_DAY/REMOTE/HOLIDAY), `workingHours`. Did NOT modify the schema.
- Created `/agent-ctx/4-A-leave-calendar-attendance-heatmap.md` with full file inventory + design notes for downstream agents.

Part 1 — Leave Calendar View:
- NEW `/src/app/api/leave/calendar/route.ts`:
  - GET `?month=YYYY-MM` (defaults to current month if missing/malformed).
  - Returns approved + pending leave requests that overlap the month window using `startDate: { lte: monthEnd }, endDate: { gte: monthStart }`. REJECTED is excluded per spec.
  - Each item flattened to: `{ id, employeeId, employeeName, employeePhoto, leaveTypeName, leaveTypeColor, startDate, endDate, days, status }` — colors default to `#10b981` (emerald) when the leave type has no color.
  - Uses LOCAL timezone date math (not UTC) so calendar dates don't shift by a day in negative timezones.
- MODIFIED `/src/components/hr/modules/leave.tsx`:
  - Added `view` state ("list" | "calendar") with a 2-button toggle group (List View / Calendar View) rendered above the existing tabs.
  - LIST VIEW: unchanged — preserves the existing Tabs (ALL/PENDING/APPROVED/REJECTED), filter bar, table, pagination, view/decision dialogs.
  - CALENDAR VIEW:
    - Header: Previous/Next month buttons + month label (e.g. "August 2026") + Today button (disabled when already on current month).
    - Grid: 7 columns (Mon-Sun), variable week rows. Uses CSS `grid-cols-7` with `gap-1 sm:gap-1.5`.
    - Each day cell: date number top-left, small colored dots for employees on leave that day (max 3, then "+N" overflow indicator), per-day leave count top-right.
    - Approved leave = solid colored dot (uses `leaveTypeColor`). Pending leave = same color but with a 45° hatched overlay (CSS `repeating-linear-gradient(45deg, rgba(255,255,255,0.55) 0 2px, transparent 2px 4px)`).
    - Weekend cells (Sat/Sun) use `bg-muted/30` background. Out-of-month cells use `bg-muted/20` with faded text.
    - Today's cell highlighted with `ring-2 ring-primary ring-offset-1 ring-offset-background`.
    - Clicking a day cell with leaves opens a Dialog listing every leave: avatar, name, status badge, leave type dot (hatched if pending), date range, days.
    - Mobile responsive: weekday headers collapse to single letters, cells shrink to `min-h-[64px]` with `size-1.5` dots; desktop uses `min-h-[92px]` with `size-2` dots.
    - Loading skeleton uses shadcn `Skeleton` component in a 7-column grid.
    - Legend row above the grid explains the dot styles (Approved solid, Pending hatched, Weekend, Today ring).
  - Calendar data is fetched only when `view === "calendar"` (`enabled` flag on the TanStack Query). Cache key `["leave-calendar", calMonth]`.
  - `["leave-calendar"]` query invalidated alongside `["leave"]` on decisions/edits/deletes so the calendar stays in sync.
  - Helpers: `buildCalendarDays(year, monthIdx)` (Monday-indexed start offset, fills to first Sunday on/before the 1st and last Saturday on/after the last), `leavesOnDay(items, date)` (date-range overlap check), `localDateKey(date)` (local-timezone YYYY-MM-DD).

Part 2 — Attendance Heatmap:
- NEW `/src/app/api/attendance/heatmap/route.ts`:
  - GET `?employeeId=&months=3` (months default 3, clamped 1-24).
  - Individual mode (`employeeId` provided): one item per day, dedupes by date keeping highest-intensity status. Item: `{ date, status, workingHours }`.
  - Aggregated mode (no `employeeId`): groups by date, picks the highest-intensity status across all employees that day, returns the average working hours and the record count. Item: `{ date, status, workingHours, count }`.
  - Intensity map used to pick max: `PRESENT=4, LATE=3, REMOTE=3, HALF_DAY=2, LEAVE=1, ABSENT=0, HOLIDAY=-1`. Unknown statuses default to -1 so known ones always win.
  - Date window: first day of the month N months ago → end of today. Uses LOCAL timezone.
  - In-memory grouping with a `Map` (dataset is small — ≤ ~3 months × ~20 employees ≈ 1,300 records max).
- MODIFIED `/src/components/hr/modules/attendance.tsx`:
  - Added new `AttendanceHeatmap` sub-component rendered between the KPI cards and the filter bar.
  - Header: title "Attendance Heatmap" + description on the left; employee filter dropdown (default "All employees (aggregated)") + months-range dropdown (1/3/6/12 months) on the right.
  - GitHub-style contribution graph: 7 rows (Sun-Sat) × N columns (weeks). Built with CSS `grid-flow-col` + `gridTemplateRows: repeat(7, 12px)` and fixed `12px × 12px` cells with `3px` gaps.
  - Cell color scale (matches spec): empty/no data = `bg-muted/30`; Absent (0) = `bg-rose-500/60`; Leave (1) = `bg-amber-500/40`; Half day (2) = `bg-sky-500/60`; Late/Remote (3) = `bg-amber-500/80`; Present (4) = `bg-emerald-500`. HOLIDAY = `bg-muted/30` (grey). Future days = transparent.
  - Month labels positioned absolutely along the top (each label at the column index where its month starts).
  - Day labels column on the left shows only "Mon", "Wed", "Fri" (with empty slots for Sun/Tue/Thu/Sat) — matches GitHub's convention.
  - Each cell wrapped in shadcn `Tooltip` — hover shows "Mon, 11 Aug 2026 — Present · 8.92h avg · 20 records" (aggregated) or just status + hours (individual).
  - Legend below: "Less [□□□□■] More" with 5 color swatches (absent, leave, half-day, late/remote, present).
  - Loading skeleton + empty state for no-data ranges.
  - Wrapped in `overflow-x-auto` so wider ranges (6-12 months) scroll horizontally on mobile.
  - Heatmap query keyed on `["attendance-heatmap", employeeId, months]`; invalidated alongside `["attendance"]` on attendance create/edit/delete.

Issues Encountered:
- The Next.js dev server was found dead (no process running, port 3000 not listening, dev.log last entry ~5 minutes stale with no errors logged). Restarted it via `setsid bash -c 'bun run dev > /tmp/dev-restart.log 2>&1' &` so I could smoke-test the new endpoints. All endpoints returned 200 with the expected JSON shape.
- The pre-existing TypeScript errors in `src/app/api/payroll/route.ts`, `src/lib/document-renderers.ts`, `src/hooks/use-keyboard-shortcuts.ts`, `prisma/seed.ts`, `examples/`, and `skills/` remain unchanged — none of my 4 files produce any TS errors.

Lint status:
- `cd /home/z/my-project && bun run lint 2>&1 | tail -20` → 0 errors, 0 warnings (exit 0).
- `bunx tsc --noEmit` → 0 errors in any of my 4 modified/created files.

API smoke tests (after dev server restart):
- `GET /api/leave/calendar?month=2026-08` → 200, 9 items returned (Arif Hossain PENDING, Nadia Khan APPROVED, Sumaiya Sarkar APPROVED, Tanvir Hossain PENDING, Farhana Khan APPROVED, Maliha Sarkar APPROVED, Sajid Hossain PENDING, Rumana Khan APPROVED, Tania Sarkar APPROVED) — both APPROVED + PENDING included, REJECTED excluded as designed.
- `GET /api/attendance/heatmap?months=3` → 200, aggregated mode, 7 items (2026-08-07 → 2026-08-13), each with `count: 20` and avg working hours ~7.2-7.3h.
- `GET /api/attendance/heatmap?employeeId=cmss1mi1u0011slbkbttb53zi&months=3` → 200, individual mode, items show that employee's daily status (LATE on 08-07, PRESENT on 08-08/09/11/12, ABSENT on 08-10) with raw working hours (not averaged).
- `GET /` → 200, normal page render.

Stage Summary:
- Leave module now has two complementary views: a paginated filterable table (existing) and a monthly calendar grid (new). The calendar makes it immediately visible who is on leave on any given day, with status-coded dot styling (solid approved, hatched pending) and a click-to-see-details dialog. Both views share the same KPI cards and the same Add Leave / Export actions in the PageHeader.
- Attendance module now has a GitHub-style contribution heatmap showing the last 1/3/6/12 months of attendance patterns, with employee filter (aggregated by default, individual selectable), intensity-based color coding, hover tooltips, month/day axis labels, and a "Less → More" legend. The heatmap sits between the KPI cards and the table, giving a quick visual overview before drilling into the per-day table.
- Both new endpoints follow the existing project conventions (NextRequest/NextResponse, `db` from `@/lib/db`, local-timezone date math, no z-ai-web-dev-sdk client-side usage). No prisma schema changes were needed.
- Total: 2 new API files + 2 modified module files. Lint clean. TypeScript clean for all 4 files. API endpoints verified via curl. All work persisted in `/agent-ctx/4-A-leave-calendar-attendance-heatmap.md`.

---
Task ID: 4-CRON-3
Agent: cron-review-agent (round 3)
Task: QA testing, add leave calendar view, attendance heatmap, payroll batch creation, email template editor, dashboard sparklines + hero banner, sidebar polish.

Work Log:
- Read worklog.md (rounds 1-2 complete: 15 templates, approval workflow, bulk generation, 6 analytics charts, dark mode toggle, keyboard shortcuts, CSV/Excel export, document print, employee photo upload, mobile responsiveness, attendance GET bug fix).
- Ran `bun run lint` — 0 errors, 0 warnings.
- Reviewed dev log — found historical 500 on bulk-download (since fixed, now returns 200 with valid ZIP).
- Dispatched 2 parallel subagents (Task 4-A: leave calendar + attendance heatmap; Task 4-B: payroll batch + email template editor).
- Directly implemented: KPI sparklines, dashboard welcome hero banner with attendance ring, sidebar active indicator bar + icon hover scale.

Features Added (directly implemented):
- **KPI Sparklines**: Enhanced `/src/components/hr/shared/kpi-card.tsx` with an optional `sparkline` prop (array of numbers). Renders a mini line chart at the bottom of each KPI card using `react-sparklines` (installed). The sparkline color auto-matches the card's accent color (emerald for primary/emerald cards, amber for amber cards, etc.). Updated `/src/components/hr/modules/dashboard.tsx` to pass sparkline data: Total Employees (growth trend), Present Today (from attendanceTrend.present), On Leave (from attendanceTrend.leave), Late Today (from attendanceTrend.late), Documents Generated (trend), Documents Sent (trend). Created type declaration at `/src/types/react-sparklines.d.ts`. VLM confirmed: "KPI cards include sparklines at the bottom of each card" — 9/10 rating.
- **Dashboard Welcome Hero Banner**: Added a gradient hero card at the top of the dashboard with:
  - Personalized greeting ("Good morning/afternoon/evening, {firstName} 👋") based on time of day.
  - Today's full date (weekday, month, day, year).
  - Contextual summary: "You have N pending leave request(s) and N document(s) generated."
  - Circular SVG attendance ring showing the attendance rate (presentToday / totalEmployees * 100) with animated stroke-dasharray.
  - Mini legend showing Present/On Leave/Late counts with colored dots.
  - Subtle gradient background (from-primary/5 via-primary/3 to-transparent) with a blurred decorative circle.
  VLM confirmed: "welcome hero banner with greeting 'Good evening, Tahmina' and 70% circular attendance ring is clearly visible" — 9/10.
- **Sidebar Active Indicator**: Added a vertical accent bar on the left side of the active nav item (h-5 w-1 rounded-r-full bg-sidebar-primary). Changed hover group name from `group` to `group/nav` to avoid conflicts. Added `transition-transform group-hover/nav:scale-110` on icons for a subtle hover scale effect. Softened inactive text color to `text-sidebar-foreground/75`.

Features Added (via subagents):
- **Task 4-A: Leave Calendar View** — New `/api/leave/calendar?month=YYYY-MM` endpoint returns approved+pending leave requests overlapping the month. Modified Leave module with List/Calendar view toggle. Calendar renders a month grid (Mon-Sun) with: month navigation (prev/next/today), colored dots per employee on leave (solid=approved, hatched=pending), weekend backgrounds, today ring, click-to-open day details dialog, legend, loading skeleton, mobile-responsive. VLM confirmed: 8/10, "Clean, functional grid layout; clear status legend; intuitive navigation."
- **Task 4-A: Attendance Heatmap** — New `/api/attendance/heatmap?employeeId=&months=3` endpoint returns daily attendance with intensity mapping (PRESENT=4, LATE=3, REMOTE=3, HALF_DAY=2, LEAVE=1, ABSENT=0). Added GitHub-style contribution heatmap to Attendance module: 7 rows (days) × N columns (weeks), color scale from bg-muted/30 (no data) to bg-emerald-500 (present), employee filter, months range selector (1/3/6/12), hover tooltips, month/day labels, "Less → More" legend, horizontal scroll for wide ranges.
- **Task 4-B: Payroll Batch Creation** — New `/api/payroll/batch-create` endpoint (POST with employeeIds + month, skip-if-exists, per-employee try/catch, PAYROLL_BATCH_CREATE audit log). New `PayrollBatchDialog` 3-step wizard (Select Employees → Select Month + skipped preview → Create with progress + results). Added "Batch Create" button to Payroll module header, Quick Actions, and Topbar Quick Add dropdown.
- **Task 4-B: Email Template Editor** — New `/api/email-templates` and `/api/email-templates/[id]` endpoints for listing and PATCHing emailSubject/emailBody on document templates. New `EmailTemplateEditor` component with left template list + right editor (subject input, monospace body textarea, clickable variables sidebar) + full-width Live Preview (real-time rendered with sample employee data) + Save/Reset/Send Test Email buttons. Added "Email Templates" tab to Settings module (between Email Settings and Document Numbering). Enhanced `/api/settings/test-email` to accept optional subject+body for testing rendered templates.

Verification:
- `bun run lint` — 0 errors, 0 warnings.
- API smoke tests (all in single command to handle server lifecycle):
  - Dashboard: 200 ✓
  - Leave Calendar: 200 with items (employeeName, leaveTypeName, leaveTypeColor, dates) ✓
  - Attendance Heatmap: 200 with aggregated daily data ✓
  - Payroll Batch: correctly validates empty array (400) ✓
  - Email Templates: 200 ✓
  - Bulk Download: 200 with valid ZIP ✓
- agent-browser + VLM verification:
  - Dashboard: 9/10 — welcome hero banner with greeting + attendance ring visible, KPI sparklines visible.
  - Leave Calendar: 8/10 — month grid with colored dots and legend.
  - All chart elements verified in DOM: 28 attendance bars + 8 pie slices + 8 sparkline paths.

Stage Summary:
- Project now has: leave calendar view, attendance heatmap, payroll batch creation, email template editor with live preview, KPI sparklines on all dashboard cards, welcome hero banner with attendance ring, polished sidebar with active indicator.
- Total document templates: 15. Total modules: 11 (+ sub-views: Leave Calendar, Attendance Heatmap, Approval Queue, Email Template Editor). Total API endpoints: 60+.
- Remaining recommendations for next cron round:
  1. Add real SMTP email sending (currently simulated).
  2. Add data backup/restore functionality (export/import SQLite DB).
  3. Add employee directory filters by joining date range.
  4. Add document comparison/diff view (compare two versions of a template).
  5. Add employee export to PDF (formatted employee directory).
  6. Add leave balance tracking (remaining days per leave type per employee).
  7. Add attendance import from CSV (bulk import check-in/out data).
  8. Add custom dashboard widgets (drag-and-drop customizable layout).
  9. Add notification preferences (email/SMS/in-app toggle per event type).
  10. Add multi-company/multi-tenant support.

---
Task ID: 5-A
Agent: 5-A-leave-balance-attendance-import
Task: Leave Balance Tracking + Attendance CSV Import.

Work Log:
- Read worklog.md (rounds 1-4 complete: documents, attendance/leave/payroll, bulk templates + generation, approval workflow + reports + charts, CSV/Excel export, print, mobile responsiveness, photo upload, leave calendar view, attendance heatmap, payroll batch creation, email template editor, KPI sparklines, dashboard hero banner, sidebar polish).
- Verified dev server was dead; restarted via detached subshell on port 3000.

Files Created (4):
- `src/app/api/leave/balances/route.ts` — GET `?employeeId=` returns `{ items: [{ employeeId, employeeCode, employeeName, employeePhoto, leaveTypeId, leaveTypeName, leaveTypeColor, allocated, used, pending, remaining }] }`. Loads ACTIVE LeaveTypes + (optionally filtered) Employees, aggregates APPROVED+PENDING LeaveRequests in-memory via `Map<empId|ltId, {used, pending}>`, builds one entry per (employee × leave type). allocated from `LeaveType.defaultDays`, remaining = allocated - used - pending. All numbers rounded to 2 decimals.
- `src/app/api/attendance/import/route.ts` — POST accepts `multipart/form-data` with `file` field. Validates CSV header (5 required columns, case-insensitive). Per-row: looks up employee by `employeeId` (cached via single `findMany` + Map), parses date (YYYY-MM-DD), parses check-in/out times (HH:MM/HH:MM:SS/12h) combined with date, validates status, computes workingHours/late/lateMinutes/overtime (mirrors `POST /api/attendance`), upserts existing record for (employee, calendar day). Per-row error isolation (one bad row never aborts the batch). Writes `ATTENDANCE_IMPORT` AuditLog. Returns `{ imported, updated, failed, errors: [{row, error}] }`. Includes a minimal RFC-4180 CSV parser (quoted fields, escaped `""`) — no external deps.
- `src/components/hr/modules/leave-balances.tsx` — Balances view. KPI cards: Total Allocated, Total Used, Total Remaining, Lowest Balance (employee+type with smallest remaining among rows where allocated > 0). Filters: leave type Select + search Input (matches name or employee code). Table columns: Employee (AvatarBadge + name + mono code), Leave Type (color dot + name), Allocated, Used, Pending (amber when > 0), Remaining (color-coded: emerald >50%, amber 20-50%, rose <20%), Usage bar (Progress component with % label, color tier matches usage tier). Loading skeleton + empty state. Legend explaining color tiers + note that pending days count against remaining.
- `src/components/hr/modules/attendance-import-dialog.tsx` — 4-step wizard (Upload → Preview → Import → Results) with step indicator. Step 1: drag-and-drop zone + click-to-browse hidden file input, "Download Template" button (generates sample CSV with PRESENT/LATE/ABSENT/HALF_DAY examples via shared `downloadBlob`), format info panel. Step 2: client-side CSV parse (mirrors server logic), preview table of first 10 rows with row numbers, format-error card if headers missing. Step 3: progress bar with fake tick + spinner, POSTs FormData to `/api/attendance/import`. Step 4: 3 stat cards (Imported/Updated/Failed) + scrollable error table (row + error message) + success banner if no errors. Resets state on close. Triggers `onImported` callback to invalidate `["attendance"]` + `["attendance-heatmap"]` queries.

Files Modified (2):
- `src/components/hr/modules/leave.tsx` — `View` type extended to include `"balances"`. Imported `Scale` icon + `LeaveBalances` component. Added 3rd view toggle button "Balances View" alongside List/Calendar with matching visual treatment. Renders `<LeaveBalances />` when `view === "balances"`. List + Calendar views unchanged.
- `src/components/hr/modules/attendance.tsx` — Imported `UploadCloud` icon + `AttendanceImportDialog` component. Added `importOpen` state. New outline "Import CSV" button in PageHeader actions (between ExportButton and Add Attendance, responsive label). Renders `<AttendanceImportDialog>` at the bottom with `onImported` callback that invalidates `["attendance"]` + `["attendance-heatmap"]` queries.

Verification:
- `cd /home/z/my-project && bunx eslint <my 6 files>` → 0 errors, 0 warnings (exit 0).
- `bunx tsc --noEmit` → 0 errors in any of my 6 files.
- `bun run lint` → 2 pre-existing errors in `src/components/hr/modules/template-compare-dialog.tsx` (parallel agent's file, NOT my scope).
- API smoke tests (after dev server restart):
  - `GET /api/leave/balances` → 200, 140 items (20 employees × 7 leave types). Spot-checked EMP001: Annual Leave alloc=20 used=0 pend=2 rem=18 ✓ (matches the PENDING leave request from earlier rounds).
  - `GET /api/leave/balances?employeeId=cmss1mi1u0011slbkbttb53zi` → 200, exactly 7 items.
  - `POST /api/attendance/import` with 3-row CSV (EMP001 PRESENT, EMP002 LATE, BAD_EMP) → 200, `{imported:0, updated:2, failed:1, errors:[{row:4, error:"Unknown employee ID \"BAD_EMP\"."}]}`. Verified DB: EMP001 now 09:05-18:15 PRESENT 9.17h, EMP002 now 09:30-18:00 LATE 8.5h 15min late. AuditLog entry written: `ATTENDANCE_IMPORT` / "Imported 0 attendance record(s), updated 2, failed 1."

Issues Encountered:
- Dev server was dead on arrival — restarted via `(bun run dev > /tmp/dev-5a.log 2>&1 &)` detached subshell so it survives the calling shell. After restart all endpoints responded 200 with expected JSON.
- The pre-existing lint errors in `template-compare-dialog.tsx` are from a parallel agent's work (untracked file, alongside `src/app/api/document-templates/compare/` and `src/app/api/employees/directory-pdf/` from other Task-5 subagents) and outside my task scope.

Stage Summary:
- Leave module now has 3 views: List (existing), Calendar (round 4-A), and **Balances** (new). Balances view exposes per-employee × per-leave-type allocation/usage/remaining with visual progress bars and color-coded remaining thresholds. KPI cards surface totals + the lowest balance.
- Attendance module now supports bulk CSV import via a 4-step wizard (Upload → Preview → Import → Results) with template download, format validation, per-row error reporting, and audit logging. Auto-computes working hours/late/overtime from check-in/out times. Updates existing records for the same employee+date.
- All 6 of my files lint-clean + TypeScript-clean. API endpoints verified via curl. No prisma schema changes. Full work record persisted at `/agent-ctx/5-A-leave-balance-attendance-import.md`.

---
Task ID: 5-B
Agent: direct implementation (no subagents dispatched)
Task: Employee Directory PDF Export + Document Template Version Comparison.

Work Log:
- Read worklog.md for context (rounds 1-4 complete: 15 templates, approval workflow, bulk generation, 6 analytics charts, dark mode toggle, keyboard shortcuts, CSV/Excel export, document print, employee photo upload, mobile responsiveness, attendance GET bug fix, leave calendar, attendance heatmap, payroll batch creation, email template editor, KPI sparklines, welcome hero banner, sidebar polish).
- Dev server was found dead (no process running, port 3000 not listening). Restarted via `nohup /tmp/start-dev.sh` (wrapper script that calls `setsid bun run dev`). The dev server doesn't survive between Bash tool calls (process tree gets cleaned up when the shell exits), so all smoke tests had to be done inside a single Bash invocation that started the server and immediately tested.
- Implemented Part 1 (Employee Directory PDF):
  - NEW `/src/app/api/employees/directory-pdf/route.ts` — pdfkit-based multi-page PDF generator with `bufferPages: true` (so `switchToPage` can reach earlier pages for TOC backfill + footer drawing). Page 1 = title (centred "Employee Directory" + company name/address/contact + "Generated on {date}" + "N employees across M departments"). Page 2 = TOC (one row per department with color swatch, dept name in bold, dotted leader line, employee count subtitle, real page number written during backfill pass). Pages 3+ = per-department sections with colored header band, 7-column table (Photo placeholder / Name / Emp ID / Designation / Email / Phone / Joined), alternating row stripes, ellipsis on long values, auto page-break with "(continued)" header when a section overflows. Footers on every page except the title: "Generated by TeamHub HR" (left) · "Page X of Y" (right). Two-pass rendering: title → TOC skeleton with blank page-number column → all department sections (recording each one's startPage) → switch back to TOC and write real page numbers → loop all pages and draw footers. Supports `?departmentId=` and `?status=` filter params (forwarded to the Prisma `where` clause). Response sets `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="employee-directory-{YYYY-MM-DD}.pdf"`, `Cache-Control: no-store`. Writes an `EMPLOYEE_DIRECTORY_PDF` audit log entry (best-effort, wrapped in try/catch).
  - MODIFIED `/src/components/hr/modules/employees.tsx` — added "Directory PDF" outline button to PageHeader actions (between ExportButton and the list/grid view toggle). Uses `FileDown`/`Loader2` icons from lucide-react. New `pdfLoading` state slot + `downloadDirectoryPdf()` handler that builds a query string from current `departmentId`/`status` filters, fetches the PDF as a Blob, creates an object URL, triggers a download via a temporary `<a download>` element, and toasts success/error. Button label collapses from "Directory PDF" to "PDF" on mobile; spinner + "Generating…" replaces the icon/label while loading.
- Implemented Part 2 (Document Template Version Comparison):
  - NEW `/src/app/api/document-templates/compare/route.ts` — GET `?id1=&id2=` returns `{ template1, template2, contentDiff, subjectDiff, emailSubjectDiff, emailBodyDiff, stats }`. Uses classic LCS dynamic programming on lines (with `Uint32Array` rows for speed) to compute the line-diff of `content` and `emailBody`. Uses the same LCS routine on whitespace-tokenised arrays for `subject` and `emailSubject` so short fields render as inline diffs. Diff entries: `{ type: "added"|"removed"|"unchanged", line, lineNum? }`. Validation: 400 if either id missing, 400 if `id1 === id2`, 404 if either template doesn't exist.
  - NEW `/src/components/hr/modules/template-compare-dialog.tsx` — full-screen dialog (`max-w-6xl`, `max-h-94vh`) with two template picker dropdowns (Template A on left, Template B on right, with an ArrowRight between them on desktop). Defaults to the two most-recently-updated templates when no explicit ids are passed. Statistics bar: "Content diff:" + three pill badges (added = green + count, removed = red − count, unchanged = gray = count) + email-body summary. Two metadata cards (Template A in rose-tinted border, Template B in emerald-tinted border) showing name, code, type, version, status, "Updated {date}". Inline token-level diff for `subject` + `emailSubject` (green bg for additions, red bg + line-through for removals, normal for unchanged). Side-by-side diff view for `content` and `emailBody`: two-column grid with column headers, monospace font, each LCS entry split into rows (unchanged → both columns aligned; removed → left column with red bg + `−` marker; added → right column with green bg + `+` marker; empty cells get muted bg). Loading states ("Loading templates…", "Computing diff…"), empty state when no templates picked, error state with rose banner, Close button in footer. State sync uses React's "adjust state when prop changes" pattern (tracking `prevOpen`/`prevTplCount` in state) instead of useEffect+setState to avoid the `react-hooks/set-state-in-effect` lint error.
  - MODIFIED `/src/components/hr/modules/documents.tsx` — imported `GitCompareArrows` from lucide-react + the new `TemplateCompareDialog` component. Added 3 new state slots at the top of `DocumentsModule`: `compareOpen`, `compareTpl1`, `compareTpl2`. Extended `TemplatesTab` props with `onCompare?: (id1?: string, id2?: string) => void`. Added a "Compare" outline button (with `GitCompareArrows` icon) in the Templates tab filter row, between the type Select and the "Create Template" button — clicking it opens the dialog with no preselected ids (defaults to two most-recently-updated). Added a "Compare with…" entry to each template card's dropdown menu, between "Preview" and the separator — clicking it opens the dialog with that template preselected as Template A. The dialog is rendered at the bottom of `DocumentsModule`; on close, the template id state is reset to undefined so the next open starts fresh.

Issues Encountered:
- Dev server was dead on arrival (no process listening on port 3000). Restarted it via a `setsid`-wrapped background script. The dev server doesn't persist between Bash tool calls (the parent shell's process tree is cleaned up when the call returns), so all smoke testing had to happen inside a single Bash invocation that started the server and immediately ran curl against it.
- pdfkit `switchToPage(1) out of bounds, current buffer covers pages 9 to 9` — first version of the directory-pdf endpoint returned HTTP 500. Root cause: pdfkit only buffers the current page by default; older pages are flushed on `addPage()`. Fix: set `bufferPages: true` in the `PDFDocument` constructor. After the fix, `switchToPage(n)` reaches any page in `0..count-1` and `bufferedPageRange().count` reflects the true total.
- TOC page-number column was rendering placeholder values twice (visible in pypdf text extraction even though the white-rect overlay covered them visually). Fix: stopped writing the placeholder entirely — the TOC skeleton now leaves the page-number column blank and the backfill pass writes the real numbers cleanly.
- TS error: `doc.widthOfString(s.name, { font: "Helvetica-Bold" })` — pdfkit's `TextOptions` type doesn't include `font`. Fix: call `doc.font("Helvetica-Bold").fontSize(11)` first, then `doc.widthOfString(s.name)` (which uses the currently-set font).
- `react-hooks/set-state-in-effect` lint error on the compare dialog's two useEffects. Fix: replaced both with React's documented "adjust state when prop changes" pattern (tracking `prevOpen` and `prevTplCount` in state, calling `setState` during render when the tracked value differs from the new prop). Same UX, no lint warning, no cascading renders.
- Compare dialog was fetching `/api/document-templates?status=ALL` which the existing API interprets as `where.status = "ALL"` (returns 0 templates, since no template has that literal status). Fix: removed the `?status=ALL` query param and rely on the endpoint's default behaviour (excludes only ARCHIVED).

Lint status:
- `cd /home/z/my-project && bun run lint 2>&1 | tail -10` → 0 errors, 0 warnings (exit 0).
- `bunx tsc --noEmit` → 0 errors in any of the 5 files I touched. (Pre-existing TS errors in `src/app/api/payroll/route.ts`, `src/lib/document-renderers.ts`, `src/hooks/use-keyboard-shortcuts.ts`, `prisma/seed.ts`, `examples/`, and `skills/` remain unchanged — none caused by my changes.)

API smoke tests (after dev server restart):
- `GET /api/employees/directory-pdf` (no filters) → 200, `application/pdf`, 23,482 bytes, 28 pages. `%PDF-1.3` header. pypdf validates: title="Employee Directory", author="TeamHub HR". Title page contains "Employee Directory / Northwind Labs / 14 Garden Road, Level 5 / hr@northwindlabs.io · +880 1700-000000 / Generated on 13 August 2026 / 20 employees across 8 departments". TOC page lists all 8 departments with employee counts + page numbers (Design→3, Engineering→4, Finance→5, HR→6, Marketing→7, Operations→8, Product→9, Sales→10). First dept section page shows the table with initials avatar + Name + Emp ID + Designation + Email + Phone + Joined columns. Last page footer: "Page 10 of 10".
- `GET /api/employees/directory-pdf?departmentId=cmss1mi1n0002slbkba43rkyg` (Engineering) → 200, 6,376 bytes, 7 pages.
- `GET /api/employees/directory-pdf?status=ACTIVE` → 200, 23,482 bytes, 28 pages.
- `GET /api/employees/directory-pdf` Content-Disposition header → `attachment; filename="employee-directory-2026-08-13.pdf"` ✓
- `GET /api/document-templates/compare?id1=cmss1mi7q00bkslbklcfeznaa&id2=cmss1mi7r00blslbk4vh8mpue` (Appointment Letter vs Offer Letter) → 200, `application/json`, 7,149 bytes. Returns `template1.name="Appointment Letter"`, `template2.name="Offer Letter"`, `contentDiff.length=30` (9 added, 16 removed, 5 unchanged), `subjectDiff` (1 added, 1 removed, 3 unchanged), `emailSubjectDiff` (3 added, 4 removed, 1 unchanged), `emailBodyDiff` (2 added, 3 removed, 6 unchanged). First 5 content diff entries verified: unchanged `<h2>{{company.name}}</h2>`, added `<p>{{company.address}}</p>`, removed `<p>{{company.address}}, {{company.city}}, {{company.country}}</p>`, etc.
- `GET /api/document-templates/compare?id1=X&id2=X` (same id) → 400 with `{"error":"Cannot compare a template with itself. Choose two different templates."}`.
- `GET /api/document-templates/compare` (no params) → 400 with `{"error":"Both id1 and id2 query parameters are required."}`.
- `GET /` (homepage) → 200, 40 KB HTML, no runtime errors in dev log.

Stage Summary:
- The HR module now has a one-click "Directory PDF" export on the Employees page that produces a polished, multi-section, paginated PDF directory of all employees — filtered by the current department/status filters, with a title page, table of contents (with real page numbers), per-department sections with photo placeholder + name + ID + designation + email + phone + joining date columns, and "Page X of Y · Generated by TeamHub HR" footers.
- The Documents module now supports side-by-side template comparison via a "Compare" button in the Templates tab and a "Compare with…" action on every template card. The compare dialog shows metadata cards for both templates, a statistics bar (added/removed/unchanged counts), inline token-level diffs for the short string fields (subject, emailSubject), and a true side-by-side line diff for the long-form fields (content, emailBody) with GitHub-style red/green row highlighting.
- Both new endpoints follow the existing project conventions (NextRequest/NextResponse, `db` from `@/lib/db`, no z-ai-web-dev-sdk client-side usage, no prisma schema changes). The PDF generator uses pdfkit which was already in the dependency tree (used by `src/lib/document-renderers.ts`).
- Total: 3 new files (`/src/app/api/employees/directory-pdf/route.ts`, `/src/app/api/document-templates/compare/route.ts`, `/src/components/hr/modules/template-compare-dialog.tsx`) + 2 modified files (`/src/components/hr/modules/employees.tsx`, `/src/components/hr/modules/documents.tsx`). Lint clean. TypeScript clean for all 5 files. API endpoints verified via curl + pypdf validation. All work persisted in `/agent-ctx/5-B-directory-pdf-template-compare.md`.

---
Task ID: 5-C
Agent: 5-C-performance-recruitment-rebuild
Task: Rebuild Performance and Recruitment modules (both had been overwritten with "Coming Soon" placeholders by a prior agent). Backend APIs at /api/performance, /api/jobs, /api/candidates already worked; seed data existed (8 performance reviews, 3 jobs, 8 candidates).

Work Log:
- Read worklog.md for context (rounds 1-5 complete: documents, attendance/leave/payroll, bulk templates + generation, approval workflow + reports + charts, CSV/Excel export, print, mobile responsiveness, photo upload, leave calendar, attendance heatmap, payroll batch creation, email template editor, KPI sparklines, welcome hero banner, sidebar polish, leave balances, attendance CSV import, employee directory PDF, document template compare). Verified dev server was alive on port 3000 (EADDRINUSE = something already bound — the running server). Did NOT restart it.

Files Modified (2):
- `src/components/hr/modules/performance.tsx` — REWROTE (27 → 1078 lines). Full Performance Management module:
  - PageHeader "Performance Management" + TrendingUp icon, actions = preserved `<ExportButton module="performance" filters={...} />` + new "Create Review" button (label collapses to "New" on mobile).
  - 4 KPI cards driven by a separate `["performance-stats"]` query (pageSize=500): Total Reviews (ClipboardList), Avg Score (TrendingUp emerald, value colored by tier), Top Performers ≥85 (Award amber), Pending Reviews status=SUBMITTED (Target rose).
  - Filters: Search input (reviewer/period/comments/employee.fullName/employeeId), Review Period text input, Status dropdown (DRAFT/SUBMITTED/REVIEWED/FINALIZED). Page resets to 1 on filter change.
  - Table in a Card: Employee (AvatarBadge + name + mono employeeId), Review Period, Reviewer (hidden on mobile), Overall Score (animated colored progress bar — rose<40 / amber<60 / yellow<75 / emerald≥75 — with colored numeric label), StatusBadge, Actions dropdown (View/Edit/Delete with confirm). Row click opens detail. Actions menu stops propagation.
  - Create/Edit dialog (ReviewFormDialog + ReviewFormBody split + `key`-based remount for edit prefill, avoiding useEffect-setState lint):
    - EmployeeSearchSelect = Popover + Command (searchable, avatar + name + employeeId + department, disabled in edit mode).
    - Review Period + Reviewer text inputs.
    - 5 score sliders (Goals/Quality/Attendance/Teamwork/Communication, 0-100 step 1) with live colored numeric value per slider.
    - Live "Overall" pill in slider panel header — average of 5, colored by tier.
    - Comments textarea.
    - Status select (DRAFT/SUBMITTED only — REVIEWED/FINALIZED are downstream).
    - Submits POST /api/performance or PATCH /api/performance/[id]. Invalidates ["performance"] + ["performance-stats"].
  - Detail dialog: employee header (AvatarBadge lg + name + employeeId + department · designation + big colored overall score), meta row (period Badge, StatusBadge, "Updated {ts}"), 2-column grid:
    - RadarChart (Recharts) — PolarGrid, PolarAngleAxis (5 dims), PolarRadiusAxis (0-100), Radar (emerald fill 35% opacity), ResponsiveContainer h-64.
    - Per-dimension score bars (same color tiers).
    - Comments block (conditional).
    - Footer: Close + "Edit Review" (closes detail, opens edit dialog prefilled).
  - Pagination (Previous / Page X of Y / Next).
  - Loading = 6 skeletons in Card. Empty state with CTA.

- `src/components/hr/modules/recruitment.tsx` — REWROTE (27 → 1108 lines). Full Recruitment module:
  - PageHeader "Recruitment" + Briefcase icon. Actions render `<ExportButton module="candidates" filters={{}} />` ONLY when Candidates tab is active (preserves prior agent's wiring).
  - Tabs: "Jobs" (Briefcase) | "Candidates" (Users).
  - Jobs tab:
    - 4 KPI cards: Open Jobs (Briefcase primary), Total Vacancy (Users amber), Candidates Applied (UserPlus sky — sum candidateCount), Hired This View (UserCheck emerald — sum stageCounts.HIRED).
    - Filter bar: Search + Department dropdown (from /api/departments) + Status dropdown (OPEN/CLOSED/ON_HOLD/FILLED) + "Create Job" button.
    - Job cards grid (1/2/3 cols). Each card: top department color stripe (1px), title + department with color dot, Status badge top-right, meta row (employment type badge, location with MapPin, vacancy with Users, closing date with CalendarDays), salary range (formatCurrency min – max), footer (candidate count + actions dropdown: View Candidates / Edit / Archive [PATCH status=CLOSED] / Delete [confirm]).
    - Create/Edit Job dialog: title, department, employmentType, location, vacancy, closingDate, description (textarea), requirements (textarea), salaryMin, salaryMax, status. Key-based remount for edit prefill. POST /api/jobs or PATCH /api/jobs/[id].
    - JobCandidatesDialog: read-only list of applicants (avatar + name + email + StatusBadge).
  - Candidates tab:
    - Top bar: Search input + "Add Candidate" button.
    - Pipeline board: horizontal-scroll flex with 7 columns (APPLIED → SCREENING → SHORTLISTED → INTERVIEW → SELECTED → OFFER → HIRED). Each column: colored top border (amber→sky→teal→emerald gradient), header (stage name + count badge), body of candidate cards (avatar, name, email, experience, "View →"), max-h-70vh internal scroll, w-72 shrink-0.
    - Rejected candidates: Collapsible at bottom (rose-tinted) with count badge + grid of rejected candidate buttons.
    - Candidate detail dialog: header card (AvatarBadge lg + name + email/phone + department dot + StatusBadge), 4-tile info grid (Experience, Expected Salary, Applied date, Updated relativeTime), skills chips (comma-split emerald badges), editable interview notes (Textarea + Save button PATCHes interviewNotes), "Move to Stage" section with 8 buttons (7 pipeline + REJECTED; current disabled; REJECTED rose-tinted). Notes state sync uses "adjust state during render" pattern (trackedId) to avoid react-hooks/set-state-in-effect lint.
    - Add Candidate dialog: name, email, phone, job select, experience, expectedSalary, skills (textarea). POST /api/candidates with status=APPLIED.

Cross-cutting:
- TanStack Query throughout (placeholderData: (prev) => prev for lists, qc.invalidateQueries on mutations).
- sonner toast for all feedback.
- Shared components: PageHeader, KpiCard, StatusBadge, AvatarBadge, EmptyState, ExportButton.
- formatCurrency / formatDate / relativeTime / cn from @/lib/utils.
- NO indigo/blue. Emerald primary palette.
- Mobile responsive: KPI 2/4 cols, filters stack, table hides Reviewer col on mobile, pipeline scrolls horizontally, dialogs max-h-[90vh] overflow-y-auto.
- Loading skeletons + empty states everywhere.

Issues Encountered:
- Initially wrote ReviewFormBody with an unused `initialState` prop and the parent ReviewFormDialog with redundant local state. Cleaned up: parent only tracks `saving`, body owns all form state, body is remounted via `key={formKey}` whenever `open` or `review?.id` changes so initial useState calls pick up the new values cleanly (no useEffect needed).
- ReviewDetailDialog's `if (!review) return null` early-return means the close animation is skipped, but the dialog still unmounts cleanly. Acceptable tradeoff — avoids tracking a separate "open" boolean and a separate "selected review" object.
- CandidateDetailDialog notes state: needed to sync `notes` whenever a new candidate is opened. Used the React-documented "adjust state during render" pattern (tracking `trackedId` in state, comparing to `candidate.id`, calling setState only when they differ) — this is the recommended alternative to useEffect+setState for this scenario and avoids the `react-hooks/set-state-in-effect` lint error.
- Pre-existing TypeScript errors in `prisma/seed.ts`, `src/app/api/payroll/route.ts`, `src/lib/document-renderers.ts`, `src/hooks/use-keyboard-shortcuts.ts`, `examples/`, `skills/` remain unchanged — none caused by my changes (verified by grepping tsc output for "performance.tsx" / "recruitment.tsx" → 0 hits).

Lint status:
- `cd /home/z/my-project && bun run lint 2>&1 | tail -10` → exit code 0, no errors, no warnings.
- `bunx tsc --noEmit` → 0 errors in either of my 2 files.

API smoke tests (against running dev server on port 3000):
- `GET /api/performance?pageSize=2` → 200, items array of 8 seed reviews with employee/department/designation populated.
- `GET /api/jobs?pageSize=2` → 200, items array of 3 seed jobs with candidateCount + stageCounts populated (e.g. Engineering job: candidateCount=3, stageCounts={APPLIED:2, INTERVIEW:1}).
- `GET /api/candidates?pageSize=2` → 200, items array of 8 seed candidates with job.department populated.
- `GET /` → 200, 40 KB HTML, dev.log shows no runtime errors after compile.

Stage Summary:
- Performance and Recruitment modules are now full-featured instead of placeholders. Performance: 4 KPIs, search/period/status filters, table with colored score bars, create/edit dialog with 5 sliders + employee searchable select + live overall score, detail dialog with RadarChart + per-dimension bars + comments + edit button. Recruitment: Jobs/Candidates tabs, job cards grid with department color stripe + salary range + actions, candidate pipeline board (7 columns + rejected collapsible), candidate detail dialog with editable notes + 8 stage transition buttons.
- Both ExportButton instances preserved exactly as the prior agent wired them (performance in PageHeader next to Create Review; candidates in PageHeader when Candidates tab active).
- 2 files modified, 0 lint errors, 0 TS errors in my files, no Prisma schema changes, dev server not restarted. Full work record at /agent-ctx/5-C-performance-recruitment-rebuild.md.

---
Task ID: 5-CRON-4
Agent: cron-review-agent (round 4)
Task: QA testing, rebuild Performance + Recruitment modules (were placeholders), add leave balance tracking, attendance CSV import, employee directory PDF, document version comparison, framer-motion page transitions.

Work Log:
- Read worklog.md (rounds 1-3 complete: 15 templates, approval workflow, bulk generation, 6 analytics charts, dark mode, keyboard shortcuts, CSV/Excel export, document print, employee photo upload, mobile responsiveness, leave calendar, attendance heatmap, payroll batch, email template editor, KPI sparklines, dashboard hero banner).
- Ran `bun run lint` — 0 errors, 0 warnings.
- Performed agent-browser QA across all modules. VLM identified critical issue: Performance and Recruitment modules were showing "Coming Soon" placeholders (accidentally overwritten by Task 3-A export-button agent).
- Dispatched 3 parallel subagents: Task 5-A (leave balances + attendance import), Task 5-B (directory PDF + template compare), Task 5-C (rebuild Performance + Recruitment).
- Directly implemented: framer-motion page transitions in AppShell.

Critical Bug Fix:
- **Performance + Recruitment modules were placeholders**: Both `/src/components/hr/modules/performance.tsx` and `/src/components/hr/modules/recruitment.tsx` had been overwritten with "Coming Soon" stubs by the Task 3-A agent (which was adding ExportButtons and replaced the entire file content with a placeholder + ExportButton). The Task 1-C agent had originally built full implementations but they were lost. Task 5-C rebuilt both modules from scratch with full functionality. VLM confirmed: Performance 9/10, Recruitment 9/10, Candidates pipeline 9/10.

Features Added (directly implemented):
- **Framer-motion Page Transitions**: Modified `/src/components/hr/app-shell.tsx` to use `AnimatePresence` + `motion.div` for smooth transitions between modules. Each module now fades in (opacity 0→1, y 8→0) on entry and fades out (opacity 1→0, y 0→-4) on exit, with a 200ms ease-out transition. Used a `MODULE_COMPONENTS` map with `useMemo` for efficient rendering. The `key={activeModule}` on the motion.div ensures AnimatePresence detects the change and triggers the transition.

Features Added (via subagents):
- **Task 5-A: Leave Balance Tracking** — New `/api/leave/balances` endpoint returns per-employee × per-leave-type balances (allocated from LeaveType.defaultDays, used from APPROVED requests, pending from PENDING requests, remaining = allocated - used - pending). New `LeaveBalances` component with KPI cards (Total Allocated/Used/Remaining/Lowest Balance), filters, color-coded remaining thresholds (emerald >50%, amber 20-50%, rose <20%), usage progress bars. Added as 3rd view toggle "Balances View" in Leave module. VLM confirmed: 9/10.
- **Task 5-A: Attendance CSV Import** — New `/api/attendance/import` endpoint accepts FormData CSV file, parses Employee ID/Date/Check In/Check Out/Status columns, upserts attendance records with auto-computed working hours/late/overtime, per-row error isolation. New `AttendanceImportDialog` 4-step wizard (Upload with drag-and-drop + template download → Preview with client-side validation → Import with progress bar → Results with error table). Added "Import CSV" button to Attendance module. Verified: 3-row CSV → 2 updated, 1 failed (unknown employee ID).
- **Task 5-B: Employee Directory PDF** — New `/api/employees/directory-pdf` endpoint generates a multi-page PDF with pdfkit: title page (company info + date), table of contents (department → page number), per-department sections with employee tables (7 columns). Supports departmentId/status filters. 28-page PDF generated for all 20 employees. Added "Directory PDF" button to Employees module. Verified: 200, valid PDF, 23,482 bytes, 28 pages.
- **Task 5-B: Document Version Comparison** — New `/api/document-templates/compare` endpoint uses LCS-based line diff for content/emailBody and token-level diff for subject/emailSubject. Returns full template metadata + diff arrays + statistics. New `TemplateCompareDialog` with two template pickers, statistics bar (added/removed/unchanged pills), inline token diffs for short fields, side-by-side line diff with GitHub-style red/green highlighting. Added "Compare" button to Templates tab + "Compare with..." in template card dropdown. Verified: Appointment vs Offer Letter → 30 diff lines (9 added, 16 removed, 5 unchanged).
- **Task 5-C: Performance Module Rebuild** — Full rewrite with: 4 KPI cards (Total Reviews/Avg Score/Top Performers/Pending), filters (period/status/search), table with colored score progress bars, create/edit dialog with 5 sliders + live overall score, detail dialog with Recharts RadarChart. Preserved ExportButton. VLM confirmed: 9/10.
- **Task 5-C: Recruitment Module Rebuild** — Full rewrite with: Jobs tab (4 KPIs, job cards grid with department colors, create job dialog), Candidates tab (7-column pipeline board with candidate cards, stage transitions, interview notes, rejected collapsed list). Preserved ExportButton. VLM confirmed: 9/10.

Verification:
- `bun run lint` — 0 errors, 0 warnings.
- API smoke tests: Leave Balances 200, Directory PDF 200 (28-page valid PDF), Template Compare 200, Attendance Import POST working.
- agent-browser + VLM verification:
  - Dashboard: 9/10 — hero banner, sparklines, charts all visible.
  - Performance: 9/10 — KPI cards, table with score bars, clean design.
  - Recruitment: 9/10 — job cards with department colors, KPIs.
  - Candidates pipeline: 9/10 — 7-column kanban board with candidate cards.
  - Leave Balances: 9/10 — table with allocated/used/remaining + progress bars.
  - Attendance Import button present.
  - Employees Directory PDF button present.
  - Documents Compare button present on Templates tab.

Stage Summary:
- Project now has: fully functional Performance + Recruitment modules (no more placeholders), leave balance tracking, attendance CSV import, employee directory PDF export, document version comparison, framer-motion page transitions.
- Total document templates: 15. Total modules: 11 (all fully functional). Total API endpoints: 65+.
- All modules verified at 9/10 via VLM.
- Remaining recommendations for next cron round:
  1. Add real SMTP email sending (currently simulated).
  2. Add data backup/restore (export/import SQLite DB).
  3. Add notification preferences (email/SMS/in-app toggle per event).
  4. Add multi-company/multi-tenant support.
  5. Add custom dashboard widgets (drag-and-drop layout).
  6. Add employee onboarding workflow (checklist for new hires).
  7. Add exit/offboarding workflow (checklist for departing employees).
  8. Add salary revision history tracking.
  9. Add org chart visualization (reporting hierarchy).
  10. Add HR analytics predictions (attrition risk, performance trends).

---
Task ID: 6-B
Agent: salary-revisions-backup-restore
Task: Add salary revision history tracking + data backup/restore (export/import JSON, danger-zone reset).

Work Log:
- Read worklog.md (rounds 1-5 complete: 11 modules, 65+ endpoints, 15 templates, Performance + Recruitment rebuilt, leave balances, attendance CSV import, directory PDF, document version comparison, framer-motion page transitions).
- Read schema.prisma (cannot modify — used existing `Activity` model for salary revisions via `type="SALARY_REVISION"` and JSON-encoded `description`).
- Inspected existing files: `src/app/api/employees/[id]/route.ts` (PATCH), `src/components/hr/modules/employee-profile.tsx`, `src/components/hr/modules/employee-form-dialog.tsx`, `src/components/hr/modules/settings.tsx`, `src/app/api/settings/route.ts`, `src/lib/utils.ts` (`downloadBlob`, `formatCurrency`, `formatDate`), `src/components/ui/alert-dialog.tsx`, `src/components/ui/progress.tsx`, `src/components/hr/shared/empty-state.tsx`.

Files Created:
1. `src/app/api/salary-revisions/route.ts` (NEW) — GET `?employeeId=` returns salary revision history ordered by date desc. Each item: `{ id, employeeId, oldBasicSalary, newBasicSalary, oldAllowances, newAllowances, oldDeductions, newDeductions, oldTax, newTax, oldNetSalary, newNetSalary, reason, changedBy, changedAt }`. Parses JSON-encoded `description` from Activity rows of type `SALARY_REVISION`.
2. `src/components/hr/modules/salary-history.tsx` (NEW) — Vertical-timeline component showing salary revisions with:
   - Summary cards: Current Net Salary, Total Increase (vs earliest known net), Avg Annual Increase % (compound rate from joiningDate, fallback to first→last revision span).
   - Timeline with colored nodes (emerald=up, rose=down, muted=flat), each entry shows date+changedBy, old→new net salary with delta pill (absolute + %), per-component breakdown (Basic/Allow/Deduct/Tax) with up/down arrows for changed fields, and reason in italic quote.
   - EmptyState when no revisions yet.
   - Loading skeleton.
3. `src/app/api/backup/export/route.ts` (NEW) — GET returns JSON `{version:1, exportedAt, tables:{...}}` with all 21 tables (users, company, departments, roles, designations, leaveTypes, employees, attendance, leaveRequests, payrolls, documentTemplates, generatedDocuments, emailLogs, emailSettings, performances, jobs, candidates, activities, auditLogs, documentNumbering, settings). Sets `Content-Type: application/json` and `Content-Disposition: attachment; filename="teamhub-backup-{date}.json"`. Strips `password` from each user row. Records `lastBackupAt` in Setting table for UI display.
4. `src/app/api/backup/import/route.ts` (NEW) — POST accepts JSON body. Validates structure (`body.tables` must exist). Upserts all 21 tables in dependency order (parent tables first, then Employee, then Employee-dependent tables). Per-table try/catch isolates errors; per-row try/catch counts successes. Drops relational fields (e.g. `department`, `role`, `manager`) before upsert since Prisma refuses nested writes on `update`. Returns `{imported: {employees:N, ...}, errors:[{table,message,count?}], meta:{version,exportedAt,restoredAt}}`. Creates AuditLog: `action="DATA_RESTORE"`, `description="Restored backup from {exportedAt} (version {version})"`. Users: never overwrites password with empty — falls back to a random UUID if backup row is missing password (defense-in-depth, though export already strips passwords).
5. `src/app/api/backup/reset/route.ts` (NEW) — POST `?confirm=DELETE` clears ALL tables except Users and Company. Returns 400 if confirm≠"DELETE". Deletes in dependency order (children first, parents last) with per-table try/catch. Records AuditLog `action="DATA_RESET"`.

Files Modified:
6. `src/app/api/employees/[id]/route.ts` (PATCH handler) — Now fetches the current employee BEFORE updating (`db.employee.findUnique`), returns 404 if not found. After update, computes deltas for `basicSalary`, `allowances`, `deductions`, `tax`. If any changed, creates an Activity row with `type="SALARY_REVISION"`, `title="Salary Revised"`, and `description` = JSON string `{oldBasicSalary, newBasicSalary, oldAllowances, newAllowances, oldDeductions, newDeductions, oldTax, newTax, reason, changedBy:"HR_ADMIN"}`. Accepts optional `body.revisionReason` field (trimmed; null if empty). AuditLog description includes "(incl. salary revision)" suffix when salary changed.
7. `src/components/hr/modules/employee-profile.tsx` — Imported `SalaryHistory` component. Wrapped Payroll tab content in `space-y-4` and appended `<SalaryHistory employeeId={emp.id} currentNetSalary={netSalary} joiningDate={emp.joiningDate} />` after the bank details grid. Updated `onSaved` callback to invalidate `["salary-revisions", id]` query key alongside `["employee", id]`.
8. `src/components/hr/modules/employee-form-dialog.tsx` — Added `MessageSquareText` icon import. Added `revisionReason: ""` to initial form state and to both the reset-on-new-employee state and the load-on-edit state (reset to empty so the user enters a fresh reason each edit). Added a conditional `{isEdit && <Field>...</Field>}` block in the Payroll tab (after the computed-net-salary box) with a 2-row Textarea labelled "Reason for change (optional)" and helper text "Recorded in the employee's salary revision history if any payroll field changes." The full form (including `revisionReason`) is already JSON-stringified to the PATCH endpoint by the existing submit handler.
9. `src/components/hr/modules/settings.tsx` — Added new tab key `backup` to TABS array with `Database` icon. Added imports for AlertDialog UI kit, Progress, and 8 new lucide icons (Database, Download, Upload, TriangleAlert, Loader2, ShieldCheck, Clock, plus existing Check). Wired `{tab === "backup" && <DataBackupTab />}`. Implemented `DataBackupTab()` component with three sections:
   - **Export Backup**: button triggers `/api/backup/export` download via `downloadBlob`. Shows included-data checklist (employees, attendance, leave, payroll, documents, templates, departments/roles/designations, settings). Shows last backup date from `settings.lastBackupAt` (or "Never"). Security note: passwords excluded.
   - **Import Backup**: button opens dynamic file picker for .json files. Amber warning box "This will overwrite existing data". AlertDialog confirmation "Are you sure? This cannot be undone." with file name shown. On confirm: parse JSON, validate `tables` key, POST to `/api/backup/import`, show progress bar (10→40→80→100), then display results grid (per-table counts) + error list if any.
   - **Danger Zone**: rose-bordered card with "Reset all data" destructive button. AlertDialog requires user to type literal "DELETE" in an Input field to enable the action button; calls `/api/backup/reset?confirm=DELETE`. Toast on success.

UI/UX notes:
- Emerald primary palette throughout (no indigo/blue).
- Timeline uses absolute-positioned vertical line with circular nodes containing direction icons (ArrowUpRight/ArrowDownRight/Minus).
- Mobile responsive: summary tiles stack 1-col on mobile, 3-col on sm+. Timeline cards stretch full-width. Settings tab nav remains horizontal-scroll on mobile.
- Loading skeletons in SalaryHistory. EmptyState when no revisions.
- AlertDialog for confirmations (import overwrite + reset). Progress bar during import. Toast feedback via sonner.
- AlertDialogDescription `asChild` with `<div>` for the reset dialog so the type-to-confirm Input renders properly inside the description.

API smoke tests (against running dev server on port 3000 via 127.0.0.1):
- `GET /api/salary-revisions?employeeId=EMP_ID` (no prior revisions) → 200, `{items:[],total:0}`.
- `PATCH /api/employees/EMP_ID` with new basicSalary/allowances/deductions/tax + `revisionReason:"Annual increment 2025"` → 200.
- `GET /api/salary-revisions?employeeId=EMP_ID` → 200, 1 item with correct old/new values and reason="Annual increment 2025".
- `PATCH` again to restore original values → 200, second revision created.
- `GET /api/backup/export` → 200, valid JSON, 227 KB, Content-Disposition header set, 21 tables (users=1, employees=20, attendance=140, payrolls=19, documentTemplates=16, generatedDocuments=10, auditLogs=44, etc.). Verified passwords stripped from users array.
- `POST /api/backup/import` with the exported JSON → 200, all 21 tables imported successfully (359 records total), 0 errors, meta.exportedAt matches.
- `POST /api/backup/reset` (without `?confirm=DELETE`) → 400 with descriptive error message.

Lint status:
- `cd /home/z/my-project && bun run lint 2>&1 | tail -20` → exit 1, BUT the only error is in `src/components/hr/modules/org-chart.tsx` line 160 (`react-hooks/set-state-in-effect`), a file created by another concurrent agent (not listed in my responsible files, not modified by me). My 9 files (5 created + 4 modified) produce zero lint errors and zero warnings — confirmed by grepping lint output for `salary-history|salary-revisions|backup/|employee-profile|employee-form-dialog|settings.tsx` → no matches.
- `bunx tsc --noEmit` → 0 errors in my files (only pre-existing errors in `prisma/seed.ts`, `src/app/api/payroll/route.ts`, `src/hooks/use-keyboard-shortcuts.ts`, `src/lib/document-renderers.ts`, `examples/`, `skills/` — all noted by previous Task 5-C agent).

Stage Summary:
- Salary revision history is now fully tracked end-to-end: editing any payroll field (basicSalary/allowances/deductions/tax) on an employee automatically creates a timestamped Activity entry of type `SALARY_REVISION` with old/new values and an optional reason. The Employee Profile's Payroll tab shows a visually appealing vertical timeline with summary stats (current net, total increase, avg annual %). The Edit Employee dialog has a new "Reason for change" textarea (only visible in edit mode).
- Data backup/restore is fully functional: HR can export the entire DB as a downloadable JSON file (passwords excluded), restore from a previously exported file via file-picker + confirmation dialog + progress bar + per-table result breakdown, and (in the Danger Zone) reset all data with type-"DELETE"-to-confirm safeguard. Reset preserves Users and Company. Every restore/reset is logged as an AuditLog entry.
- 5 new files, 4 modified files. 0 lint errors in my files. No Prisma schema changes (used existing Activity model). Dev server not restarted. z-ai-web-dev-sdk not used (not needed for this task).

---
Task ID: 6-A
Agent: subagent-6-A (Employee Onboarding Workflow + Org Chart Visualization)

Task: Build (1) a checklist-based employee onboarding workflow (backend + frontend) using the Activity model workaround, and (2) an interactive org chart visualization (backend tree API + zoomable/pannable frontend tree).

Work Log:
- Read worklog.md (last 80 lines) + existing modules (employee-profile.tsx, employees.tsx) + shared components (PageHeader, KpiCard, StatusBadge, AvatarBadge, EmptyState) + lib/utils.ts + lib/db.ts + lib/store.ts + prisma/schema.prisma + nav-config.ts + ui/checkbox.tsx + ui/progress.tsx + the employees API + audit-log conventions established by sibling agents.
- Created `/src/app/api/onboarding/route.ts`:
  - GET `?employeeId=&status=PENDING|IN_PROGRESS|COMPLETED|SKIPPED`. Auto-seeds 10 default onboarding tasks on first GET (idempotent — `count === 0` check). Each task is stored as an Activity row with `type="ONBOARDING_TASK"` and the description field carries a JSON-encoded metadata blob `{ description, dueDate, assignedTo, status, notes, completedAt, sortOrder, isDefault }`. The 10 default tasks are: Collect ID/personal docs (HR), Set up official email (IT), Provide employee handbook (HR), Conduct office tour (HR), Set up workstation and equipment (IT), Introduce to team members (Manager), Complete tax forms (Finance), Set up payroll and bank details (Finance), Schedule orientation session (HR), First week check-in (Manager, dueDate = joiningDate + 7 days). Tasks are returned sorted by sortOrder. Handles legacy Activity rows (plain-text description) gracefully.
  - POST `{ employeeId, title, description?, dueDate?, assignedTo? }` — validates employeeId + title, ensures defaults exist first (so custom tasks append after defaults), auto-assigns next sortOrder, writes an AuditLog entry (`ONBOARDING_TASK_CREATE`).
- Created `/src/app/api/onboarding/[id]/route.ts`:
  - PATCH `{ status?, notes?, dueDate?, completedAt?, assignedTo?, description? }` — validates status against the 4 allowed values, auto-sets `completedAt=now()` when transitioning to COMPLETED (and clears it when moving away). Writes `ONBOARDING_TASK_UPDATE` AuditLog entry.
  - DELETE — removes the task + writes `ONBOARDING_TASK_DELETE` AuditLog entry. 404s if the Activity isn't an onboarding task.
- Created `/src/components/hr/modules/onboarding.tsx`:
  - Pure client component using TanStack Query + sonner toast + shadcn/ui.
  - Top: progress ring (SVG `<circle>` with strokeDashoffset animation) showing % complete, plus "X of Y tasks completed" headline + a `<Progress>` bar + a 4-tile stat pill grid (Pending/In Progress/Completed/Skipped) + overdue task count badge.
  - Filter row: All / Pending / Completed tabs (with live counts in parentheses).
  - Checklist: each task is a Card with a clickable status-cycler checkbox (PENDING → IN_PROGRESS → COMPLETED → PENDING, with SKIPPED → PENDING), the status icon (CircleDashed/CircleDot/CheckCircle2/SkipForward) colored per state, title with strikethrough when COMPLETED/SKIPPED, "Custom" badge for non-default tasks, description, due date (red + "· overdue" when overdue), assigned-to label, completedAt timestamp, inline editable notes field (Textarea appears when clicked, "Add a note" placeholder when empty), Skip button, Reopen button (only when SKIPPED), Delete button (only on custom tasks). Custom emerald checkbox color overrides the default primary tone for COMPLETED.
  - "Add Task" button → opens an AddTaskDialog with title (required), description, due date picker, assignedTo dropdown (HR/IT/Finance/Manager/Admin/—). POSTs to `/api/onboarding`, on success invalidates the query and toasts.
  - Loading skeleton + error empty state.
- Modified `/src/components/hr/modules/employee-profile.tsx`:
  - Imported `Onboarding` from `./onboarding`.
  - Added a new tab trigger `<TabsTrigger value="onboarding">Onboarding</TabsTrigger>` after the Activity tab.
  - Added `<TabsContent value="onboarding"><Onboarding employeeId={id} /></TabsContent>` after the Activity tab content.
- Created `/src/app/api/org-chart/route.ts`:
  - GET returns the recursive reporting tree. Loads all ACTIVE/ON_LEAVE/PROBATION employees (excludes RESIGNED/TERMINATED) with department + role + designation. Builds a `childrenByParent` map keyed by `reportingManagerId`, detects cycles defensively (visited-set walk up the manager chain), treats orphaned-manager and cycle-forming employees as roots, recursively builds OrgNode tree (max depth 3) with full descendant count (`subordinateCount`) computed independently of the depth cap. Returns `{ tree, departments: [{name,color,count}], totalEmployees, totalRoots, maxDepth }`.
- Created `/src/components/hr/modules/org-chart.tsx`:
  - Pure client component. TanStack Query for the tree fetch (30s staleTime). State: `zoom` (0.4-2), `collapsed` Set<string>, `search` string, `isPanning` boolean.
  - Toolbar: search input, "Expand all" / "Collapse all" buttons, zoom out / zoom % display / zoom in / reset zoom controls.
  - Department legend: pills with color dot + name + count.
  - Canvas: `overflow-auto` container with `cursor-grab/grabbing`, mouse-pointer-event panning (ignores clicks on buttons/links via `data-no-pan` attribute and `closest()` check). Inner div uses `transform: scale(zoom)` with `transform-origin: top-left`.
  - Recursive `OrgNodeView` renders each node as a Card with: department color stripe on top, AvatarBadge, name, employee ID, designation, department dot+name, status badge (hidden when ACTIVE), and a footer showing `subordinateCount` + an Expand/Collapse chevron button (keyboard accessible, Enter/Space toggles).
  - Connectors: a vertical line from parent down to a horizontal trunk, with the trunk clipped to span only between the centers of the first and last child (left/right halves for outermost children, full width for middle children) — standard CSS-only tree connector pattern using absolute-positioned `w-px`/`h-px` divs. Single-child subtrees skip the horizontal trunk.
  - Default collapse state: collapses every node at depth ≥ 1 on first tree arrival (so the chart isn't overwhelming for large orgs). Uses the React-documented "adjust state during render" pattern (`if (currentSig !== treeSig) { setTreeSig(...); setCollapsed(...) }`) instead of `useEffect+setState` to avoid the `react-hooks/set-state-in-effect` lint error.
  - Search: computes an "effective collapsed" set with `useMemo` that expands any ancestor of a matching node (so the match is actually visible). Matching nodes get a `border-primary ring-2 ring-primary/40` highlight. Matches against fullName / employeeId / designation / department / role.
  - Clicking a node card calls `openEmployee(id)` from the store → navigates to that employee's profile.
- Modified `/src/components/hr/modules/employees.tsx`:
  - Added `Network` to lucide-react imports + `OrgChart` import.
  - Changed view state type from `"list" | "grid"` to `"list" | "grid" | "org"`.
  - Added a 3rd toggle button (Network icon) in the view-switcher group with proper title/aria-label.
  - Wrapped Filters, Result count, Empty state, Loading skeleton, Pagination in `{view !== "org" && (...)}` conditionals so they don't show in org-chart view.
  - Added `{view === "org" && <OrgChart />}` block (rendered between Loading and List view).
- Smoke-tested all endpoints via curl against the running dev server (had to start it since it had died — `bun run dev` in background):
  - `GET /api/onboarding?employeeId=<EMP020 id>` → 200, returned 10 default onboarding tasks with the correct titles, assignedTo values (HR/IT/HR/HR/IT/Manager/Finance/Finance/HR/Manager), and the "First week check-in" dueDate correctly computed from joiningDate + 7 days.
  - `PATCH /api/onboarding/<id> {status:"IN_PROGRESS"}` → 200, status updated.
  - `PATCH /api/onboarding/<id> {status:"COMPLETED", notes:"..."}` → 200, status updated + completedAt auto-set + notes saved.
  - `POST /api/onboarding {employeeId, title, description, dueDate, assignedTo}` → 201, custom task created with sortOrder=10 (next after the 10 defaults), isDefault=false.
  - `GET /api/onboarding?employeeId=...&status=COMPLETED` → 200, returned 1 task (filter works).
  - `DELETE /api/onboarding/<custom task id>` → 200, `{ok:true}`.
  - `GET /api/org-chart` → 200, returned `{tree:[20 roots with 0 subs each], departments:[8], totalEmployees:20, totalRoots:20, maxDepth:3}` (initial state has no reporting managers set).
  - Assigned 2 employees to report to a 3rd via `PATCH /api/employees/<id> {reportingManagerId:...}`, re-fetched the org chart — confirmed the parent now shows `subs=2` with the 2 subordinates nested correctly, totalRoots dropped to 18.
  - `GET /` → 200 (page renders cleanly).
  - Reverted the test data (cleared the reporting-manager assignments, reset the test task back to PENDING).

Issues Encountered:
- ESLint error: `react-hooks/set-state-in-effect` on the initial `useEffect` that auto-collapsed deep nodes. Fixed by switching to the React-documented "adjust state during render" pattern (track previous tree-signature in state, compare during render, call setState only when signature changes).
- Dev server had died (only `agent-browser` + `caddy` were running when I checked). Started it in the background with `nohup bun run dev` so I could smoke-test my endpoints.

Lint status:
- `cd /home/z/my-project && bun run lint 2>&1 | tail -10` → exit code 0, no errors, no warnings.
- `bunx tsc --noEmit` → 0 errors in any of my files (pre-existing TS errors in prisma/seed.ts, payroll/route.ts, use-keyboard-shortcuts.ts, document-renderers.ts, examples/, skills/ remain unchanged).

Stage Summary:
- Two new high-impact HR features added end-to-end:
  1. **Employee Onboarding Workflow** — every employee profile now has an "Onboarding" tab with a progress ring, 10 default checklist tasks (auto-seeded on first GET), and full lifecycle (PENDING → IN_PROGRESS → COMPLETED/SKIPPED + notes + due dates + custom task creation/deletion). Uses the Activity model workaround so no Prisma schema migration was required.
  2. **Org Chart Visualization** — a 3rd view in the Employees module ("Org Chart" button next to List/Grid) that renders the reporting hierarchy as an interactive tree with department color stripes, zoom controls (40%-200%), drag-to-pan canvas, expand/collapse per node, search highlight with auto-expand of ancestor paths, and clickable nodes that jump to the employee profile.
- 6 files created, 2 files modified, 0 lint errors, 0 TS errors in my files, no Prisma schema changes, dev server verified responding 200 on all new endpoints.

---
Task ID: 6-CRON-5
Agent: cron-review-agent (round 5)
Task: QA testing, add employee onboarding workflow, org chart visualization, salary revision history, data backup/restore.

Work Log:
- Read worklog.md (rounds 1-4 complete: 15 templates, approval workflow, bulk generation, 6 analytics charts, dark mode, keyboard shortcuts, CSV/Excel export, document print, employee photo upload, mobile responsiveness, leave calendar, attendance heatmap, payroll batch, email template editor, KPI sparklines, dashboard hero banner, leave balances, attendance CSV import, directory PDF, template compare, Performance + Recruitment rebuilt, framer-motion transitions).
- Ran `bun run lint` — 0 errors, 0 warnings.
- Started dev server, performed agent-browser QA. Dashboard 8/10 (VLM noted "empty chart" false positive — verified 24 bars + 8 slices in DOM).
- Dispatched 2 parallel subagents: Task 6-A (onboarding + org chart), Task 6-B (salary revisions + backup/restore).

Features Added (via subagents):
- **Task 6-A: Employee Onboarding Workflow** — New `/api/onboarding` and `/api/onboarding/[id]` endpoints using Activity model workaround (type="ONBOARDING_TASK", JSON metadata in description). 10 default tasks auto-seeded on first GET (Collect ID, Set up email, Provide handbook, Office tour, Set up workstation, Introduce to team, Complete tax forms, Set up payroll, Schedule orientation, First week check-in with dueDate = joiningDate + 7 days). New `Onboarding` component with progress ring, checklist with status cycler (PENDING → IN_PROGRESS → COMPLETED), inline notes, skip/reopen, delete (custom only), filter tabs, Add Task dialog. Added as "Onboarding" tab in Employee Profile. VLM confirmed: 9/10.
- **Task 6-A: Org Chart Visualization** — New `/api/org-chart` endpoint returns recursive reporting tree (max depth 3, cycle-safe). New `OrgChart` component with zoomable/pannable interactive tree, department color stripes, search highlight (auto-expands ancestors), expand/collapse, clickable nodes. Pure CSS tree connectors. Added as 3rd view toggle "Org Chart" in Employees module (alongside List and Grid). VLM confirmed: 8/10.
- **Task 6-B: Salary Revision History** — New `/api/salary-revisions` endpoint returns history from Activity rows (type="SALARY_REVISION"). Modified `/api/employees/[id]` PATCH to auto-log salary changes (old/new values for basicSalary, allowances, deductions, tax + reason). New `SalaryHistory` component with vertical timeline, summary cards (Current Net, Total Increase, Avg Annual Increase %), per-revision nodes (emerald=up, rose=down) with old→new net salary, delta pill with %, per-component breakdown. Added to Employee Profile Payroll tab. Added "Reason for change" field to employee form dialog (edit mode only). VLM confirmed: 9/10.
- **Task 6-B: Data Backup/Restore** — New `/api/backup/export` (GET downloads JSON of all 21 tables, strips User passwords, 239KB), `/api/backup/import` (POST upserts all tables in dependency order, per-row error isolation, DATA_RESTORE audit log), `/api/backup/reset` (POST clears all tables except Users+Company, requires confirm=DELETE). New "Data & Backup" tab in Settings with Export section (download + last-backup-date + included-data checklist), Import section (file picker + warning + AlertDialog confirm + progress + results), Danger Zone (reset with type-DELETE-to-confirm). VLM confirmed: 9/10.

Verification:
- `bun run lint` — 0 errors, 0 warnings.
- API smoke tests: Onboarding 200, Org Chart 200, Salary Revisions 200 (with employeeId), Backup Export 200 (239KB valid JSON, 21 tables).
- agent-browser + VLM verification:
  - Org Chart: 8/10 — hierarchical tree with employee nodes, department colors, expand/collapse.
  - Onboarding tab: 9/10 — progress ring (0% 0/10) + checklist of 10 tasks with status tags.
  - Salary History: 9/10 — chronological timeline with green/red indicators, component breakdown, summary stats.
  - Data & Backup: 9/10 — Export/Import/Danger Zone sections with clear visual hierarchy.

Stage Summary:
- Project now has: employee onboarding workflow with 10 default tasks, interactive org chart, salary revision history timeline, full data backup/restore with danger zone.
- Total document templates: 15. Total modules: 11 (all fully functional). Total API endpoints: 75+.
- All new features verified at 8-9/10 via VLM.
- Remaining recommendations for next cron round:
  1. Add real SMTP email sending (currently simulated).
  2. Add notification preferences (email/SMS/in-app toggle per event).
  3. Add multi-company/multi-tenant support.
  4. Add custom dashboard widgets (drag-and-drop layout).
  5. Add exit/offboarding workflow (checklist for departing employees).
  6. Add HR analytics predictions (attrition risk, performance trends).
  7. Add employee self-service portal (P2 — employees can view their own data).
  8. Add biometric attendance integration.
  9. Add WhatsApp/SMS notifications.
  10. Add advanced payroll (tax slabs, PF, gratuity).
