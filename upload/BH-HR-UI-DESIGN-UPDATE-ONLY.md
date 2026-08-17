# BH HR — UI DESIGN UPDATE SPECIFICATION
## Exact Visual Upgrade Based on Supplied UI Reference

**Scope:** UI/UX and visual design only  
**Do not modify:** Business logic, APIs, database, authentication, document workflows, email workflows, or HR functionality unless required only to support visual presentation.

---

# 1. PRIMARY UI REFERENCE

Use the supplied UI design image as the **visual source of truth** for the application redesign.

Reference:

```text
ux.jpg
```

The target visual language is:

**Warm Beige + Deep Teal + Premium Restrained Neumorphism**

The existing BH HR application should be visually transformed to this design language while keeping the existing application structure and functionality intact.

---

# 2. CORE VISUAL PRINCIPLE

Do not create a generic SaaS dashboard.

The final interface must feel:

- Premium
- Calm
- Warm
- Professional
- Enterprise-grade
- Soft
- Tactile
- Clean
- Consistent
- Modern but restrained

Avoid:

- Glassmorphism
- Excessive gradients
- Blue/purple admin-template styling
- Excessive cards
- Heavy shadows
- Excessive rounded corners
- Hard black shadows
- Overly colorful interfaces
- Unnecessary animations

---

# 3. COLOR SYSTEM

## Background

Use a warm beige/off-white base.

Target visual range:

```text
#F3EDE1
#F5F0E6
#EFE8DA
```

Use one primary background token rather than different page-specific backgrounds.

## Primary

Deep teal:

```text
#005C5A
```

Use for:

- Primary buttons
- Active navigation
- Active tabs
- Progress
- Links where appropriate
- Selected states
- Important indicators

## Text

Primary:

```text
Near-black / deep warm charcoal
```

Secondary:

```text
Warm muted gray
```

Do not use pure black for normal UI text.

## Feedback

Use restrained versions of:

```text
Success
Warning
Error
Info
```

Feedback colors must remain compatible with the warm beige/deep-teal system.

---

# 4. FOUR SURFACE LAYERS

The UI must use four clearly distinguishable surface treatments.

## Base Layer

Use for:

- Application background
- Main page
- Large content areas

Appearance:

- Flat
- Warm
- Minimal elevation

## Raised Layer

Use for:

- KPI cards
- Primary cards
- Important panels
- Selected navigation
- Primary controls

Appearance:

- Soft raised effect
- Subtle warm shadow
- Soft highlight

## Inset Layer

Use for:

- Search
- Inputs
- Filters
- Form controls
- Recessed content

Appearance:

- Content appears pressed into the surface
- Soft inner shadow
- Subtle inner highlight

## Pressed Layer

Use for:

- Active buttons
- Pressed buttons
- Active switches
- Active navigation
- Interaction feedback

Appearance:

- Recessed
- Tactile
- Slightly darker than raised state

---

# 5. ELEVATION SYSTEM

Implement five elevation levels.

```text
LEVEL 1 — FLAT
LEVEL 2 — HOVER
LEVEL 3 — RAISED
LEVEL 4 — MODAL
LEVEL 5 — POPOVER
```

### Level 1 — Flat

No visible elevation.

### Level 2 — Hover

Very subtle elevation increase.

### Level 3 — Raised

Standard card elevation.

### Level 4 — Modal

Higher elevation with stronger separation.

### Level 5 — Popover

Highest elevation for:

- Dropdowns
- Menus
- Tooltips
- Floating controls

Do not use the same shadow everywhere.

---

# 6. BORDER SYSTEM

Use:

```text
1px — THIN
2px — REGULAR
4px — THICK
```

Default:

```text
1px
```

Use 2px for emphasis.

Use 4px only for specific visual emphasis.

Borders should remain soft and harmonious with the warm palette.

---

# 7. RADIUS SYSTEM

Use only the approved radius scale:

```text
4px
8px
12px
16px
24px
```

Recommended:

```text
4px  → small controls
8px  → inputs / compact elements
12px → cards / tables
16px → larger panels
24px → major visual surfaces where appropriate
```

Do not make every element pill-shaped.

---

# 8. ICONOGRAPHY

Use:

**Lucide React**

Sizes:

```text
16px
20px
24px
```

Default:

```text
2px stroke
```

Guidelines:

- 16px for compact controls
- 20px for navigation/actions
- 24px for primary page-level actions
- Keep icons visually aligned
- Do not mix icon families

---

# 9. SHADOW SYSTEM

Use soft warm neumorphic shadows.

Every shadow should feel:

- Soft
- Low contrast
- Warm
- Natural

Use separate tokens for:

```text
Flat
Hover
Raised
Modal
Popover
Inset
Pressed
```

Avoid hard black shadows.

---

# 10. HIGHLIGHT SYSTEM

Use subtle surface highlights to create the neumorphic effect.

Raised components should have:

- Soft light edge
- Soft warm shadow

Inset components should have:

- Inner dark/warm edge
- Inner light edge

Keep the effect restrained.

The interface should not look 3D-heavy.

---

# 11. TYPOGRAPHY

Use a clean, professional sans-serif system.

Typography hierarchy:

```text
Page Title
Section Title
Card Title
Body
Secondary
Caption
```

### Page Title

Strong visual weight.

### Section Title

Medium/strong weight.

### Body

Highly readable.

### Secondary

Muted warm gray.

### Metrics

Large, bold, high contrast.

Avoid excessive font sizes.

---

# 12. SPACING SYSTEM

Use consistent spacing throughout the application.

Primary spacing values:

```text
8px
12px
16px
24px
32px
```

The supplied reference particularly demonstrates:

```text
16px spacing
24px spacing
```

Use these as the primary component/layout rhythm.

Do not use random margins between components.

---

# 13. BUTTON DESIGN

## Primary Button

Appearance:

- Deep teal
- White text
- Raised surface
- Soft shadow
- Moderate radius

Example:

```text
Submit Now
```

## Hover

Slight elevation increase.

## Pressed

Button becomes visibly pressed/inset.

## Loading

Example:

```text
Sending...
```

Include spinner/progress indication.

## Disabled

Use muted beige/gray appearance.

Disabled buttons must clearly look unavailable.

---

# 14. INPUT DESIGN

Inputs must follow the inset-layer style.

States:

```text
Default
Focus
Error
Disabled
Success
```

### Default

Soft inset surface.

### Focus

Deep teal focus treatment with subtle glow.

### Error

Soft red border and helper text.

### Success

Soft teal/green validation treatment.

### Helper text

Small muted text below field.

Example:

```text
Email Address
Helper: Enter a valid email
```

Error:

```text
Error: Invalid email format
```

---

# 15. CHECKBOX

Use:

- Deep teal selected state
- Soft beige unchecked state
- Clear checkmark
- Consistent 16–20px visual size

States:

```text
Unchecked
Checked
Hover
Focus
Disabled
```

---

# 16. RADIO

Use:

- Deep teal selected state
- Soft neutral unselected state
- Clear circular indicator

States:

```text
Unselected
Selected
Hover
Focus
Disabled
```

---

# 17. SWITCH

Use tactile switch styling.

ON:

```text
Deep teal
```

OFF:

```text
Muted beige/gray
```

The thumb should appear slightly raised.

---

# 18. SLIDER

Use:

- Deep teal active track
- Warm neutral inactive track
- Raised thumb
- Visible value

Example:

```text
75%
```

Use clear tick/value labels where appropriate.

---

# 19. TABS

Use a restrained tab design.

Active tab:

- Deep teal indicator
- Stronger text
- Subtle raised/pressed treatment

Inactive tabs:

- Neutral text
- No excessive visual weight

Example:

```text
Overview
Details
Settings
```

---

# 20. BREADCRUMBS

Use compact raised/inset breadcrumb surfaces.

Example:

```text
Home / Categories / Product Details / Edit
```

Keep breadcrumb text small and readable.

---

# 21. PAGINATION

Use:

```text
PREV
1
2
3
4
NEXT
```

Active page:

- Deep teal
- White text
- Raised/pressed appearance

Inactive pages:

- Neutral
- Minimal visual weight

---

# 22. STEPPER / PROCESS INDICATOR

Use a 4-step process component.

Example:

```text
1. Account
2. Details
3. Review
4. Payment
```

For BH HR use equivalent workflows such as:

```text
Employee
Document
Review
Send
```

Current step:

- Deep teal
- Stronger visual emphasis
- Tooltip/label where helpful

Completed steps:

- Connected teal line

Upcoming:

- Neutral outline

---

# 23. CARDS

Cards must use the raised-layer treatment.

Card structure:

```text
Icon
Title
Description
Primary Action
```

Use:

- Warm background
- Soft shadow
- Subtle border
- Moderate radius
- Consistent padding

Do not put every small piece of information inside a card.

---

# 24. LIST ITEMS

List items should use flat or lightly raised surfaces.

Structure:

```text
Avatar / Icon
Title
Secondary text
Optional status/action
```

Keep list rows compact.

Use subtle separation instead of heavy borders.

---

# 25. BADGES

Badges should be compact.

Example:

```text
New
Beta
24
```

Use deep teal as the primary badge style.

Secondary states should use restrained neutral/success/warning/error tones.

Avoid bright badge colors.

---

# 26. AVATARS

Use circular avatars.

Support:

```text
Small
Medium
Large
```

Use consistent borders and subtle elevation.

Employee photos should look integrated with the warm UI rather than floating independently.

---

# 27. TOOLTIPS

Use a compact dark/warm tooltip.

Tooltips should:

- Be readable
- Have high contrast
- Appear above/beside controls
- Not remain visible unnecessarily

Use for icon-only actions and unfamiliar controls.

---

# 28. COMPACT TABLE HEADER

Tables must use a compact header style.

Example:

```text
Name (A-Z)
Date
Status
Action
```

Header:

- Compact
- Clear
- Slightly emphasized
- Warm neutral background
- Minimal borders

Sorting/filter indicators should use Lucide icons.

---

# 29. TABLE DESIGN FOR BH HR

Apply the same visual system to:

- Employees
- Attendance
- Leave
- Payroll
- Recruitment
- Documents
- Reports
- Audit Log

Table behavior:

- Flat/soft surface
- Compact rows
- Clear hierarchy
- Subtle hover
- Raised selected row where appropriate
- Deep teal active controls
- Responsive behavior

Avoid heavy grid lines.

---

# 30. MODAL

Modal must use:

```text
LEVEL 4 — MODAL
```

Example:

```text
Delete Account?

[warning icon]

Are you sure?

Cancel
Delete
```

Modal requirements:

- Raised surface
- Soft shadow
- Warm background
- Clear title
- Clear destructive action
- Clear cancel action
- Proper focus handling

---

# 31. TOAST STACK

Use a consistent toast stack.

Examples:

```text
Success: File uploaded
Info: Updates available
Warning: Action requires attention
Error: Something went wrong
```

Toasts should use:

- Raised surface
- Small icon
- Clear message
- Optional close action

---

# 32. ALERT BANNER

Use a horizontal alert banner for important system messages.

Example:

```text
Important: System maintenance scheduled
```

Primary information alerts can use deep teal.

Keep the banner visually restrained.

---

# 33. PROGRESS

Use linear progress with:

- Deep teal active bar
- Warm neutral track
- Rounded but restrained shape

Example:

```text
50%
```

Use for:

- Upload
- Document generation
- Bulk processing
- Long workflows

---

# 34. SPINNER

Use a minimal teal spinner.

Do not use oversized animated loaders.

Use for:

- Page loading
- API actions
- Document generation
- Email sending

---

# 35. SKELETON

Skeleton rows should use warm neutral blocks.

Example:

