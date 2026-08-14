# Task 5-C: Performance + Recruitment Module Rebuild

## Task
Both `/src/components/hr/modules/performance.tsx` and `/src/components/hr/modules/recruitment.tsx` were accidentally overwritten with placeholder "Coming Soon" stubs by a prior agent. Backend APIs at `/api/performance`, `/api/jobs`, `/api/candidates` already work. Rebuild both modules from scratch while preserving the `ExportButton` shared component.

## Work Log

### Performance module (`/src/components/hr/modules/performance.tsx`)
Replaced 27-line placeholder with full ~1078-line implementation:
- **PageHeader**: "Performance Management" + description "Track employee goals, reviews, and ratings" with `TrendingUp` icon.
- **Header actions**: Preserved `ExportButton module="performance" filters={{search, reviewPeriod, status}}` PLUS a new "Create Review" button (label collapses to "New" on mobile).
- **KPI cards (4)**: Total Reviews (ClipboardList), Avg Score (TrendingUp emerald — value colored by tier), Top Performers (Award amber — score ≥ 85), Pending Reviews (Target rose — status=SUBMITTED). KPIs driven by a separate `["performance-stats"]` query that fetches up to 500 rows so the numbers reflect the whole dataset, not just the current page.
- **Filters**: Search input (matches reviewer/period/comments/employee.fullName/employee.employeeId), Review Period text input (e.g. "Q2 2025"), Status dropdown (DRAFT/SUBMITTED/REVIEWED/FINALIZED). All reset page to 1 on change.
- **Table** inside a `Card`: Employee (AvatarBadge + name + mono employeeId), Review Period, Reviewer (hidden on mobile), Overall Score (animated colored progress bar — `scoreBarColor` returns rose<40 / amber<60 / yellow<75 / emerald≥75 — plus colored numeric label), StatusBadge, Actions dropdown (View / Edit / Delete with confirm). Row click opens detail dialog. Actions menu uses `e.stopPropagation()` to avoid triggering row click.
- **Create/Edit dialog** (`ReviewFormDialog` + `ReviewFormBody` — split so the body can be remounted via `key` when the underlying review changes, avoiding useEffect-setState lint):
  - Employee searchable select (Popover + Command from shadcn) with avatar + name + employeeId + department, full-text search, disabled when editing.
  - Review Period text input + Reviewer text input (2-col grid).
  - 5 score sliders (Goals, Quality, Attendance, Teamwork, Communication) — 0-100 step 1, each with live colored numeric value.
  - Live "Overall" pill in the slider panel header — average of 5 dimensions, colored by tier.
  - Comments textarea.
  - Status select (DRAFT/SUBMITTED only — REVIEWED/FINALIZED are downstream states).
  - Submit calls `POST /api/performance` (create) or `PATCH /api/performance/[id]` (edit). On success: invalidates `["performance"]` + `["performance-stats"]`, shows sonner toast, closes dialog.
- **Detail dialog** (`ReviewDetailDialog`): Employee header card (avatar, name, employeeId, department · designation, big colored overall score), meta row (period Badge, StatusBadge, "Updated {timestamp}"), two-column grid:
  - **RadarChart** (Recharts) with PolarGrid, PolarAngleAxis (5 dimensions), PolarRadiusAxis (0-100), Radar (emerald fill, 35% opacity). Height 256px, ResponsiveContainer.
  - Per-dimension score bars (same color tiers as the table) with colored numeric labels.
  - Comments block (only if comments present).
  - Footer: Close + "Edit Review" (closes detail, opens edit dialog prefilled).
- **Pagination**: Previous / Page X of Y / Next buttons.
- **Loading**: 6 skeletons inside a Card. **Empty state**: EmptyState with "Create Review" CTA when no items.
- Types: `EmployeeOption`, `PerformanceReview`. Helpers: `scoreBarColor`, `scoreTextColor`, `DIMENSIONS` const array (used by form, body, and detail for DRY).

