import { beforeEach, describe, expect, it } from "vitest";
import { app, createCourse, createUser, enroll, login, prisma, request, resetDb } from "./helpers";

describe("Dashboard aggregation", () => {
  beforeEach(resetDb);

  it("computes overview, distribution, time, and trend from progress data", async () => {
    const student = await createUser({ email: "s@example.com" });
    const { course, lessons } = await createCourse("JS", 5); // 5 lessons, 30 min each
    await enroll(student.id, course.id);

    // 2 completed today, 1 in-progress, 2 not started.
    await prisma.lessonProgress.create({
      data: { studentId: student.id, lessonId: lessons[0].id, completed: true, timeSpent: 30, completedAt: new Date() },
    });
    await prisma.lessonProgress.create({
      data: { studentId: student.id, lessonId: lessons[1].id, completed: true, timeSpent: 40, completedAt: new Date() },
    });
    await prisma.lessonProgress.create({
      data: { studentId: student.id, lessonId: lessons[2].id, completed: false, timeSpent: 10 },
    });

    const token = await login("s@example.com");
    const res = await request(app)
      .get("/dashboard")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const { overview, completionDistribution, activityTrend } = res.body;
    expect(overview.totalLessons).toBe(5);
    expect(overview.completedLessons).toBe(2);
    expect(overview.overallProgress).toBe(40); // 2/5
    expect(overview.timeSpentMinutes).toBe(80); // 30 + 40 + 10 (all progress rows)

    expect(completionDistribution).toEqual({ completed: 2, inProgress: 1, notStarted: 2 });

    // Trend is a dense 30-day series; today's bucket holds the two completions' time.
    expect(activityTrend).toHaveLength(30);
    const trendSum = activityTrend.reduce((a: number, b: { minutes: number }) => a + b.minutes, 0);
    expect(trendSum).toBe(70); // only completed lessons contribute to the trend (30 + 40)
  });

  it("uses completed/total (not average of course percentages) for overall progress", async () => {
    const student = await createUser({ email: "s2@example.com" });
    const a = await createCourse("A", 10);
    const b = await createCourse("B", 2);
    await enroll(student.id, a.course.id);
    await enroll(student.id, b.course.id);
    // Course A: 1/10 done. Course B: 2/2 done. Averaging % would give (10+100)/2=55.
    // Correct global metric: 3 completed / 12 total = 25%.
    await prisma.lessonProgress.create({
      data: { studentId: student.id, lessonId: a.lessons[0].id, completed: true, timeSpent: 30, completedAt: new Date() },
    });
    for (const l of b.lessons) {
      await prisma.lessonProgress.create({
        data: { studentId: student.id, lessonId: l.id, completed: true, timeSpent: 30, completedAt: new Date() },
      });
    }
    const token = await login("s2@example.com");
    const res = await request(app).get("/dashboard").set("Authorization", `Bearer ${token}`).expect(200);
    expect(res.body.overview.overallProgress).toBe(25);
  });
});
