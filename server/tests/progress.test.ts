import { beforeEach, describe, expect, it } from "vitest";
import { app, createCourse, createUser, enroll, login, prisma, request, resetDb } from "./helpers";

describe("Progress", () => {
  beforeEach(resetDb);

  async function setup() {
    const student = await createUser({ email: "s@example.com" });
    const { course, lessons } = await createCourse("JS", 4);
    await enroll(student.id, course.id);
    const token = await login("s@example.com");
    return { student, course, lessons, token };
  }

  it("marks a lesson complete and records timeSpent", async () => {
    const { lessons, token } = await setup();
    const res = await request(app)
      .post(`/api/progress/lessons/${lessons[0].id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ completed: true, timeSpent: 35 })
      .expect(200);
    expect(res.body.completed).toBe(true);
    expect(res.body.timeSpent).toBe(35);
  });

  it("treats timeSpent as cumulative/absolute (write 35 -> stored 35, not additive)", async () => {
    const { lessons, token } = await setup();
    const url = `/api/progress/lessons/${lessons[0].id}`;
    await request(app).post(url).set("Authorization", `Bearer ${token}`).send({ timeSpent: 20 }).expect(200);
    const res = await request(app)
      .post(url)
      .set("Authorization", `Bearer ${token}`)
      .send({ timeSpent: 35 })
      .expect(200);
    expect(res.body.timeSpent).toBe(35); // absolute, not 55
  });

  it("is idempotent: repeating an identical request yields identical state and one activity", async () => {
    const { student, lessons, token } = await setup();
    const url = `/api/progress/lessons/${lessons[0].id}`;
    const body = { completed: true, timeSpent: 35 };

    await request(app).post(url).set("Authorization", `Bearer ${token}`).send(body).expect(200);
    const second = await request(app).post(url).set("Authorization", `Bearer ${token}`).send(body).expect(200);

    expect(second.body.completed).toBe(true);
    expect(second.body.timeSpent).toBe(35);

    const completedEvents = await prisma.activityEvent.count({
      where: { studentId: student.id, type: "LESSON_COMPLETED" },
    });
    expect(completedEvents).toBe(1); // no double-count on retry
  });

  it("emits COURSE_COMPLETED once when the final lesson is completed", async () => {
    const { student, lessons, token } = await setup();
    for (const l of lessons) {
      await request(app)
        .post(`/api/progress/lessons/${l.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ completed: true, timeSpent: 30 })
        .expect(200);
    }
    const courseCompleted = await prisma.activityEvent.count({
      where: { studentId: student.id, type: "COURSE_COMPLETED" },
    });
    expect(courseCompleted).toBe(1);
  });
});