### Recruitment module (`/src/components/hr/modules/recruitment.tsx`)
Replaced 27-line placeholder with full ~1100-line implementation:
- **PageHeader**: "Recruitment" + description "Manage job postings and candidate pipelines" with `Briefcase` icon. Header actions render `ExportButton module="candidates"` ONLY when the Candidates tab is active (`tab === "candidates"`) — matches the existing convention. ExportButton placement preserves the prior agent's wiring.
- **Tabs**: "Jobs" (Briefcase icon) | "Candidates" (Users icon) using shadcn Tabs.

**Jobs tab:**
- **KPI cards (4)**: Open Jobs (Briefcase primary), Total Vacancy (Users amber), Candidates Applied (UserPlus sky — sums `candidateCount` across visible jobs), Hired This View (UserCheck emerald — sums `stageCounts.HIRED`).
- **Filter bar**: Search input (matches title/description/location/requirements), Department dropdown (loaded from `/api/departments`), Status dropdown (OPEN/CLOSED/ON_HOLD/FILLED), "Create Job" button. All reset page to 1.
- **Job cards grid**: responsive `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`. Each `JobCard`:
  - Top: 1px department color stripe (`style={{background: deptColor}}`).
  - Title (heading) + department name with color dot.
  - Status badge in top-right.
  - Row of meta: Employment type badge (capitalized), Location with MapPin, Vacancy count, Closing date with CalendarDays.
  - Salary range (`formatCurrency(min) – formatCurrency(max)`).
  - Footer: candidate count + actions dropdown (View Candidates / Edit / Archive [PATCH status=CLOSED] / Delete [confirm]).
- **Create/Edit Job dialog**: title, department, employmentType, location, vacancy, closingDate, description (textarea), requirements (textarea), salaryMin, salaryMax, status. Remounted via `key` for edit-mode prefill. Submits POST `/api/jobs` or PATCH `/api/jobs/[id]`.
- **JobCandidatesDialog**: read-only list of applicants for a job (fetches `/api/candidates?jobId=...`), each row = avatar + name + email + StatusBadge.

**Candidates tab:**
- **Top bar**: Search input (matches name/email/phone/skills) + "Add Candidate" button.
- **Pipeline board**: horizontal scrollable flex container with 7 columns (one per stage): APPLIED → SCREENING → SHORTLISTED → INTERVIEW → SELECTED → OFFER → HIRED. Each `PipelineColumn`:
  - Header: stage name + count badge, with a colored top border (amber → sky → teal → emerald gradient as candidate advances).
  - Body: vertical list of candidate cards (avatar, name, email, experience years, "View →" link). Max height 70vh with internal scroll.
  - Empty state per column: "No candidates".
  - Column width: 18rem (288px) shrink-0, so columns don't compress on narrow screens.
- **Rejected candidates**: collapsed `Collapsible` at the bottom with rose tint, shows count badge, expand to reveal grid of rejected candidates (clicking opens detail).
- **Candidate detail dialog** (`CandidateDetailDialog`):
  - Header card: AvatarBadge lg + name + email (with Mail icon) + phone (with Phone icon) + department color dot, StatusBadge top-right.
  - 4-tile info grid: Experience, Expected Salary (`formatCurrency`), Applied date, Updated (`relativeTime`).
  - Skills chips: comma-split, each rendered as emerald-tinted Badge.
  - Editable interview notes: Textarea + "Save" button (PATCHes `interviewNotes`). Save spinner uses inline border-ring spinner.
  - "Move to Stage" section: 8 buttons (7 pipeline stages + REJECTED). Current stage is disabled (default variant). REJECTED button is rose-tinted. Clicking any button PATCHes `status` and closes the dialog so the pipeline board re-renders in view.
  - Notes state sync uses the React "adjust state during render" pattern (tracking `trackedId` in state, comparing to `candidate.id`, calling setState only when they differ) — avoids `react-hooks/set-state-in-effect` lint error.
