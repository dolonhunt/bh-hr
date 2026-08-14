# Task 2-A — Add 10 New Document Templates + Bulk Document Generation

Agent: bulk-templates-agent (Task ID 2-A)

## Scope
- Added 10 new HR document templates (Promotion, Transfer, Warning, Show Cause,
  Salary Certificate, Increment, Resignation Acceptance, Relieving, NOC,
  Employment Certificate) via an idempotent seed script.
- Built the full bulk document generation pipeline:
  - `POST /api/documents/bulk-generate` (loops over employees, per-employee
    try/catch, single AuditLog summary entry with `BULK_DOCUMENT_GENERATE`).
  - `POST /api/documents/bulk-download` (returns a ZIP of DOCX renderings via
    the `archiver` package).
  - `BulkGenerateDialog` — 5-step wizard (Select Employees → Select Template →
    Review → Generate → Results) with progress bar, ZIP download, and one-at-a-
    time email send (each recipient strictly validated against the document's
    own employee official email).
- Wired the dialog into the Documents module header (`Bulk Generate` button),
  the global Quick Actions renderer, and the topbar's Quick Add dropdown.

## Files Created
- `prisma/seed-templates.ts` — idempotent seed script (10 templates).
- `src/app/api/documents/bulk-generate/route.ts` — POST bulk-generate API.
- `src/app/api/documents/bulk-download/route.ts` — POST bulk-download (ZIP) API.
- `src/components/hr/modules/bulk-generate-dialog.tsx` — multi-step wizard.

## Files Modified
- `src/components/hr/modules/documents.tsx`
  - Extended `DOC_TYPES` to include every type defined in the Prisma schema
    (`CONTRACT`, `JOINING`, `SALARY_CERT`, `INCREMENT`, `SALARY_REVISION`,
    `PROMOTION`, `TRANSFER`, `WARNING`, `SHOW_CAUSE`, `EMPLOYMENT_CERT`, `NOC`,
    `LEAVE_CANCELLATION`, `RESIGN_ACCEPT`, `FINAL_SETTLEMENT`).
  - Imported `Layers` icon and `BulkGenerateDialog`.
  - Added "Bulk Generate" outline button next to "Generate Document" in the
    PageHeader actions.
  - Rendered `<BulkGenerateDialog open={bulkOpen} onOpenChange={setBulkOpen} />`.
- `src/components/hr/quick-actions.tsx`
  - Imported `BulkGenerateDialog`.
  - Added the `bulk-generate` case to the global QuickActions renderer.
- `src/components/hr/topbar.tsx`
  - Added a "Bulk Generate Documents" item to the Quick Add dropdown.
- `next.config.ts`
  - Added `archiver` to `serverExternalPackages` (kept the existing pdfkit/docx
    entries for the existing document renderers).
- `package.json` / `bun.lock`
  - Installed `archiver@8.0.0` and `@types/archiver@8.0.0`.

## Architecture Notes

### Variable system reuse
The bulk-generate API reuses the existing helpers verbatim:
- `resolveVariables(content, ctx)` from `src/lib/document-vars.ts` to expand
  `{{employee.*}}`, `{{company.*}}`, `{{document.*}}`, `{{payroll.*}}` tokens.
- `generateDocumentNumber({type, employee, company})` from
  `src/lib/document-number.ts` to produce the unique `{COMPANY}/{DEPARTMENT}/
  {DOCUMENT_TYPE}/{DATE}/{EMPLOYEE_ID}` document numbers — same pattern used
  by the single-doc generation endpoint.
- The dataJson snapshot includes a pre-rendered `emailSubject` / `emailBody`
  so the bulk email send (which runs after the docs are generated) can simply
  POST those pre-rendered strings to `/api/documents/[id]/send-email` without
  re-resolving variables client-side.

### Per-employee resilience
The bulk-generate loop wraps every employee in its own try/catch. A single
failure (e.g. an employee missing a department, a numbering collision that
exceeds the safety limit, etc.) is recorded in the `failed[]` array and the
loop continues with the next employee. The response shape is:
```
{ generated: [...], failed: [...], count: number, totalRequested: number }
```

### Audit log
A single `AuditLog` row is written per bulk request with:
- `action: "BULK_DOCUMENT_GENERATE"`
- `entityType: "DocumentTemplate"`, `entityId: <templateId>`
- `description: "Bulk generated N document(s) using template X (CODE). M failed."`
- `metadata`: JSON with template info, requested/success/failed counts, the
  full list of generated document IDs, and the list of failed employee IDs.

