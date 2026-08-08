// Domain value sets. SQLite has no native enums, so these string unions are the source
// of truth for `User.role` and `ActivityEvent.type`.

export const Role = {
  STUDENT: "STUDENT",
  MENTOR: "MENTOR",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const ActivityType = {
  LOGIN: "LOGIN",
  LESSON_STARTED: "LESSON_STARTED",
  LESSON_COMPLETED: "LESSON_COMPLETED",
  COURSE_STARTED: "COURSE_STARTED",
  COURSE_COMPLETED: "COURSE_COMPLETED",
} as const;
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];