- **Add Candidate dialog**: name, email, phone, job select (loaded from `/api/jobs?pageSize=100`), experience, expectedSalary, skills (textarea, comma-separated). Submits POST `/api/candidates` with `status: "APPLIED"`.

### Cross-cutting
- All data fetching uses TanStack Query with `placeholderData: (prev) => prev` for list queries (preserves scroll position during refetch).
- All mutations invalidate the relevant query keys (`["performance"]`, `["performance-stats"]`, `["jobs"]`, `["candidates"]`).
- All feedback via `sonner` toast (success + error).
- All status displays via shared `StatusBadge` (which already maps APPLIED/SCREENING/SHORTLISTED/INTERVIEW/SELECTED/OFFER/HIRED/REJECTED/OPEN/CLOSED/ON_HOLD/FILLED colors).
- All avatars via shared `AvatarBadge`.
- All KPIs via shared `KpiCard`.
- All empty states via shared `EmptyState`.
- All currency via `formatCurrency`, dates via `formatDate`, relative times via `relativeTime`, conditional classes via `cn`.
- NO indigo/blue colors. Emerald primary throughout (KPI icon backgrounds use emerald/amber/sky/rose tiers).
- Mobile responsive: KPI grid is 2 cols on mobile / 4 on lg; filter bar stacks on mobile; table hides Reviewer column on mobile; pipeline scrolls horizontally on mobile; dialogs use `max-h-[90vh] overflow-y-auto`.
- Loading states: skeleton grids. Error states: try/catch with sonner toast.

## Files Modified
1. `/src/components/hr/modules/performance.tsx` — REWROTE (27 → 1078 lines). Placeholder → full Performance Management module with KPI cards, filters, table with score bars, create/edit dialog with 5 sliders + employee combobox, detail dialog with RadarChart, pagination, loading/empty states.
2. `/src/components/hr/modules/recruitment.tsx` — REWROTE (27 → 1108 lines). Placeholder → full Recruitment module with Jobs/Candidates tabs, job cards grid, candidate pipeline board (7 columns + rejected collapsible), create/edit dialogs, candidate detail dialog with stage transition buttons.

## Verification
- `cd /home/z/my-project && bun run lint 2>&1 | tail -10` → exit code 0, no errors, no warnings.
- `bunx tsc --noEmit` → 0 errors in either of my 2 files (all reported errors are pre-existing in `prisma/seed.ts`, `src/app/api/payroll/route.ts`, `src/lib/document-renderers.ts`, `src/hooks/use-keyboard-shortcuts.ts`, `examples/`, `skills/` — none caused by my changes).
- API smoke tests against the running dev server (port 3000):
  - `GET /api/performance?pageSize=2` → 200, returns array of 8 seed reviews with employee/department/designation populated.
  - `GET /api/jobs?pageSize=2` → 200, returns 3 seed jobs with `candidateCount` + `stageCounts` populated.
  - `GET /api/candidates?pageSize=2` → 200, returns 8 seed candidates with `job.department` populated.
  - `GET /` → 200, homepage renders (40KB HTML, no runtime errors in dev.log).
- Dev server log shows successful compile + 200 responses for `/api/performance`, `/api/jobs`, `/api/candidates`, `/api/departments`, and `/`.

## Stage Summary
- Performance module and Recruitment module are no longer placeholders — they are fully functional with all features specified: KPI cards, filters, table/cards, create/edit dialogs with all required fields, detail dialogs (RadarChart for performance, stage transitions for candidates), pipeline board, rejected collapsible, loading skeletons, empty states, mobile responsiveness, emerald palette, TanStack Query, sonner toasts, shadcn/ui components, and shared component reuse.
- Both `ExportButton` instances preserved (performance in PageHeader next to Create Review button; candidates in PageHeader when Candidates tab active).
- 0 lint errors, 0 TypeScript errors in my files. All API endpoints verified via curl. No Prisma schema changes. Dev server not restarted.
