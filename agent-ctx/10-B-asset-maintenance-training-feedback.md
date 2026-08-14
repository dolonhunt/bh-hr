# Task 10-B: Asset Maintenance Tracking + Training Feedback

**Agent:** asset-maintenance-feedback-agent
**Task ID:** 10-B
**Date:** 2026-08-14

## Scope

Add two new end-to-end features:
1. **Asset Maintenance / Repair Tracking** — log repairs, inspections, upgrades, etc. for any company asset, with a portfolio-wide summary card and per-asset timeline.
2. **Training Feedback (Post-Course Surveys)** — collect 1-5 star ratings + free-text responses from employees who completed a course, with rating distribution chart and KPI tiles.

Both features persist data in the existing Activity model (no Prisma schema changes).

## Files Created

| File | Purpose |
| --- | --- |
| `/src/app/api/assets/[id]/maintenance/route.ts` | GET list per asset + POST create record. Exports `MaintenanceType`, `MaintenanceStatus`, `MaintenanceMeta`, `MaintenanceDTO`, `parseMaintenanceMeta`, `toMaintenanceDTO`, `MAINTENANCE_CONSTANTS`. |
| `/src/app/api/assets/[id]/maintenance/[maintenanceId]/route.ts` | PATCH (status/notes/endDate/cost) + DELETE. |
| `/src/app/api/assets/maintenance/route.ts` | Global GET — all maintenance records across every asset + portfolio summary block (totalCost, activeCount, damagedAssetCount, typeDistribution, topAssets). |
| `/src/app/api/training/[id]/feedback/route.ts` | GET list per course (with summary block: avgRating, recommendPct, distribution) + POST submit feedback (enforces COMPLETED-enrollment requirement + duplicate prevention). |

## Files Modified

| File | Change |
| --- | --- |
| `/src/components/hr/modules/assets.tsx` | Added Maintenance KPI summary card on the main Assets page (Total Maintenance Cost, Active Maintenance Count, Assets Needing Maintenance, Total Records). Added per-asset "Maintenance" action button (table + grid views + dropdowns). Added `MaintenanceHistoryDialog` showing inline summary tiles + scrollable record list with type/status badges, cost, vendor, dates, notes, and inline status-cycling buttons (SCHEDULED → IN_PROGRESS → COMPLETED) + Cancel + Delete. Added `AddMaintenanceDialog` with type select, description, cost, vendor, dates, notes. |
| `/src/components/hr/modules/training.tsx` | Added 3rd "Feedback" tab in the Training module (after Courses + Enrollments). The Feedback tab shows: course selector, 3 KPI tiles (Avg Rating with stars, Would Recommend %, Total Responses), rating distribution BarChart (1★–5★ with red→green gradient colors), and a list of individual responses with avatar, stars, content, "what worked", "could improve", and recommend badge. Added `SubmitFeedbackDialog` with employee select (filtered to COMPLETED enrollments), 1–5 star picker, overall feedback textarea, "what worked" / "what could improve" textareas, and recommend Yes/No toggle. Added a "Feedback" quick-action button per completed enrollment row in the Enrollments tab. |

## Data Storage Strategy

### Asset Maintenance (Activity model)
```
type        = "ASSET_MAINTENANCE"
title       = <assetActivityId>          ← used as the indexed join key
employeeId  = null                       ← FK prevents storing asset IDs here
description = JSON { assetId, assetName, type, description, cost, vendor,
                     startDate, endDate, status, notes }
```

The task spec suggested storing the asset's activity ID in `employeeId`, but that
breaks Prisma's FK constraint (verified with a test:
`Foreign key constraint violated on the foreign key`).
The `title` field approach is FK-safe and equally efficient for queries:
`db.activity.findMany({ where: { type: "ASSET_MAINTENANCE", title: assetId } })`.

### Training Feedback (Activity model)
```
type        = "TRAINING_FEEDBACK"
title       = <courseId>                 ← indexed join key (course activity ID)
employeeId  = <employeeId>              ← FK-valid (real Employee)
description = JSON { courseId, courseTitle, employeeName, rating, content,
                     whatWorked, whatCouldImprove, wouldRecommend, submittedAt }
```

## Validation

### Maintenance types & statuses
- **Types:** REPAIR, MAINTENANCE, UPGRADE, INSPECTION, REPLACEMENT
- **Statuses:** SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
- POST defaults status to `SCHEDULED`.
- PATCH to `COMPLETED` auto-sets `endDate` to "today" if not provided.

### Training feedback validation
- **Rating:** integer 1-5 (rejected otherwise).
- **Content:** required (non-empty string).
- **Eligibility:** only employees with a COMPLETED enrollment for the course can submit.
- **Duplicate prevention:** one feedback per (course, employee) — returns HTTP 409 on second submit.

## API Smoke Tests (all passed)

```
GET    /api/assets/{id}/maintenance                     → 200 (empty)
POST   /api/assets/{id}/maintenance                     → 201 (created REPAIR)
GET    /api/assets/{id}/maintenance                     → 200 (1 record, summary block)
PATCH  /api/assets/{id}/maintenance/{maintId}           → 200 (status SCHEDULED → IN_PROGRESS)
PATCH  /api/assets/{id}/maintenance/{maintId}           → 200 (status → COMPLETED, cost updated, endDate set)
GET    /api/assets/maintenance                          → 200 (1 record, summary with totalCost=4750, typeDistribution, topAssets)
POST   /api/training/{courseId}/feedback                → 201 (5★ rating submitted)
GET    /api/training/{courseId}/feedback                → 200 (1 response, avgRating=5, recommendPct=100, distribution[4].count=1)
POST   /api/training/{courseId}/feedback (duplicate)    → 409 (prevented)
POST   /api/training/{courseId}/feedback (non-completed)→ 404 employee not found / 400 if employee exists but no completed enrollment
```

## Lint & TypeScript

- `bun run lint` → **0 errors, 0 warnings**.
- `bunx tsc --noEmit --skipLibCheck` → no errors in any of the new/modified files (pre-existing errors in unrelated files are unchanged).

## UI / UX Notes

- Emerald primary palette used throughout (no indigo / blue).
- Recharts BarChart for rating distribution (red→green gradient: 1★ red, 5★ emerald).
- Star icons (filled vs outline) for rating display and the interactive picker.
- All async flows show skeletons during load and clear error states with retry.
- Empty states use the shared `EmptyState` component with descriptive copy and optional primary action.
- All mutations invalidate the right TanStack Query keys so the UI refreshes instantly.
- sonner toasts for every success / error.
- Mobile-responsive: KPI grids collapse to 1-col on small screens, dialogs scroll vertically, table views hide non-essential columns at small breakpoints.
- Per-enrollment "Feedback" button + dropdown item only appears when `enrollment.status === "COMPLETED"`.

## Cross-agent note

Another agent (Task 10-A, pid 16685) was concurrently modifying `payroll.tsx`, `payslip-dialog.tsx`, `interviews.tsx`, and adding new endpoints (`payslip-pdf`, `bank-file`, `interviews/ics`). No file conflicts arose — Task 10-B touches only `assets.tsx`, `training.tsx`, and the four new files listed above.
