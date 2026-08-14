# BH HR — FINAL AGENT IMPLEMENTATION & UPGRADE SPECIFICATION

**Status:** FINAL — DIRECT CODING-AGENT HANDOFF  
**Date:** 16 August 2026  
**Product:** BH HR  
**Company:** Beyond Headlines  
**Mode:** Upgrade existing application in place — DO NOT rebuild from scratch

---

# 1. AGENT OBJECTIVE

Upgrade the existing BH HR application from its current stage to the final production-ready version.

This is an **implementation document**, not only a review document.

The agent must:

1. Inspect the existing project before changing it.
2. Preserve currently working functionality.
3. Upgrade the entire visual system to match `ux.jpg`.
4. Remove all temporary/demo branding.
5. Apply official Beyond Headlines branding.
6. Complete missing HR workflows.
7. Complete document generation and email delivery.
8. Fix critical authentication/authorization problems.
9. Fix analytics/data inconsistencies.
10. Run complete QA before declaring completion.

**Do not rebuild the application from zero.**

---

# 2. AUTHORITATIVE REFERENCES

## Primary visual reference

`ux.jpg`

https://i.postimg.cc/ZqXkpQzc/ux.jpg

This controls the final visual language.

Use it for:

- Color palette
- Warm background
- Deep teal
- Typography
- Neumorphic elevation
- Raised surfaces
- Inset surfaces
- Pressed states
- Flat surfaces
- Shadows
- Borders
- Buttons
- Inputs
- Cards
- Tables
- Navigation
- Feedback states
- Overall personality

The target style is:

**warm + premium + restrained + enterprise-grade neumorphism**

Do NOT convert the UI into glassmorphism or a generic SaaS dashboard.

---

## HR UX reference

TeamHub HR:

https://ui8.net/peterdraw-59d38a/products/teamhub--hr-management-dashboard-ui-figma-template?rel=timer

Use TeamHub only for:

- HR information architecture
- Page structure
- HR workflows
- Dashboard composition
- Employee UX
- Attendance
- Leave
- Payroll
- Performance
- Recruitment
- Calendar
- Settings
- Data presentation

Do not copy proprietary TeamHub branding or source assets.

---

## Official BH full logo

https://i.postimg.cc/Vk8rGFCM/Logo.png

Use for:

- Login
- Expanded sidebar
- Documents
- Email branding
- Organization settings
- Formal brand placements

---

## Official BH B mark

https://i.postimg.cc/7P5Zr1bh/B.png

Use for:

- Collapsed sidebar
- Mobile header
- Favicon
- App icon
- Compact brand placements

---

# 3. BRAND IDENTITY — MANDATORY

## Product name

Use:

**BH HR**

## Company

Use:

**Beyond Headlines**

Do NOT display:

- TeamHub
- TeamHub HR
- Northwind
- Northwind Labs
- NWL
- Generic HR Dashboard
- Generic HR Management

as product/company identity.

---

# 4. MANDATORY BRANDING AUDIT

Before completion, search the ENTIRE repository for:

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

Remove or replace all temporary product/company branding.

Check all of these:

- Browser title
- Favicon
- Login
- Sidebar
- Header
- Dashboard
- Settings
- Employee profile
- Documents
- Document templates
- Generated DOCX
- Generated PDF
- Email templates
- Email sender identity
- Metadata
- Seed data
- API defaults
- Company configuration

A UI-only logo replacement is NOT sufficient.

---

# 5. EXISTING BUILD PRESERVATION

This is an upgrade, not a rebuild.

Preserve currently working:

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
- Existing data relationships

Do not remove functional modules merely to simplify the redesign.

Refactor where necessary, but preserve working business logic.

---

# 6. VISUAL REDESIGN — REQUIRED

The current application must be visually upgraded to clearly reflect `ux.jpg`.

## Required characteristics

- Warm beige/off-white background
- Deep teal primary accent
- Premium restrained neumorphism
- Raised surfaces
- Inset input surfaces
- Pressed interaction states
- Flat content surfaces
- Soft warm shadows
- Subtle highlights
- Clean typography
- Restrained borders
- Professional enterprise HR aesthetic

## Do NOT use

