# BH HR — NEXT-GEN HR MANAGEMENT APP
## PRD & UI/UX DESIGN SYSTEM v2.0

**Product:** BH HR  
**Company:** Beyond Headlines  
**Document purpose:** Visual/UI implementation specification for the existing BH HR application  
**Status:** Final visual direction / agent handoff

> **Important:** The attached visual poster is the visual reference. This Markdown file is the implementation source of truth. Preserve the existing BH HR functionality and information architecture.

---

# 1. PRODUCT VISION

BH HR is a modern enterprise HR management platform for managing employees, attendance, leave, payroll, recruitment, performance, documents, reports, training, assets, expenses, timesheets, feedback, interviews, notifications, audit records, and organization settings.

The UI should feel:

- Premium
- Modern
- Professional
- Tactile
- Neumorphic
- Data-focused
- Fast
- Highly readable
- Enterprise-ready

Do not turn the product into a generic dashboard template.

---

# 2. VISUAL DESIGN DIRECTION

Use the supplied reference image as the primary visual direction.

## Core visual language

- Dark rich navy background
- Soft 3D neumorphic surfaces
- Raised and inset layers
- Rounded panels
- Controlled shadows
- Subtle glow
- BH teal primary accent
- Orange, coral and purple semantic accents
- High-contrast typography
- Floating cards
- Premium dashboard composition
- Smooth micro-interactions

The reference image is a visual style reference only. Do not copy its sample finance content.

Translate the style into BH HR.

---

# 3. BRANDING

Use the official BH branding.

## Full logo

https://i.postimg.cc/Vk8rGFCM/Logo.png

## B mark

https://i.postimg.cc/7P5Zr1bh/B.png

Expanded sidebar:

```text
BH HR
BEYOND HEADLINES
```

Collapsed sidebar:

```text
BH B MARK
```

Remove all temporary/demo branding.

Do not use:

```text
TeamHub
Northwind
Northwind Labs
NWL
northwindlabs.io
```

---

# 4. INFORMATION ARCHITECTURE

Preserve all existing BH HR modules.

## MAIN

```text
Dashboard
Employees
Attendance
Leave
Payroll
Performance
Recruitment
```

## OPERATIONS

```text
Documents
Interviews
Training
Expenses
Assets
Timesheets
Feedback
```

## INSIGHTS

```text
Reports
Notifications
```

## SYSTEM

```text
Audit Log
Settings
```

### Navigation rule

Do not remove existing modules merely to simplify the visual design.

The sidebar should use grouped navigation and remain scrollable.

---

# 5. DOCUMENTS

Documents should retain internal navigation:

```text
All Documents
Templates
Generated
Approval Queue
Email History
```

These should not become separate top-level sidebar items.

---

# 6. ROLES & PERMISSIONS

The UI must support the existing role/permission architecture.

Expected role presentation:

```text
Super Admin
HR Admin
HR Manager
Employee
```

Role access should determine which modules/actions are visible or available.

Do not weaken authorization while changing the UI.

---

# 7. COLOR SYSTEM

## Background

```text
#00182A
#07152F
#0A1838
#101C46
```

## Surfaces

```text
#10234A
#142951
#182D59
#1E2847
```

## Primary teal

```text
#00E0C3
#08CFC3
#00BFAF
```

## Secondary teal/cyan

```text
#00B6DA
#16D9C8
```

## Orange

```text
#FFB52E
#FFAA2B
#FF9F1C
```

## Coral

```text
#FF5B62
#FF6B6B
```

## Purple

```text
#8C4DFF
#A24CFF
```

## Text

```text
Primary   #F5F7FA
Secondary #B8C2D3
Muted     #7F8BA3
```

Do not use low-contrast text on dark surfaces.

---

# 8. SEMANTIC COLORS

```text
Success / Present     → Teal
Pending / Attention   → Orange
Error / Absent        → Coral
Special / Secondary   → Purple
Neutral               → Blue-gray
```

Color must not be the only way to communicate a state.

Use icon/text labels as well.

---

# 9. SURFACE SYSTEM

Implement four main surface types.

## Base

Deep navy page background.

## Raised

For:

- Cards
- Sidebar
- Header
- KPI panels
- Feature panels

## Inset

For:

- Search
- Inputs
- Filters
- Tables
- Form fields

## Pressed

For:

- Active navigation
- Selected controls
- Pressed buttons
- Toggles

---

# 10. ELEVATION

Use:

```text
Level 1 — Flat
Level 2 — Hover
Level 3 — Raised
Level 4 — Modal
Level 5 — Popover
```

Each level should have a distinct depth.

Do not use heavy borders to simulate hierarchy.

---

# 11. SHADOW & GLOW

Use soft deep shadows.

Primary interactions may use subtle teal glow.

Orange/coral/purple glow should be used sparingly.

Do not make the entire page glow.

---

# 12. RADIUS

Use:

```text
8px
12px
16px
20px
24px
28px
32px
```

Recommended:

```text
Controls      10–16px
Cards         16–24px
Hero panels   24–32px
Modal         24px
```

