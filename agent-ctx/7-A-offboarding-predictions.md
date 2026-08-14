# Task 7-A — Employee Offboarding Workflow + HR Analytics Predictions

**Agent**: 7-A-offboarding-predictions-agent
**Task**: Build employee offboarding workflow (8 default tasks, exit date/reason, rose/amber themed UI, employee-profile integration) + HR analytics predictions (attrition risk, performance trends, headcount forecast, department risk heatmap).

## Files Touched

### Created (4 new files)
- `/src/app/api/offboarding/route.ts` — GET (auto-seeds 8 default offboarding tasks on first call), POST (create custom task).
- `/src/app/api/offboarding/[id]/route.ts` — PATCH (status / notes / dueDate / exitDate / exitReason with broadcast to siblings), DELETE.
- `/src/components/hr/modules/offboarding.tsx` — Offboarding component (rose/amber themed, progress ring, exit-info editor, checklist, Add Task dialog).
- `/src/app/api/reports/predictions/route.ts` — GET returns attritionRisk, performanceTrend, headcountForecast, departmentRisk.

### Modified (2 files)
- `/src/components/hr/modules/employee-profile.tsx` — Added "Offboarding" tab (only visible when `employmentStatus` is `RESIGNED` or `TERMINATED`); added "Start Offboarding" CTA banner on the Onboarding tab that flips the status to RESIGNED and switches to the Offboarding tab.
- `/src/components/hr/modules/reports.tsx` — Added "Predictions & Insights" section (below analytics charts, above recruitment funnel) with 4 cards: Attrition Risk, Performance Trends, Headcount Forecast, Department Risk Heatmap.

### Incidental fix
- `/src/components/hr/notification-center.tsx` — Renamed a local variable `module` → `moduleKey` to clear a pre-existing `@next/next/no-assign-module-variable` lint error so `bun run lint` passes clean.

## Work Log

### Part 1: Offboarding

**Backend** — Modeled offboarding tasks as `Activity` rows with `type: "OFFBOARDING_TASK"` and a JSON description holding `{ description, dueDate, assignedTo, status, notes, completedAt, sortOrder, isDefault, exitDate, exitReason }`. This mirrors the onboarding pattern so no Prisma schema migration is needed.

- The `ensureDefaultsForEmployee` helper is idempotent — only seeds when zero `OFFBOARDING_TASK` rows exist for an employee.
- Default exit date: today if employee is already RESIGNED/TERMINATED, else today + 30 days (notice period). Default exit reason is inferred from `employmentStatus` (TERMINATED → TERMINATION, else RESIGNATION).
- Each default task has a `dueOffsetDays` from the exit date: resignation-letter and access-revocation on the exit date (offset 0), exit interview 3 days before, asset recovery 1 day before, final settlement and dues-clearing 1 day after, certificates and relieving letter 2 days after.
- Custom tasks (POST) inherit the exitDate/exitReason from existing siblings so the whole checklist shares one exit context.
- PATCH on the exit date/reason **broadcasts** to every sibling task for the same employee (so the user can edit it from any task and the entire list updates).
- `completedAt` is auto-set when status transitions to COMPLETED and cleared when moving away; audit log entries are written for create/update/delete and for the initial seed.

**Frontend (`offboarding.tsx`)** — Mirrors `onboarding.tsx` structure but themed for exits:
- Rose-tinted progress ring (replaces emerald) with `stroke-rose-500`.
- Summary card has a `bg-gradient-to-br from-rose-50/60 via-amber-50/30 to-card` background and shows: "Exit scheduled for {date}", "{completed} of {total} tasks completed", reason chip (rose=Resignation/Termination, amber=Contract End, emerald=Retirement), and a `days until exit` indicator.
- "Edit Exit Info" button opens a dialog to change exit date + reason (broadcasts via PATCH).
- Checklist mirrors onboarding: status cycler (PENDING→IN_PROGRESS→COMPLETED→PENDING), skip / reopen, delete (custom only), inline notes editor with save/cancel, overdue detection, "Custom" badge for user-added tasks.
- "Add Task" dialog inherits exit date/reason display.
- Filter tabs: All / Pending / Completed.
- Long lists use `max-h-96 overflow-y-auto custom-scrollbar`.