- Glassmorphism
- Excessive gradients
- Generic blue/purple SaaS palette
- Hard black shadows
- Excessive floating cards
- Excessive rounded containers
- Heavy 3D effects
- TeamHub visual branding

---

# 7. VISUAL DESIGN TOKENS

Primary background:

```text
#F3EDE1 range
```

Primary accent:

```text
#005C5A range
```

Text:

- Near-black
- Warm muted gray

States:

- Soft success
- Soft warning
- Soft error
- Soft information

Use a coherent token system rather than page-specific colors.

---

# 8. NEUMORPHIC SURFACE SYSTEM

Implement four explicit surface modes.

## Raised

Use for:

- KPI cards
- Important cards
- Primary actions
- Selected navigation
- Important controls

## Inset

Use for:

- Inputs
- Search
- Filters
- Data-entry areas

## Pressed

Use for:

- Active buttons
- Toggles
- Active navigation
- Click feedback

## Flat

Use for:

- Page background
- Tables
- Large content areas
- Secondary content

Do not put shadows on every component.

---

# 9. TYPOGRAPHY

Use a strong condensed/sans-serif heading style with readable body text.

Hierarchy:

```text
Page Title
Section Title
Card Title
Body
Secondary
Caption
```

Numeric metrics should have strong visual hierarchy.

---

# 10. COMPONENT SYSTEM

Use reusable components.

Required examples:

```text
Button
Input
Select
Checkbox
Radio
Toggle
Tabs
Breadcrumbs
Pagination
Card
Table
Avatar
Badge
Tooltip
Modal
Toast
Alert
Progress
Spinner
Skeleton
EmptyState
```

Use:

**Lucide React**

Default icon stroke:

```text
2px
```

---

# 11. DESIGN SYSTEM PAGE

Create:

```text
/design-system
```

This is mandatory.

Show:

## Foundations

- Colors
- Typography
- Spacing
- Radius
- Borders
- Shadows
- Elevation

## Components

All reusable components.

For interactive components show:

```text
Default
Hover
Active
Pressed
Focus
Disabled
Error
Success
Loading
```

This page becomes the visual QA source of truth.

---

# 12. BRAND COMPONENTS

Create reusable:

```text
<BrandLogo />
<BrandMark />
```

Do not duplicate logo markup across pages.

Use the official BH assets.

---

# 13. MAIN NAVIGATION

Primary navigation:

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

Existing additional modules may remain if functional:

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

Group secondary modules logically rather than allowing navigation to become cluttered.

---

# 14. DASHBOARD

Create a premium BH HR dashboard.

## KPIs

- Total Employees
- Present Today
- On Leave
- Late Today
- Pending Leave
- Documents Generated
- Documents Sent
- Failed Emails

## Widgets

- Attendance overview
- Employee overview
- Leave overview
- Recent employees
- Recent documents
- Upcoming birthdays
- Upcoming events
- Pending actions

## Quick actions

```text
Add Employee
Generate Document
Create Payslip
Add Attendance
Add Leave
```

---

# 15. EMPLOYEES

Support:

```text
Employee List
Employee Grid
Add Employee
Employee Profile
```

Employee table:

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

Support:

- Search
- Filters
- Pagination
- Loading
- Empty
- Error

---

# 16. EMPLOYEE PROFILE

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

The profile should allow HR to perform most employee-level HR tasks without navigating away unnecessarily.

---

# 17. EMPLOYEE DATA

## Personal

- Full name
- Employee ID
- Photo
- Date of birth
- Gender
- Phone
- Personal email
- Official email
- Address
- Emergency contact

## Employment

- Department
- Role
- Designation
- Employment type
- Joining date
- Confirmation date
- Reporting manager
- Employment status
- Work location

## Payroll

- Basic salary
- Allowances
- Deductions
- Tax
- Bank details
- Payment method

## Files

- CV
- NID/Passport
- Certificates
- Contract
- Other files

---

# 18. ATTENDANCE

Provide:

```text
Attendance Dashboard
Attendance Table
Attendance Entry
Attendance Report
```

KPIs:

- Present
- Absent
- Late
- Leave

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

- Date
- Employee
- Department
- Status

