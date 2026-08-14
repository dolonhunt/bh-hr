# Task 5-A — Leave Balance Tracking + Attendance CSV Import

**Agent:** 5-A-leave-balance-attendance-import
**Scope:** Leave Balance tracking + Attendance CSV Import (new API + 2 new components + 2 module integrations)

## Files Created
- `src/app/api/leave/balances/route.ts` — GET endpoint for per-employee × per-leave-type balance rollup
- `src/app/api/attendance/import/route.ts` — POST endpoint that parses a CSV file and upserts attendance records
- `src/components/hr/modules/leave-balances.tsx` — Balances view (KPIs + filterable table with usage bars)
- `src/components/hr/modules/attendance-import-dialog.tsx` — 4-step wizard (Upload → Preview → Import → Results)

## Files Modified
- `src/components/hr/modules/leave.tsx` — added "Balances View" toggle (3rd view alongside List/Calendar); renders `<LeaveBalances />` when active
- `src/components/hr/modules/attendance.tsx` — added "Import CSV" outline button in PageHeader actions; renders `<AttendanceImportDialog />`

## Work Log

### Leave Balance API (`/api/leave/balances`)
- GET handler with optional `?employeeId=<cuid>` query param.
- Loads all ACTIVE `LeaveType`s and (optionally filtered) `Employee`s.
- Loads all APPROVED + PENDING `LeaveRequest`s for those employees, projecting only `(employeeId, leaveTypeId, status, days)`.
- Aggregates in-memory via `Map<"${empId}|${ltId}", { used, pending }>` — O(n) over leave requests, no per-row DB queries.
- Builds a flat items list: one entry per (employee × leave type) — `allocated` from `LeaveType.defaultDays`, `used` from APPROVED sums, `pending` from PENDING sums, `remaining = allocated - used - pending`.
- All numeric fields rounded to 2 decimals via `round2()` helper.
- Returns `{ items: [...] }` with: `employeeId, employeeCode, employeeName, employeePhoto, leaveTypeId, leaveTypeName, leaveTypeColor, allocated, used, pending, remaining`.

