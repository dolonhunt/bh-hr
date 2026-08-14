# Task 8-B — Interview Scheduling + Employee Feedback/Survey Module

**Agent:** 8-B
**Scope:** Build two new HR modules — Interviews (scheduling + tracking) and Feedback/Surveys (creation + analytics).

## Files Owned

### Backend (NEW)
- `/src/app/api/interviews/route.ts` — GET (list with filters) + POST (schedule)
- `/src/app/api/interviews/[id]/route.ts` — GET / PATCH / DELETE
- `/src/app/api/interviews/[id]/complete/route.ts` — POST (mark complete + rating + recommendation)
- `/src/app/api/surveys/route.ts` — GET (list) + POST (create)
- `/src/app/api/surveys/[id]/route.ts` — GET (with questions + responses) / PATCH / DELETE
- `/src/app/api/surveys/[id]/responses/route.ts` — GET (list) + POST (submit response)

### Frontend (NEW)
- `/src/components/hr/modules/interviews.tsx`
- `/src/components/hr/modules/surveys.tsx`

### Frontend (MODIFY)
- `/src/components/hr/nav-config.ts` — add `interviews` + `feedback` items
- `/src/lib/store.ts` — add `"interviews"` + `"feedback"` to `ModuleKey`
- `/src/components/hr/app-shell.tsx` — register `InterviewsModule` + `SurveysModule`

## Storage Strategy (no schema changes — Activity model)

| Entity           | Activity.type       | Activity.title                              | Activity.description (JSON)                                                                                  | Activity.employeeId |
|------------------|---------------------|---------------------------------------------|--------------------------------------------------------------------------------------------------------------|---------------------|
| Interview        | `INTERVIEW`         | `Interview — {candidateName} — {jobTitle}`  | `{candidateId,candidateName,jobId,jobTitle,interviewerId,interviewerName,scheduledAt,duration,type,location,meetingLink,status,notes,rating,recommendation}` | null                |
| Survey           | `SURVEY`            | survey title                                | `{description,status,questions:[{id,text,type,options?}],createdBy}`                                          | null                |
| Survey Response  | `SURVEY_RESPONSE`   | `Response — {surveyTitle}`                  | `{surveyId,employeeId,employeeName,answers:[{questionId,value}],submittedAt}`                                 | responder emp id    |

## Reference Patterns Used
- Storage pattern mirrors `onboarding` / `offboarding` modules (`type` discriminator + JSON in `description`).
- API shape mirrors `candidates/route.ts` (`{items, total, page, pageSize, totalPages}`).
- Frontend patterns mirror `recruitment.tsx` (PageHeader + KpiCard grid + Tabs + card grid + dialog form).
- Shared components: `PageHeader`, `KpiCard`, `StatusBadge`, `AvatarBadge`, `EmptyState`, `ExportButton`.
- Recharts usage mirrors `reports.tsx`.
- Audit log entries on every mutation, mirroring existing API routes.

## Progress
- [x] Backend APIs (interviews) — `/api/interviews` (GET+POST), `/api/interviews/[id]` (GET+PATCH+DELETE), `/api/interviews/[id]/complete` (POST)
- [x] Backend APIs (surveys) — `/api/surveys` (GET+POST), `/api/surveys/[id]` (GET+PATCH+DELETE), `/api/surveys/[id]/responses` (GET+POST)
- [x] Frontend interviews module — `/src/components/hr/modules/interviews.tsx`
- [x] Frontend surveys module — `/src/components/hr/modules/surveys.tsx`
- [x] nav-config + store + app-shell integration
- [x] Lint pass — `bun run lint` returns 0 errors / 0 warnings
- [x] TypeScript check — 0 errors in my files
- [x] API smoke tests — all endpoints return 200/201 with correct payloads
- [x] Worklog update

## Smoke Test Results

**Interviews:**
- `POST /api/interviews` → 201, denormalises candidateName/jobTitle/interviewerName from IDs
- `GET /api/interviews/{id}` → 200
- `POST /api/interviews/{id}/complete` → 200, sets status=COMPLETED + rating + recommendation
- `PATCH /api/interviews/{id}` → 200, supports status/type/scheduledAt/duration/etc updates
- `GET /api/interviews?search=Fahim` → 200, filters by candidate name
- Validation: invalid candidateId → 404; missing fields → 400

**Surveys:**
- `POST /api/surveys` → 201, supports 4 question types (TEXT/RATING/SINGLE_CHOICE/MULTIPLE_CHOICE)
- `POST /api/surveys/{id}/responses` → 201, validates answers against question types, resolves employee name
- `GET /api/surveys/{id}` → 200, returns full survey with questions + responses array + responseCount
- Validation: missing title → 400; invalid question type → 400; choice question needs ≥2 options → 400

**Created during smoke test:**
- 1 interview: Fahim Ahmed (Senior Backend Engineer) — TECHNICAL, 45 min, 2026-01-15 14:30, Priya Sarkar interviewing, rating 4/5, HIRE
- 1 survey: "Q3 Engagement Pulse" — 4 questions (RATING + TEXT + SINGLE_CHOICE + MULTIPLE_CHOICE)
- 2 responses to the survey (1 with employee, 1 anonymous)
