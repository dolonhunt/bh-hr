# Task 4-B — Payroll Batch Creation + Email Template Editor

## File Inventory

### New files (4)
- `/home/z/my-project/src/app/api/payroll/batch-create/route.ts` — POST endpoint for batch payroll creation.
- `/home/z/my-project/src/app/api/email-templates/route.ts` — GET (list) + POST (convenience update) for email templates.
- `/home/z/my-project/src/app/api/email-templates/[id]/route.ts` — GET + PATCH for a single template's email fields.
- `/home/z/my-project/src/components/hr/modules/payroll-batch-dialog.tsx` — 3-step wizard dialog.
- `/home/z/my-project/src/components/hr/modules/email-template-editor.tsx` — full-section email editor + live preview.

### Modified files (5)
- `/home/z/my-project/src/components/hr/modules/payroll.tsx` — added `Batch Create` button + `<PayrollBatchDialog>` mounting; imported `Layers` icon + `PayrollBatchDialog`.
- `/home/z/my-project/src/components/hr/quick-actions.tsx` — added `payroll-batch-create` case → mounts `<PayrollBatchDialog>`.
- `/home/z/my-project/src/components/hr/topbar.tsx` — added "Batch Create Payroll" to the Quick Add dropdown (key `payroll-batch-create`); swapped generic `Plus` icons for task-specific icons (`FileText`, `FileStack`, `Wallet`, `Layers`, `CalendarPlus`).
- `/home/z/my-project/src/components/hr/modules/settings.tsx` — added new "Email Templates" tab between "Email Settings" and "Document Numbering"; imports `EmailTemplateEditor`; `EmailTemplatesTab()` thin wrapper renders the editor.
- `/home/z/my-project/src/app/api/settings/test-email/route.ts` — extended to accept optional `subject` + `body` (so the Email Template Editor's "Send Test Email" button sends the rendered subject/body instead of a hardcoded test string). Backward-compatible: if `subject`/`body` are absent, falls back to the original defaults.

## Backend — `/api/payroll/batch-create` (POST)

- **Body**: `{ employeeIds: string[], month: string }` (month = `YYYY-MM`).
- **Validation**: 400 if `employeeIds` not a non-empty array, 400 if `month` doesn't match `^\d{4}-\d{2}$`, 400 if more than 500 employees per request.
- **Pre-load existing**: single `payroll.findMany({ where: { payrollMonth, employeeId: { in: [...] } } })` to build a `Set<string>` of employeeIds that already have payroll for `month`. Lets us skip in O(1) instead of N queries.
- **Per-employee loop** (try/catch):
  - If already in `existingSet` → push to `skipped` with `reason="Payroll already exists for this month"` (best-effort name lookup).
  - Otherwise `employee.findUnique` → if missing, push to `failed`.
  - Compute `basic + allowances - deductions - tax` as `netSalary`.
  - `payroll.create` with `status="DRAFT"`, no paymentDate, no note.
  - `activity.create` with `type="CREATED"`, `title="Payroll Created (Batch)"`, description mentioning batch + month.
  - Push to `created`.
- **Single AuditLog**: `action="PAYROLL_BATCH_CREATE"`, `entityType="Payroll"`, description `Batch created {N} payroll record(s) for {month}. {M} skipped, {K} failed.`, metadata JSON with month + counts + employeeId lists.
- **Returns**: `{ created, skipped, failed, count, totalRequested }`, HTTP 201.

## Frontend — `payroll-batch-dialog.tsx` (3-step wizard)

**Step 0 — Select Employees**:
- Searchable multi-select reusing the bulk-generate-dialog pattern (search input + dept filter + checkbox list + dept quick-add buttons + "Select all visible" master checkbox + selected-count Badge).
- Each row shows AvatarBadge + name + employeeId + designation · department + email on md+ screens.
- Up to 6 department quick-add buttons ("+ {Department}").

**Step 1 — Select Month + Preview**:
- `<Input type="month">` (defaults to current month).
- Reads selected-count box.
- **Skipped preview query**: TanStack Query fetches `/api/payroll?payrollMonth={month}&pageSize=500` to find existing payroll rows for the chosen month; we filter the selected employees into two lists: `selectedToCreate` and `selectedAlreadyExist`.
- Highlight banner: "Will create payroll records for **{N}** employees for **{Month Year}**" + amber alert when some will be skipped.
- Two separate scrollable lists: "Will create DRAFT payroll — N" (emerald border) and "Already have payroll for {Month Year} (will skip) — M" (amber border).
- "Create" button is disabled when `selectedToCreate.length === 0` or the preview query is still loading.

**Step 2 — Create (progress + results)**:
- On entering step 2, fires POST `/api/payroll/batch-create` with `employeeIds: selectedToCreate.map(e => e.id)` and `month`.
- Animated `Progress` bar (5% → 90% in 250ms ticks) while waiting for the server.
- Toast: `Created {N} payroll record(s), skipped {M} existing{, K failed}.`
- Results panel: emerald/amber banner depending on whether failures occurred.
- **3 summary chips**: Created / Skipped / Failed counts in colored cards.
- Three scrollable lists: created (with avatar + name + dept + net + status badge), skipped (with amber alert icon + reason), failed (with rose X icon + error message).
- "Go to Payroll" button → closes dialog + invalidates `payroll` query (caller's `onOpenChange` also invalidates).

## Backend — `/api/email-templates` (GET + POST) + `/api/email-templates/[id]` (GET + PATCH)

**GET `/api/email-templates`**:
- `?includeEmpty=1` → returns ALL non-archived templates (even ones with no email configured).
- Default → only returns templates where `emailSubject` OR `emailBody` is non-null.
- `?status=` → filter by status.
- Returns: `{ items: [...], total }` where each item has `id, name, code, type, category, description, status, subject, content, emailSubject, emailBody, version, updatedAt`.

**POST `/api/email-templates`** (convenience update):
- Body: `{ templateId, emailSubject?, emailBody? }`.
- Updates only the email fields on an existing DocumentTemplate (refuses to create new templates — those must go through `/api/document-templates` POST).
- AuditLog: `action="EMAIL_TEMPLATE_UPDATE"`.

**GET `/api/email-templates/[id]`**: returns the same fields as GET list but for a single template.

**PATCH `/api/email-templates/[id]`**:
- Body: `{ emailSubject?, emailBody? }` — only fields explicitly sent are touched (subject-only, body-only, or both).
- Empty/whitespace values are stored as `null` (so callers can clear a field).
- AuditLog: `action="EMAIL_TEMPLATE_UPDATE"`.

## Frontend — `email-template-editor.tsx`

Full-section editor (rendered inline in Settings → Email Templates tab, NOT a dialog).

**Layout** (responsive `grid lg:grid-cols-3 gap-4` + full-width preview below):
- **Left column** (`lg:col-span-1`): Templates list Card with search input, scrollable list of templates with "Email ready" / "No email" badges. Auto-selects first template on mount.
- **Right column** (`lg:col-span-2`): Editor Card with:
  - Header showing selected template name + code + type + category + "Unsaved changes" amber badge when dirty.
  - **Subject input** + **Body textarea** (`font-mono text-xs leading-relaxed resize-y`, 14 rows) on the left (md:col-span-2).
  - **Variables sidebar** on the right (md:col-span-1) — sticky, scrollable, 4 groups (Employee / Company / Document / Payroll) with clickable emerald chips. Each chip inserts `{{token}}` at the cursor position of whichever field was last focused (subject input OR body textarea). Uses `requestAnimationFrame` to restore cursor position after insertion.
  - Action bar with "Reset" (revert to last saved), "Send Test Email" (opens a small modal with To field + preview), and "Save" (PATCH the template). Save button disabled when not dirty or while saving.
- **Live Preview Card** (full width below the editor grid): Renders an email-like UI with `To:` (sample employee's official email), `Subject:` (rendered subject with variables resolved using sample employee + company), and `Body:` (rendered body, whitespace preserved via `whitespace-pre-wrap`). Updates in real-time on every keystroke.
- **Test Email modal**: simple overlay div (not the shadcn Dialog because we already render inside a Settings tab) with `To:` input (defaults to sample employee email), preview of subject + body length, Send button. Calls `/api/settings/test-email` with `{ to, subject, body }`.

**Sample data**:
- Loads first employee via `/api/employees?pageSize=1`.
- Loads company via `/api/company`.
- Uses both to render the live preview.

**Variable resolver** (`resolvePreview`): mirrors `/lib/document-vars.ts` server-side resolver. Tokens: `employee.name/id/role/designation/department/email/phone/joining_date/salary/address`, `company.name/legal_name/address/email/phone/website`, `document.number/date/issue_date`, `payroll.month/basic_salary/allowances/deductions/tax/net_salary`. Document + payroll tokens use sensible sample values (today's date, `DOC/SAMPLE/0001`, current month, etc.).

## Settings integration

- Added `FileText` to the icon imports.
- Added `email-templates` tab to `TABS` array (between `email` and `numbering`).
- `EmailTemplatesTab()` is a one-line wrapper returning `<EmailTemplateEditor />`.
- `{tab === "email-templates" && <EmailTemplatesTab />}` added to the tab content switch.

## Topbar / Quick Add integration

- Imported `Layers, Wallet, FileStack, FileText, CalendarPlus` icons.
- Added `<DropdownMenuItem onClick={() => setQuickAction("payroll-batch-create")}>` with `<Layers />` icon and "Batch Create Payroll" label.
- Also swapped the generic `Plus` icons on the existing Quick Add items for task-specific icons (Search→FileText for Generate Document, Plus→FileStack for Bulk Generate, Plus→Wallet for Create Payslip, Plus→CalendarPlus for Add Attendance).
- `quick-actions.tsx` imports `PayrollBatchDialog` and mounts it on `quickAction === "payroll-batch-create"`.

## test-email route change (additive)

The existing `/api/settings/test-email` route was hardcoding `"Test Email from TeamHub HR"` as subject and a generic body. Extended to accept optional `subject` and `body` from the request body — if provided (and non-empty), they override the defaults. This is backward-compatible: existing callers that only send `{ to }` keep working with the generic test message. The Email Template Editor's "Send Test Email" button passes `{ to, subject: renderedSubject, body: renderedBody }` so the test email actually shows the rendered template content.

## Verification

- `cd /home/z/my-project && bun run lint 2>&1 | tail -10` → **0 errors, 0 warnings** (clean exit code 0).
- `bunx tsc --noEmit` → 0 errors in any of my created/modified files. The errors that DO appear are all in pre-existing files I did NOT touch (noted in worklog Task 3-B): `src/app/api/payroll/route.ts` (lines 64, 77-80), `src/lib/document-renderers.ts` (line 186), `src/hooks/use-keyboard-shortcuts.ts` (line 45), plus `prisma/seed.ts`, `examples/websocket/*`, `skills/*` which are also pre-existing.
- Dev server log ends with `✓ Compiled in 767ms` — successful compile, no runtime errors.

## Color palette compliance

No indigo or blue colors introduced. Used:
- `primary` (emerald via shadcn theme) for active states, accents, icons.
- `emerald-500/10` + `emerald-600` for success states (created list, "Email ready" badge, summary Created chip).
- `amber-500/10` + `amber-600` / `amber-700` for skipped/unsaved states.
- `rose-500/10` + `rose-600` for failures (Failed chip, error list).
- `muted` + `muted-foreground` for inactive/secondary UI.

## Files NOT touched (per assignment constraints)

- `prisma/schema.prisma` — untouched. The new email-templates endpoints reuse `DocumentTemplate.emailSubject` + `DocumentTemplate.emailBody` fields that already exist. No schema migration required.
- z-ai-web-dev-sdk — not used anywhere in my new files (kept server-side only, per the global constraint).
- Existing payroll/payslip/attendance/leave/etc. modules — only `payroll.tsx` was touched (added Batch Create button + dialog mount).
