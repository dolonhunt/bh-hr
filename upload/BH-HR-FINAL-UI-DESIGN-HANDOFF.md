# BH HR — FINAL UI DESIGN HANDOFF
## Premium Soft 3D / Neumorphic HR Management Interface

**Status:** FINAL  
**Product:** BH HR  
**Company:** Beyond Headlines  
**Purpose:** Agent implementation handoff

## 1. FINAL VISUAL SOURCE OF TRUTH

Use the attached final BH HR UI concept image as the primary visual reference.

Target feel:

- Premium
- Clean
- Modern
- Soft 3D
- Neumorphic
- Editorial
- Light
- Spacious
- Highly readable
- Enterprise-ready

Visual atmosphere:

```text
Cream / off-white surfaces
Soft lavender background
Peach / coral atmospheric accents
Purple accents
Orange accents
Teal / green status accents
Soft shadows
Rounded floating cards
Subtle depth
```

The image defines the **visual style and composition only**. Do not copy its sample names, numbers, finance content, branding, or proprietary content.

## 2. CORE RULE

This is a **visual/UI upgrade**, not a product rebuild.

Preserve:

- Existing routes
- Existing functionality
- Database
- Authentication
- Authorization
- HR business rules
- Payroll calculations
- Attendance logic
- Leave logic
- Document generation
- Email workflows
- Permissions
- Existing data relationships

Do not remove functionality to simplify the UI.

## 3. BRANDING

Use the official BH branding.

**Full BH logo**
```text
https://i.postimg.cc/Vk8rGFCM/Logo.png
```

**BH B mark**
```text
https://i.postimg.cc/7P5Zr1bh/B.png
```

Use the full logo on expanded desktop/login and the B mark on collapsed/mobile layouts.

Remove all temporary/demo branding and fix any broken image fallback.

## 4. COLOR DIRECTION

### Background
```text
#F7F2F8
#F2ECF7
#F8F3F1
```

Use a very subtle lavender/peach atmospheric gradient.

### Main surfaces
```text
#FFFFFF
#FFFDFC
#FBF8F5
#F7F4F1
```

### Primary coral/orange
```text
#FF6658
#FF765E
#FF8A5B
```

Use for primary actions and important highlights. Do not make every element orange.

### Purple
```text
#7650C8
#8B63D8
#A58AE4
```

Use for analytics, secondary actions and selected states.

### Teal/green
```text
#18A98F
#2ABBA3
```

Use for success, present and approved states.

### Blue
```text
#4C86D9
#5E9BEA
```

Use for information and secondary analytics.

### Pink
```text
#D98DBA
#E7A6C8
```

Use sparingly for secondary categories and decorative accents.

### Text
```text
Primary   #272333
Secondary #625B6F
Muted     #8A8292
```

Soft UI must never compromise readability.

## 5. VISUAL FEEL

The UI should feel like a premium product presentation rather than a traditional admin panel.

Use:

```text
Large breathing room
Strong hierarchy
Floating panels
Soft depth
Rounded geometry
Clean typography
Subtle color accents
```

Avoid:

```text
Flat Bootstrap cards
Heavy borders
Dense spreadsheet appearance
Excessive gradients
Excessive glassmorphism
Excessive shadows
Neon effects
Random colors
Tiny text
```

## 6. SURFACE / DEPTH SYSTEM

Create shared:

- Base surface
- Raised surface
- Inset surface
- Pressed surface

Use soft layered shadows and subtle warm/lavender shadow tones. Avoid hard black shadows.

Recommended radius:

```text
Controls  10–16px
Cards     18–24px
Large     24–32px
Hero      28–36px
Modal     24–28px
```

## 7. TYPOGRAPHY

Use the existing project font if appropriate.

```text
Page title       28–40px / Bold
Section title    18–24px / SemiBold
Card title       15–18px / SemiBold
Body             14–16px
Secondary        12–14px
Caption          11–13px
KPI              28–42px / Bold
```

Never use pale text on white/cream surfaces.

## 8. SIDEBAR

Use a light floating cream/white sidebar with rounded corners and soft shadow.

