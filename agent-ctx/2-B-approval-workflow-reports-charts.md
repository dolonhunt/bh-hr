# Task 2-B — Document Approval Workflow + Enhanced Reports Module with Charts

## Agent
subagent-2-B (approval-workflow + reports-charts)

## Task
1. Build the full Document approval workflow (PENDING_APPROVAL → APPROVED → ISSUED → SENT) on top of the existing `GeneratedDocument` model — backend status-transition APIs + audit logs + lock-on-issue, plus a new Approval Queue tab UI in the Documents module.
2. Rewrite the Reports module as a real analytics dashboard: KPIs + 6 Recharts visualizations + a custom recruitment funnel, while keeping the existing on-demand CSV/Excel/PDF export cards.

## Files Created
- `/src/app/api/documents/pending-approval/route.ts` — GET returns PENDING_APPROVAL docs + queue KPIs (pending, approvedToday, issuedToday, rejectedToday).
- `/src/app/api/documents/[id]/approve/route.ts` — POST { note? } transitions PENDING_APPROVAL → APPROVED, writes AuditLog (DOCUMENT_STATUS_CHANGE) + Activity (DOCUMENT_APPROVED).
- `/src/app/api/documents/[id]/reject/route.ts` — POST { note? } transitions PENDING_APPROVAL → GENERATED, writes AuditLog + Activity (DOCUMENT_REJECTED).
- `/src/app/api/documents/[id]/issue/route.ts` — POST transitions APPROVED → ISSUED (locks content), writes AuditLog + Activity (DOCUMENT_ISSUED).
- `/src/app/api/reports/analytics/route.ts` — GET returns aggregate analytics: employee growth (12mo), attendance rate trend (30d), leave utilization by type, payroll by department (this month), document generation trend (6mo stacked by type), performance distribution histogram, recruitment funnel (cumulative counts per stage), and top-level KPIs.
- `/src/components/hr/modules/approval-queue.tsx` — Approval Queue UI rendered as the 5th tab in Documents. KPI row (Pending / Approved Today / Issued Today / Rejected Today), filter bar + "Approve All" bulk action, table of pending docs with quick Approve / Reject (with reason dialog) / Review (with optional note) / Preview actions, loading skeletons + empty state, sonner toasts.

## Files Modified
- `/src/lib/store.ts` — Added `"approval-queue"` to the `documentsTab` union type (persisted).
- `/src/app/api/documents/[id]/route.ts` — Rewrote PATCH to:
  - Validate every status transition against an allow-list (`VALID_TRANSITIONS` map).
  - Write a `DOCUMENT_STATUS_CHANGE` AuditLog on every transition with description `Document {docNumber} status changed from {oldStatus} to {newStatus}`.
  - Mirror the transition as an Activity on the employee timeline.
  - **Lock content edits** when `status ∈ {APPROVED, ISSUED, SENT, ARCHIVED}` — PATCH silently ignores `title`/`content`/`month` changes when the document is in a finalized state.
- `/src/components/hr/modules/documents.tsx`:
  - Added the 5th TabsTrigger "Approval Queue" (TabsList is now `md:grid-cols-5`).
  - Wired `{documentsTab === "approval-queue" && <ApprovalQueue onPreview={setPreviewDoc} />}`.
  - Added a `StatusFlowPills` component rendering `Draft → Generated → Pending → Approved → Issued → Sent` as small horizontal pills with the current stage highlighted in primary and past stages in primary/15. The `Status` table column header became `Status Flow` and now renders these pills.
  - Replaced the row action buttons with a single Preview icon button + a `MoreVertical` dropdown containing **status-based action items at the top** (Submit for Approval / Approve / Reject / Issue & Lock / Send Email / Resend Email) followed by the standard actions (Preview, Download DOCX/PDF, Send Email, Archive).
  - Status transitions call the dedicated `/approve`, `/reject`, `/issue` endpoints; the `submitForApproval` flow uses PATCH with `{status:"PENDING_APPROVAL"}`.