### Leave Balance Frontend (`leave-balances.tsx`)
- TanStack Query (`["leave-balances"]`) + `["leave-types"]` for the filter dropdown.
- **KPI cards (4):** Total Allocated (sum), Total Used (sum), Total Remaining (sum), Lowest Balance (employee + leave type with smallest `remaining`, only counting leave types where `allocated > 0` so unpaid types don't dominate).
- **Filters:** leave type `Select` + search `Input` matching employee name OR employee code.
- **Table columns:** Employee (AvatarBadge + name + mono code), Leave Type (color dot + name), Allocated, Used, Pending (amber when > 0), Remaining (color-coded), Usage bar (`Progress` component with % label).
- **Color coding on `remaining`:** emerald (>50% of allocated), amber (20-50%), rose (<20%). Excludes zero-allocated rows (they show as muted).
- **Usage bar color:** emerald (<50%), amber (50-80%), rose (≥80%).
- Legend below the table explaining remaining color tiers + the note that pending days count against remaining.
- Loading skeleton (8 rows), empty state with contextual message based on whether filters are active.

### Leave Module Integration (`leave.tsx`)
- `View` type extended to `"list" | "calendar" | "balances"`.
- Imported `Scale` icon + `LeaveBalances` component.
- Added 3rd toggle button "Balances View" with the same visual treatment as List/Calendar.
- Renders `<LeaveBalances />` when `view === "balances"`. The KPI cards + view toggle still appear above; the existing List/Calendar sections remain unchanged.

### Attendance CSV Import API (`/api/attendance/import`)
- POST handler accepting `multipart/form-data` with a `file` field.
- **Validation:** file must be a `.csv` (by extension or `text/csv` MIME); file must be non-empty; CSV must have a header row with all 5 required columns (case-insensitive match: `employee id`, `date`, `check in`, `check out`, `status`).
- **CSV parser:** minimal RFC-4180-style parser handling quoted fields with escaped `""` — no external dependency. Pads short rows with empty strings.
- **Per-row processing:**
  - Looks up employee by `employeeId` (cached via `Map` after a single `findMany` with `employeeId: { in: [...] }`).
  - Parses date (`YYYY-MM-DD` primary, `YYYY/MM/DD` and `DD-MM-YYYY` fallbacks) — uses local-timezone `Date` construction.
  - Parses check-in/out times (`HH:MM`, `HH:MM:SS`, or `H:MM AM/PM`) and combines with the parsed date to form full timestamps.
  - Auto-derives `status` if missing (LATE if check-in > 09:15, else PRESENT; ABSENT if no check-in).
  - Validates `status` against `PRESENT | ABSENT | LATE | LEAVE | HALF_DAY | REMOTE | HOLIDAY`.
  - Computes `workingHours`, `late`, `lateMinutes`, `overtime` using the **exact same logic as `POST /api/attendance`** (9h threshold for overtime, 09:15 cutoff for late).
  - Finds existing record for (employee, calendar day) via `findFirst` with date range `gte` day-start / `lte` day-end. If found → `update`, else `create`. Counts `imported` (new) vs `updated` (existing).
- **Per-row error isolation:** any failure (missing employee, bad date, bad time, unknown status, DB error) is recorded as `{ row, error }` and the loop continues — batch never aborts.
- **AuditLog:** writes a single `ATTENDANCE_IMPORT` entry after processing with description `"Imported {imported} attendance record(s), updated {updated}, failed {failed}."` and a JSON metadata blob. Best-effort — failures here don't break the response.
- Returns `{ imported, updated, failed, errors: [{ row, error }] }`.

### Attendance Import Dialog (`attendance-import-dialog.tsx`)
- Props: `open`, `onOpenChange`, optional `onImported` callback.
- **4-step wizard** with a step indicator at the top showing progress (Upload → Preview → Import → Results).
- **Step 1 (Upload):**
  - Drag-and-drop zone + click-to-browse hidden `<input type="file" accept=".csv">`.
  - "Download Template" button — generates a sample CSV with 5 rows (PRESENT, LATE, ABSENT, HALF_DAY examples) using the shared `downloadBlob` helper.
  - Information panel listing expected columns + formats.
- **Step 2 (Preview):**
  - Client-side CSV parser (mirrors server logic — handles quoted fields, validates headers).
  - If headers are missing/malformed: shows a rose-bordered error card listing each format error and disables Import.
  - If valid: shows a scrollable preview table of the first 10 rows (with row numbers, employee ID, date, check-in, check-out, status).
  - Shows the file name + size; "Choose another file" button to reset.
- **Step 3 (Importing):**
  - Indeterminate progress bar with fake tick (5% → 90%) + spinner.
  - POSTs `FormData` to `/api/attendance/import` (no `Content-Type` header — browser sets the multipart boundary).
  - On success → step 4. On failure → back to preview with error message + toast.
- **Step 4 (Results):**
  - 3 stat cards: Imported (emerald), Updated (amber), Failed (rose).
  - Error table (row + error message) — only shown if `failed > 0`. Scrollable (`max-h-60 overflow-y-auto`).
  - Success banner if `errors.length === 0`.
- Triggers `onImported` callback (which invalidates `["attendance"]` and `["attendance-heatmap"]` queries) so the parent table + heatmap refresh.
- Resets state when the dialog closes.

### Attendance Module Integration (`attendance.tsx`)
- Imported `UploadCloud` icon + `AttendanceImportDialog` component.
- Added `importOpen` state.
- New outline "Import CSV" button in PageHeader actions, between `ExportButton` and "Add Attendance". Responsive label (full on `sm+`, "Import" on mobile).
- Renders `<AttendanceImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={...} />` at the bottom — invalidates `["attendance"]` and `["attendance-heatmap"]` queries on successful import.

## Verification

### Lint
```
$ cd /home/z/my-project && bunx eslint <my 6 files>
exit:0
```
All 6 files I created/modified pass ESLint cleanly with 0 errors, 0 warnings.

(Pre-existing lint errors exist in `src/components/hr/modules/template-compare-dialog.tsx` — that file was created by a parallel agent and is NOT part of my task scope.)

### TypeScript
```
$ bunx tsc --noEmit
```
0 errors in any of my 6 files (no `leave-balances`, `attendance-import-dialog`, `leave/balances`, `attendance/import`, `modules/leave.tsx`, or `modules/attendance.tsx` matches).

### API Smoke Tests
After restarting the dev server (`bun run dev` died mid-session, restarted via detached subshell on port 3000):

1. **`GET /api/leave/balances`** → 200. Returns 7 leave types × 20 employees = 140 items. Spot-checked EMP001 (Arif Hossain):
   - Annual Leave: allocated=20, used=0, pending=2, remaining=18 ✓ (matches the PENDING leave request Arif has from earlier worklog rounds).
   - Sick Leave: allocated=12, used=0, pending=0, remaining=12 ✓
   - All 7 leave types present with correct allocations from `LeaveType.defaultDays`.

2. **`GET /api/leave/balances?employeeId=cmss1mi1u0011slbkbttb53zi`** → 200. Returns exactly 7 items (just Arif's balances).

3. **`POST /api/attendance/import`** with a 3-row CSV (EMP001 PRESENT, EMP002 LATE, BAD_EMP):
   ```json
   {"imported":0,"updated":2,"failed":1,"errors":[{"row":4,"error":"Unknown employee ID \"BAD_EMP\"."}]}
   ```
   - EMP001 + EMP002 records for 2026-08-13 were updated (already existed from seed data).
   - BAD_EMP correctly failed per-row without aborting the batch.
   - Verified the actual DB state: EMP001 now has checkIn=09:05, checkOut=18:15, status=PRESENT, workingHours=9.17h. EMP002 has checkIn=09:30, checkOut=18:00, status=LATE, workingHours=8.5h, lateMinutes=15 (15 min past 09:15 cutoff). ✓
   - **AuditLog entry created:** action=`ATTENDANCE_IMPORT`, description=`"Imported 0 attendance record(s), updated 2, failed 1."` ✓

### Issues Encountered
- The Next.js dev server died at some point during the session (port 3000 stopped listening). Restarted it via a detached subshell `(bun run dev > /tmp/dev-5a.log 2>&1 &)` so it would survive the calling shell's exit. After restart, all endpoints responded 200 with the expected JSON.
- The pre-existing lint errors in `template-compare-dialog.tsx` (2 errors, `react-hooks/set-state-in-effect`) are from a parallel agent's work — NOT my files.

## Stage Summary
- **Leave module** now has 3 views: List (existing), Calendar (round 4-A), and **Balances** (new). The Balances view shows every employee × leave-type combination with allocated/used/pending/remaining days, a usage progress bar, and color-coded remaining thresholds (green/amber/red). KPI cards summarise totals and surface the lowest balance.
- **Attendance module** now supports bulk CSV import. HR can download a template, drag-and-drop a CSV, preview the first 10 rows with format validation, import with a progress bar, and see per-row error details. The import auto-computes working hours, late minutes, and overtime from check-in/out times (mirroring the existing single-record creation logic), updates existing records for the same employee+date, and writes an audit log entry.
- All 6 files lint-clean. TypeScript-clean. API endpoints verified via curl. No prisma schema changes needed. The 2 pre-existing lint errors are in another agent's file (`template-compare-dialog.tsx`) and outside my task scope.
