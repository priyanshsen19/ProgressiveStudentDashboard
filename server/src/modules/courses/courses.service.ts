import { prisma } from "../../prisma";
import { forbidden, notFound } from "../../lib/http-error";

// Throws 403 unless the student is enrolled in the course.
export async function assertEnrolled(studentId: string, courseId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
  });
  if (!enrollment) throw forbidden("You are not enrolled in this course");
}

function pct(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

// Lists the courses a student is enrolled in, each with per-student completion stats.
export async function listEnrolledCourses(studentId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    include: { course: { include: { _count: { select: { lessons: true } } } } },
    orderBy: { enrolledAt: "asc" },
  });

  const courseIds = enrollments.map((e) => e.courseId);
  const completedGroups = await prisma.lessonProgress.groupBy({
    by: ["lessonId"],
    where: {
      studentId,
      completed: true,
      lesson: { courseId: { in: courseIds } },
    },
  });

  // Map completed lessonIds -> courseId to count per course.
  const lessons = await prisma.lesson.findMany({
    where: { id: { in: completedGroups.map((g) => g.lessonId) } },
    select: { id: true, courseId: true },
  });
  const completedByCourse = new Map<string, number>();
  for (const lesson of lessons) {
    completedByCourse.set(lesson.courseId, (completedByCourse.get(lesson.courseId) ?? 0) + 1);
  }

  return enrollments.map((e) => {
    const totalLessons = e.course._count.lessons;
    const completedLessons = completedByCourse.get(e.courseId) ?? 0;
    return {
      id: e.course.id,
      title: e.course.title,
      description: e.course.description,
      totalLessons,
      completedLessons,
      progress: pct(completedLessons, totalLessons),
    };
  });
}

// Returns a single enrolled course with completion stats.
export async function getEnrolledCourse(studentId: string, courseId: string) {
  await assertEnrolled(studentId, courseId);
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { _count: { select: { lessons: true } } },
  });
  if (!course) throw notFound("Course not found");

  const completedLessons = await prisma.lessonProgress.count({
    where: { studentId, completed: true, lesson: { courseId } },
  });
  const totalLessons = course._count.lessons;
  return {
    id: course.id,
    title: course.title,
    description: course.description,
    totalLessons,
    completedLessons,
    progress: pct(completedLessons, totalLessons),
  };
}

// Returns the lessons of an enrolled course, each flagged with the student's completion.
export async function getCourseLessons(studentId: string, courseId: string) {
  await assertEnrolled(studentId, courseId);
  const lessons = await prisma.lesson.findMany({
    where: { courseId },
    orderBy: { order: "asc" },
    include: {
      progress: { where: { studentId }, select: { completed: true, timeSpent: true } },
    },
  });
  return lessons.map((l) => ({
    id: l.id,
    courseId: l.courseId,
    title: l.title,
    description: l.description,
    durationMin: l.durationMin,
    order: l.order,
    completed: l.progress[0]?.completed ?? false,
    timeSpent: l.progress[0]?.timeSpent ?? 0,
  }));
}
