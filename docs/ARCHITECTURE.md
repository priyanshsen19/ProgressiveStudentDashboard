# Architecture

## Overview

A modular monolith split into two deployables:

```
┌─────────────────────┐        ┌──────────────────────────┐        ┌──────────┐
│  client/ (React SPA) │  HTTP  │  server/ (Express + TS)  │ Prisma │  SQLite  │
│  Vite · Tailwind     │ ─────► │  modular monolith        │ ─────► │  dev.db  │
│  Recharts            │  JWT   │  controllers → services  │        │          │
└─────────────────────┘        └──────────────────────────┘        └──────────┘
```

**Principle:** the backend owns all business logic and aggregation. The frontend renders API
responses and holds no derived business numbers.

## Backend

Each feature is a module with a **router** (HTTP concerns: parsing, status codes, auth
middleware) and a **service** (business logic, Prisma access). There is no separate repository
layer — Prisma *is* the data-access layer.

```
src/
├── app.ts                 Express app factory (imported by index.ts and by tests)
├── index.ts               HTTP listener
├── config.ts              env parsing (dotenv), fail-fast on missing JWT_SECRET
├── domain.ts              Role / ActivityType string unions (SQLite has no enums)
├── prisma.ts              PrismaClient singleton
├── middleware/
│   ├── auth.ts            signToken, requireAuth, requireRole
│   └── error.ts           central error handler (Zod → 422, HttpError → status, else 500)
├── lib/                   http-error, async-handler, csv
└── modules/
    ├── auth/              register / login / me
    ├── courses/           enrolled courses + completion stats, enrollment guard
    ├── lessons/           lesson detail (student-scoped completion)
    ├── progress/          cumulative + idempotent upsert (transactional)
    ├── activities/        event recording + bounded pagination
    ├── dashboard/         aggregation service (the core) + CSV export
    └── recommendations/   deterministic rules service
```

### Request lifecycle
1. `requireAuth` verifies the JWT and populates `req.user`.
2. `requireRole("STUDENT")` gates student endpoints.
3. The router validates the body with Zod, calls the service.
4. Services enforce data isolation (only ever read the caller's rows) and return plain data.
5. Errors bubble to the central handler via `asyncHandler`, producing consistent JSON.

## Data model

```
User ──(mentorId self-relation)──► User
 ├─ Enrollment ──► Course ──► Lesson
 ├─ LessonProgress ──► Lesson      (@@unique studentId+lessonId — source of truth for time)
 ├─ ActivityEvent                  (timestamped; never feeds time totals)
 └─ Recommendation                 (@@unique studentId+key — deterministic, regenerable)
```

Notable choices:
- `Course.totalLessons` is **derived** (count of lessons), never stored — avoids drift.
- Mentor→students is a **named self-relation** on `User`, not a join table.
- `Role` / `ActivityType` are strings (SQLite has no enums); allowed values live in `domain.ts`.

## Key invariants

- **Time source of truth:** every time figure (KPI + 30-day trend) is derived from
  `LessonProgress.timeSpent`. `ActivityEvent` carries no duration.
- **Cumulative time:** `POST /progress` sets `timeSpent` to an absolute value.
- **Idempotency:** identical progress requests → identical state; activity events fire only on
  the transition into completion, inside a Prisma transaction.
- **Overall progress:** `completedLessons / totalLessons`, not an average of course percentages.
- **Trend bucketing:** completed lessons are attributed to their `completedAt` day in **UTC**;
  the series is dense (zero-filled) across the last 30 days.

## Frontend

- `lib/api.ts` — one typed client; injects the Bearer token; base URL from `VITE_API_URL`
  (empty in dev → Vite proxies `/api`).
- `lib/auth.tsx` — auth context; restores the session from a stored token via `GET /auth/me`.
- `hooks/useAsync.ts` — loading/error/reload state for every data page.
- Route guards (`App.tsx`) redirect unauthenticated users to `/login` and route by role.
- Dashboard is composed of small components (`OverviewCards`, `ActivityChart`,
  `CompletionChart`, `CourseProgress`, `Recommendations`), all fed by one `GET /dashboard`.
- Charts use Recharts `ResponsiveContainer`; a mount-time reflow (`useReflowOnMount`) works
  around Recharts' first-paint measurement under React StrictMode.

## Testing

`app.ts` exports a `createApp()` factory so Supertest drives the real app in-process. A Vitest
`globalSetup` provisions an isolated `test.db` via `prisma db push`; each test resets rows for
isolation. Suites cover auth, authorization/data-isolation, progress semantics, aggregation,
recommendation rules, and an end-to-end happy path.
