import { beforeEach, describe, expect, it } from "vitest";
import { createCourse, createUser, enroll, prisma, resetDb } from "./helpers";
import { computeRecommendations } from "../src/modules/recommendations/recommendations.service";

describe("Recommendations (deterministic rules)", () => {
  beforeEach(resetDb);

  it("recommends continuing an unfinished course", async () => {
    const student = await createUser({ email: "s@example.com" });
    const { course, lessons } = await createCourse("JS", 10);
    await enroll(student.id, course.id);
    // 5/10 = 50% -> "continue"
    for (let i = 0; i < 5; i++) {
      await prisma.lessonProgress.create({
        data: { studentId: student.id, lessonId: lessons[i].id, completed: true, timeSpent: 30, completedAt: new Date() },
      });
    }
    // Recent activity so the inactivity rule doesn't fire.
    await prisma.activityEvent.create({ data: { studentId: student.id, type: "LOGIN" } });

    const recs = await computeRecommendations(student.id);
    expect(recs.some((r) => r.key === `continue:${course.id}`)).toBe(true);
  });

  it("recommends a next course once a course is completed", async () => {
    const student = await createUser({ email: "s2@example.com" });
    const done = await createCourse("Done", 2);
    await createCourse("Next", 3); // exists but student not enrolled
    await enroll(student.id, done.course.id);
    for (const l of done.lessons) {
      await prisma.lessonProgress.create({
        data: { studentId: student.id, lessonId: l.id, completed: true, timeSpent: 30, completedAt: new Date() },
      });
    }
    await prisma.activityEvent.create({ data: { studentId: student.id, type: "LOGIN" } });

    const recs = await computeRecommendations(student.id);
    expect(recs.some((r) => r.key.startsWith("next-course:"))).toBe(true);
  });

  it("recommends re-engagement for an inactive student", async () => {
    const student = await createUser({ email: "s3@example.com" });
    const { course } = await createCourse("JS", 5);
    await enroll(student.id, course.id);
    // Last activity 10 days ago -> inactive.
    await prisma.activityEvent.create({
      data: {
        studentId: student.id,
        type: "LOGIN",
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
    });
    const recs = await computeRecommendations(student.id);
    expect(recs.some((r) => r.key === "re-engage")).toBe(true);
  });
});