### MAIN
```text
Dashboard
Employees
Attendance
Leave
Payroll
Performance
Recruitment
```

### OPERATIONS
```text
Interviews
Feedback
Documents
Training
Expenses
Timesheets
Assets
```

### INSIGHTS
```text
Reports
Notifications
```

### SYSTEM
```text
Audit Log
Settings
```

The sidebar must be scrollable and must not hide modules because of screen height.

### Active state

Use a clearly visible soft coral/orange or lavender/purple raised state with readable dark text and accent icon. The active item must never look disabled.

## 9. HEADER

Floating, compact header containing:

```text
Page title
Page subtitle
Global search
Quick Add
Notifications
User profile
```

## 10. QUICK ADD

Prominent primary action:

```text
+ Quick Add
```

Options:

```text
Add Employee
Add Attendance
Add Leave
Generate Document
Add Payroll
```

Use coral/orange, white text, rounded shape, raised shadow.

## 11. DASHBOARD

Use a composed editorial layout, not an equal-size card grid.

Recommended:

```text
Welcome / HR Overview
        ↓
KPI Row
        ↓
Attendance + Employee Analytics
        ↓
Recent Activity + Upcoming Events
        ↓
Leave / Payroll / Quick Actions
```

Use varied card sizes and generous whitespace.

## 12. KPI CARDS

Examples:

```text
Total Employees
Present Today
On Leave
New Hires
Birthdays
Pending Approvals
```

Each card contains:

```text
Label
Large number
Supporting value/trend
Icon
```

Keep accent colors subtle.

## 13. ATTENDANCE

KPI cards:

```text
Present
Absent
Late
On Leave
```

Semantic colors:

```text
Present  → Teal
Absent   → Coral
Late     → Orange
On Leave → Purple
```

### Heatmap

Use the available space effectively:

```text
Attendance Heatmap
Last 3 Months

[LARGE HEATMAP]

Less ---------------- More
```

Optionally pair it with:

```text
Attendance Rate
Present
Absent
Late
On Leave
```

Do not place a tiny heatmap inside a large empty card.

## 14. EMPLOYEES

Table:

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

Profile:

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

## 15. LEAVE

Use:

```text
Leave Balance
Pending
Approved
Rejected
```

Tabs where appropriate:

```text
All Leave
My Leave
Team Leave
Leave Calendar
```

Actions:

```text
Approve → Teal/Green
Reject → Coral
```

## 16. PAYROLL

Display:

```text
Total Payroll
Net Payroll
Allowances
Deductions
Tax
Pending Payments
```

Use the same soft analytics language.

## 17. PERFORMANCE

Display:

```text
Performance Score
Goals
Progress
Reviews
Feedback
```

Prefer visual progress components over dense numeric tables.

## 18. RECRUITMENT

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
Action
```

## 19. DOCUMENTS

Keep:

```text
All Documents
Templates
Generated
Approval Queue
Email History
```

Actions:

```text
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

## 20. REMAINING MODULES

Apply the same visual system to:

```text
Interviews
Feedback
Training
Expenses
Timesheets
Assets
Reports
Notifications
Audit Log
Settings
```

Do not remove any existing module.

## 21. COMPONENT SYSTEM

Create shared tokens/components for:

```text
Buttons
Inputs
Selects
Cards
Tables
Badges
Tabs
Avatars
Modals
Toasts
Alerts
Progress
Skeletons
Empty States
```

All interactive components should support:

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

## 22. BUTTONS

```text
Primary     → Coral/orange
Secondary   → Cream raised
Purple      → Secondary/high-value action
Success     → Teal
Warning     → Orange
Destructive → Coral/red
Disabled    → Muted cream
```

## 23. FORMS

Inputs should be:

```text
White/cream
Inset
Rounded
Soft shadow
```

States:

```text
Default
Hover
Focus
Error
Success
Disabled
Loading
```

Focus must have a clear purple/coral ring.

## 24. TABLES

Tables should sit inside soft raised containers.

Avoid heavy grid lines.

Use:

```text
Rounded container
Light header
Soft separators
Lavender hover
Readable text
```

## 25. BADGES