Actions:

- Add
- Edit
- Import
- Export

---

# 19. LEAVE

KPIs:

- Total Requests
- Pending
- Approved
- Rejected

Leave types:

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

- Employee
- Leave type
- Start date
- End date
- Days
- Reason
- Attachment

Actions:

```text
Approve
Reject
Edit
View
```

Add overlap detection and holiday/weekend calculation.

---

# 20. PAYROLL

Dashboard:

```text
Total Payroll
Basic Salary
Allowances
Deductions
Net Payroll
```

Payroll record:

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

Production requirements:

- Payroll locking
- Approval separation
- Immutable approved periods
- Calculation audit trail
- Recalculation/version history

---

# 21. PAYSLIP

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

- Beyond Headlines
- BH logo
- Employee name
- Employee ID
- Role
- Department
- Month
- Basic salary
- Allowances
- Deductions
- Tax
- Net salary
- Payment date
- Document number

---

# 22. PERFORMANCE

Fields:

- Employee
- Review period
- Reviewer
- Goals
- Quality
- Attendance
- Teamwork
- Communication
- Overall score
- Comments

Actions:

```text
Create Review
Edit
Submit
Generate Performance Document
```

---

# 23. RECRUITMENT

## Jobs

- Job title
- Department
- Employment type
- Location
- Vacancy
- Closing date
- Status

## Candidates

- Name
- Email
- Phone
- Position
- CV
- Experience
- Skills
- Interview notes
- Status

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

# 24. DOCUMENTS — CORE MODULE

Documents are a first-class HR workflow.

Navigation:

```text
Documents
├── All Documents
├── Templates
├── Generated Documents
└── Email History
```

---

# 25. DOCUMENT TYPES

## Employment

- Offer Letter
- Appointment Letter
- Employment Contract
- Joining Letter
- Confirmation Letter

## Salary

- Payslip
- Salary Certificate
- Increment Letter
- Salary Revision Letter

## HR

- Promotion Letter
- Transfer Letter
- Warning Letter
- Show Cause Notice
- Experience Certificate
- Employment Certificate
- NOC

## Leave

- Leave Approval
- Leave Cancellation

## Separation

- Resignation Acceptance
- Relieving Letter
- Experience Certificate
- Final Settlement

Allow custom document types.

---

# 26. TEMPLATE MANAGEMENT

HR can:

```text
Create Template
Edit Template
Duplicate Template
Archive Template
Preview Template
```

Metadata:

- Name
- Type
- Description
- Status
- Version
- Effective date

---

# 27. DOCUMENT VARIABLES

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

Variable resolution must be extensible.

---

# 28. DOCUMENT GENERATION

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

HR should not manually re-enter employee data unless explicitly overriding a generated field.

---

# 29. DOCX / PDF

Generate real:

```text
.docx
.pdf
```

Preserve:

- Formatting
- Tables
- Headers
- Footers
- Images
- Signatures
- Page layout
- Variables
- Document number

Options:

```text
Generate DOCX
Generate PDF
Generate DOCX + PDF
```

Test actual generated files, not only API responses.

---

# 30. DOCUMENT NUMBERING

Default BH example:

```text
BH/HR/APPT/08162026/EMP001
```

Configurable pattern:

```text
{COMPANY}/{DEPARTMENT}/{DOCUMENT_TYPE}/{DATE}/{EMPLOYEE_ID}
```

Configurable:

- Prefix
- Department code
- Document type
- Date format
- Employee ID
- Sequence

Default company prefix must be:

```text
BH
```

---

# 31. VERSIONING

Templates support:

```text
v1.0
v1.1
v2.0
```

Generated documents permanently retain the exact template version used.

Updating a template must not modify historical generated documents.

---

# 32. EMPLOYEE DOCUMENT REPOSITORY

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

- Employee
- Document type
- Template version
- Document number
- Created time
- Issued time
- Status
- Email status

---

# 33. APPROVAL FLOW

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

# 34. DIRECT EMAIL DELIVERY

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

**Official employee email**

Optional fallback:

**Personal employee email**

HR can edit the recipient before sending.

---

# 35. EMAIL TEMPLATES

Provide:

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

