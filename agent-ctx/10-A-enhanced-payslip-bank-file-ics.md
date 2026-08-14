# Task 10-A: Enhanced Payslip PDF + Payroll Bank File Generation + Interview Calendar Export (ICS)

## Task ID: 10-A
## Agent: payslip-bank-ics-agent

## Task
Three high-impact payroll & recruitment export features:
1. **Enhanced Payslip PDF** — Generate a professional A4 portrait payslip PDF using the advanced payroll calculation (HRA, PF, progressive-slab TDS, gratuity) from `/src/lib/payroll-calc.ts`.
2. **Payroll Bank File Generation** — Generate bank transfer files for direct deposit, supporting both CSV and simplified NACHA fixed-width formats.
3. **Interview Calendar Export (ICS)** — Generate iCalendar (.ics) files for single interviews and for all upcoming interviews.

## Files Created/Modified

### NEW Backend API Routes
- `/src/app/api/payroll/payslip-pdf/route.ts` — GET `?employeeId=&month=` generates a professional payslip PDF using pdfkit. Uses `calculatePayroll()` from `/src/lib/payroll-calc.ts`.
- `/src/app/api/payroll/bank-file/route.ts` — GET `?month=&format=csv|nacha` generates bank transfer file for all PAID payroll records of the specified month. CSV with header + total row, or NACHA fixed-width (94-char) with File Header, Batch Header, Entry Detail, Batch Control, File Control records.
- `/src/app/api/interviews/[id]/ics/route.ts` — GET generates ICS for a single interview.
- `/src/app/api/interviews/ics-all/route.ts` — GET generates ICS for ALL upcoming (SCHEDULED + future) interviews.

### MODIFIED Frontend Components
- `/src/components/hr/modules/payslip-dialog.tsx`:
  * Added `FileDown`, `Sparkles` icons.
  * Added `downloadEnhancedPdf()` function that fetches `/api/payroll/payslip-pdf` and triggers browser download via Blob.
  * Added `downloadingPdf` state for button spinner.
  * In success state: Added a full "Advanced Payroll Breakdown" preview card showing Earnings (Basic, HRA, Special Allow., Gross) and Deductions (PF, Prof. Tax, TDS, Total) in a 2-col grid with the tax slab badge at the top, plus a highlighted Net Salary row at the bottom.
  * Added primary action "Download PDF (Enhanced)" button (full-width, emerald) above the existing download grid.
  * Renamed existing "PDF" basic-download button to "PDF (basic)" for clarity.
  * Added a new `MiniBreakdownRow` sub-component (compact label/value row without icon).
  * On generate, now also auto-fetches the breakdown if not already calculated, so the success state always shows the breakdown.
- `/src/components/hr/modules/payroll.tsx`:
  * Added `Landmark`, `FileSpreadsheet` icons.
  * Added `bankFileLoading` state (tracks which format is currently being generated).
  * Added `downloadBankFile(format)` function that fetches `/api/payroll/bank-file?month=&format=` and triggers Blob download. Reads the `X-Employee-Count` response header for the toast message.
  * Added a "Bank File" dropdown button (with Landmark icon) in the PageHeader actions, between ExportButton and Tax Configuration. Two menu items:
    - CSV Format (with description "Standard bank transfer CSV")
    - NACHA Format (with description "US fixed-width (94-char)")
  * Button shows a spinner and "Generating CSV…" or "Generating NACHA…" while in flight.
  * Toast on success: "Bank file generated for {N} employees".
- `/src/components/hr/modules/interviews.tsx`:
  * Added `CalendarPlus`, `Download` icons.
  * Extended `InterviewFilters` to accept an optional `extraAction?: React.ReactNode` prop (rendered between the type-select and the "Schedule Interview" button).
  * `UpcomingTab`: Added `exportingAll` + `downloadingId` state. Added `downloadAllIcs()` (calls `/api/interviews/ics-all`) and `downloadSingleIcs(i)` (calls `/api/interviews/[id]/ics`) functions. Passes "Export All (ICS)" button to InterviewFilters as `extraAction`. Passes `onAddToCalendar` + `downloadingIcs` props to each `UpcomingCard`.
  * `UpcomingCard`: Added `onAddToCalendar` + `downloadingIcs` props. Added a new "Calendar" button (with CalendarPlus icon, outline variant) next to the existing Join/MoreVertical buttons in the right-side actions. Shows a Loader2 spinner while downloading.

## Technical Notes

### Payslip PDF Layout (A4 portrait, pdfkit)
1. **Header band** (emerald-700 background, 80px tall): Company name (left), company address + email/phone contact line, "PAYSLIP" title (28pt right), month/year (right), document number (right, italic).
2. **Employee info table** (2 columns × 3 rows): Label (gray bg) + Value for Employee Name, Employee ID, Department, Designation, Pay Period, Payment Date.
3. **Earnings + Deductions side-by-side tables**: Each has a colored header band (emerald for earnings, rose for deductions), alternating row backgrounds, then a tinted total row at the bottom (Gross Salary / Total Deductions).
4. **Net Salary highlight box** (full-width): Emerald-tinted background, left emerald accent bar, "NET SALARY (Take-home)" label + small subtitle, large 20pt emerald-700 amount on the right.
5. **Employer contributions note** (gray box): "Gratuity (4.81% of basic) — paid by employer, not deducted from employee salary." with the gratuity amount on the right.
6. **TDS Slab Breakdown** (optional, only if slabs apply): Lists each slab label, rate, taxable amount, and tax amount.
7. **Footer** (centered): "This is a computer-generated payslip and does not require a signature." + document number + generation date.

