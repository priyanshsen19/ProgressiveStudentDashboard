import { prisma } from "../../prisma";
import { listEnrolledCourses } from "../courses/courses.service";
import { computeRecommendations } from "../recommendations/recommendations.service";

const TREND_DAYS = 30;

// Formats a Date as a UTC calendar day (YYYY-MM-DD). All trend bucketing is done in UTC
// to avoid mixing server and client timezones.
function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Builds a dense list of the last `days` UTC dates (oldest first), each mapped to 0.
function emptyTrend(days: number): Map<string, number> {
  const map = new Map<string, number>();
  const today = new Date();
  const base = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(base - i * 24 * 60 * 60 * 1000);
    map.set(utcDay(d), 0);
  }
  return map;
}

export interface DashboardResponse {
  overview: {
    completedLessons: number;
    totalLessons: number;
    timeSpentMinutes: number;
    overallProgress: number;
    coursesCount: number;
  };
  courses: Awaited<ReturnType<typeof listEnrolledCourses>>;
  activityTrend: { date: string; minutes: number }[];
  completionDistribution: {
    completed: number;
    inProgress: number;
    notStarted: number;
  };
  recommendations: Awaited<ReturnType<typeof computeRecommendations>>;
}

export async function getDashboard(studentId: string): Promise<DashboardResponse> {
  // Total lessons across the student's enrolled courses.
  const totalLessons = await prisma.lesson.count({
    where: { course: { enrollments: { some: { studentId } } } },
  });

  // Progress rows exist only for enrolled lessons; split by completion.
  const [completedLessons, inProgressLessons] = await Promise.all([
    prisma.lessonProgress.count({ where: { studentId, completed: true } }),
    prisma.lessonProgress.count({ where: { studentId, completed: false } }),
  ]);

  // Time spent — the single source of truth is LessonProgress.timeSpent.
  const timeAgg = await prisma.lessonProgress.aggregate({
    where: { studentId },
    _sum: { timeSpent: true },
  });
  const timeSpentMinutes = timeAgg._sum.timeSpent ?? 0;

  const overallProgress =
    totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);

  const notStarted = Math.max(0, totalLessons - completedLessons - inProgressLessons);

  // Activity trend — attribute each completed lesson's minutes to its completion day
  // (UTC), within the last 30 days. Derived from the same source as the KPI.
  const cutoff = new Date(Date.now() - TREND_DAYS * 24 * 60 * 60 * 1000);
  const completedInWindow = await prisma.lessonProgress.findMany({
    where: { studentId, completed: true, completedAt: { gte: cutoff } },
    select: { completedAt: true, timeSpent: true },
  });
  const trend = emptyTrend(TREND_DAYS);
  for (const row of completedInWindow) {
    if (!row.completedAt) continue;
    const key = utcDay(row.completedAt);
    if (trend.has(key)) trend.set(key, (trend.get(key) ?? 0) + row.timeSpent);
  }
  const activityTrend = Array.from(trend.entries()).map(([date, minutes]) => ({
    date,
    minutes,
  }));

  const [courses, recommendations] = await Promise.all([
    listEnrolledCourses(studentId),
    computeRecommendations(studentId),
  ]);

  return {
    overview: {
      completedLessons,
      totalLessons,
      timeSpentMinutes,
      overallProgress,
      coursesCount: courses.length,
    },
    courses,
    activityTrend,
    completionDistribution: {
      completed: completedLessons,
      inProgress: inProgressLessons,
      notStarted,
    },
    recommendations,
  };
}
