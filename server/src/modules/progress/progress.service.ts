import { prisma } from "../../prisma";
import { forbidden, notFound } from "../../lib/http-error";
import { recordActivity } from "../activities/activities.service";

export interface ProgressInput {
  completed?: boolean;
  // Absolute cumulative minutes for the lesson (NOT an increment).
  timeSpent?: number;
}

// Creates or updates a student's progress for a lesson.
//
// Semantics (deliberate, for idempotency):
//  - `timeSpent` is stored as an absolute value — writing 35 sets it to 35, never +35.
//  - Repeating an identical request yields identical business state.
//  - Activity events fire only on the *transition* into completion, so refreshing or
//    re-submitting never double-records activity or corrupts the trend.
export async function upsertLessonProgress(
  studentId: string,
  lessonId: string,
  input: ProgressInput
) {
  return prisma.$transaction(async (tx) => {
    const lesson = await tx.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, courseId: true },
    });
    if (!lesson) throw notFound("Lesson not found");

    const enrollment = await tx.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId: lesson.courseId } },
    });
    if (!enrollment) throw forbidden("You are not enrolled in this course");

    const existing = await tx.lessonProgress.findUnique({
      where: { studentId_lessonId: { studentId, lessonId } },
    });

    const wasCompleted = existing?.completed ?? false;
    const nowCompleted = input.completed ?? wasCompleted;
    const timeSpent = input.timeSpent ?? existing?.timeSpent ?? 0;
    // Preserve the original completion timestamp; only stamp on first completion.
    const completedAt = nowCompleted ? existing?.completedAt ?? new Date() : null;

    const progress = await tx.lessonProgress.upsert({
      where: { studentId_lessonId: { studentId, lessonId } },
      create: { studentId, lessonId, completed: nowCompleted, timeSpent, completedAt },
      update: { completed: nowCompleted, timeSpent, completedAt },
    });

    // Fire activity only when the lesson newly transitions to completed.
    if (!wasCompleted && nowCompleted) {
      await recordActivity(
        studentId,
        "LESSON_COMPLETED",
        { lessonId, courseId: lesson.courseId },
        tx
      );
      const [total, done] = await Promise.all([
        tx.lesson.count({ where: { courseId: lesson.courseId } }),
        tx.lessonProgress.count({
          where: { studentId, completed: true, lesson: { courseId: lesson.courseId } },
        }),
      ]);
      if (total > 0 && done === total) {
        await recordActivity(
          studentId,
          "COURSE_COMPLETED",
          { courseId: lesson.courseId },
          tx
        );
      }
    }

    return progress;
  });
}

export function listProgress(studentId: string) {
  return prisma.lessonProgress.findMany({
    where: { studentId },
    orderBy: { updatedAt: "desc" },
  });
}
