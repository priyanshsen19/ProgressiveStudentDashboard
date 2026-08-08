# Progressive Student Dashboard

A full-stack web application that tracks student learning progress across courses,
visualizes learning insights, and recommends next steps. Built for the Fullstack Developer
Challenge (Challenge 1).

- **Frontend:** React + Vite + TypeScript + Tailwind CSS + Recharts
- **Backend:** Node.js + Express + TypeScript
- **Database:** SQLite via Prisma ORM (zero-setup; one-line swap to PostgreSQL)
- **Auth:** Email/password, bcrypt hashing, JWT Bearer tokens
- **Docs:** OpenAPI / Swagger UI at `/api/docs`

---

## Features

### Core
- Email/password authentication with **student** and **mentor** roles
- Student dashboard with real, backend-computed metrics:
  - Overall progress, completed lessons, time spent, course count
  - **Trend chart** — minutes learned per day over the last 30 days (time series)
  - **Donut chart** — completion distribution (completed / in-progress / not started)
  - Per-course progress bars
- Course & lesson browsing (enrolled courses only)
- Lesson completion with cumulative, idempotent time tracking
- Activity event recording
- Single aggregated `GET /dashboard` endpoint (one round-trip powers the whole page)
- Seeded demo data with varied student profiles
- Documented REST API (Swagger UI)

### Stretch (implemented)
- **Adaptive recommendations** — deterministic rule engine (no AI), isolated in a service
- **CSV export** of the student's learning data
- **Automated tests** — Vitest + Supertest (auth, authorization, progress semantics,
  aggregation, recommendations, integration happy-path)
- **Responsive UI** — works on desktop, tablet, and mobile

