# Task 8-A — Asset Management + Training & Development

**Agent:** assets-training-agent
**Task ID:** 8-A
**Scope:** Build two new HR modules end-to-end (backend API + frontend UI + nav integration) for the existing Next.js HR Management System.

---

## Files Created

### Asset Management (Part 1)
- `/src/app/api/assets/route.ts` — GET (list with filters `?employeeId=&status=&type=&search=`) + POST (create). Exports `AssetDTO`, `AssetMeta`, `ASSET_CONSTANTS`, `toDTO`.
- `/src/app/api/assets/[id]/route.ts` — GET / PATCH (update name, type, serialNumber, condition, status, notes) / DELETE.
- `/src/app/api/assets/[id]/assign/route.ts` — POST `{ employeeId, assignedDate, expectedReturnDate? }`. Sets status=ASSIGNED, sets assignedToId/assignedToName/assignedDate/expectedReturnDate. Creates Activity type=`ASSET_ASSIGNED` + AuditLog.
- `/src/app/api/assets/[id]/return/route.ts` — POST `{ condition, notes }`. Sets status=AVAILABLE, clears assignment fields, sets returnDate. Creates Activity type=`ASSET_RETURNED` + AuditLog. Append-only notes (`[Return] …`).
- `/src/components/hr/modules/assets.tsx` — Full Assets module with PageHeader, 4 KPI cards (Total / Assigned / Available / Damaged), filter bar (type + status + search), table view + grid view toggle, Add/Edit dialog, Assign dialog (single-employee searchable select with avatar), Return dialog (condition + notes), Retire action, EmptyState + Skeleton + error retry.

### Training & Development (Part 2)
- `/src/app/api/training/route.ts` — GET (list courses with filters `?status=&search=`) + POST (create). Exports `CourseDTO`, `EnrollmentDTO`, `CourseMeta`, `EnrollmentMeta`, `TRAINING_CONSTANTS`, `toCourseDTO`, `toEnrollmentDTO`, `parseEnrollmentMeta`.
- `/src/app/api/training/[id]/route.ts` — GET / PATCH / DELETE (cascade deletes enrollments).
- `/src/app/api/training/[id]/enroll/route.ts` — POST `{ employeeIds[] | employeeId }`. Validates course + employees, capacity check, dedupes existing active enrollments, silently re-activates dropped ones, creates `TRAINING_ENROLLMENT` Activity per employee + AuditLog.
- `/src/app/api/training/[id]/complete/route.ts` — POST `{ employeeId, score?, certificate? }`. Marks enrollment COMPLETED, sets completedAt/score/certificate.
- `/src/app/api/training/enrollments/route.ts` — GET (all enrollments across courses, with `?status=&courseId=&employeeId=&search=` filters; includes employee name/code/photo).
- `/src/app/api/training/enrollments/[id]/route.ts` — PATCH (status ENROLLED/COMPLETED/DROPPED, score, certificate, completedAt) / DELETE.
- `/src/components/hr/modules/training.tsx` — Full Training module with PageHeader, 4 KPI cards (Active Courses / Total Enrollments / Completion Rate / Upcoming 7d), two tabs (Courses / Enrollments), course card grid (capacity progress bar, status badge, trainer, date range, duration), enrollments table (avatar+name, course, dates, score badge, certificate badge, status), Create Course dialog, Enroll dialog (multi-employee picker with selected chips), Complete dialog (score + certificate), Drop/Reactivate/Delete actions.

## Files Modified
- `/src/app/api/export/route.ts` — Added 3 new modules to the export endpoint: `assets`, `training-courses`, `training-enrollments`. Each fetches from the Activity table and parses the JSON metadata into CSV rows.
- `/src/components/hr/nav-config.ts` — Added `Package` and `GraduationCap` imports; added two new nav items (`training`, `assets`) placed between Documents and Reports.
- `/src/lib/store.ts` — Added `"assets"` and `"training"` to the `ModuleKey` union type.
- `/src/components/hr/app-shell.tsx` — Imported `AssetsModule` and `TrainingModule`; registered them in `MODULE_COMPONENTS`.

## Storage Pattern (no Prisma schema changes)
All data is stored in the existing `Activity` model with JSON-stringified `description`:

| Entity              | `type`                  | `title`                          | `employeeId`            |
|---------------------|-------------------------|----------------------------------|-------------------------|
| Asset               | `ASSET`                 | asset name                       | assigned employee or null |
| Asset assignment log| `ASSET_ASSIGNED`        | "Asset assigned: <name>"         | assignee                |
| Asset return log    | `ASSET_RETURNED`        | "Asset returned: <name>"         | returning employee or null |
| Training course     | `TRAINING_COURSE`       | course title                     | null                    |
| Training enrollment | `TRAINING_ENROLLMENT`   | "Enrollment: <course title>"     | enrolled employee       |

