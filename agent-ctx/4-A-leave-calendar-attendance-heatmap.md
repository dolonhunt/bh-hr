# Task 4-A — Leave Calendar View + Attendance Heatmap

## Files touched

### Created
- `src/app/api/leave/calendar/route.ts` — GET endpoint that returns all approved + pending leave requests overlapping a given `?month=YYYY-MM`, with employee + leave type includes. Each item shape: `{ id, employeeId, employeeName, employeePhoto, leaveTypeName, leaveTypeColor, startDate, endDate, days, status }`. REJECTED leave is excluded per spec. Month defaults to current month when param missing or malformed.
- `src/app/api/attendance/heatmap/route.ts` — GET endpoint returning daily attendance for the last N months (default 3, max 24). Two modes:
  - `?employeeId=` provided → individual mode: one item per day (dedupes by date, keeping highest-intensity status). Item shape: `{ date, status, workingHours }`.
  - No `employeeId` → aggregated mode: groups by date, picks the highest-intensity status across all employees that day, returns the average working hours and the record count. Item shape: `{ date, status, workingHours, count }`.
  - Intensity map used by the backend to pick the max: `PRESENT=4, LATE=3, REMOTE=3, HALF_DAY=2, LEAVE=1, ABSENT=0, HOLIDAY=-1`.

### Modified
- `src/components/hr/modules/leave.tsx` — added view toggle (List View / Calendar View) at the top, between the KPI cards and the existing list content. List view preserves the existing tabs/filter/table/pagination exactly. Calendar view renders a month grid (Mon-Sun columns, variable week rows) with:
  - Month navigation header: Previous / Next / Today buttons + month label (e.g. "August 2026"), Today disabled when already on current month.
  - Each day cell shows date number (top-left), small colored dots for employees on leave that day (max 3, then "+N" overflow), and a per-day count (top-right).
  - Approved leave = solid color dot (leaveType color). Pending leave = same color but with a 45° hatched/striped CSS overlay (repeating-linear-gradient). Rejected = not shown (filtered out by the API).
  - Weekend cells (Sat/Sun) use `bg-muted/30` when in-month; out-of-month cells use `bg-muted/20` with faded text.
  - Today's cell highlighted with a `ring-2 ring-primary ring-offset-1 ring-offset-background`.
  - Clicking any day cell with leaves opens a dialog listing every leave for that day: avatar, name, status badge, leave type dot (with hatched overlay if pending), date range, days.
  - Mobile responsive: weekday headers collapse to single letters, cells shrink to `min-h-[64px]` with `size-1.5` dots; desktop uses `min-h-[92px]` with `size-2` dots.
  - Loading skeleton uses the shadcn `Skeleton` component shaped as a 7-column grid.
  - Legend row above the grid explains dot styles.
  - Calendar data is fetched only when view === "calendar" (`enabled` flag on the TanStack Query). Leave list + heatmap invalidation cascades through `["leave-calendar"]` on decisions/edits/deletes.
  - Helpers: `buildCalendarDays(year, monthIdx)` (Monday-indexed start offset, fills to first Sunday on/before the 1st and last Saturday on/after the last), `leavesOnDay(items, date)` (date-range overlap check), `localDateKey(date)` (local-timezone YYYY-MM-DD).
- `src/components/hr/modules/attendance.tsx` — added a new `AttendanceHeatmap` sub-component (rendered between the KPI cards and the filter bar). Features:
  - Header row with title + description on the left, employee filter dropdown + months-range dropdown (1/3/6/12 months) on the right.
  - GitHub-style contribution graph: 7 rows (Sun-Sat) × N columns (weeks). Built with a CSS grid using `grid-flow-col` + `gridTemplateRows: repeat(7, 12px)` and fixed `12px × 12px` cells with `3px` gaps. Cell color comes from `INTENSITY_COLORS[status]` — `PRESENT=emerald-500`, `LATE/REMOTE=amber-500/80`, `HALF_DAY=sky-500/60`, `LEAVE=amber-500/40`, `ABSENT=rose-500/60`, `HOLIDAY/empty=muted/30`, future days = transparent.
  - Month labels positioned absolutely along the top (each label sits at the column index where its month starts, computed via `m.col * (CELL_PX + GAP_PX)` px).
  - Day labels column on the left: shows "Mon", "Wed", "Fri" only (with empty slots for Sun/Tue/Thu/Sat) — matches GitHub's convention. Each label uses the same fixed cell height + gap as the grid so they align row-by-row.
  - Each cell wrapped in a shadcn `Tooltip` — hover shows "Mon, 11 Aug 2026 — Present · 8.92h" (aggregated mode appends " · 20 records").
  - Future days render as transparent (no data yet).
  - Legend below: "Less [□ absent/leave/half-day/late-remote/present] More" using actual cell color classes.
  - Loading skeleton + empty state for no-data ranges.
  - Wrapped in `overflow-x-auto` so wider ranges (6-12 months) scroll horizontally on mobile.
  - Heatmap query keyed on `[employeeId, months]` so switching employee or range refetches. Cache is invalidated through `["attendance-heatmap"]` on attendance create/edit/delete.