---

# 13. TYPOGRAPHY

Use the existing project font where possible.

Preferred visual hierarchy:

```text
Page title      28–40px / Bold
Section title   18–24px / SemiBold
Card title      15–18px / SemiBold
Body            14–16px / Regular
Secondary       12–14px / Medium
Caption         11–13px / Regular
KPI             28–40px / Bold
```

Text must remain readable at normal viewing distance.

---

# 14. ICON SYSTEM

Use Lucide React consistently.

Sizes:

```text
16px
20px
24px
```

Default stroke:

```text
2px
```

Do not mix unrelated icon libraries.

---

# 15. SIDEBAR

The sidebar should be a dark floating neumorphic panel.

## Active item

Must be clearly visible:

```text
Deep teal surface
White text
Teal/white icon
Subtle teal glow
Raised/pressed treatment
```

The active item must never look disabled.

## Inactive

```text
Readable light-gray text
Muted icon
Subtle hover surface
```

## Collapsed

Use the BH B mark plus icons/tooltips.

---

# 16. HEADER

Header:

```text
Page title
Page subtitle
Global search
Quick Add
Notifications
User profile
Utility controls
```

Keep the header compact and aligned.

---

# 17. QUICK ADD

Quick Add is a global action launcher.

Suggested actions:

```text
Add Employee
Add Attendance
Add Leave
Generate Document
Add Payroll
```

Style:

```text
Teal
White text
Plus icon
Raised surface
Subtle glow
```

Page-specific actions should remain contextual.

---

# 18. DASHBOARD

Dashboard should use layered card composition.

## KPI row

```text
Total Employees
Present Today
On Leave
Absent
New Hires
Birthdays
```

## Main analytics

```text
Attendance Overview
Attendance Distribution
Employee Growth
Payroll Summary
```

## Operations

```text
Recent Activities
Upcoming Events
Leave Balance
```

The dashboard should contain varied card sizes rather than a grid of identical boxes.

---

# 19. ATTENDANCE

Primary attendance metrics:

```text
Present
Absent
Late
On Leave
```

Use:

```text
Present  → Teal
Absent   → Coral
Late     → Orange
On Leave → Purple
```

Attendance heatmap should be large enough to use the available card space.

Recommended composition:

```text
Attendance Heatmap
+
Attendance Summary
```

Summary:

```text
Attendance Rate
Present
Absent
Late
On Leave
```

---

# 20. EMPLOYEES

Employee table:

```text
Avatar
Employee
Employee ID
Department
Designation
Status
Joining Date
Actions
```

Employee profile:

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

---

# 21. LEAVE

Dashboard metrics:

```text
Leave Balance
Pending Requests
Approved
Rejected
```

Request card:

```text
Employee
Leave Type
Dates
Days
Status
Actions
```

Actions:

```text
Approve → Teal
Reject → Coral
```

---

# 22. PAYROLL

Show:

```text
Gross Payroll
Net Payroll
Allowances
Deductions
Tax
Pending Payroll
```

Use strong numerical hierarchy.

---

# 23. RECRUITMENT

Pipeline:

```text
Applied
Screening
Shortlisted
Interview
Selected
Offer
Hired
```

Candidate cards:

```text
Avatar
Name
Position
Experience
Status
Actions
```

---

# 24. PERFORMANCE

Use:

```text
Performance Score
Goals
Progress
Review Timeline
Manager Feedback
```

Use teal for positive performance and orange/coral for attention.

---

# 25. DOCUMENTS

Use dark raised document cards with:

```text
Search
Filters
Preview
Generate
Approve
Issue
Email
```

Statuses:

```text
Draft
Generated
Pending Approval
Approved
Issued
Sent
Failed
```

---

# 26. TRAINING

Use:

```text
Training Programs
Sessions
Participants
Completion
Certificates
```

Show progress using teal/orange accents.

---

# 27. EXPENSES

Use:

```text
Expense Requests
Pending
Approved
Rejected
Reimbursed
```

Use semantic status colors.

---

# 28. TIMESHEETS

Use:

```text
Daily Hours
Weekly Hours
Overtime
Approval Status
```

Use clear numeric hierarchy and compact tables.

---

# 29. ASSETS

Use:

```text
Assigned Assets
Available Assets
Maintenance
Returned Assets
```

Show assignment status clearly.

---

# 30. INTERVIEWS & FEEDBACK

Interviews:

```text
Scheduled
Today
Upcoming
Completed
```

Feedback:

```text
Pending
Submitted
Review
```

Use timeline/card compositions.

---

# 31. REPORTS & ANALYTICS

Use dark chart surfaces.

Recommended chart colors:

```text
Teal
Orange
Purple
Coral
```

Keep labels high contrast.

Exports:

```text
PDF
Excel
CSV
```

---

# 32. NOTIFICATIONS

Notifications should be available from the topbar.

Notification item:

```text
Icon
Title
Message
Time
Status
```

Categories:

```text
HR
Leave
Payroll
Documents
Training
System
```

---

# 33. AUDIT LOG

Audit table:

