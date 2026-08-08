import { prisma } from "../../prisma";

export interface RecommendationDTO {
  key: string;
  title: string;
  description: string;
  priority: number; // higher = more important
}

const INACTIVE_DAYS = 5;

// Deterministic, rule-based recommendations. No AI/model involved. Isolated here so it
// can later be swapped for an ML implementation without touching callers.
//
// Rules:
//   A. Almost done   (progress >= 80, < 100)      -> finish remaining lessons
//   B. Continue      (0 < progress < 80)          -> keep going
//   C. Next course   (a course is 100% complete)  -> suggest an un-enrolled course
//   D. Re-engage     (no activity in N days)      -> get back on track
export async function computeRecommendations(
  studentId: string
): Promise<RecommendationDTO[]> {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    include: { course: { include: { _count: { select: { lessons: true } } } } },
  });

  const courseIds = enrollments.map((e) => e.courseId);
  const completed = await prisma.lessonProgress.findMany({
    where: { studentId, completed: true, lesson: { courseId: { in: courseIds } } },
    include: { lesson: { select: { courseId: true } } },
  });
  const completedByCourse = new Map<string, number>();
  for (const p of completed) {
    const c = p.lesson.courseId;
    completedByCourse.set(c, (completedByCourse.get(c) ?? 0) + 1);
  }

  const recs: RecommendationDTO[] = [];
  let anyCompletedCourse = false;

  for (const e of enrollments) {
    const total = e.course._count.lessons;
    const done = completedByCourse.get(e.courseId) ?? 0;
    const progress = total === 0 ? 0 : Math.round((done / total) * 100);

    if (progress >= 100 && total > 0) {
      anyCompletedCourse = true;
      continue;
    }
    if (progress >= 80) {
      recs.push({
        key: `almost-done:${e.courseId}`,
        title: `Almost there in ${e.course.title}`,
        description: `You're at ${progress}%. Finish the last ${total - done} lesson(s) to complete this course.`,
        priority: 90,
      });
    } else if (progress > 0) {
      recs.push({
        key: `continue:${e.courseId}`,
        title: `Continue ${e.course.title}`,
        description: `You've completed ${done} of ${total} lessons (${progress}%). Keep the momentum going.`,
        priority: 60,
      });
    } else {
      recs.push({
        key: `start:${e.courseId}`,
        title: `Start ${e.course.title}`,
        description: `You're enrolled but haven't started yet. Open your first lesson.`,
        priority: 50,
      });
    }
  }

  // Rule C — suggest a course the student is not enrolled in, if they finished one.
  if (anyCompletedCourse) {
    const nextCourse = await prisma.course.findFirst({
      where: { id: { notIn: courseIds } },
      orderBy: { createdAt: "asc" },
    });
    if (nextCourse) {
      recs.push({
        key: `next-course:${nextCourse.id}`,
        title: `Explore ${nextCourse.title}`,
        description: `Nice work finishing a course! ${nextCourse.title} could be a good next step.`,
        priority: 70,
      });
    }
  }

  // Rule D — re-engagement if inactive.
  const lastActivity = await prisma.activityEvent.findFirst({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const cutoff = new Date(Date.now() - INACTIVE_DAYS * 24 * 60 * 60 * 1000);
  if (!lastActivity || lastActivity.createdAt < cutoff) {
    recs.push({
      key: "re-engage",
      title: "Get back on track",
      description: `You haven't been active in the last ${INACTIVE_DAYS} days. A short lesson today keeps your streak alive.`,
      priority: 100,
    });
  }

  return recs.sort((a, b) => b.priority - a.priority);
}

// Recomputes and persists recommendations for a student (delete + insert). Used by the
// seed script so the Recommendation table reflects the deterministic rules.
export async function refreshRecommendations(studentId: string) {
  const recs = await computeRecommendations(studentId);
  await prisma.$transaction([
    prisma.recommendation.deleteMany({ where: { studentId } }),
    prisma.recommendation.createMany({
      data: recs.map((r) => ({
        studentId,
        key: r.key,
        title: r.title,
        description: r.description,
        priority: r.priority,
      })),
    }),
  ]);
  return recs;
}
