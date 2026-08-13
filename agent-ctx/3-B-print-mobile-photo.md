# Task 3-B — Document Preview Print + Mobile Responsiveness + Employee Photo Upload

**Agent:** subagent-3-B
**Task scope:**
1. Add a Print button to the document preview dialog (Documents module), the Generate Document wizard's preview step, the Payslip dialog's success state and preview sub-dialog, and the Template Preview dialog. Centralize the print logic in a shared `printDocument` helper.
2. Audit every HR module at 375px width and fix layout issues (KPI grids, filter bars, table columns, tab lists, dialog widths, action buttons).
3. Replace the URL-only Photo field in the Employee Form Dialog with a proper file upload (AvatarBadge preview + Upload Photo button + Remove button + 500 KB size guard).

## Files created
- `src/lib/print.ts` — Shared `printDocument({ title, html, docNumber })` helper that opens a new browser window, writes a print-friendly HTML scaffold (serif font, `@page { margin: 2cm }`, max-width 800px body, 2cm page margins, table/th/hr/heading styles, hidden `.no-print` class), writes the document title + doc-number header, fires `window.print()` via `requestAnimationFrame` (twice, to allow layout + image paint), and registers `window.onafterprint` to auto-close the new tab once the user dismisses the print dialog. Returns `true` on success, `false` if the popup was blocked. Includes an `escapeHtml` helper to safely inject the title/doc-number into the page header.

## Files modified

### Documents module
- `src/components/hr/modules/documents.tsx`
  - Imported `Printer` from lucide-react + `printDocument` from `@/lib/print`.
  - `DocumentPreviewDialog`: Replaced the simple `DialogTitle` + subtitle layout with a flex header containing the title (truncated) + subtitle on the left and a Print button on the right. The Print button calls `printDocument({ title: preview.title ?? preview.documentNumber, html: preview.content, docNumber: preview.documentNumber })`. Dialog width changed to `max-w-[95vw] sm:max-w-4xl` and padding to `px-4 sm:px-6` so the preview never overflows at 375px.
  - `TemplatePreviewDialog`: Same flex-header + Print button treatment (uses `template.name` and `template.code` as title/doc number).
  - `DirectSendEmailDialog`: Width changed to `max-w-[95vw] sm:max-w-2xl`.
  - Tabs: `TabsTrigger` labels get `text-xs sm:text-sm` so they fit on mobile; the 5th tab (Approval Queue) gets `col-span-2 md:col-span-1` so it doesn't share a row on tiny screens.
  - KPI grid: Added `sm:gap-3` alongside existing `gap-3` (kept the `grid-cols-2 md:grid-cols-3 lg:grid-cols-5`).

### Generate Document dialog
- `src/components/hr/modules/generate-document-dialog.tsx`
  - Imported `Printer` + `printDocument`.
  - Dialog width: `max-w-[95vw] sm:max-w-4xl`, header padding `px-4 sm:px-6`.
  - Stepper container now has `overflow-x-auto pb-1` so the 6-step indicator scrolls on narrow viewports.
  - Step 4 (Preview): Replaced single-button header with a flex layout containing a Print button (calls `printDocument` with the in-memory preview data) and the existing Refresh button.
  - Step 5 (Generated): Action grid changed from `grid-cols-1 md:grid-cols-3` to `grid-cols-2 md:grid-cols-4` and added a Print button (uses `generatedDoc.content`) alongside Preview/DOCX/PDF.
  - Dialog footer: `px-4 sm:px-6 py-4 justify-between gap-2 flex-wrap` so Cancel/Back/Next wrap properly on narrow screens.
  - ScrollArea inner padding: `px-4 sm:px-6 py-5`.

### Payslip dialog
- `src/components/hr/modules/payslip-dialog.tsx`
  - Imported `Printer` + `printDocument`.
  - Main dialog, preview sub-dialog, and email sub-dialog: all changed from fixed `max-w-lg` / `max-w-2xl` to `max-w-[95vw] sm:max-w-lg` / `sm:max-w-2xl`.
  - Success-state action grid: rearranged to a 2-column grid (Preview / Print / DOCX / PDF / Send Email spanning both columns).
  - Preview sub-dialog header: Added a flex header with Print button next to the title.