```text
Timestamp
User
Action
Module
Record
Result
IP/Device where supported
```

Use a dense but readable table.

---

# 34. SETTINGS

Group settings into:

```text
Organization
Departments
Roles
Designations
Leave Types
Email Settings
Document Numbering
Templates
Permissions
```

---

# 35. COMPONENT DESIGN SYSTEM

Provide examples for:

```text
Primary Button
Secondary Button
Accent Button
Ghost Button
Card
Input Field
Select
Checkbox
Radio
Switch
Badge
Progress
Tooltip
Modal
Toast
Alert
Table
Avatar
```

All must support:

```text
Default
Hover
Focus
Active
Pressed
Disabled
Loading
Success
Error
```

---

# 36. SPACING SYSTEM

Base:

```text
8px
```

Scale:

```text
4
8
12
16
24
32
40
48
64
80
96
128
160
192
256
320
```

Use consistent spacing.

---

# 37. RESPONSIVE REQUIREMENTS

Test:

```text
390px
768px
1024px
1440px
```

Mobile:

- Accessible navigation
- Stacked KPI cards
- Full-width panels
- Touch-friendly controls
- Horizontal table scrolling where required

Desktop:

- Full sidebar
- Multi-column dashboard
- Dense data tables
- Large analytics cards

---

# 38. REAL-TIME / DATA BEHAVIOR

Preserve the application's existing data architecture.

Where real-time synchronization is already supported:

- Keep listeners intact.
- Update UI immediately after CRUD operations.
- Show subtle Live status where appropriate.
- Handle offline/error states gracefully.
- Resolve conflicts according to the existing application rules.

Do not introduce unnecessary backend changes for UI work.

---

# 39. SECURITY RULES

UI changes must not weaken security.

Preserve:

- Role-based access
- Permission checks
- Authorized data access
- Protected HR information
- Least-privilege behavior

Do not rely only on hiding UI elements for security.

---

# 40. PWA / DEVICE EXPERIENCE

Where already supported, preserve:

- Installability
- Responsive layout
- Fast loading
- Offline-safe states
- Push notifications
- App icons
- Splash experience

---

# 41. ACCESSIBILITY

Required:

- Strong text contrast
- Visible focus
- Keyboard navigation
- Accessible labels
- Accessible errors
- Color-independent status communication
- Reduced-motion support

---

# 42. MOTION

Use restrained motion:

```text
150–250ms
```

For:

```text
Hover
Press
Sidebar
Dropdown
Modal
Toast
Card interactions
```

Respect:

```text
prefers-reduced-motion
```

---

# 43. NON-FUNCTIONAL REQUIREMENTS

The visual redesign must not intentionally degrade:

- Performance
- Responsiveness
- Accessibility
- Security
- Existing routing
- Existing workflows
- Existing data operations

Avoid unnecessary animations and excessive visual effects.

---

# 44. VISUAL ACCEPTANCE CRITERIA

The implementation is accepted only when:

- BH branding is correct.
- Official logo assets are used.
- Temporary/demo branding is removed.
- All existing modules remain accessible.
- Sidebar grouping is clear.
- Active navigation is obvious.
- Quick Add is clearly actionable.
- Text is readable.
- KPI hierarchy is clear.
- Cards have consistent depth.
- Tables are readable.
- Attendance heatmap uses space effectively.
- Forms have clear states.
- Modals/toasts/alerts match the design system.
- Responsive behavior works.
- Accessibility requirements are met.
- Existing functionality continues working.
- No console/runtime errors are introduced.

---

# 45. IMPLEMENTATION ORDER

```text
1. Inspect current BH HR implementation
2. Preserve existing functionality
3. Establish visual tokens
4. Establish surface/elevation system
5. Establish typography
6. Establish icon system
7. Update global layout
8. Update sidebar
9. Update header
10. Update Quick Add
11. Update buttons/forms
12. Update cards
13. Update tables
14. Update feedback components
15. Refine Dashboard
16. Refine Employees
17. Refine Attendance
18. Refine Leave
19. Refine Payroll
20. Refine Performance
21. Refine Recruitment
22. Refine Documents
23. Refine remaining modules
24. Responsive pass
25. Accessibility pass
26. Visual QA
27. Build/lint/test
```

---

# 46. FINAL AGENT INSTRUCTION

Use the supplied **BH HR visual specification poster image** and this Markdown together.

The image communicates:

```text
Visual composition
Card hierarchy
Neumorphic depth
Color direction
Navigation presentation
Dashboard layout
Component appearance
```

This Markdown communicates:

```text
Implementation rules
Information architecture
HR module mapping
Design tokens
UX requirements
Responsive behavior
Accessibility
Security preservation
Acceptance criteria
```

The reference image is NOT a finance-app template.

Do not copy its sample data.

Do not recreate the sample product.

Instead:

```text
Existing BH HR
+
Existing HR functionality
+
BH branding
+
Reference visual language
+
Neumorphism 3D
+
Premium enterprise UX
=
Final BH HR
```

**The existing application remains the product. The reference image defines the visual language.**