- `/src/components/hr/modules/reports.tsx` — Full rewrite. Now has:
  - 4 KPI cards (Total Employees, Avg Attendance 30d %, Payroll This Month, Docs This Month).
  - **Analytics Dashboard** section: 6 Recharts in a responsive `lg:grid-cols-2` grid:
    1. Employee Growth — `LineChart` (hires + cumulative, 12 months)
    2. Attendance Rate Trend — `AreaChart` (30 days, gradient fill)
    3. Leave Utilization by Type — `PieChart` (donut with per-type colors)
    4. Payroll by Department — horizontal `BarChart` (this month's net salary)
    5. Document Generation Trend — stacked `BarChart` by type (6 months)
    6. Performance Score Distribution — `BarChart` histogram (0-40 / 41-60 / 61-75 / 76-85 / 86-100)
  - **Recruitment Funnel** section: custom horizontal funnel visualization with cumulative candidate count per stage (Applied → Screening → Shortlisted → Interview → Selected → Offer → Hired), conversion % between stages, and "at stage" count.
  - **Export Reports** section: the existing 5 report type cards + Generate dialog (CSV / Excel / PDF) preserved verbatim.
  - Loading skeletons while analytics load.
  - Chart color palette uses the requested: emerald (#10b981), amber (#f59e0b), rose (#ef4444), teal (#14b8a6), violet (#a855f7), orange (#f97316), fuchsia (#ec4899). NO indigo/blue.

## Smoke Tests Performed (curl)

```
1. PATCH /api/documents/{id} {status:PENDING_APPROVAL}  -> 200, status=PENDING_APPROVAL ✓
2. GET  /api/documents/pending-approval                 -> 200, total=1, kpis={pending:1,...} ✓
3. POST /api/documents/{id}/approve {note:"Looks good"} -> 200, ok=true, status=APPROVED ✓
4. POST /api/documents/{id}/issue                       -> 200, ok=true, status=ISSUED ✓
5. PATCH /api/documents/{id} {status:APPROVED}          -> 400 "Invalid status transition: ISSUED → APPROVED. Allowed: SENT, ARCHIVED" ✓ (validation works)
6. PATCH /api/documents/{id} {title:"HACKED",content:...} -> 200, title unchanged ✓ (lock-on-issue works)
7. PATCH second doc {status:PENDING_APPROVAL}           -> 200 ✓
8. POST /api/documents/{id}/reject {note:"Needs revision"} -> 200, status=GENERATED ✓
9. GET  /api/reports/analytics                          -> 200 with full payload:
   kpis: {totalEmployees:20, avgAttendanceRate:19, totalPayrollThisMonth:1609090, docsGeneratedThisMonth:9}
   employeeGrowth: 12 entries ✓
   attendanceTrend: 30 entries ✓
   leaveUtilization: 7 leave types with days + counts ✓
   payrollByDepartment: 8 departments ✓
   documentTrend: 6 months × 5 doc types (PROMOTION/NOC/WARNING/PAYSLIP/OFFER) ✓
   performanceDistribution: 5 buckets (0-40, 41-60, 61-75, 76-85, 86-100) ✓
   recruitmentFunnel: 7 stages with cumulative + at-stage counts ✓
```

## Lint Status
`bun run lint` returns **0 errors and 0 warnings** across the entire project (all my new files + modifications pass cleanly).

## Dev Server Status
All endpoints respond 200; the page renders cleanly. Latest dev log shows my new routes compiling and serving:
- `GET /api/documents/pending-approval 200`
- `POST /api/documents/{id}/approve 200`
- `POST /api/documents/{id}/issue 200`
- `POST /api/documents/{id}/reject 200`
- `PATCH /api/documents/{id} 200` (and 400 for invalid transitions)
- `GET /api/reports/analytics 200`

## Notes for Other Agents
- A parallel agent added `bulk-generate-dialog.tsx` + `/api/documents/bulk-generate` + `/api/documents/bulk-download`. I restored the BulkGenerateDialog wiring in documents.tsx after initially removing it (the file didn't exist yet when I started).
- The `/api/documents/bulk-download` route has a known runtime error (`{imported module [externals]/archiver}.default is not a function`) — NOT my file, but flagged for the documents-module agent. It sometimes succeeds (likely after a recompile), but the underlying `archiver` import needs fixing (likely the same `serverExternalPackages` treatment applied to pdfkit in next.config.ts).
- The status flow pills + status-based dropdown actions live inside the shared `DocumentsTable` component, so they appear in BOTH the "All Documents" tab and the "Generated" tab.
- The "Rejected Today" KPI in the approval queue is derived from the AuditLog (counting `DOCUMENT_STATUS_CHANGE` entries today whose description contains "to GENERATED"). This is accurate but does include documents that were rejected and then re-submitted — i.e. it counts "rejection events" not "currently-rejected documents". This is the right semantic for an approval-queue KPI.
- The recruitment funnel uses **cumulative** counts (candidates who reached stage X or beyond, excluding REJECTED). This gives a proper monotonically-decreasing funnel rather than the per-stage `atStage` count, which would not visualize correctly as a funnel.
