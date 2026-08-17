# BH HR — FINAL CODING AGENT HANDOFF
## Current Build → Final BH HR Production Upgrade

**Status:** FINAL — DIRECT IMPLEMENTATION HANDOFF  
**Product:** BH HR  
**Company:** Beyond Headlines  
**Mode:** Upgrade the existing application in place. DO NOT rebuild from scratch.

---

## 1. AGENT MISSION

Upgrade the current BH HR application to the final production-ready version.

This is an **implementation specification**, not merely a review.

The agent must:

1. Inspect the current repository and live preview.
2. Preserve all working functionality and data relationships.
3. Remove all temporary/demo branding.
4. Apply the supplied `ux.jpg` visual system throughout the application.
5. Use the official Beyond Headlines logo and B mark.
6. Build the reusable design system first.
7. Upgrade all HR screens using that system.
8. Complete document generation and direct employee email workflows.
9. Fix P0 authentication, authorization, and backup-security issues.
10. Fix analytics/data inconsistencies.
11. Run responsive and accessibility QA.
12. Run the final acceptance tests before declaring completion.

**Do not restart or unnecessarily rewrite the application.**

---

# 2. AUTHORITATIVE REFERENCES

## Primary visual reference — ux.jpg

https://i.postimg.cc/ZqXkpQzc/ux.jpg

Treat this as the **visual source of truth**, not loose inspiration.

It defines:

- Base layer
- Raised layer
- Inset layer
- Pressed layer
- Elevation
- Borders
- Radius
- Iconography
- Controls
- Navigation
- Data display
- Feedback
- Spacing
- Overall visual personality

Target:

**warm + premium + restrained + enterprise-grade neumorphism**

Do not replace it with glassmorphism or a generic SaaS theme.

## HR UX reference — TeamHub

https://ui8.net/peterdraw-59d38a/products/teamhub--hr-management-dashboard-ui-figma-template?rel=timer

Use TeamHub only for HR information architecture, workflows, page structure, data presentation, and responsive patterns.

Do not copy TeamHub branding, logo, proprietary assets, or identity.

## Official BH full logo

https://i.postimg.cc/Vk8rGFCM/Logo.png

Use for login, expanded sidebar, documents, email branding, organization settings, and formal brand placements.

## Official BH B mark

https://i.postimg.cc/7P5Zr1bh/B.png

Use for collapsed sidebar, mobile header, favicon, app icon, and compact placements.

Create reusable:

```text
<BrandLogo />
<BrandMark />
```

---

# 3. BRAND IDENTITY — MANDATORY

Product:

```text
BH HR
```

Company:

```text
Beyond Headlines
```

Never use as current branding:

```text
TeamHub
TeamHub HR
Northwind
Northwind Labs
NWL
northwindlabs.io
Generic HR Dashboard
Generic HR Management
```

---

# 4. COMPLETE BRANDING AUDIT

Search the entire repository and application for:

```text
TeamHub
TeamHub HR
Northwind
Northwind Labs
NWL
northwindlabs.io
temporary logo
placeholder logo
demo logo
```

Remove or replace temporary identity in:

- Browser title
- Favicon
- Login
- Sidebar
- Header
- Dashboard
- Employee screens
- Documents
- Document templates
- Generated DOCX
- Generated PDF
- Email templates
- Email sender identity
- Settings
- Metadata
- Seed data
- API defaults
- Demo records
- Company configuration

A logo-only replacement is insufficient.

---

# 5. EXISTING BUILD PRESERVATION

This is an **upgrade**, not a rebuild.

Preserve existing working:

- APIs
- Database models
- CRUD
- Employee records
- Attendance
- Leave
- Payroll
- Documents
- Recruitment
- Reports
- Settings
- Existing relationships
- Existing working integrations

Refactor where required, but do not remove working functionality merely to simplify the redesign.

---

# 6. EXACT VISUAL DESIGN SYSTEM

The supplied `ux.jpg` reference is authoritative.