**Integration (`employee-profile.tsx`)**:
- Added `Offboarding` import, `DoorOpen` + `Loader2` icons, `toast` import.
- Added `activeTab` + `startingOffboarding` state; the `Tabs` is now controlled so we can programmatically switch to the offboarding tab after starting.
- `isOffboarding` derived flag = `employmentStatus` is `RESIGNED` or `TERMINATED`. The Offboarding tab trigger only renders when this is true.
- On the Onboarding tab, when NOT offboarding, a rose-tinted banner appears at the top with a "Start Offboarding" button. Clicking it PATCHes the employee to `employmentStatus: RESIGNED`, invalidates the employee query, and switches to the Offboarding tab. The offboarding endpoint auto-seeds the 8 default tasks on first GET.

### Part 2: HR Analytics Predictions

**Backend (`/api/reports/predictions/route.ts`)** — Single GET endpoint returning 4 sections:

1. **Attrition Risk** — For every employee, computes a 0-100 risk score:
   - Latest Performance.overallScore < 60 → +30 (factor label includes the actual score)
   - No `SALARY_REVISION` Activity in last 12 months → +20
   - > 5 ABSENT attendance rows in last 30 days → +25
   - No `PROMOTION` Activity in last 24 months → +15
   - `employmentType === "PROBATION"` or `employmentStatus === "PROBATION"` → +10
   
   Risk level: LOW (0-30), MEDIUM (31-60), HIGH (61+). Returns `{ employees: [...sorted by score desc], avgRisk, highRiskCount, total }`. Each employee entry includes `factors: string[]` (with sensible defaults so the chip list is never empty).

2. **Performance Trend** — Employees with ≥ 2 Performance rows: compares latest `overallScore` to previous, classifies as UP / DOWN / STABLE, returns the delta. Sorted with declining first. Summary counters: `{ up, down, stable, total }`.

