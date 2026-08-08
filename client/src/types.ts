// Shared API types — the single source of truth for response shapes on the client.
// Mirrors the server's responses.

export type Role = "STUDENT" | "MENTOR";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface CourseSummary {
  id: string;
  title: string;
  description: string;
  totalLessons: number;
  completedLessons: number;
  progress: number;
}

export interface LessonSummary {
  id: string;
  courseId: string;
  title: string;
  description: string;
  durationMin: number;
  order: number;
  completed: boolean;
  timeSpent: number;
}

export interface Recommendation {
  key: string;
  title: string;
  description: string;
  priority: number;
}

export interface Dashboard {
  overview: {
    completedLessons: number;
    totalLessons: number;
    timeSpentMinutes: number;
    overallProgress: number;
    coursesCount: number;
  };
  courses: CourseSummary[];
  activityTrend: { date: string; minutes: number }[];
  completionDistribution: {
    completed: number;
    inProgress: number;
    notStarted: number;
  };
  recommendations: Recommendation[];
}