```text
████████████
████████
████████████████
```

Use subtle animation only where useful.

---

# 36. EMPTY STATES

Empty states must use a clean bordered/soft raised container.

Example:

```text
[Illustration/Icon]

No Results Found

Clear Filters
```

Use for:

- No employees
- No documents
- No attendance
- No leave requests
- No payroll
- No candidates
- No reports

Keep the empty state helpful, not decorative.

---

# 37. DASHBOARD UI UPDATE

Apply the design system to the existing dashboard.

### KPI cards

Use:

- Raised Layer
- Large metric
- Small supporting label
- Deep teal accent
- Minimal icon

### Charts

Charts should use:

- Warm neutral chart background
- Deep teal primary data
- Soft secondary tones
- Minimal grid lines
- Clean labels

### Quick actions

Use primary/raised controls.

### Recent activity

Use compact list/table patterns.

---

# 38. EMPLOYEE UI UPDATE

Redesign:

- Employee list
- Employee grid
- Employee profile
- Employee tabs
- Employee forms
- Employee actions

Use the same component system.

Employee profile should feel like the central HR workspace.

---

# 39. ATTENDANCE UI UPDATE

Redesign:

- Attendance dashboard
- KPI cards
- Attendance table
- Filters
- Calendar/heatmap
- Import dialog
- Empty states
- Loading states

Use inset filters and raised data cards.

---

# 40. LEAVE UI UPDATE

Redesign:

- Leave KPI cards
- Request form
- Calendar
- Approval modal
- Leave table
- Leave status badges

Use consistent:

```text
Raised
Inset
Pressed
Modal
Toast
```

patterns.

---

# 41. PAYROLL UI UPDATE

Redesign:

- Payroll dashboard
- Payroll table
- Payroll form
- Payslip preview
- Payroll approval modal

Use strong numeric hierarchy for salary figures.

---

# 42. DOCUMENT UI UPDATE

Redesign:

- Document dashboard
- Template list
- Template cards
- Document preview
- Generated document list
- Document status badges
- Email composer
- Email history
- Bulk generation UI

The visual design must remain consistent across all document workflows.

---

# 43. RECRUITMENT / PERFORMANCE UI UPDATE

Apply the same system to:

- Job cards
- Candidate lists
- Candidate profiles
- Recruitment pipeline
- Interview views
- Performance reviews
- Scorecards
- Status badges

---

# 44. SETTINGS UI UPDATE

Redesign settings using:

- Tabs
- Cards
- Inset forms
- Raised sections
- Toggle controls
- Modal confirmations
- Toast feedback

Settings should feel consistent with the rest of BH HR.

---

# 45. SIDEBAR

Sidebar must follow the same visual language.

Expanded:

```text
BH Full Logo
Navigation
Section groups
User/profile
```

Collapsed:

```text
BH B Mark
Icons
```

Active navigation:

- Deep teal
- Pressed/raised treatment
- Clear visual indicator

Inactive:

- Warm neutral
- Minimal visual weight

---

# 46. HEADER

Header should contain:

- Page context
- Search where appropriate
- Notifications
- User/profile
- Primary page action

Use restrained elevation.

Do not make the header visually heavier than the page.

---

# 47. LOGIN

Login should use:

- Official BH full logo
- Warm beige background
- Deep teal primary action
- Inset input fields
- Clear validation
- Soft raised login panel

Do not show temporary TeamHub/Northwind branding.

---

# 48. RESPONSIVE UI

Maintain the same visual system on:

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

Mobile must preserve:

- Warm background
- Neumorphic surfaces
- Deep teal
- Clear touch targets
- Correct spacing
- Usable tables/forms

Do not simply shrink desktop components.

---

# 49. ACCESSIBILITY VISUAL REQUIREMENTS

Ensure:

- Strong enough text contrast
- Visible focus state
- Keyboard-visible interaction
- Accessible labels
- Clear error states
- Clear disabled states
- Touch-friendly controls
- No information communicated only by color