Every mutating endpoint also writes an `AuditLog` entry for traceability (visible in the existing Audit Log module).

## Validation Rules
- Asset types: LAPTOP, MONITOR, PHONE, TABLET, KEYBOARD, MOUSE, HEADSET, DESK, CHAIR, PRINTER, CAMERA, OTHER
- Asset conditions: NEW, GOOD, FAIR, DAMAGED
- Asset statuses: AVAILABLE, ASSIGNED, RETURNED, RETIRED
- Course statuses: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
- Enrollment statuses: ENROLLED, COMPLETED, DROPPED
- Cannot assign an already-assigned asset to the same employee.
- Cannot assign a RETIRED asset.
- Capacity is enforced on enroll (DROPPED enrollments don't count toward capacity).
- Enrolling an already-dropped employee silently re-activates them.

## UI/UX Features
- Emerald-primary palette throughout (no indigo/blue).
- Table view + card-grid toggle on Assets.
- Card grid on Training courses; table on enrollments.
- Type-icon badges per asset type (Laptop, Monitor, Smartphone, etc.) — uses `LampDesk` for DESK since lucide-react has no `Desk`.
- Color-coded condition badges (NEW=emerald, GOOD=sky, FAIR=amber, DAMAGED=rose).
- Color-coded status badges.
- Multi-employee picker with searchable Command palette and removable chips.
- Loading skeletons, empty states with CTAs, error retry.
- Mobile responsive (hide columns at sm/md/lg/xl breakpoints).
- TanStack Query for data fetching; sonner toast for feedback.
- Shared components used: `PageHeader`, `KpiCard`, `AvatarBadge`, `StatusBadge`, `EmptyState`, `ExportButton`.
- `formatDate` from `@/lib/utils` for all date rendering.

## Verification
- `bun run lint` → **exit 0, 0 errors, 0 warnings** (the prior `surveys.tsx` lint error from a parallel agent was also resolved by them during this run).
- `bunx tsc --noEmit` → **0 errors in any of my files** (only pre-existing errors in `interviews/route.ts`, `surveys/[id]/route.ts`, `prisma/seed.ts`, `payroll/route.ts`, etc. — none in my code).
- API smoke tests (all return 200):
  - `GET /api/assets` ✓
  - `POST /api/assets` (create) ✓
  - `POST /api/assets/[id]/assign` ✓ — verified asset moved to ASSIGNED + assignedToName set + ASSET_ASSIGNED activity created.
  - `POST /api/assets/[id]/return` ✓ — verified status reverted to AVAILABLE + returnDate set + notes appended + ASSET_RETURNED activity created.
  - `DELETE /api/assets/[id]` ✓
  - `GET /api/training` ✓
  - `POST /api/training` (create course) ✓
  - `POST /api/training/[id]/enroll` with `employeeIds[]` ✓ — 2 employees enrolled, enrolledCount went 0→2.
  - `POST /api/training/[id]/complete` ✓ — score=92, certificate="CERT-2024-001", status=COMPLETED, completedAt set.
  - `PATCH /api/training/enrollments/[id]` (drop) ✓ — status=DROPPED, course enrolledCount went 2→1 (drop excluded from active count).
  - `DELETE /api/training/[id]` ✓ — cascade-deleted 2 enrollments.
  - `GET /api/training/enrollments` (all) ✓ — returns employee name/code/photo.
  - `GET /api/export?module=assets&format=csv` ✓
  - `GET /api/export?module=training-courses&format=csv` ✓
  - `GET /api/export?module=training-enrollments&format=csv` ✓ — CSV verified with proper escaping.
- Test data cleaned up after verification.

## Stage Summary
Two new full-featured HR modules delivered end-to-end:
1. **Asset Management** — Track company assets (laptops, monitors, phones, etc.) with full lifecycle: create → assign to employee → return → retire/delete. Dual view (table + card grid). 4 KPI cards. Filter by type/status/search.
2. **Training & Development** — Manage training courses and employee enrollments. Two tabs: Courses (card grid with capacity progress) and Enrollments (table with score/certificate/status). Multi-employee enrollment. Mark complete with score + certificate. Drop / reactivate / delete enrollments.

Both modules:
- Use the existing `Activity` model (no Prisma schema changes).
- Integrate with the sidebar nav, store type system, and app-shell router.
- Support CSV/Excel export via the generic `/api/export` endpoint.
- Write `AuditLog` entries on every mutation (visible in the Audit Log module).
- Use the existing shared component library and emerald primary palette.
- Are mobile responsive with proper loading/empty/error states.

Total: 11 new files + 4 modified files. 0 lint errors. 0 TS errors in my files.