### Bank File CSV Format
Header row + one row per PAID employee + total row. Columns: Employee ID, Employee Name, Bank Name, Account Number, IFSC/Routing, Amount, Payment Date, Reference. Account numbers are masked (****1234). Amounts formatted with 2 decimals. Total row shows employee count + total amount + month reference.

### Bank File NACHA Format
94-char fixed-width lines, blocked to multiples of 10 (with `9`-filler rows). Records:
- **File Header (1)** — record type "1", priority code, immediate destination/origin (placeholder zeros), file creation date/time, file ID modifier "A", record size "094", blocking factor "10", format code "1", destination name "BANK", origin name (company).
- **Batch Header (1)** — record type "5", service class code "220" (credits only), company name, company identification, standard entry class "CCD", entry description "PAYROLL", effective entry date, ODFI ID, batch number.
- **Entry Detail (1 per employee)** — record type "6", receiving DFI routing (from bankIfsc digits), check digit "0", receiving account number, transaction code "22" (checking deposit), amount in cents (10 digits), individual ID (employee code), individual name (uppercase, 22 chars).
- **Batch Control (1)** — record type "8", service class code, entry/addenda count, entry hash (sum of routing numbers), total debit/credit amounts (cents), company identification.
- **File Control (1)** — record type "9", batch count, block count, entry/addenda count, entry hash, total debit/credit amounts.

### ICS Format (RFC 5545)
- Lines joined with CRLF.
- Single-interview ICS: VCALENDAR with one VEVENT (UID={interviewId}@teamhub-hr, DTSTAMP=current UTC, DTSTART/DTEND from scheduledAt ± duration, SUMMARY, DESCRIPTION with type/interviewer/notes, LOCATION (meetingLink or location), STATUS:CONFIRMED, ORGANIZER with CN + mailto).
- All-upcoming ICS: VCALENDAR with multiple VEVENTs, sorted ascending by scheduledAt. Filters to status=SCHEDULED + scheduledAt >= now - 1h grace. Includes `X-WR-CALNAME:TeamHub HR Interviews (N)` header.

### AuditLog entries created
- `PAYSLIP_PDF_GENERATED` — action=`PAYSLIP_PDF_GENERATED`, entityType=`Payroll`, includes metadata with docNumber, netSalary, tds, pf, gratuity.
- `BANK_FILE_GENERATED` — action=`BANK_FILE_GENERATED`, description=`Generated bank transfer file for {month} ({N} employees, total: {amount}). Format: {CSV|NACHA}.`, includes metadata with month/format/employeeCount/totalAmount.
- `INTERVIEW_ICS_EXPORTED` — action=`INTERVIEW_ICS_EXPORTED`, entityType=`Interview`, includes interviewId, candidateName, scheduledAt.
- `INTERVIEW_ICS_ALL_EXPORTED` — action=`INTERVIEW_ICS_ALL_EXPORTED`, entityType=`Interview`, includes count + firstScheduledAt.

## Verification

- `bun run lint` — 0 errors, 0 warnings (after parallel subagent 10-B's work was also completed).
- TypeScript: my files have zero tsc errors.
- Smoke tests (via curl through localhost:3000):
  * GET `/api/payroll/payslip-pdf?employeeId=...&month=2026-08` → HTTP 200, application/pdf, 4079 bytes, 2 pages, valid PDF v1.3.
  * GET `/api/payroll/bank-file?month=2026-08&format=csv` → HTTP 200, text/csv, 1493 bytes, header + 14 employee rows + TOTAL row.
  * GET `/api/payroll/bank-file?month=2026-08&format=nacha` → HTTP 200, application/octet-stream, 1900 bytes, properly formatted 94-char fixed-width lines (File Header → Batch Header → Entry Detail × N → Batch Control → File Control).
  * GET `/api/interviews/[id]/ics` → HTTP 200, text/calendar, 571 bytes, valid VCALENDAR with VEVENT.
  * GET `/api/interviews/ics-all` → HTTP 200, text/calendar, 505 bytes, VCALENDAR with multiple VEVENTs (correctly filters to upcoming only).
  * When no upcoming interviews exist, ics-all returns HTTP 404 with `{error: "No upcoming interviews to export."}`.
  * When no PAID payrolls exist for the month, bank-file returns HTTP 404 with descriptive error message.
- z-ai-web-dev-sdk not used.
- No Prisma schema changes (interviews stored as Activity rows with JSON description, payslip PDFs use existing Payroll model).
- Emerald primary palette throughout, no indigo/blue colors.