---

# 36. EMAIL BRANDING

Default sender identity:

```text
BH HR
```

or:

```text
HR Department — Beyond Headlines
```

Use official BH branding.

Never expose SMTP/API credentials to the frontend.

---

# 37. EMAIL TRACKING

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

Support provider-level delivery status where available.

---

# 38. RESEND

Every sent document must support:

```text
Send
Resend
```

Preserve complete history.

---

# 39. BULK DOCUMENT GENERATION

Workflow:

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

Every file must contain only the correct employee's information.

---

# 40. BULK EMAIL

Workflow:

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

relationship before sending.

Maintain individual email logs.

---

# 41. ORGANIZATION SETTINGS

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

Organization:

- Beyond Headlines
- BH
- Logo
- Address
- Phone
- Email
- Website
- Currency
- Timezone
- Date format
- Sender name

---

# 42. EMAIL CONFIGURATION

Support:

```text
Sender Name
Sender Email
SMTP Host
SMTP Port
Username
Password/API Key
Encryption
```

Store credentials securely on the backend.

Provide:

```text
Send Test Email
```

---

# 43. GLOBAL SEARCH

Search:

- Employees
- Employee ID
- Role
- Department
- Documents
- Document number
- Candidates

Allow direct navigation from results.

---

# 44. REPORTS

Create:

- Employee report
- Attendance report
- Leave report
- Payroll report
- Document report

Export:

```text
PDF
Excel
CSV
```

---

# 45. AUDIT LOG

Track:

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

- Who
- What
- Employee
- Document
- Timestamp
- Result

---

# 46. CRITICAL SECURITY FIXES — P0

The current build previously/currently exposes sensitive API responses without an authenticated session.

This MUST be fixed before production.

Protect all private endpoints, including:

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

Do NOT rely on frontend visibility.

---

# 47. BACKUP SECURITY — P0

Protect:

```text
/api/backup/export
/api/backup/import
/api/backup/reset
```

Require privileged HR Admin authorization.

Add:

- Audit logging
- Rate limiting
- Secure download
- Import validation
- Confirmation for destructive restore/reset

---

# 48. ATTENDANCE ANALYTICS — P1

Current dashboard and reports use inconsistent attendance figures.

Dashboard currently shows approximately:

```text
14 / 20 = 70%
```

while analytics has returned:

```text
avgAttendanceRate: 24
```

and includes zero-data dates.

Fix by centralizing attendance calculations.

Do not include meaningless zero-activity dates in averages.

Define:

- Working day
- Holiday
- Weekend
- Leave
- Present
- Absent
- Late
- Eligible employee
- Timezone

Dashboard and reports must use the same calculation service.

---

# 49. CURRENT DATA CLEANUP

Remove temporary company data from:

- Seed data
- Company settings
- Documents
- Email templates
- Generated document examples
- API defaults
- Demo UI

Replace:

```text
Northwind Labs
NWL
northwindlabs.io
```

with Beyond Headlines/BH equivalents where appropriate.

Use clearly synthetic employee data for demo/testing.

---

# 50. RESPONSIVE DESIGN

Support:

- Desktop
- Tablet
- Mobile

Test at:

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

Tables must safely scroll or transform into mobile cards.

---

# 51. ACCESSIBILITY

Implement:

- Semantic HTML
- Keyboard navigation
- Visible focus
- ARIA labels
- Correct tab order
- Accessible errors
- Sufficient contrast
- Reduced motion

Test dialogs, tables, menus, forms, command search, and icon-only controls.

---

# 52. UI STATES

Every module requires:

```text
Loading
Empty
Error
Success
Confirmation
```

Use consistent BH styling.

---

# 53. TECHNICAL ARCHITECTURE

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

---

# 54. NO STATIC PROTOTYPE RULE

Major actions must work.

Do not hard-code primary application data.

Use real:

- Persistence
- Forms
- Search
- Filtering
- Pagination
- Document generation
- Email service
- File storage
- Audit logging

Demo data is acceptable only for preview/testing.

---

# 55. IMPLEMENTATION ORDER

Execute in this order:

```text
1. Inspect current repository
2. Inspect live preview
3. Inventory existing routes/components/services
4. Audit temporary branding
5. Create BH branding system
6. Create ux.jpg design tokens
7. Upgrade global layout
8. Upgrade sidebar/header
9. Upgrade dashboard
10. Upgrade employee screens
11. Upgrade remaining HR modules
12. Create /design-system
13. Replace temporary company data
14. Fix BH document numbering
15. Verify DOCX/PDF
16. Verify email workflow
17. Fix API authentication
18. Fix authorization/RBAC
19. Fix analytics calculations
20. Responsive QA
21. Accessibility QA
22. Repository-wide branding search
23. End-to-end acceptance tests
24. Final visual comparison
25. Production hardening
```

---

# 56. DO NOT DECLARE COMPLETION UNTIL

All P0 items pass.

All P1 core workflows pass.

The visual system clearly matches `ux.jpg`.

BH branding is used consistently.

No TeamHub/Northwind temporary branding remains.

Document generation works.

Email delivery works.

Security tests pass.

Responsive QA passes.

Accessibility QA passes.

---

# 57. VISUAL ACCEPTANCE TEST

Compare the final application against `ux.jpg`.

The final UI must clearly demonstrate:

- Warm beige/off-white background
- Deep teal primary accent
- Premium restrained neumorphism
- Raised cards
- Inset inputs
- Pressed states
- Warm subtle shadows
- Clean typography
- Restrained borders
- Consistent spacing
- Enterprise HR appearance

The UI must NOT look like:

- Generic SaaS dashboard
- Glassmorphism product
- Blue/purple admin template
- TeamHub clone
- Northwind Labs product

The intended final identity is:

```text
BH HR
×
ux.jpg visual language
×
TeamHub-inspired HR information architecture
×
Real HR operations
```

---

# 58. BRANDING ACCEPTANCE TEST

Verify:

```text
Login
Sidebar
Header
Dashboard
Employee
Documents
Generated DOCX
Generated PDF
Email
Settings
Favicon
Browser title
Metadata
```

All must show BH identity where appropriate.

Official assets:

```text
Full logo:
https://i.postimg.cc/Vk8rGFCM/Logo.png

B mark:
https://i.postimg.cc/7P5Zr1bh/B.png
```

---

# 59. SECURITY ACCEPTANCE TEST

### Test 1

```text
Unauthenticated request
→ private API
→ 401/403
```

### Test 2

```text
Unauthenticated request
→ backup export
→ 401/403
```

### Test 3

```text
Authenticated non-admin
→ admin endpoint
→ 403
```

### Test 4

```text
Employee A document
→ Employee B recipient
→ blocked
```

### Test 5

```text
Employee A bulk document
→ Employee B attachment
→ blocked
```

---

# 60. APPOINTMENT LETTER ACCEPTANCE TEST

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

---

# 61. PAYSLIP ACCEPTANCE TEST

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
DOCX/PDF
↓
Send
↓
Email History
```

---

# 62. BULK ACCEPTANCE TEST

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
Track each result
```

No cross-employee data may occur.

---

# 63. FINAL QA MATRIX

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

No P0 item may remain PARTIAL, MISSING, or BLOCKED.

---

# 64. FINAL AGENT COMMAND

**Upgrade the existing application in place.**

Do not rebuild from scratch.

Preserve working functionality.

Apply the `ux.jpg` visual language throughout the entire application.

Replace every temporary TeamHub/Northwind identity with:

```text
BH HR
Beyond Headlines
```

Use the official BH full logo and B mark.

Complete the HR document generation and direct email workflows.

Fix authentication, authorization, and backup security.

Fix analytics consistency.

Create the design-system page.

Run the complete acceptance tests.

Perform a repository-wide temporary-branding search.

Perform visual QA against `ux.jpg`.

Perform responsive and accessibility QA.

Only declare the build complete after all required acceptance tests pass.

**Final target:**

> A polished, production-ready **BH HR** application that feels like a premium enterprise HR SaaS product, uses the `ux.jpg` visual language, follows TeamHub-inspired HR information architecture without copying its branding/assets, uses official Beyond Headlines identity, and provides reliable HR document generation, storage, and direct employee email delivery.
