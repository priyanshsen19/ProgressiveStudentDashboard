import { beforeEach, describe, expect, it } from "vitest";
import { app, createCourse, createUser, enroll, login, request, resetDb } from "./helpers";

describe("Integration: happy path", () => {
  beforeEach(resetDb);

  it("login -> dashboard -> complete lesson -> dashboard reflects the change", async () => {
    const student = await createUser({ email: "flow@example.com" });
    const { course, lessons } = await createCourse("JS", 4);
    await enroll(student.id, course.id);
    const token = await login("flow@example.com");
    const auth = { Authorization: `Bearer ${token}` };

    const before = await request(app).get("/api/dashboard").set(auth).expect(200);
    expect(before.body.overview.completedLessons).toBe(0);
    expect(before.body.overview.overallProgress).toBe(0);

    await request(app)
      .post(`/api/progress/lessons/${lessons[0].id}`)
      .set(auth)
      .send({ completed: true, timeSpent: 25 })
      .expect(200);

    const after = await request(app).get("/api/dashboard").set(auth).expect(200);
    expect(after.body.overview.completedLessons).toBe(1);
    expect(after.body.overview.overallProgress).toBe(25); // 1/4
    expect(after.body.overview.timeSpentMinutes).toBe(25);
  });

  it("exports CSV for the authenticated student", async () => {
    const student = await createUser({ email: "csv@example.com" });
    const { course } = await createCourse("JS", 2);
    await enroll(student.id, course.id);
    const token = await login("csv@example.com");

    const res = await request(app)
      .get("/api/dashboard/export.csv")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.text.split("\n")[0]).toBe("Date,Course,Lesson,Time Spent (min),Status");
  });

  it("bounds activity pagination (default 20, max 100)", async () => {
    await createUser({ email: "pg@example.com" });
    const token = await login("pg@example.com");
    const res = await request(app)
      .get("/api/activities?limit=999999")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.limit).toBe(100);
  });
});
