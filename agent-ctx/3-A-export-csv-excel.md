# Task 3-A — CSV/Excel Export Buttons for All Major Tables

**Agent**: subagent-3-A
**Task**: Add CSV and Excel export buttons to all major tables in the HR app.

## Files Owned
- `/src/app/api/export/route.ts` (NEW) — Generic export GET endpoint
- `/src/components/hr/shared/export-button.tsx` (NEW) — Reusable dropdown button
- `/src/components/hr/modules/employees.tsx` (MODIFY)
- `/src/components/hr/modules/attendance.tsx` (MODIFY)
- `/src/components/hr/modules/leave.tsx` (MODIFY)
- `/src/components/hr/modules/payroll.tsx` (MODIFY)
- `/src/components/hr/modules/performance.tsx` (MODIFY — placeholder module, add to PageHeader)
- `/src/components/hr/modules/recruitment.tsx` (MODIFY — placeholder module, add to PageHeader)
- `/src/components/hr/modules/audit.tsx` (MODIFY)
- `/src/components/hr/modules/documents.tsx` (MODIFY — Generated tab + Email History tab)

## Approach
- Backend: single `/api/export` route that takes `?module=` + `?format=csv|excel` + filter params, queries the DB using the SAME filter logic as each module's list endpoint (mirror exactly), then builds a CSV string with UTF-8 BOM. For `excel` format, serve the same CSV body but with `application/vnd.ms-excel` content-type and `.xls` extension (Excel opens this natively).
- Frontend: small reusable `ExportButton` that uses shadcn `DropdownMenu` + `Button` (outline, sm, Download icon). On click constructs a query string from current filters and triggers download via a temporary `<a>` element. 500ms loading spinner; `sonner` toast on success.

## Notes for Future Agents
- The Performance and Recruitment modules are still placeholders (owned by other agents). I added an `ExportButton` to their `PageHeader` actions so it'll be present when those modules are implemented. If you replace those placeholders, please preserve the `ExportButton` import + usage.
- CSV escaping rules: wrap fields containing commas, quotes, or newlines in double quotes; escape inner quotes by doubling; include `\ufeff` BOM at the start.
- Module→filter mapping: each module passes a different set of filters. See the export-button calls in each module file.