### Employee Form dialog
- `src/components/hr/modules/employee-form-dialog.tsx`
  - Imported `useRef`, `Upload`, `X`, `AvatarBadge`. Added `MAX_PHOTO_BYTES = 500 * 1024` constant.
  - Added `photo: ""` to both the initial state object and the reset block.
  - Added `fileInputRef` (hidden `<input type="file" accept="image/*">`).
  - Added `handlePhotoSelect(file)` that:
    - Rejects non-image MIME types with a toast.
    - Rejects files > 500 KB with a toast showing the actual file size.
    - Otherwise reads the file as a data URL via `FileReader.readAsDataURL` and stores it in `form.photo`.
  - Added `clearPhoto()` that resets `form.photo` to `""` and clears the input's value.
  - Inserted a prominent Photo upload card at the top of the Personal tab (before the Full Name field): rounded-xl bordered card containing an XL `AvatarBadge` (uses `form.fullName` so the initials fallback updates live) + a stack with the "Profile Photo" label, size hint, and Upload Photo / Remove buttons.
  - Dialog width `max-w-[95vw] sm:max-w-3xl`, header padding `px-4 sm:px-6 py-4`, footer padding `px-4 sm:px-6 py-4`.

### Shared KpiCard
- `src/components/hr/shared/kpi-card.tsx`
  - Card padding: `p-3 sm:p-5` (was `p-5`).
  - Value font size: `text-lg sm:text-[26px]` (was `text-[26px]`) with `truncate` to prevent overflow at 375px when the value is a long currency string.
  - Label font: `text-[10px] sm:text-[11px]` with `truncate`.
  - Icon container: `size-9 sm:size-11`, icon `size-4 sm:size-5`.
  - Gap between content and icon: `gap-2 sm:gap-3`.

### Topbar
- `src/components/hr/topbar.tsx`
  - Quick Add button: replaced the single `hidden sm:inline-flex` button (which was completely hidden on mobile) with a single trigger that always renders. The "Quick Add" label and chevron are wrapped in `<span className="hidden sm:inline">` so on mobile only the `+` icon shows, while desktop retains the full button.

### Dashboard
- `src/components/hr/modules/dashboard.tsx`
  - PageHeader actions: "Generate Document" button gets `hidden sm:inline-flex` (mobile users have the Quick Add dropdown); "Add Employee" button's label becomes "Add" on mobile via `hidden sm:inline` / `sm:hidden` spans.
  - KPI grid: `gap-3 sm:gap-4` (was `gap-4`).
  - Attendance chart card header: legend dots shrink to `text-[10px] sm:text-[11px]` and `gap-2 sm:gap-3` so all four legend items fit at 375px.

### Employees
- `src/components/hr/modules/employees.tsx`
  - PageHeader action button: "Add Employee" → "Add" on mobile.
  - List table columns: Employee ID, Department, Designation, Joining Date, Salary are now `hidden md:table-cell` / `hidden lg:table-cell` so on mobile the table only shows Employee + Status + Actions. Added a small inline sub-line under the employee name on mobile (`md:hidden`) showing `employeeId · department`.

### Attendance
- `src/components/hr/modules/attendance.tsx`
  - PageHeader action button: "Add Attendance" → "Add" on mobile.
  - KPI grid: `gap-3 sm:gap-4`.
  - Table columns: Date, Check Out, Hours, Late, Overtime are now `hidden sm:table-cell` / `hidden md:table-cell` / `hidden lg:table-cell`. On mobile, the date appears as a sub-line under the employee name.

### Leave
- `src/components/hr/modules/leave.tsx`
  - PageHeader action button: "Add Leave" → "Add" on mobile.
  - KPI grid: `gap-3 sm:gap-4`.
  - Tab list: wrapped in a `<div className="overflow-x-auto pb-1 -mx-1 px-1">` with `TabsList` set to `flex w-max` so all 4 tabs scroll horizontally on mobile.
  - Table columns: Leave Type, End, Reason, Applied are now `hidden md:table-cell` / `hidden sm:table-cell` / `hidden lg:table-cell`. On mobile, the leave type appears as a sub-line with a color dot under the employee name.
  - View + Decision sub-dialogs: `max-w-[95vw] sm:max-w-lg` / `sm:max-w-md`.

