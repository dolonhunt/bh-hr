# Task 6-A — Employee Onboarding Workflow + Org Chart Visualization

## Files Created
- `/src/app/api/onboarding/route.ts` — GET (filters + auto-seed) + POST (custom task)
- `/src/app/api/onboarding/[id]/route.ts` — PATCH (status/notes/dueDate) + DELETE
- `/src/components/hr/modules/onboarding.tsx` — Progress ring + checklist UI (filter, add task, notes, skip/reopen, delete)
- `/src/app/api/org-chart/route.ts` — Recursive reporting tree builder (max depth 3, cycle-safe)
- `/src/components/hr/modules/org-chart.tsx` — Zoomable/pannable interactive tree with search

## Files Modified
- `/src/components/hr/modules/employee-profile.tsx` — Added "Onboarding" tab after Activity
- `/src/components/hr/modules/employees.tsx` — Added "Org Chart" view toggle (Network icon) + conditionally render OrgChart

## Implementation Notes

### Onboarding (Activity model workaround)
Onboarding tasks are stored in the Activity model with:
- `type` = "ONBOARDING_TASK"
- `employeeId` = the employee being onboarded
- `title` = the task title
- `description` = JSON string `{ description, dueDate, assignedTo, status, notes, completedAt, sortOrder, isDefault }`

GET endpoint auto-seeds 10 default tasks on first request (idempotent). POST endpoint ensures defaults exist first, then appends custom tasks.

### Org Chart tree API
- Loads all non-resigned/terminated employees in one query.
- Builds a `childrenByParent` map keyed by `reportingManagerId`.
- Treats orphaned-manager and cycle-forming employees as roots.
- Returns `{ tree, departments, totalEmployees, totalRoots, maxDepth }`.

### Org Chart UI
- Pannable canvas (pointer events, ignores clicks on buttons/links via `data-no-pan`).
- Zoom 40%-200% via CSS transform scale.
- Connectors drawn with absolute-positioned divs (vertical lines + horizontal trunk clipped to outermost child centers).
- Default-collapses depth ≥ 1 nodes on first tree arrival using React's "adjust state during render" pattern (avoids the `set-state-in-effect` lint error).
- Search highlights matching nodes + auto-expands ancestor paths (computed with `useMemo` so user-initiated collapses are preserved when search clears).

## Verification
- `bun run lint` → 0 errors, 0 warnings.
- `bunx tsc --noEmit` → 0 errors in any file I touched.
- Smoke-tested via curl:
  - GET /api/onboarding → seeded 10 defaults ✓
  - PATCH /api/onboarding/[id] (status IN_PROGRESS, then COMPLETED + notes) → status + completedAt + notes saved ✓
  - POST /api/onboarding → custom task created with sortOrder=10 ✓
  - GET /api/onboarding?status=COMPLETED → filter works ✓
  - DELETE /api/onboarding/[id] → 200 {ok:true} ✓
  - GET /api/org-chart → 200 with 20 roots (seeded data has no managers); after assigning 2 employees to report to a 3rd, parent showed subs=2 ✓

## Lint
`cd /home/z/my-project && bun run lint 2>&1 | tail -10` → exit code 0, no errors, no warnings.