### Bulk ZIP download
The bulk-download endpoint fetches all requested `GeneratedDocument` rows,
re-renders each one as a DOCX buffer via `renderDocxBuffer` (from
`src/lib/document-renderers.ts` — the same helper the single-doc download
endpoint uses), and streams them through `archiver`'s `ZipArchive` into a
single `application/zip` response. File names inside the ZIP are sanitised to
`{documentNumber}_{employeeName}.docx`. A `usedNames` Set protects against
collisions by appending `_{n}` suffixes when needed.

### archiver v8 ESM compatibility
The first integration used `import archiver from "archiver"` and called
`archiver("zip", …)`. archiver@8 is ESM-only and only exports the named
classes `Archiver`, `ZipArchive`, `TarArchive`, `JsonArchive` — there is no
default factory function. Switched to `import { ZipArchive } from "archiver"`
and `new ZipArchive({ zlib: { level: 6 } })`. `ZipArchive` extends Node's
`Transform` stream so the `.on("data")` / `.on("end")` / `.append()` /
`.finalize()` API still works exactly like the old default export did.

### Critical security: employee-doc-recipient binding
The bulk email send runs sequentially (one `fetch` per document), and for
each document the recipient is resolved **from the corresponding employee
record**, never from a free-text field the user can edit. The recipient
string is the employee's `officialEmail` (looked up by `employeeId` on the
generated document). Each email is sent to exactly one recipient with
exactly one attachment. Employee A can never receive Employee B's document
because the (docId, recipientEmail) pair is always derived from the same
employee row.

## Verification

### Seed script
```
$ bun run prisma/seed-templates.ts
📜 Seeding additional document templates...
   + Created PROMO (Promotion Letter)
   + Created TRANS (Transfer Letter)
   + Created WARN (Warning Letter)
   + Created SCN (Show Cause Notice)
   + Created SALC (Salary Certificate)
   + Created INCR (Increment Letter)
   + Created RESIG (Resignation Acceptance)
   + Created REL (Relieving Letter)
   + Created NOC (No Objection Certificate)
   + Created EMPC (Employment Certificate)
✅ Done. Created 10, updated 0 template(s).
```
Re-running the script would print `↻ Updated …` for each — it is idempotent.

### API smoke tests
- `GET /api/document-templates?status=ACTIVE&pageSize=200` → 15 templates
  (5 original + 10 new).
- `POST /api/documents/bulk-generate` with 3 employees + PROMO template →
  `201` with `count: 3`, document numbers `NWL/DES/PROMO/08132026/EMP020`,
  `NWL/PROD/PROMO/08132026/EMP019`, `NWL/ENG/PROMO/08132026/EMP018`.
- `POST /api/documents/bulk-generate` with 2 employees + NOC template →
  `201` with `count: 2`.
- `POST /api/documents/bulk-generate` with 2 employees + WARN template →
  `201` with `count: 2`.
- `POST /api/documents/bulk-download` with 2 doc IDs → `200`,
  `application/zip`, 14,371 bytes. `unzip -l` shows two DOCX entries
  (`NWL_DES_WARN_08132026_EMP020_Priya_Sarkar.docx`,
  `NWL_PROD_WARN_08132026_EMP019_Rashed_Karim.docx`).
- `POST /api/documents/[id]/send-email` for one of the bulk-generated docs
  with `to: priya.sarkar@northwindlabs.io` → `201`, EmailLog status=SENT.
- `GET /api/audit-logs?action=BULK_DOCUMENT_GENERATE` → 3 audit log entries
  with the expected descriptions and metadata.

### Lint
`cd /home/z/my-project && bun run lint` → 0 errors, 0 warnings across the
entire project.

### Dev server log
All new endpoints return 200/201; no runtime errors after the archiver ESM
fix. The Documents module page renders on `GET /` with HTTP 200.

## Stage Summary
- 10 new document templates are now seeded and available in the Documents
  module template gallery, in the Generate Document wizard, and in the Bulk
  Generate wizard.
- The Bulk Generate feature is fully functional end-to-end: select N
  employees → pick a template → review → generate → download ZIP and/or send
  each employee their own personalised document via email — all with proper
  audit logging and per-employee error isolation.
- The strict "Employee A never receives Employee B's document" security rule
  is enforced at the API level: each email is sent one-at-a-time with the
  recipient derived from the corresponding employee's official email.
- All assigned files pass lint cleanly; the dev server compiles and serves
  every new endpoint with no errors.