## Backend design notes
- Both endpoints use local-timezone date math (`new Date(year, monthIdx, 1, 0, 0, 0, 0)` etc.) rather than UTC, so the calendar/heatmap render the same dates the user sees regardless of timezone.
- The leave calendar overlap query uses Prisma: `startDate: { lte: monthEnd }, endDate: { gte: monthStart }` — standard half-open interval overlap test.
- The heatmap aggregated mode groups in-memory using a `Map<dateKey, {status, workingHoursSum, count}>` rather than SQL GROUP BY because Prisma+SQLite doesn't easily support `MAX(CASE WHEN ...)` aggregations. The dataset is small (≤ ~3 months × ~20 employees ≈ 1,300 records max) so in-memory grouping is fast.
- Intensity comparison uses the `INTENSITY` lookup table — unknown statuses default to `-1` (lowest priority), so known statuses always win.

## Frontend design notes
- View toggle is a custom 2-button group (not ToggleGroup/Tabs) because we needed tight control of the active/inactive styling and to keep the icon + label layout consistent with the rest of the app.
- Pending dot hatching uses inline `backgroundImage: repeating-linear-gradient(45deg, rgba(255,255,255,0.55) 0 2px, transparent 2px 4px)` stacked on top of the leave-type color — this works for any base color (green, blue, pink, etc.) and is more legible than a separate "outline-only" style.
- Calendar grid uses CSS `grid-cols-7` (Tailwind) for the day grid because the cells have flexible widths (they fill the available column width); the heatmap uses inline `gridTemplateRows: repeat(7, 12px)` because the cells have a fixed pixel size and the column count varies with the date range.
- Both new queries integrate with the existing invalidation cascade: the leave module's `["leave-calendar"]` query is invalidated alongside `["leave"]` whenever a decision/edit/delete happens; the attendance module's `["attendance-heatmap"]` query is invalidated alongside `["attendance"]` on the same triggers. So both views stay in sync with the underlying data.

## Verification
- `bun run lint` → 0 errors, 0 warnings (exit 0).
- `bunx tsc --noEmit` → 0 errors in any of my 4 files (the pre-existing errors in `payroll/route.ts`, `document-renderers.ts`, `use-keyboard-shortcuts.ts`, seed.ts, examples/, skills/ remain unchanged and were flagged by previous agents).
- API smoke tests (dev server restarted to verify):
  - `GET /api/leave/calendar?month=2026-08` → 200, 9 items returned (Arif Hossain PENDING, Nadia Khan APPROVED, Sumaiya Sarkar APPROVED, Tanvir Hossain PENDING, Farhana Khan APPROVED, Maliha Sarkar APPROVED, Sajid Hossain PENDING, Rumana Khan APPROVED, Tania Sarkar APPROVED) — both APPROVED + PENDING included, REJECTED excluded as designed.
  - `GET /api/attendance/heatmap?months=3` → 200, aggregated mode, 7 items (one per attendance day in seed data, 2026-08-07 → 2026-08-13), each with `count: 20` and avg working hours ~7.2-7.3h.
  - `GET /api/attendance/heatmap?employeeId=cmss1mi1u0011slbkbttb53zi&months=3` → 200, individual mode, items show that employee's daily status (LATE on 2026-08-07, PRESENT on 08-08/09/11/12, ABSENT on 08-10, etc.) with raw working hours (not averaged).
  - `GET /` → 200, normal page render.

## Dev server note
The Next.js dev server had stopped (dev.log last entry was "Compiled in 767ms" with no further activity for ~5 minutes; port 3000 not listening; no `next dev` or `bun run dev` process). I restarted it via `setsid bash -c 'bun run dev > /tmp/dev-restart.log 2>&1' &` so I could smoke-test the new endpoints. After my testing it remained running. If the system's own watchdog restarts the original server, my background instance will conflict on port 3000 — the next agent may need to kill one if both end up running.

## Stage Summary
- Leave module now has two complementary views: a paginated filterable table (existing) and a monthly calendar grid (new). The calendar makes it immediately visible who is on leave on any given day, with status-coded dot styling (solid approved, hatched pending) and a click-to-see-details dialog. Both views share the same KPI cards and the same Add Leave / Export actions in the PageHeader.
- Attendance module now has a GitHub-style contribution heatmap showing the last 1/3/6/12 months of attendance patterns, with employee filter (aggregated by default, individual selectable), intensity-based color coding, hover tooltips, month/day axis labels, and a "Less → More" legend. The heatmap sits between the KPI cards and the table, giving a quick visual overview before drilling into the per-day table.
- Both new endpoints follow the existing project conventions (NextRequest/NextResponse, `db` from `@/lib/db`, local-timezone date math, no z-ai-web-dev-sdk client-side usage). No prisma schema changes were needed.
- Total: 2 new API files, 2 modified module files. Lint clean. TypeScript clean for all 4 files. API endpoints verified via curl.