Use pastel status badges:

```text
Active    → Soft green
Pending   → Soft orange
Rejected  → Soft coral
Approved  → Soft teal
Special   → Soft purple
```

Status must remain understandable without color alone.

## 26. MODALS / TOASTS / EMPTY STATES

### Modals
Cream surface, 24–28px radius, soft shadow, clear hierarchy.

### Toasts
Floating soft cards for success/info/warning/error.

### Empty states
Centered, clean, useful copy and a clear action.

## 27. RESPONSIVE

Test:

```text
390px
768px
1024px
1440px
```

Mobile:

- Compact navigation/drawer
- Stacked cards
- Touch-friendly actions
- Scrollable tables
- Full-width panels

Desktop:

- Full sidebar
- Multi-column dashboard
- Floating cards
- Large analytics
- Dense but readable tables

## 28. ACCESSIBILITY

Required:

- Strong contrast
- Keyboard navigation
- Visible focus
- Accessible labels
- Accessible errors
- Color-independent status
- Reduced-motion support
- Touch-friendly controls

## 29. PERFORMANCE

Do not sacrifice performance for visual effects.

Avoid excessive:

- Blur
- Shadow stacks
- Animation
- Large images
- Continuous background animation

## 30. DO NOT DO

Do NOT:

- Copy TeamHub branding
- Copy sample employee names/numbers
- Copy finance content
- Remove BH HR menus
- Remove workflows
- Replace official BH branding
- Use the previous dark navy theme as the primary final direction
- Use excessive neon
- Use excessive glassmorphism
- Make every card orange/purple
- Make text too pale
- Use generic admin-template styling
- Hide modules because the sidebar is crowded

## 31. FINAL VISUAL TARGET

The final application should feel like:

```text
Premium HR SaaS
+
Soft 3D
+
Neumorphic depth
+
Cream surfaces
+
Lavender atmosphere
+
Peach/coral accents
+
Purple analytics
+
Teal success states
+
Strong typography
+
Spacious editorial layout
+
Professional enterprise information architecture
```

The supplied final BH HR concept image is the visual benchmark.

## 32. FINAL AGENT COMMAND

> Implement the BH HR UI using the attached final concept image as the primary visual reference and this Markdown as the implementation specification.
>
> Preserve the existing BH HR product, menus, routes, functionality, database, authentication, authorization, permissions and HR workflows.
>
> Apply the new visual system consistently across every existing screen.
>
> Use the official BH HR logo and B mark.
>
> Do not copy the reference product's content or branding.
>
> Do not remove any existing menu.
>
> Do not redesign the backend.
>
> Do not change business logic.
>
> The finished product must look like a premium, light, soft-3D HR management application inspired by the supplied reference, while remaining clearly BH HR / Beyond Headlines.

## 33. IMPLEMENTATION ORDER

```text
1. Inspect current BH HR
2. Preserve functionality
3. Create global design tokens
4. Create background/surface system
5. Create typography
6. Fix BH branding/logo
7. Redesign sidebar
8. Fix menu visibility/grouping
9. Redesign header
10. Redesign Quick Add
11. Redesign buttons/forms
12. Redesign cards/tables/badges
13. Redesign Dashboard
14. Redesign Employees
15. Redesign Attendance
16. Redesign Leave
17. Redesign Payroll
18. Redesign Performance
19. Redesign Recruitment
20. Redesign Documents
21. Apply to remaining modules
22. Mobile responsive pass
23. Accessibility pass
24. Performance pass
25. Visual consistency pass
26. Build/lint/test
27. Final screen-by-screen QA
```

## 34. DEFINITION OF DONE

- Official BH branding is used.
- No temporary logo remains.
- No broken logo/image appears.
- All agreed menus are visible and accessible.
- Active menu state is obvious.
- Text is readable.
- Dashboard has clear hierarchy.
- Cards have consistent soft 3D depth.
- Attendance is visually strong.
- Tables remain readable.
- Forms have clear states.
- Mobile layout works.
- Existing functionality still works.
- Existing permissions still work.
- No console/runtime errors are introduced.
- Overall interface visually matches the supplied final concept.