Build the design system **before redesigning the pages**.

## Surface layers

### Base
Main background and large flat regions.

### Raised
KPI cards, important cards, primary actions, selected navigation, important controls.

### Inset
Inputs, search, filters, data-entry zones, recessed controls.

### Pressed
Active buttons, toggles, active navigation, click feedback.

Do not use one generic shadow for every component.

## Elevation

```text
LEVEL 1 — FLAT
LEVEL 2 — HOVER
LEVEL 3 — RAISED
LEVEL 4 — MODAL
LEVEL 5 — POPOVER
```

## Border tokens

```text
1px — THIN
2px — REGULAR
4px — THICK
```

## Radius

```text
4px
8px
12px
16px
24px
```

## Iconography

Use **Lucide React**.

```text
16px
20px
24px
```

Default stroke:

```text
2px
```

## Colors

Primary background:

```text
#F3EDE1 range
```

Primary accent:

```text
#005C5A range
```

Use near-black text and warm muted gray secondary text.

Use soft success/warning/error/info states.

Do not introduce unrelated bright colors.

## Shadows

Use warm, subtle shadows and highlights.

Avoid:

- Hard black shadows
- Excessive blur
- Large floating shadows
- Multiple unrelated shadow systems

## Typography

Use strong condensed/sans-serif headings and readable body typography.

Hierarchy:

```text
Page Title
Section Title
Card Title
Body
Secondary
Caption
```

Use strong numeric typography for metrics.

---

# 7. REQUIRED REUSABLE COMPONENTS

Build:

```text
Button
Input
Select
Checkbox
Radio
Switch
Slider
Tabs
Breadcrumbs
Pagination
Stepper
Card
Table
List Item
Avatar
Badge
Tooltip
Modal
Toast
Alert
Progress
Spinner
Skeleton
Empty State
```

Every appropriate component must support:

```text
Default
Hover
Active
Pressed
Focus
Disabled
Loading
Error
Success
```

Do not implement only the default state.

---

# 8. DESIGN-SYSTEM PAGE — REQUIRED

Create:

```text
/design-system
```

Show:

### Foundations
- Colors
- Typography
- Spacing
- Radius
- Borders
- Shadows
- Elevation

### Components
All reusable components above.

Show interactive states visibly.

The design-system page is the visual QA source of truth.

Do not independently style each page with unrelated Tailwind/shadcn defaults.

---

# 9. VISUAL TARGET

The final application must feel like:

```text
BH HR
+
ux.jpg visual language
+
TeamHub-inspired HR information architecture
+
Premium enterprise HR software
```

It must NOT look like:

```text
Generic SaaS dashboard
Glassmorphism
Blue/purple admin template
TeamHub clone
Northwind Labs product
```

---

# 10. MAIN NAVIGATION

Primary:

```text
Dashboard
Employees
Attendance
Leave
Payroll
Performance
Recruitment
Documents
Settings
```

Existing functional secondary modules may remain:

```text
Interviews
Feedback
Training
Expenses
Timesheets
Assets
Reports
Audit Log
```

Group secondary modules logically if necessary.

---

# 11. DASHBOARD

KPIs:

```text
Total Employees
Present Today
On Leave
Late Today
Pending Leave
Documents Generated
Documents Sent
Failed Emails
```

Widgets:

```text
Attendance Overview
Employee Overview
Leave Overview
Recent Employees
Recent Documents
Upcoming Birthdays
Upcoming Events
Pending Actions
```

Quick actions:

```text
Add Employee
Generate Document
Create Payslip
Add Attendance
Add Leave
```

---

# 12. EMPLOYEES

Support:

```text
Employee List
Employee Grid
Add Employee
Employee Profile
```

Table:

```text
Photo
Name
Employee ID
Role
Department
Designation
Joining Date
Status
Actions
```

Actions:

```text
View
Edit
Generate Document
Send Document
Upload Document
```

Include search, filters, pagination, loading, empty, and error states.

