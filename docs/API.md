# API Reference

Base URL (dev): `http://localhost:4000`
Interactive docs: `http://localhost:4000/api/docs` (Swagger UI)

All responses are JSON unless noted. Authenticated endpoints require an
`Authorization: Bearer <token>` header. Student-scoped endpoints require the `STUDENT` role;
mentors receive `403` on them.

### Status codes

| Code | Meaning                                   |
| ---- | ----------------------------------------- |
| 200  | OK                                        |
| 201  | Created                                   |
| 400  | Bad request                               |
| 401  | Unauthenticated (missing/invalid token)   |
| 403  | Forbidden (wrong role or not your data)   |
| 404  | Not found                                 |
| 409  | Conflict (e.g. duplicate email)           |
| 422  | Validation error                          |
| 500  | Internal server error                     |

---

## System

### `GET /health`
Unauthenticated. → `200 {"status":"ok"}`

---

## Auth

### `POST /auth/register`
Self-registration (students only).
```json
{ "name": "Demo Student", "email": "student@new.com", "password": "Password123!" }
```
→ `201 { "user": { id, name, email, role }, "token": "<jwt>" }`
Errors: `409` email exists, `422` validation.

### `POST /auth/login`
```json
{ "email": "student@example.com", "password": "Ava#Learn2026" }
```
→ `200 { "user": {...}, "token": "<jwt>" }` · `401` invalid credentials.

### `GET /auth/me`  🔒
Returns the current user (student or mentor). → `200 { "user": {...} }`

---

## Courses  🔒 (STUDENT)

### `GET /courses`
Courses the student is enrolled in, with completion stats.
```json
[ { "id", "title", "description", "totalLessons", "completedLessons", "progress" } ]
```

### `GET /courses/:courseId`
Single enrolled course (same shape as above). → `403` if not enrolled, `404` if missing.

### `GET /courses/:courseId/lessons`
Lessons of an enrolled course, each with the student's `completed` flag and `timeSpent`.

---

## Lessons  🔒 (STUDENT)

### `GET /lessons/:lessonId`
```json
{ "id", "courseId", "title", "description", "durationMin", "order", "completed", "timeSpent" }
```
`completed`/`timeSpent` are specific to the authenticated student. `403` if not enrolled in
the parent course.

---

## Progress  🔒 (STUDENT)

### `GET /progress`
Raw `LessonProgress` records for the student.

### `POST /progress/lessons/:lessonId`
Create/update progress. **`timeSpent` is absolute/cumulative (not an increment).** Idempotent.
```json
{ "completed": true, "timeSpent": 35 }
```
At least one field is required. Records a `LESSON_COMPLETED` activity only on the transition
into completion (and `COURSE_COMPLETED` when the last lesson of the course is finished).
→ `200 <LessonProgress>` · `403` not enrolled · `404` lesson missing.

---

## Activities  🔒 (STUDENT)

### `POST /activities`
```json
{ "type": "LESSON_STARTED", "metadata": { "lessonId": "..." } }
```
`type` ∈ `LOGIN | LESSON_STARTED | LESSON_COMPLETED | COURSE_STARTED | COURSE_COMPLETED`.
→ `201 <ActivityEvent>`

### `GET /activities?limit=&offset=`
Paginated, newest first. `limit` default **20**, max **100** (clamped); `offset` default 0.
```json
{ "items": [ { id, type, metadata, createdAt } ], "total", "limit", "offset" }
```

---

## Dashboard  🔒 (STUDENT)

### `GET /dashboard`
All primary dashboard data in one response.
```json
{
  "overview": { "completedLessons", "totalLessons", "timeSpentMinutes", "overallProgress", "coursesCount" },
  "courses": [ { "id", "title", "description", "totalLessons", "completedLessons", "progress" } ],
  "activityTrend": [ { "date": "2026-08-01", "minutes": 60 } ],           // dense, last 30 days (UTC)
  "completionDistribution": { "completed", "inProgress", "notStarted" },
  "recommendations": [ { "key", "title", "description", "priority" } ]
}
```

### `GET /dashboard/export.csv`
CSV of the authenticated student's own data. Columns:
`Date, Course, Lesson, Time Spent (min), Status`. → `200 text/csv`
