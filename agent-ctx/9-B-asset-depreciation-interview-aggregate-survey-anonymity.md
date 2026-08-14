# Task 9-B — Asset Depreciation + Interview Feedback Aggregation + Survey Anonymity

## Summary
Implemented three independent HR features end-to-end (backend + frontend) on top of the existing Activity-model pattern. Zero Prisma schema changes. 3 new files + 8 modified files. Lint passes (0 errors).

## Files
**New (3):**
- `/src/app/api/assets/depreciation/route.ts` — GET depreciation summary
- `/src/app/api/assets/[id]/depreciation/route.ts` — GET per-asset year-by-year history
- `/src/app/api/interviews/aggregate/route.ts` — GET aggregated feedback per candidate

**Modified (8):**
- `/src/app/api/assets/route.ts` — added `purchaseValue` to AssetMeta/DTO + POST handler
- `/src/app/api/assets/[id]/route.ts` — PATCH handler accepts `purchaseValue`
- `/src/app/api/surveys/route.ts` — added `anonymous` to SurveyMeta/DTO + POST handler
- `/src/app/api/surveys/[id]/route.ts` — PATCH supports `anonymous`; GET strips employee info when anonymous
- `/src/app/api/surveys/[id]/responses/route.ts` — anonymity enforcement on GET + POST
- `/src/components/hr/modules/assets.tsx` — Depreciation view + Purchase Value field + AreaChart detail dialog
- `/src/components/hr/modules/interviews.tsx` — Candidate Summary tab with PieChart + timeline
- `/src/components/hr/modules/surveys.tsx` — anonymity toggle + Anonymous badge + privacy note

## Key implementation notes

### Asset depreciation
- Rates: LAPTOP=33%, MONITOR=25%, PHONE=40%, TABLET=35%, DESK=10%, CHAIR=15%, OTHER=20%. Unspecified types default to 20%.
- Formula: `currentValue = max(0, min(purchaseValue, purchaseValue × (1−rate)^years))`.
- Per-asset detail dialog shows Recharts AreaChart with two stacked areas (remaining value emerald + cumulative depreciation rose).
- Color-coded depreciation bars: <30% green, 30-70% amber, >70% rose.

### Interview aggregation
- Counts ratings/recommendations from any interview with the value set (not strictly COMPLETED) so partially-completed seed data is still represented.
- Overall recommendation = majority; ties resolve to HOLD.
- PieChart uses Cell colors HIRE=#10b981, REJECT=#f43f5e, HOLD=#f59e0b.
- Auto-selects first candidate that has interviews.

### Survey anonymity
- Anonymity enforced on backend (GET strips employeeId/employeeName, POST never stores employeeId). Frontend just renders what API returns — cannot be bypassed client-side.
- Switch toggle in Create wizard step 1 with descriptive help text + emerald privacy note when enabled.
- SurveyCard shows "Anonymous" badge (emerald tone, ShieldCheck icon) alongside status badge.
- ResponsesAnalytics header shows Anonymous badge + privacy note box.
- TextAnalytics enhanced to show "— {displayName}" prefix and relative time per response.

## Lint status
`bun run lint` returns 0 errors, 0 warnings.

## Smoke tests passed
- GET /api/assets/depreciation → 12 items + summary
- GET /api/assets/[id]/depreciation → year-by-year history
- POST /api/assets with purchaseValue=3500 → stored correctly
- GET /api/interviews/aggregate?candidateId=X → avgRating=4, overallRecommendation=HIRE
- POST /api/surveys with anonymous=true → persisted
- POST /api/surveys/[id]/responses with employeeId when anonymous → employeeId stored as null, displayName="Anonymous"
- GET /api/surveys/[id]/responses for anonymous survey → all responses anonymous
- GET /api/surveys/[id] for anonymous survey → responses inline are anonymous

## Not used
- z-ai-web-dev-sdk (not needed for this task)
- Prisma schema changes (all new fields stored in Activity.description JSON)
