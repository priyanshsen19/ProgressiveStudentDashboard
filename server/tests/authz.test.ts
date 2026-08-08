import { beforeEach, describe, expect, it } from "vitest";
import { app, createCourse, createUser, enroll, login, request, resetDb } from "./helpers";

describe("Authorization", () => {
  beforeEach(resetDb);

  it("rejects unauthenticated access to protected routes with 401", async () => {
    await request(app).get("/dashboard").expect(401);
    await request(app).get("/courses").expect(401);
  });

  it("forbids a mentor from student-only endpoints with 403", async () => {
    await createUser({ email: "m@example.com", role: "MENTOR" });
    const token = await login("m@example.com");
    await request(app)
      .get("/dashboard")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
  });

  it("prevents a student from accessing a course they are not enrolled in (403)", async () => {
    const owner = await createUser({ email: "owner@example.com" });
    const other = await createUser({ email: "other@example.com" });
    const { course, lessons } = await createCourse("Private", 3);
    await enroll(owner.id, course.id);

    const otherToken = await login("other@example.com");
    await request(app)
      .get(`/courses/${course.id}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .expect(403);
    // ...and cannot read a lesson inside it, nor post progress to it.
    await request(app)
      .get(`/lessons/${lessons[0].id}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .expect(403);
    await request(app)
      .post(`/progress/lessons/${lessons[0].id}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ completed: true })
      .expect(403);
  });

  it("rejects an invalid token with 401", async () => {
    await request(app)
      .get("/dashboard")
      .set("Authorization", "Bearer not-a-real-token")
      .expect(401);
  });
});