### Payroll
- `src/components/hr/modules/payroll.tsx`
  - PageHeader action button: "Create Payroll" → "Create" on mobile.
  - KPI grid: `gap-3 sm:gap-4`.
  - (Filter bar already used `flex-col md:flex-row` and the table already had `overflow-x-auto`.)

### Audit
- `src/components/hr/modules/audit.tsx`
  - Result-count row: `flex flex-col sm:flex-row sm:items-center justify-between gap-2` (was just `flex items-center justify-between`) so the "Clear filters" button wraps below the count on mobile.

### Reports
- `src/components/hr/modules/reports.tsx`
  - Generate Report sub-dialog: `max-w-[95vw] sm:max-w-md` (was `max-w-md`).
  - (KPI grid and chart grid were already responsive.)

### Settings
- `src/components/hr/modules/settings.tsx`
  - Tab nav container: added `-mx-1 px-1 md:mx-0 md:px-0` so the horizontal scroll snaps nicely to the card edge on mobile.
  - Tab buttons: added `flex-shrink-0` to the icon so it doesn't get squished.
  - Organization form: `grid grid-cols-2 gap-4` → `grid grid-cols-1 sm:grid-cols-2 gap-4`, and `col-span-2` for full-width fields → `sm:col-span-2`.
  - Email Settings form: `grid grid-cols-2 gap-4` → `grid grid-cols-1 sm:grid-cols-2 gap-4`.
  - Document Numbering form: same change.
  - Generic master-data dialog (`max-w-lg`): `max-w-[95vw] sm:max-w-lg` + grid changed to `grid-cols-1 sm:grid-cols-2` + `col-span-2` → `sm:col-span-2`.
  - Test Email dialog (`max-w-md`): `max-w-[95vw] sm:max-w-md`.

### Employee Profile
- `src/components/hr/modules/employee-profile.tsx`
  - Header bar (Back / Edit / Generate Document / Create Payslip): changed from `flex items-center justify-between` to `flex flex-col sm:flex-row sm:items-center justify-between gap-3`. Action buttons show only an icon on mobile ("Edit", "Document", "Payslip" instead of "Edit", "Generate Document", "Create Payslip").
  - Profile card padding: `p-4 sm:p-6` (was `p-6`).
  - Tab list: replaced `grid w-full grid-cols-3 md:grid-cols-8 h-auto` (which was 3-col on mobile and forced 8-col on md+ — making 8 tabs squish into a too-narrow row) with an `overflow-x-auto pb-1 -mx-1 px-1` wrapper + `TabsList` set to `flex w-max` so all 8 tabs scroll horizontally on any viewport.
  - Overview KPI cards: `gap-3 sm:gap-4` (was `gap-4`).

## Verification
- `cd /home/z/my-project && bun run lint 2>&1 | tail -20` → no errors, no warnings.
- `bunx tsc --noEmit` → no errors in any of the modified files (the remaining errors are pre-existing in `prisma/seed.ts`, `src/app/api/payroll/route.ts`, `src/lib/document-renderers.ts`, `examples/`, and `skills/` — none of which I touched).
- `curl http://localhost:3000/` → 200.
- `curl http://localhost:3000/api/documents?pageSize=1` → 200.
- `curl http://localhost:3000/api/employees?pageSize=1` → 200.
- Dev server log: clean compile, no runtime errors after all changes.

## Notes for downstream agents
- The `printDocument` helper is the canonical way to print any HTML fragment in this app. Pass the title (shown in the print-page header), the HTML body, and an optional doc-number (also shown in the header). The helper handles HTML escaping of the title/doc-number, but **not** of the body HTML — that is intentional, because the body comes from already-rendered templates.
- The 500 KB photo limit is enforced client-side only. The schema field is `String` (base64 data URL), so technically larger images would fit, but large base64 strings bloat the SQLite DB row size and slow down every employees list query. The 500 KB limit is a UX/data-size tradeoff, not a hard schema constraint.
- The KpiCard value now uses `truncate` — if you pass a very long string value (e.g. a multi-line description), it will be cut off. All current call sites pass numbers or single-line currency strings, so this is safe.
