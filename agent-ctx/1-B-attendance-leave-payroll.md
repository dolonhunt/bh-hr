# Task 1-B — Attendance + Leave + Payroll + Entry Dialogs

## Scope
Build the Attendance, Leave, and Payroll modules + their API routes + entry dialogs.

## Files
### API routes (15)
- `/src/app/api/attendance/route.ts` (GET list + POST)
- `/src/app/api/attendance/[id]/route.ts` (PATCH + DELETE)
- `/src/app/api/leave/route.ts` (GET list + POST)
- `/src/app/api/leave/[id]/route.ts` (GET + PATCH + DELETE)
- `/src/app/api/leave-types/route.ts` (GET + POST)
- `/src/app/api/leave-types/[id]/route.ts` (PATCH + DELETE)
- `/src/app/api/payroll/route.ts` (GET list + POST)
- `/src/app/api/payroll/[id]/route.ts` (GET + PATCH + DELETE)
- `/src/app/api/payroll/generate-payslip/route.ts` (POST)
- `/src/app/api/departments/route.ts` (GET + POST)
- `/src/app/api/departments/[id]/route.ts` (PATCH + DELETE)
- `/src/app/api/roles/route.ts` (GET + POST)
- `/src/app/api/roles/[id]/route.ts` (PATCH + DELETE)
- `/src/app/api/designations/route.ts` (GET + POST)
- `/src/app/api/designations/[id]/route.ts` (PATCH + DELETE)

### Frontend modules (6)
- `/src/components/hr/modules/attendance.tsx`
- `/src/components/hr/modules/leave.tsx`
- `/src/components/hr/modules/payroll.tsx`
- `/src/components/hr/modules/attendance-entry-dialog.tsx`
- `/src/components/hr/modules/leave-entry-dialog.tsx`
- `/src/components/hr/modules/payslip-dialog.tsx`

### Placeholder stubs (so dev server compiles; other agents replace)
- performance, recruitment, documents, reports, audit, settings, generate-document-dialog

## Notes
- Prisma schema and seed are already in place (do not modify).
- Reuses shared components: PageHeader, KpiCard, StatusBadge, AvatarBadge, EmptyState.
- TanStack Query + sonner toast pattern (per employees.tsx).
- Emerald primary palette only — no indigo/blue.
- generate-payslip creates Payroll if missing + a GeneratedDocument from the PAYSLIP template, resolving variables inline (since /api/documents POST is owned by Task 1-A).