---

# 13. EMPLOYEE PROFILE

Central HR workspace.

Tabs:

```text
Overview
Personal Info
Employment
Attendance
Leave
Payroll
Performance
Documents
Activity
```

Actions:

```text
Edit Employee
Generate Document
Upload Document
```

HR should be able to perform most employee-level tasks from this page.

---

# 14. EMPLOYEE DATA

Personal:

```text
Full name
Employee ID
Photo
Date of birth
Gender
Phone
Personal email
Official email
Address
Emergency contact
```

Employment:

```text
Department
Role
Designation
Employment type
Joining date
Confirmation date
Reporting manager
Employment status
Work location
```

Payroll:

```text
Basic salary
Allowances
Deductions
Tax
Bank details
Payment method
```

Files:

```text
CV
NID/Passport
Certificates
Contract
Other files
```

---

# 15. ATTENDANCE

Provide:

```text
Attendance Dashboard
Attendance Table
Attendance Entry
Attendance Report
```

KPIs:

```text
Present
Absent
Late
Leave
```

Table:

```text
Employee
Date
Check In
Check Out
Working Hours
Late
Overtime
Status
```

Filters:

```text
Date
Employee
Department
Status
```

Actions:

```text
Add
Edit
Import
Export
```

---

# 16. LEAVE

KPIs:

```text
Total Requests
Pending
Approved
Rejected
```

Types:

```text
Annual
Casual
Sick
Maternity
Paternity
Unpaid
Other
```

Request:

```text
Employee
Leave Type
Start Date
End Date
Number of Days
Reason
Attachment
```

Actions:

```text
Approve
Reject
Edit
View
```

Implement overlap detection, holiday/weekend calculation, policy-aware validation, and approval audit trail.

---

# 17. PAYROLL

Dashboard:

```text
Total Payroll
Basic Salary
Allowances
Deductions
Net Payroll
```

Record:

```text
Employee
Payroll Month
Basic Salary
Allowances
Deductions
Tax
Net Salary
Payment Date
Status
```

Actions:

```text
Create Payroll
Edit
Approve
Generate Payslip
```

Production controls:

- Payroll locking
- Approval separation
- Immutable approved periods
- Calculation audit trail
- Recalculation/version history

---

# 18. PAYSLIP

Workflow:

```text
Employee
↓
Select Month
↓
Generate Payslip
↓
Preview
↓
Generate PDF/DOCX
```

Include:

```text
Beyond Headlines
BH Logo
Employee Name
Employee ID
Role
Department
Month
Basic Salary
Allowances
Deductions
Tax
Net Salary
Payment Date
Document Number
```

---

# 19. PERFORMANCE

Fields:

```text
Employee
Review Period
Reviewer
Goals
Quality
Attendance
Teamwork
Communication
Overall Score
Comments
```

Actions:

```text
Create Review
Edit
Submit
Generate Performance Document
```

---

# 20. RECRUITMENT

Jobs:

```text
Job Title
Department
Employment Type
Location
Vacancy
Closing Date
Status
```

Candidates:

```text
Name
Email
Phone
Position
CV
Experience
Skills
Interview Notes
Status
```

Pipeline:

```text
Applied
↓
Screening
↓
Shortlisted
↓
Interview
↓
Selected
↓
Offer
↓
Hired
```

---

# 21. DOCUMENTS — CORE MODULE

Navigation:

```text
Documents
├── All Documents
├── Templates
├── Generated Documents
└── Email History
```

Document types include:

### Employment
- Offer Letter
- Appointment Letter
- Employment Contract
- Joining Letter
- Confirmation Letter

### Salary
- Payslip
- Salary Certificate
- Increment Letter
- Salary Revision Letter

### HR
- Promotion Letter
- Transfer Letter
- Warning Letter
- Show Cause Notice
- Experience Certificate
- Employment Certificate
- NOC

### Leave
- Leave Approval
- Leave Cancellation