---

# 50. MOTION

Use subtle motion only.

Recommended:

```text
150–250ms
```

Use for:

- Hover
- Press
- Modal
- Toast
- Dropdown
- Navigation transitions

Avoid excessive animations.

Respect reduced-motion preferences.

---

# 51. VISUAL CONSISTENCY RULE

Every screen must use the same:

```text
Colors
Typography
Spacing
Radius
Borders
Elevation
Icons
Controls
Feedback
```

Do not create a different visual style for individual modules.

---

# 52. UI IMPLEMENTATION ORDER

Implement in this order:

```text
1. Design tokens
2. Surface/elevation system
3. Typography
4. Icon system
5. Buttons
6. Inputs
7. Selects
8. Checkbox
9. Radio
10. Switch
11. Slider
12. Tabs
13. Breadcrumbs
14. Pagination
15. Stepper
16. Cards
17. Lists
18. Badges
19. Avatars
20. Tables
21. Tooltip
22. Modal
23. Toast
24. Alert
25. Progress
26. Spinner
27. Skeleton
28. Empty state
29. /design-system
30. Global layout
31. Sidebar
32. Header
33. Login
34. Dashboard
35. Employees
36. Employee Profile
37. Attendance
38. Leave
39. Payroll
40. Performance
41. Recruitment
42. Documents
43. Reports
44. Settings
45. Responsive pass
46. Accessibility visual pass
```

---

# 53. DO NOT CHANGE

This UI-only update must NOT intentionally change:

- Business rules
- API contracts
- Database schema
- Authentication logic
- Authorization logic
- Payroll calculations
- Attendance calculations
- Leave calculations
- Document generation logic
- Email logic
- Existing HR workflows

Only change code necessary to support the new visual presentation.

---

# 54. UI ACCEPTANCE CHECKLIST

Before completion verify:

### Foundations

- [ ] Warm beige base layer
- [ ] Deep teal primary
- [ ] Correct typography
- [ ] Correct spacing
- [ ] Correct radius
- [ ] Correct borders
- [ ] Correct shadows
- [ ] Correct icon sizes

### Surfaces

- [ ] Base
- [ ] Raised
- [ ] Inset
- [ ] Pressed

### Elevation

- [ ] Flat
- [ ] Hover
- [ ] Raised
- [ ] Modal
- [ ] Popover

### Controls

- [ ] Buttons
- [ ] Inputs
- [ ] Select
- [ ] Checkbox
- [ ] Radio
- [ ] Switch
- [ ] Slider

### Navigation

- [ ] Tabs
- [ ] Breadcrumbs
- [ ] Pagination
- [ ] Stepper

### Data

- [ ] Cards
- [ ] Lists
- [ ] Badges
- [ ] Avatars
- [ ] Tables
- [ ] Tooltips

### Feedback

- [ ] Modal
- [ ] Toast
- [ ] Alert
- [ ] Progress
- [ ] Spinner
- [ ] Skeleton
- [ ] Empty state

### Application

- [ ] Sidebar
- [ ] Header
- [ ] Login
- [ ] Dashboard
- [ ] Employees
- [ ] Employee Profile
- [ ] Attendance
- [ ] Leave
- [ ] Payroll
- [ ] Performance
- [Recruitment
- [ ] Documents
- [ ] Reports
- [ ] Settings

### Responsive

- [ ] 1440px
- [ ] 1024px
- [ ] 768px
- [ ] 390px

---

# 55. FINAL VISUAL ACCEPTANCE

The implementation is visually accepted only when the application clearly resembles the supplied reference in:

```text
Surface treatment
Elevation
Inset/pressed controls
Warm beige palette
Deep teal accent
Typography
Spacing
Radius
Border treatment
Iconography
Buttons
Inputs
Navigation
Tables
Cards
Feedback
```

The result must look like a **single coherent BH HR design system**, not a collection of separately styled pages.

**Final instruction: UI DESIGN UPDATE ONLY. Preserve existing application functionality.**
