# As Dev and HR app specialist you have to make-

## **HR Management System**

Build a production-ready **Basic HR Management Web Application**.

The application is an **HR-only operations console**. Employees do not log into the system in the MVP.

---

# 1. DESIGN REFERENCE

Use the TeamHub HR Management Dashboard UI by Peterdraw Studio as the primary visual and UX reference.

The original reference is available here:

[https://ui8.net/peterdraw-59d38a/products/teamhub--hr-management-dashboard-ui-figma-template?rel=timer](https://ui8.net/peterdraw-59d38a/products/teamhub--hr-management-dashboard-ui-figma-template?rel=timer)

A local **TeamHub Extracted Images Gallery** has also been provided with this project.

## IMPORTANT

Before implementing the UI, inspect the provided TeamHub visual reference gallery and use it as the visual source of truth.

The gallery contains:

1. Hero Banner
2. Main Dashboard
3. Employees & Payroll
4. Attendance & Leave
5. Recruitment & Openings
6. Performance Analytics
7. Settings & Mobile UI
8. Full Screen Preview 1
9. Full Screen Preview 2

The extracted gallery identifies the previews and their dimensions.

---

# 2. QUICK VISUAL REFERENCE

## Reference 01 — Main Dashboard

Study:

- Sidebar
- Dashboard cards
- KPI layout
- Charts
- Data widgets
- Quick actions
- Header
- User profile area
- Spacing
- Card radius
- Typography
- Status indicators

Use this as the primary reference for the application shell and Dashboard.

---

## Reference 02 — Employees & Payroll

Study:

- Employee table
- Employee cards
- Search
- Filters
- Employee status
- Payroll presentation
- Table actions
- Profile information hierarchy
- Data density

Use this as the primary reference for:

```text
Employees
Employee List
Employee Grid
Employee Profile
Payroll
```

---

## Reference 03 — Attendance & Leave

Study:

- Attendance dashboard
- Calendar
- Attendance statistics
- Leave cards
- Leave status
- Date controls
- Tables
- Filters
- Status badges

Use this as the primary reference for:

```text
Attendance
Leave
Calendar
```

---

## Reference 04 — Recruitment & Openings

Study:

- Job cards
- Recruitment pipeline
- Candidate information
- Job status
- Recruitment statistics
- Filters
- Actions

Use this as the primary reference for:

```text
Recruitment
Jobs
Candidates
```

---

## Reference 05 — Performance Analytics

Study:

- Performance charts
- Employee statistics
- Analytics cards
- Progress indicators
- Performance status
- Data visualization

Use this as the primary reference for:

```text
Performance
Reports
Analytics
```

---

## Reference 06 — Settings & Mobile UI

Study:

- Settings structure
- Form layouts
- Mobile responsive behavior
- Navigation collapse
- Mobile cards
- Responsive tables
- Mobile spacing

Use this as the primary reference for:

```text
Settings
Responsive Design
Mobile UI
```

---

## Reference 07–08 — Full Screen Previews

Use the full-screen previews to understand:

- Overall design consistency
- Page-to-page transitions
- Vertical spacing
- Complete page composition
- Sidebar behavior
- Header behavior
- Card relationships
- Responsive design direction

Do not design each page independently.

The entire application should feel like **one unified HR SaaS product**.

---

# 3. VISUAL IMPLEMENTATION RULE

Do not simply reproduce screenshots.

Extract the underlying design system:

### Layout

- Sidebar
- Top navigation
- Content container
- Cards
- Tables
- Modals
- Drawers
- Forms

### Visual language

- Clean SaaS interface
- Light background
- White content surfaces
- Rounded cards
- Soft borders
- Subtle shadows
- Professional typography
- Compact but readable tables
- Clear status badges
- Modern charts
- Consistent spacing

### Interaction

Use:

- Hover states
- Active navigation
- Dropdowns
- Search
- Filters
- Modals
- Confirmation dialogs
- Toast notifications
- Loading states
- Empty states
- Error states

---

# 4. DO NOT COPY PROPRIETARY ASSETS

The TeamHub design is a visual reference.

Do not copy:

- Proprietary source code
- Figma components
- Logos
- Brand assets
- Proprietary illustrations
- Paid icon sets
- Proprietary images

Create an original implementation inspired by the reference.

---

# 5. PRIMARY USER

MVP has only:

**HR / HR Admin**

HR has full access.

No employee login.

No employee dashboard.

No employee permissions system is required in MVP.

---

# 6. CORE PRODUCT

The application is an:

> HR Operations Console

The central workflow is:

```text
Employee
   ↓
Employee Profile
   ↓
Manage HR Data
   ↓
Generate Document
   ↓
Preview
   ↓
Generate PDF/DOCX
   ↓
Send Directly to Employee
   ↓
Track Email
```

The key differentiator is:

**Fast HR document generation + direct employee email delivery.**

---

# 7. NAVIGATION

Create the following sidebar:

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

Keep navigation visually consistent with the TeamHub reference.

---

# 8. DASHBOARD

Create a TeamHub-inspired HR dashboard.

## KPI Cards

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
- Pending HR actions

## Quick Actions

```text
+ Add Employee
+ Generate Document
+ Create Payslip
+ Add Attendance
+ Add Leave
```

---

# 9. EMPLOYEES

Provide:

```text
Employee List
Employee Grid
Add Employee
Employee Profile
```

Support:

```text
Table View
Grid View
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

---

# 10. EMPLOYEE PROFILE

Create:

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

Top actions:

```text
Edit Employee
Generate Document
Upload Document
```

The Employee Profile is the central HR workspace.

HR should be able to perform most actions without leaving the profile.

---

# 11. EMPLOYEE INFORMATION

## Personal

- Full Name
- Employee ID
- Photo
- Date of Birth
- Gender
- Phone
- Personal Email
- Official Email
- Address
- Emergency Contact

## Employment

- Department
- Role
- Designation
- Employment Type
- Joining Date
- Confirmation Date
- Reporting Manager
- Employment Status
- Work Location

## Payroll

- Basic Salary
- Allowances
- Deductions
- Tax
- Bank information
- Payment method

---

# 12. ROLE MANAGEMENT

Roles are employee HR attributes, NOT application permission roles.

HR can:

- Add Role
- Edit Role
- Archive Role
- Assign Role

Examples:

```text
Editor
Senior Executive
Executive
IT Support
Accountant
HR Executive
Custom Role
```

Document variable:

```text
{{employee.role}}
```

---

# 13. DEPARTMENTS

HR can:

- Add
- Edit
- Archive

Example:

```text
HR
Editorial
IT
Accounts
Marketing
Sales
Administration
```

---

# 14. ATTENDANCE

Build:

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

---

# 15. LEAVE

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

Leave request:

- Employee
- Leave Type
- Start Date
- End Date
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

---

# 16. PAYROLL

Keep payroll simple for MVP.

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

---

# 17. PAYSLIP

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

Automatically populate:

- Company
- Employee
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

# 18. PERFORMANCE

Create basic performance management.

Fields:

- Employee
- Review Period
- Reviewer
- Goals
- Quality
- Attendance
- Teamwork
- Communication
- Overall Score
- Comments

Actions:

```text
Create Review
Edit
Submit
Generate Performance Document
```

Use the TeamHub Performance Analytics reference for visual direction.

---

# 19. RECRUITMENT

## Jobs

- Job Title
- Department
- Employment Type
- Location
- Vacancy
- Closing Date
- Status

## Candidates

- Name
- Email
- Phone
- Position
- CV
- Experience
- Skills
- Interview Notes
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

Use the TeamHub Recruitment reference for layout direction.

---

# 20. DOCUMENTS

Documents are a core product module.

Navigation:

```text
Documents
├── All Documents
├── Templates
├── Generated Documents
└── Email History
```

---

# 21. DOCUMENT TYPES

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

# 22. DOCUMENT TEMPLATE SYSTEM

HR can:

```text
Create Template
Edit Template
Duplicate Template
Archive Template
Preview Template
```

Template fields:

- Name
- Type
- Description
- Status
- Version
- Effective Date

Support dynamic variables.

---

# 23. DOCUMENT VARIABLES

## Employee

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

## Company

```text
{{company.name}}
{{company.address}}
{{company.email}}
{{company.phone}}
{{company.website}}
```

## Document

```text
{{document.number}}
{{document.date}}
{{document.issue_date}}
```

## Payroll

```text
{{payroll.month}}
{{payroll.basic_salary}}
{{payroll.allowances}}
{{payroll.deductions}}
{{payroll.tax}}
{{payroll.net_salary}}
```

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

No duplicate manual data entry.

---

# 25. DOCX

Generate actual `.docx` files.

Preserve:

- Formatting
- Tables
- Headers
- Footers
- Images
- Signatures
- Page layout
- Variables
- Document numbering

---

# 26. PDF

Generate matching PDF.

Options:

```text
Generate DOCX
Generate PDF
Generate DOCX + PDF
```

---

# 27. DOCUMENT PREVIEW

Before final generation:

```text
Edit Data
Preview
Generate
Cancel
```

After generation:

```text
Preview
Download
Send Email
Regenerate
Archive
```

---

# 28. DOCUMENT NUMBERING

Support configurable numbering.

Example:

```text
TBH/HR/APPT/08142026/EMP001
```

Configurable pattern:

```text
{COMPANY}/{DEPARTMENT}/{DOCUMENT_TYPE}/{DATE}/{EMPLOYEE_ID}
```

---

# 29. DOCUMENT VERSIONING

Support:

```text
v1.0
v1.1
v2.0
```

Previously generated documents must never change when a template is edited.

---

# 30. EMPLOYEE DOCUMENT REPOSITORY

Each employee has:

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

---

# 31. DIRECT SEND TO EMPLOYEE

Every generated document must have:

```text
Preview | Download | Send to Employee
```

Clicking Send opens:

```text
Send Document

To:
employee@email.com

CC:
BCC:

Subject:

Message:

Attachment:
Generated Document

[Cancel] [Send Email]
```

The employee's official email should automatically populate.

HR can edit before sending.

---

# 32. EMAIL TEMPLATES

Create reusable templates:

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

# 33. EMAIL TRACKING

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

---

# 34. RESEND

Every document supports:

```text
Send
Resend
```

Keep all previous sending history.

---

# 35. BULK DOCUMENT GENERATION

Workflow:

```text
Select Employees
      ↓
Select Document
      ↓
Select Template
      ↓
Generate
      ↓
Review
      ↓
Download ZIP
```

Every generated file must contain only the correct employee's data.

---

# 36. BULK EMAIL

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

Critical security rule:

**Employee A must never receive Employee B's document.**

Validate every employee-document-recipient relationship before sending.

---

# 37. DOCUMENT DASHBOARD

KPIs:

```text
Total Documents
Generated Today
Sent Today
Pending Approval
Failed Emails
Templates
```

Recent documents:

```text
Document Number
Employee
Document Type
Created Date
Status
Email Status
Actions
```

---

# 38. DOCUMENT APPROVAL

Optional workflow:

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

Approved documents should be locked.

---

# 39. SETTINGS

Create:

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

---

# 40. EMAIL CONFIGURATION

Support configurable email provider/SMTP.

Fields:

```text
Sender Name
Sender Email
SMTP Host
SMTP Port
Username
Password/API Key
Encryption
```

Never expose credentials in frontend code.

Provide:

```text
Send Test Email
```

---

# 41. SEARCH

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

---

# 42. REPORTS

Create:

- Employee Report
- Attendance Report
- Leave Report
- Payroll Report
- Document Report

Export:

```text
PDF
Excel
CSV
```

---

# 43. AUDIT LOG

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
```

---

# 44. RESPONSIVE DESIGN

Use the TeamHub Settings/Mobile reference as the responsive design guide.

Support:

- Desktop
- Tablet
- Mobile

Desktop is the primary HR workspace.

Mobile should prioritize:

- Dashboard
- Employee search
- Employee profile
- Leave
- Documents
- Approvals

Tables should convert to cards or horizontally scroll where appropriate.

---

# 45. UI STATES

Every module must have:

- Loading state
- Empty state
- Error state
- Success state
- Confirmation state

Example:

```text
No employees yet.

Add your first employee to start managing HR records.

[+ Add Employee]
```

---

# 46. SECURITY

HR information is sensitive.

Implement:

- Secure authentication
- Backend validation
- Secure file access
- Protected document URLs
- Secure email credentials
- Audit logs
- Safe attachments
- Proper database relationships

Never expose another employee's private information or documents.

---

# 47. TECHNICAL QUALITY

Do not build a static prototype.

All major UI actions must connect to real application functionality.

Do not hard-code the primary application data.

Use:

- Real database persistence
- Reusable components
- Form validation
- Pagination
- Search
- Filtering
- Error handling
- Secure file storage
- Document generation service
- Email service

---

# 48. MVP PRIORITY

## P0

```text
HR Login
Dashboard
Employees
Employee Profile
Roles
Departments
Attendance
Leave
Payroll
Payslip
Documents
Templates
Variables
DOCX
PDF
Document Numbering
Document Repository
Email Sending
Email Templates
Email History
Search
Settings
```

## P1

```text
Performance
Recruitment
Bulk Generation
Bulk Email
Approval Workflow
Reports
Audit Logs
```

## P2

```text
Employee Portal
Employee Login
Mobile App
Digital Signature
WhatsApp
SMS
Biometric Integration
Advanced Payroll
```

---

# 49. IMPLEMENTATION ORDER

Build in this order:

```text
1. Project Foundation
2. Database Schema
3. Authentication
4. Design System
5. Global Layout
6. Sidebar/Header
7. Dashboard
8. Departments/Roles
9. Employee Management
10. Employee Profile
11. Attendance
12. Leave
13. Payroll
14. Document Template Engine
15. DOCX Generation
16. PDF Generation
17. Document Repository
18. Email Integration
19. Email Templates
20. Email History
21. Performance
22. Recruitment
23. Reports
24. Audit Logs
25. Responsive Optimization
26. Testing
27. Production Hardening
```

---

# 50. CRITICAL END-TO-END TEST

Before considering the application complete, test this exact workflow:

```text
HR Login
   ↓
Add Employee
   ↓
Assign Role + Department
   ↓
Open Employee Profile
   ↓
Generate Appointment Letter
   ↓
Select Template
   ↓
Auto-populate employee data
   ↓
Preview
   ↓
Generate DOCX + PDF
   ↓
Generate Document Number
   ↓
Save to Employee Documents
   ↓
Click Send to Employee
   ↓
Employee email automatically populated
   ↓
HR reviews email
   ↓
Send
   ↓
Email status recorded
   ↓
Document appears in Email History
```

Then test:

```text
Employee
   ↓
Payroll
   ↓
Generate August Payslip
   ↓
PDF
   ↓
Send to Employee
   ↓
Email History
```

Then test:

```text
50 Employees
   ↓
Bulk Generate Payslips
   ↓
50 Individual Documents
   ↓
50 Individual Emails
   ↓
Verify every attachment belongs to the correct employee
```

---

# 51. FINAL DESIGN PRINCIPLE

Do not create a collection of unrelated dashboards.

Create one coherent HR product.

The visual hierarchy should be:

```text
TeamHub Reference
       ↓
Extract Design Language
       ↓
Create Original Design System
       ↓
Apply Across Every Module
```

The TeamHub references should guide:

- Layout
- Spacing
- Components
- Data presentation
- Charts
- Forms
- Tables
- Navigation
- Responsive behavior

The application's own branding, HR workflows, document generation system and email delivery system must be original.

---

# 52. FINAL PRODUCT TARGET

The finished application should allow an HR professional to perform this complete workflow quickly:

```text
MANAGE EMPLOYEE
       ↓
GENERATE HR DOCUMENT
       ↓
CREATE DOCX/PDF
       ↓
STORE DOCUMENT
       ↓
SEND DIRECTLY TO EMPLOYEE
       ↓
TRACK DELIVERY
```

The application should feel like a **real commercial HR SaaS application**, not a static UI prototype.

Start by studying the supplied TeamHub visual reference gallery, establish the design system, then build the application in the implementation order above.