### Separation
- Resignation Acceptance
- Relieving Letter
- Experience Certificate
- Final Settlement

Allow custom document types.

---

# 22. TEMPLATE MANAGEMENT

HR can:

```text
Create Template
Edit Template
Duplicate Template
Archive Template
Preview Template
```

Metadata:

```text
Name
Type
Description
Status
Version
Effective Date
```

---

# 23. DOCUMENT VARIABLES

Employee:

```text
{{employee.name}}
{{employee.id}}
{{employee.role}}
{{employee.designation}}
{{employee.department}}
{{employee.joining_date}}
{{employee.confirmation_date}}
{{employee.salary}}
{{employee.email}}
{{employee.phone}}
{{employee.address}}
```

Company:

```text
{{company.name}}
{{company.short_name}}
{{company.logo}}
{{company.address}}
{{company.email}}
{{company.phone}}
{{company.website}}
```

Document:

```text
{{document.number}}
{{document.date}}
{{document.issue_date}}
```

Payroll:

```text
{{payroll.month}}
{{payroll.basic_salary}}
{{payroll.allowances}}
{{payroll.deductions}}
{{payroll.tax}}
{{payroll.net_salary}}
```

Make variable resolution extensible.

---

# 24. DOCUMENT GENERATION

Workflow:

```text
Employee Profile
↓
Generate Document
↓
Select Type
↓
Select Template
↓
Auto-load Employee Data
↓
Populate Variables
↓
Preview
↓
Generate
```

HR should not manually re-enter employee data unless intentionally overriding a generated field.

---

# 25. DOCX / PDF

Generate actual:

```text
.docx
.pdf
```

Preserve:

```text
Formatting
Tables
Headers
Footers
Images
Signatures
Page Layout
Variables
Document Number
```

Options:

```text
Generate DOCX
Generate PDF
Generate DOCX + PDF
```

Validate actual generated files, not only API responses.

---

# 26. DOCUMENT NUMBERING

Default:

```text
BH/HR/APPT/08162026/EMP001
```

Pattern:

```text
{COMPANY}/{DEPARTMENT}/{DOCUMENT_TYPE}/{DATE}/{EMPLOYEE_ID}
```

Configurable:

```text
Prefix
Department Code
Document Type Code
Date Format
Employee ID
Sequence
```

Default prefix must be:

```text
BH
```

---

# 27. TEMPLATE VERSIONING

Support:

```text
v1.0
v1.1
v2.0
```

Generated documents permanently retain the exact template version used.

Updating a template must not modify historical documents.

---

# 28. EMPLOYEE DOCUMENT REPOSITORY

Categories:

```text
Employment
Salary
Performance
Leave
Other
```

Actions:

```text
Preview
Download
Send Email
Delete
Archive
```

Metadata:

```text
Employee
Document Type
Template Version
Document Number
Created Time
Issued Time
Status
Email Status
```

---

# 29. APPROVAL FLOW

Support:

```text
Draft
↓
Generated
↓
Pending Approval
↓
Approved
↓
Issued
↓
Sent
```

Approved/issued documents should be locked.

---

# 30. DIRECT EMAIL DELIVERY

Every generated document must provide:

```text
Preview
Download
Send to Employee
```

Composer:

```text
To
CC
BCC
Subject
Message
Attachment
```

Default recipient:

```text
Official Employee Email
```

Optional fallback:

```text
Personal Employee Email
```

HR can edit recipient before sending.

---

# 31. EMAIL TEMPLATES / BRANDING

Templates:

```text
Payslip Email
Appointment Letter Email
Offer Letter Email
Experience Certificate Email
Salary Certificate Email
Leave Approval Email
Custom HR Email
```

Variables:

```text
{{employee.name}}
{{employee.role}}
{{employee.department}}
{{company.name}}
{{document.number}}
{{document.date}}
{{payroll.month}}
```

Sender identity:

```text
BH HR
```

or:

```text
HR Department — Beyond Headlines
```