### Intentionally out of scope
- **Mentor dashboard UI.** The mentor *role* exists and authenticates (the challenge requires
  it), but there are no mentor-specific pages or endpoints, and mentors have **no** access to
  student data through the API. See [Design Decisions](#design-decisions).

---

## Architecture

```
client/ (React SPA)  ──HTTP + JWT──►  server/ (Express API)  ──Prisma──►  SQLite
```

- The backend owns **all** business logic and aggregation; the frontend only renders API
  responses. No dashboard numbers are hard-coded on the client.
- Backend is a modular monolith: `auth`, `courses`, `lessons`, `progress`, `activities`,
  `dashboard`, `recommendations`, each split into a router (HTTP) and a service (logic).
- See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for details and
  [`docs/API.md`](docs/API.md) for the full endpoint reference.

---

## Prerequisites

- **Node.js 20+** (developed on Node 22)
- npm 10+
- No Docker or database server required — SQLite is file-based.

---

## Installation & Setup

From the repository root:

```bash
# 1. Configure environment
cp .env.example server/.env
#    then edit server/.env and set a JWT_SECRET (any long random string)

# 2. Install dependencies for both packages
npm run install:all

# 3. Create the database schema
npm run db:migrate

# 4. Seed demo data
npm run db:seed

# 5. Start both servers (API on :4000, web on :5173)
npm run dev
```

Then open **http://localhost:5173**.

Quick health check: `curl -s localhost:4000/health` → `{"status":"ok"}`

### Environment variables (`server/.env`)

| Variable          | Description                                            | Example                     |
| ----------------- | ----------------------------------------------------- | --------------------------- |
| `DATABASE_URL`    | Prisma datasource URL (SQLite file)                   | `file:./dev.db`             |
| `JWT_SECRET`      | Secret used to sign JWTs (**do not commit**)          | a long random string        |
| `PORT`            | API port                                              | `4000`                      |
| `CORS_ORIGIN`     | Allowed frontend origin(s), comma-separated           | `http://localhost:5173`     |

The frontend reads `VITE_API_URL` (optional). In development it is left empty and the Vite dev
server proxies `/api` → the backend, so the browser talks to a single origin.

---

## Demo Accounts

Each seeded account has its **own** password (the seed script also prints this list on run).
Credentials are intentionally **not** shown on the login page.

### Mentors
| Email                | Password            | Name        |
| -------------------- | ------------------- | ----------- |
| `mentor@example.com` | `Mentor#Mia2026`    | Mia Mentor  |
| `marcus@example.com` | `Mentor#Marcus2026` | Marcus Reed |

### Students — each shows a distinct dashboard (different trend shape & completion donut)
| Email                 | Password           | Profile                                             |
| --------------------- | ------------------ | --------------------------------------------------- |
| `student@example.com` | `Ava#Learn2026`    | Ava — highly active; activity **spread** over 30 days; donut mostly completed |
| `ben@example.com`     | `Ben#Learn2026`    | Ben — moderate; roughly half-completed donut         |
| `chloe@example.com`   | `Chloe#Learn2026`  | Chloe — **inactive** (early activity, then a gap) → re-engage rec |
| `diego@example.com`   | `Diego#Learn2026`  | Diego — just started; donut dominated by *Not Started* |
| `emma@example.com`    | `Emma#Learn2026`   | Emma — almost finished; **steady/even** trend; donut mostly completed |
| `frank@example.com`   | `Frank#Learn2026`  | Frank — binge learner; **tall recent spike**; prominent *In Progress* slice |
| `grace@example.com`   | `Grace#Learn2026`  | Grace — consistent; **even** trend across the window; balanced donut |
| `hassan@example.com`  | `Hassan#Learn2026` | Hassan — enrolled broadly but barely started; donut mostly *Not Started*; inactive |

---

## API Documentation

Interactive Swagger UI: **http://localhost:4000/api/docs**

Full written reference: [`docs/API.md`](docs/API.md).

Authenticated endpoints expect an `Authorization: Bearer <token>` header (obtain a token from
`POST /auth/login`).

---

## Testing

```bash
npm run test        # server unit + integration tests (Vitest + Supertest)
```

Tests run against an isolated `test.db` (provisioned automatically) and never touch your dev
database. Coverage includes authentication, role/data-isolation authorization, progress
cumulative/idempotent semantics, dashboard aggregation, the recommendation rules, and an
end-to-end happy path.

---

## Available Commands

Run from the repository root:

| Command               | Description                                       |
| --------------------- | ------------------------------------------------- |
| `npm run install:all` | Install deps in `server/` and `client/`           |
| `npm run dev`         | Start API + web dev servers concurrently          |
| `npm run db:migrate`  | Apply Prisma migrations                           |
| `npm run db:seed`     | Seed demo data                                    |
| `npm run test`        | Run the server test suite                         |
| `npm run typecheck`   | TypeScript check for both packages                |
| `npm run build`       | Production build of the frontend                  |

---

## Design Decisions

- **SQLite over PostgreSQL.** Zero-setup clean-run for reviewers — no Docker, no DB server.
  Because SQLite (via Prisma) supports neither native enums nor `Json` columns, `Role` and
  `ActivityType` are stored as strings (validated by `src/domain.ts`) and activity metadata is
  a JSON string. Moving to Postgres is a one-line datasource change plus restoring enums.
- **Express over NestJS; Vite SPA over Next.js.** Leaner and faster to run/read for a
  challenge graded on "it works," with fewer moving parts.
- **JWT in the `Authorization` header** (stored client-side), not httpOnly cookies. Simplest
  for an SPA + separate API; avoids CORS-credential and CSRF handling. A cookie strategy would
  be the more hardened production choice.
- **`timeSpent` is cumulative/absolute, and progress writes are idempotent.** A write of
  `timeSpent=35` sets the stored value to 35 (never `+35`); repeating an identical request
  yields identical state and records activity only on the *transition* into completion. This
  makes retries, refreshes, and re-opens safe and prevents double-counting.
- **Single source of truth for time.** All time totals — the KPI and the 30-day trend — come
  from `LessonProgress.timeSpent`. `ActivityEvent` never contributes to time totals. The trend
  attributes each completed lesson's minutes to its completion day (UTC).
- **Overall progress = completed ÷ total lessons**, not the average of per-course percentages.
- **Recommendations are deterministic rules** in an isolated service, designed to be swappable
  for an ML implementation later.
- **Mentor relationship** is a simple self-relation (`User.mentorId`) rather than a join table.

---

## Known Limitations

- No mentor dashboard UI/endpoints (see above) — the role authenticates only.
- The frontend JS bundle is a single chunk (~600 kB, mostly Recharts). Fine for this scope;
  could be code-split for production.
- Time-on-lesson is measured from page-open to "Mark Complete" (a simple heuristic), added to
  the lesson's cumulative total.
- Screenshots in `docs/screenshots/` should be captured from your running instance (see that
  folder's README) — they are not committed as binaries here.

---

## Repository Layout

```
Challenge/
├── server/          Express + Prisma API
│   ├── prisma/      schema.prisma, seed.ts
│   ├── src/
│   │   ├── modules/ auth, courses, lessons, progress, activities, dashboard, recommendations
│   │   ├── middleware/  auth (JWT + roles), error handler
│   │   ├── lib/     http-error, async-handler, csv
│   │   ├── app.ts   Express app factory (used by server + tests)
│   │   └── openapi.ts  hand-written OpenAPI spec
│   └── tests/       Vitest + Supertest
├── client/          React + Vite SPA
│   └── src/
│       ├── pages/   Login, Register, Dashboard, Courses, CourseDetail, Lesson, MentorInfo
│       ├── components/  dashboard charts + common state components
│       └── lib/     api client, auth context
├── docs/            API.md, ARCHITECTURE.md, screenshots/
├── package.json     root convenience scripts
└── .env.example
```