3. **Headcount Forecast** — 
   - `current`: count where `employmentStatus NOT IN (RESIGNED, TERMINATED)`.
   - `hireRate`: employees with `joiningDate` in the last 12 months, divided by 12.
   - `attritionRate`: count of RESIGNED/TERMINATED employees divided by 12 (we don't track exit dates, so this is an average).
   - `netMonthly`: hireRate − attritionRate, floored at -5% of current headcount (sanity cap on attrition).
   - Forecast = `current + netMonthly × {3, 6, 12}`, floored at 30% of current (so we never project the org shrinking to nothing).
   - Also returns `totalVacancies` (sum of `Job.vacancy` where `status === OPEN`).

4. **Department Risk** — Per department: `avgRisk` (mean of employee risk scores in that dept), `lowPerformerCount` (employees whose latest performance < 60), `vacancyCount` (sum of open-job vacancies for that dept), `headcount`. Includes an "Unassigned" pseudo-dept if any employees lack a department. Sorted by avgRisk desc.

**Frontend (`reports.tsx`)** — Added a `PredictionsSection` placed between the Analytics Dashboard and the Recruitment Funnel. It fetches `/api/reports/predictions` via TanStack Query (`staleTime: 60s`) and renders 4 cards in a 2×2 grid:

1. **Attrition Risk** (rose header) — Custom SVG gauge (color-coded by overall avg risk level: emerald/amber/rose), 3-stat row (HIGH/MEDIUM/LOW counts), top-5 high-risk employees with avatar, score bar, and factor chips. "View All" Collapsible button expands the full list (max-height 96 with custom scrollbar).

2. **Performance Trends** (emerald header) — 3-stat row (Improving / Stable / Declining with icons), "Needs attention" sub-list of declining employees showing `previous → current` with a delta badge. Empty state when nobody is declining.

3. **Headcount Forecast** (amber header) — 4-stage timeline (Now / +3mo / +6mo / +12mo) with up/down/flat arrow deltas between consecutive stages. Below: side-by-side Hire rate vs Attrition rate panels with the open-vacancy count. Footer line shows net monthly change with color coding.

4. **Department Risk Heatmap** (violet header) — Grid of department cards colored by risk level (rose for HIGH, amber for MEDIUM, emerald for LOW). Each card shows avg risk %, headcount, vacancies, and a "low performer" warning if any.

All four cards share a `PredictionsCardSkeleton` for the loading state and use the existing `AvatarBadge`, `Badge`, `Card`, `Collapsible`, `Skeleton`, and `cn` utilities. No indigo/blue colors anywhere.

## Verification

- `cd /home/z/my-project && bun run lint 2>&1 | tail -10` → exit code 0, no errors, no warnings.
- `bunx tsc --noEmit` → 0 errors in any of the new/modified files (pre-existing TS errors in seed.ts and other untouched files remain unchanged).
- Smoke tests against the running dev server (port 3000):
  - `GET /api/offboarding?employeeId=EMP020_id` → 200, returned 8 default tasks with correct titles, assignedTo values (HR/HR/IT/IT/Finance/Finance/HR/HR), dueDates computed correctly from the inferred exit date (offset 0/−3/−1/0/+1/+1/+2/+2 days).
  - `PATCH /api/offboarding/<id> {status:"IN_PROGRESS"}` → 200, status updated, completedAt stays null.
  - `PATCH /api/offboarding/<id> {status:"COMPLETED", notes:"..."}` → 200, status updated, completedAt auto-set to current ISO timestamp, notes saved.
  - `POST /api/offboarding` with custom task → 201, custom task created with sortOrder=8 (next after the 8 defaults), isDefault=false, exitDate/exitReason inherited from siblings.
  - `PATCH /api/offboarding/<id> {exitDate, exitReason}` → 200; verified the change **broadcast** to all sibling offboarding tasks for that employee (re-GET showed all 8 tasks now have the new exitDate and CONTRACT_END reason).
  - `DELETE /api/offboarding/<custom_id>` → 200, `{ok:true}`.
  - `GET /api/offboarding?employeeId=...&status=COMPLETED` → 200, returned 1 task (filter works).
  - `GET /api/reports/predictions` → 200. Verified the response shape:
    - `attritionRisk`: avgRisk=34, highRiskCount=0, total=20. Top scorer (Arif Hossain, EMP001, HR) has score=45, level=MEDIUM, factors=["No salary revision in 12 months", "No promotion in 24 months", "On probation"].
    - `performanceTrend`: total=0 (no employees have ≥2 performance reviews yet — seed data only has 1 review per employee).
    - `headcountForecast`: current=20, forecast3m=23, forecast6m=26, forecast12m=31, hireRate=0.92/mo, attritionRate=0/mo, netMonthly=0.92, totalVacancies=6.
    - `departmentRisk`: 8 departments listed, top risk: Marketing & Operations (avgRisk=40, headcount=2 each); Sales has 3 vacancies.
  - `GET /` → 200, page renders cleanly.
  - Dev log shows zero errors, zero warnings on any of the new endpoints.

## Issues Encountered

- **Default dueDate falsy bug**: Initially the first default task ("Accept resignation letter") had `dueOffsetDays: 0`, and the seed code used `t.dueOffsetDays ? new Date(...) : null` which evaluated `0` as falsy and skipped setting the due date. Fixed by switching to `t.dueOffsetDays !== undefined ?`. Cleared test data and re-seeded to verify all 8 tasks now have proper dueDates.
- **Dev server had died** between sessions (only Caddy + agent-browser were running). Started a new detached `bun run dev` so I could smoke-test the new endpoints. The setsid+disown pattern kept it alive for the duration of testing.
- **Pre-existing lint error** in `notification-center.tsx` (`no-assign-module-variable`) — fixed by renaming the local `module` variable to `moduleKey` so `bun run lint` exits clean.

## Stage Summary

- Two high-impact HR features delivered end-to-end:
  1. **Employee Offboarding Workflow** — every employee profile now has a path to start offboarding (banner CTA on the Onboarding tab → flips status to RESIGNED → reveals the Offboarding tab). The Offboarding tab includes a rose-tinted progress ring, 8 default tasks (auto-seeded on first GET), exit date + reason editor (with broadcast to all sibling tasks), checklist with status cycler / skip / reopen / delete / inline notes, and a custom-task dialog. Full audit trail via AuditLog.
  2. **HR Analytics Predictions** — new "Predictions & Insights" section in the Reports module with 4 cards: Attrition Risk (gauge + top-5 high-risk list with factor chips, expandable to full list), Performance Trends (improving/stable/declining summary + declining-employees watchlist), Headcount Forecast (4-stage timeline + hire/attrition rate comparison + net monthly change), Department Risk Heatmap (color-coded grid by risk level with avg risk / headcount / vacancies per department).
- All risk levels use the requested color coding: LOW (emerald), MEDIUM (amber), HIGH (rose). No indigo/blue.
- 4 files created, 2 files modified (plus 1 incidental lint fix), 0 lint errors, 0 TS errors in my files, no Prisma schema changes, dev server verified responding 200 on all new endpoints with correct payload shapes.