Use official BH branding.

Never expose SMTP/API credentials in the frontend.

---

# 32. EMAIL TRACKING / RESEND

Track:

```text
Document
Employee
Recipient
Subject
Sent By
Sent Date
Status
```

Statuses:

```text
Queued
Sent
Delivered
Failed
Bounced
```

Every sent document must support:

```text
Send
Resend
```

Preserve complete history.

---

# 33. BULK DOCUMENTS / EMAIL

Generation:

```text
Select Employees
↓
Select Document Type
↓
Select Template
↓
Generate
↓
Review
↓
Download ZIP
```

Bulk email:

```text
Select Employees
↓
Generate Individual Documents
↓
Review
↓
Send
```

Validate every:

```text
employee ↔ document ↔ recipient
```

Employee A must never receive Employee B's document.

Maintain individual email logs.

---

# 34. SETTINGS

Provide:

```text
Organization
Departments
Roles
Designations
Leave Types
Email Settings
Document Numbering
Document Templates
```

Organization defaults:

```text
Company Name: Beyond Headlines
Short Name: BH
Logo: Official BH Logo
Currency
Timezone
Date Format
Sender Name
Address
Phone
Email
Website
```

Email settings:

```text
Sender Name
Sender Email
SMTP Host
SMTP Port
Username
Password/API Key
Encryption
```

Store credentials securely on backend.

Provide:

```text
Send Test Email
```

---

# 35. SEARCH / REPORTS / AUDIT

Global search:

```text
Employees
Employee ID
Role
Department
Documents
Document Number
Candidates
```

Reports:

```text
Employee Report
Attendance Report
Leave Report
Payroll Report
Document Report
```

Export:

```text
PDF
Excel
CSV
```

Audit log must track:

```text
Login
Employee Created
Employee Updated
Employee Deleted
Document Generated
Document Approved
Document Issued
Document Sent
Document Downloaded
Email Failed
Settings Changed
Backup Export
Backup Import
Backup Reset
```

Record:

```text
Who
What
Employee
Document
Timestamp
Result
```

---

# 36. P0 SECURITY FIXES

The current build has exposed sensitive API responses without authentication.

Fix before production.

Protect private endpoints including:

```text
/api/dashboard
/api/employees/*
/api/attendance/*
/api/leave/*
/api/payroll/*
/api/performance/*
/api/jobs/*
/api/candidates/*
/api/interviews/*
/api/documents/*
/api/training/*
/api/expenses/*
/api/timesheets/*
/api/assets/*
/api/reports/*
/api/settings/*
/api/backup/*
/api/audit/*
```

Unauthenticated requests must return:

```text
401
```

or:

```text
403
```

Implement server-side authorization/RBAC.

Do not rely on frontend visibility.

---

# 37. BACKUP SECURITY — P0

Protect:

```text
/api/backup/export
/api/backup/import
/api/backup/reset
```

Require privileged HR Admin authorization.

Implement:

- Audit logging
- Rate limiting
- Secure download
- Import validation
- Destructive-action confirmation

---

# 38. ATTENDANCE ANALYTICS — P1

Current dashboard and analytics have inconsistent attendance calculations.

Dashboard indicates approximately:

```text
14 / 20 = 70%
```

while analytics has returned:

```text
avgAttendanceRate: 24
```

and includes zero-data dates.

Create one authoritative attendance calculation service.

Explicitly define:

```text
Working Day
Holiday
Weekend
Leave
Present
Absent
Late
Eligible Employee
Timezone
```

Dashboard and reports must use the same logic.

Do not let zero-activity dates distort averages.

---

# 39. TEMPORARY DATA CLEANUP

Replace temporary company data in:

- Seed data
- Company settings
- Documents
- Email templates
- API defaults
- Demo UI
- Generated examples

Replace:

```text
Northwind Labs
NWL
northwindlabs.io
```

with appropriate Beyond Headlines/BH values.

