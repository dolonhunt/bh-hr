# Task 6-B: Salary Revision History + Data Backup/Restore

**Agent:** salary-revisions-backup-restore
**Date:** 2026-08-14

## Files Created
1. `src/app/api/salary-revisions/route.ts` — GET `?employeeId=` returns revision history from Activity rows of type `SALARY_REVISION`.
2. `src/components/hr/modules/salary-history.tsx` — Vertical-timeline UI with summary cards (current net, total increase, avg annual %).
3. `src/app/api/backup/export/route.ts` — GET downloads JSON of all 21 tables (passwords stripped).
4. `src/app/api/backup/import/route.ts` — POST upserts all tables in dependency order, returns per-table counts.
5. `src/app/api/backup/reset/route.ts` — POST `?confirm=DELETE` clears all tables except Users + Company.

## Files Modified
6. `src/app/api/employees/[id]/route.ts` — PATCH now diffs payroll fields and writes SALARY_REVISION Activity when changed. Accepts `revisionReason`.
7. `src/components/hr/modules/employee-profile.tsx` — Added SalaryHistory component under Payroll tab. Invalidates salary-revisions query on save.
8. `src/components/hr/modules/employee-form-dialog.tsx` — Added "Reason for change (optional)" Textarea in Payroll tab, edit-mode only.
9. `src/components/hr/modules/settings.tsx` — Added "Data & Backup" tab with Export/Import/Danger Zone sections.

## Verification
- Lint: 0 errors in my 9 files. (Pre-existing error in org-chart.tsx from concurrent agent is not my responsibility.)
- TypeScript: 0 errors in my files.
- API smoke tests:
  - GET /api/salary-revisions?employeeId=X → 200, items array.
  - PATCH /api/employees/X with new salary + revisionReason → 200, revision Activity created.
  - GET /api/backup/export → 200, 227 KB JSON, 21 tables, passwords stripped.
  - POST /api/backup/import → 200, 359 records imported, 0 errors.
  - POST /api/backup/reset (no confirm) → 400 with descriptive error.
- Dev server (port 3000) not restarted. No Prisma schema changes.