Use synthetic employee data for demo/testing.

---

# 40. RESPONSIVE / ACCESSIBILITY

Support:

```text
Desktop
Tablet
Mobile
```

Test:

```text
1440px
1024px
768px
390px
```

Mobile priorities:

```text
Dashboard
Employee Search
Employee Profile
Leave
Documents
Approvals
```

Tables must safely scroll or become cards.

Accessibility:

- Semantic HTML
- Keyboard navigation
- Visible focus
- ARIA labels
- Correct tab order
- Accessible errors
- Sufficient contrast
- Reduced motion

Test dialogs, tables, menus, forms, search, and icon-only controls.

---

# 41. TECHNICAL ARCHITECTURE

Preferred:

```text
React
Vite
Tailwind CSS
JavaScript
Lucide React
```

Firebase-ready:

```text
Firebase Auth
Firestore
Firebase Storage
```

Keep UI decoupled from Firebase through service layers:

```text
/services/auth
/services/employees
/services/attendance
/services/leave
/services/payroll
/services/documents
/services/email
/services/settings
/services/audit
```

Major actions must use real persistence, forms, search, filtering, pagination, document generation, email, file storage, and audit logging.

---

# 42. IMPLEMENTATION ORDER

Execute in this order:

```text
1. Inspect current repository
2. Inspect current live preview
3. Inventory routes/components/services
4. Audit temporary branding
5. Create BH brand system
6. Create ux.jpg design tokens
7. Create /design-system
8. Build and verify reusable components
9. Upgrade global layout
10. Upgrade sidebar/header
11. Upgrade dashboard
12. Upgrade Employees
13. Upgrade Employee Profile
14. Upgrade Attendance
15. Upgrade Leave
16. Upgrade Payroll
17. Upgrade Documents
18. Upgrade Recruitment/Performance
19. Upgrade Reports/Settings
20. Complete DOCX/PDF
21. Complete Email
22. Complete Bulk workflows
23. Fix API authentication
24. Fix RBAC
25. Protect Backup
26. Fix Analytics
27. Replace temporary company data
28. Responsive QA
29. Accessibility QA
30. Repository-wide branding search
31. Critical acceptance tests
32. Final visual comparison
33. Production hardening
```

---

# 43. VISUAL ACCEPTANCE TEST

Compare the final application directly against `ux.jpg`.

Required:

```text
Warm beige/off-white background
Deep teal accent
Premium restrained neumorphism
Raised cards
Inset inputs
Pressed states
Warm subtle shadows
Clean typography
Restrained borders
Consistent spacing
Enterprise HR appearance
```

Must NOT look like:

```text
Generic SaaS dashboard
Glassmorphism
Blue/purple admin template
TeamHub clone
Northwind Labs product
```

---

# 44. BRANDING ACCEPTANCE TEST

Verify:

```text
Login
Sidebar
Header
Dashboard
Employees
Employee Profile
Documents
Generated DOCX
Generated PDF
Email
Settings
Favicon
Browser Title
Metadata
```

All appropriate locations must use:

```text
BH HR
Beyond Headlines
```

with the official BH assets.

No temporary branding may remain.

---

# 45. SECURITY ACCEPTANCE TEST

### Test 1

```text
Unauthenticated request
↓
Private API
↓
401/403
```

### Test 2

```text
Unauthenticated request
↓
Backup Export
↓
401/403
```

### Test 3

```text
Authenticated non-admin
↓
Admin endpoint
↓
403
```

### Test 4

```text
Employee A document
↓
Employee B recipient
↓
Blocked
```

### Test 5

```text
Employee A bulk document
↓
Employee B attachment
↓
Blocked
```

---

# 46. APPOINTMENT LETTER END-TO-END TEST

```text
HR Login
↓
Add Employee
↓
Assign Department + Role
↓
Open Profile
↓
Generate Appointment Letter
↓
Select BH Template
↓
Auto-fill Employee Data
↓
Preview
↓
Generate DOCX + PDF
↓
Generate BH Document Number
↓
Save Repository
↓
Send Official Employee Email
↓
Track Status
↓
Email History
↓
Resend
```

Must work end-to-end.

---

# 47. PAYSLIP END-TO-END TEST

```text
Employee
↓
Payroll
↓
Select Month
↓
Generate Payslip
↓
Preview
↓
Generate DOCX/PDF
↓
Send
↓
Email History
```

---

# 48. BULK END-TO-END TEST

Test at least 10 employees.

```text
Select Employees
↓
Generate Individual Documents
↓
Validate every document
↓
Validate every recipient
↓
Validate every attachment
↓
Send
↓
Track every result
```

No cross-employee data may occur.

---

# 49. FINAL QA MATRIX

Every item must finish as PASS:

| Area | Required |
|---|---|
| Authentication | PASS |
| Authorization/RBAC | PASS |
| Backup security | PASS |
| BH branding | PASS |
| ux.jpg visual alignment | PASS |
| Design system | PASS |
| Dashboard | PASS |
| Employees | PASS |
| Employee profile | PASS |
| Attendance | PASS |
| Leave | PASS |
| Payroll | PASS |
| Performance | PASS |
| Recruitment | PASS |
| Documents | PASS |
| DOCX | PASS |
| PDF | PASS |
| Email | PASS |
| Bulk generation | PASS |
| Bulk email | PASS |
| Reports | PASS |
| Audit Log | PASS |
| Responsive | PASS |
| Accessibility | PASS |
| Analytics consistency | PASS |
| Temporary branding audit | PASS |

No P0 item may remain:

```text
PARTIAL
MISSING
BLOCKED
```

---

# 50. FINAL COMPLETION RULE

Do not declare:

```text
Completed
Done
Production Ready
```

until:

1. P0 security issues are fixed.
2. BH branding is complete.
3. ux.jpg visual language is applied.
4. `/design-system` exists and is complete.
5. Documents work end-to-end.
6. DOCX/PDF output is validated.
7. Email delivery works.
8. Bulk document/email safety is verified.
9. Analytics are consistent.
10. Responsive QA passes.
11. Accessibility QA passes.
12. Temporary branding audit passes.
13. Critical acceptance tests pass.

---

# 51. FINAL AGENT COMMAND

**Upgrade the existing application in place.**

Do not rebuild from scratch.

Do not remove working functionality.

Do not merely create a review or mockup.

Implement the changes.

Use `ux.jpg` as the exact visual design-system reference.

Build `/design-system` first.

Create reusable components from that system.

Apply those components throughout the HR application.

Replace every TeamHub/Northwind/temporary identity with:

```text
BH HR
Beyond Headlines
```

Use:

```text
BH Full Logo:
https://i.postimg.cc/Vk8rGFCM/Logo.png

BH B Mark:
https://i.postimg.cc/7P5Zr1bh/B.png
```

Complete HR document generation, repository, DOCX/PDF, email, tracking, resend, and bulk workflows.

Fix authentication, authorization/RBAC, and backup security.

Fix attendance analytics.

Run responsive and accessibility QA.

Search the entire repository for leftover temporary branding.

Run every final acceptance test.

Only then declare the application complete.

---

# 52. FINAL PRODUCT TARGET

The final product is:

**BH HR — Beyond Headlines HR Operations Console**

It combines:

```text
BH Brand Identity
+
ux.jpg Visual Design System
+
TeamHub-inspired HR Information Architecture
+
Real HR Data Management
+
Employee Lifecycle Management
+
Document Generation
+
DOCX/PDF
+
Direct Employee Email
+
Document Repository
+
Email Tracking
+
Audit
+
Secure HR Data
```

Central workflow:

```text
VIEW
↓
MANAGE
↓
GENERATE
↓
PREVIEW
↓
APPROVE
↓
ISSUE
↓
SEND
↓
TRACK
```

**This is the final implementation handoff.**
