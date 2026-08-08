import bcrypt from "bcryptjs";
import { PrismaClient, Course, Lesson } from "@prisma/client";
import { refreshRecommendations } from "../src/modules/recommendations/recommendations.service";

const prisma = new PrismaClient();

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

const hash = (pw: string) => bcrypt.hash(pw, 10);

// Course blueprints. Lesson count varies; each course gets 9+ lessons.
const COURSES = [
  { title: "JavaScript Fundamentals", description: "Variables, functions, async, and the DOM.", lessons: 12 },
  { title: "React Essentials", description: "Components, hooks, state, and rendering.", lessons: 10 },
  { title: "Node.js & APIs", description: "Build REST APIs with Express and Node.", lessons: 11 },
  { title: "Databases with SQL", description: "Modelling data and writing queries.", lessons: 10 },
  { title: "TypeScript Deep Dive", description: "Types, generics, and safe patterns.", lessons: 10 },
  { title: "Python for Beginners", description: "Syntax, data types, and control flow.", lessons: 12 },
  { title: "Data Structures & Algorithms", description: "Lists, trees, graphs, and complexity.", lessons: 14 },
  { title: "Web Security Basics", description: "Auth, XSS, CSRF, and safe-by-default design.", lessons: 9 },
];

// Completion-date distribution patterns — control the *shape* of each student's 30-day
// activity trend so the visualizations genuinely differ between accounts.
type Pattern = "spread" | "even" | "recent" | "early";

// Returns how many days ago the i-th completed lesson happened, given the pattern.
function offsetForPattern(i: number, count: number, spreadDays: number, pattern: Pattern): number {
  if (count <= 0) return 1;
  switch (pattern) {
    // Cluster in the last ~5 days -> a tall recent spike (binge learner).
    case "recent":
      return 1 + (i % 5);
    // Cluster ~near the start of the window, nothing recent -> left-heavy, then a gap.
    case "early":
      return Math.max(1, spreadDays - (i % 6));
    // Evenly spaced across the whole window -> steady, consistent bars.
    case "even":
      return count === 1
        ? Math.max(1, Math.round(spreadDays / 2))
        : Math.max(1, Math.round(spreadDays - (i / (count - 1)) * (spreadDays - 1)));
    // Default: denser toward recent days.
    default:
      return count > 1
        ? Math.max(1, Math.round(((count - i) / count) * spreadDays))
        : Math.max(1, Math.round(spreadDays / 2));
  }
}

async function main() {
  console.log("Clearing existing data...");
  await prisma.recommendation.deleteMany();
  await prisma.activityEvent.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  console.log("Creating courses and lessons...");
  const courses: (Course & { lessons: Lesson[] })[] = [];
  for (const c of COURSES) {
    const course = await prisma.course.create({
      data: { title: c.title, description: c.description },
    });
    const lessonData = Array.from({ length: c.lessons }, (_, i) => ({
      courseId: course.id,
      title: `${c.title} — Lesson ${i + 1}`,
      description: `Lesson ${i + 1} of ${c.title}.`,
      durationMin: 20 + ((i * 5) % 30), // 20..45
      order: i + 1,
    }));
    await prisma.lesson.createMany({ data: lessonData });
    const lessons = await prisma.lesson.findMany({
      where: { courseId: course.id },
      orderBy: { order: "asc" },
    });
    courses.push({ ...course, lessons });
  }
  const byTitle = (t: string) => courses.find((c) => c.title === t)!;

  console.log("Creating mentors...");
  const mentor1 = await prisma.user.create({
    data: {
      name: "Mia Mentor",
      email: "mentor@example.com",
      passwordHash: await hash("Mentor#Mia2026"),
      role: "MENTOR",
    },
  });
  const mentor2 = await prisma.user.create({
    data: {
      name: "Marcus Reed",
      email: "marcus@example.com",
      passwordHash: await hash("Mentor#Marcus2026"),
      role: "MENTOR",
    },
  });

  // Profile: which courses, and how many lessons completed in each, plus recency window
  // (days ago) over which completions are spread, and the last-login recency.
  interface StudentSpec {
    name: string;
    email: string;
    password: string;
    mentorId: string;
    lastLoginDaysAgo: number;
    enrollments: {
      title: string;
      completed: number;
      inProgress: number;
      spreadDays: number;
      pattern?: Pattern;
    }[];
  }

  const students: StudentSpec[] = [
    {
      // Highly active. Trend: activity spread across the window. Donut: mostly completed.
      name: "Ava Student",
      email: "student@example.com", // primary demo account
      password: "Ava#Learn2026",
      mentorId: mentor1.id,
      lastLoginDaysAgo: 0,
      enrollments: [
        { title: "JavaScript Fundamentals", completed: 12, inProgress: 0, spreadDays: 26, pattern: "spread" }, // 100%
        { title: "React Essentials", completed: 8, inProgress: 1, spreadDays: 20, pattern: "spread" }, // 80%
        { title: "Node.js & APIs", completed: 5, inProgress: 1, spreadDays: 14, pattern: "spread" }, // ~45%
      ],
    },
    {
      // Moderate progress across two courses. Donut: roughly half/half.
      name: "Ben Carter",
      email: "ben@example.com",
      password: "Ben#Learn2026",
      mentorId: mentor1.id,
      lastLoginDaysAgo: 2,
      enrollments: [
        { title: "JavaScript Fundamentals", completed: 6, inProgress: 1, spreadDays: 18, pattern: "spread" }, // 50%
        { title: "Databases with SQL", completed: 3, inProgress: 1, spreadDays: 12, pattern: "spread" }, // 30%
        { title: "TypeScript Deep Dive", completed: 0, inProgress: 0, spreadDays: 0 },
      ],
    },
    {
      // Inactive: activity is early in the window then a gap. -> re-engage recommendation.
      name: "Chloe Diaz",
      email: "chloe@example.com",
      password: "Chloe#Learn2026",
      mentorId: mentor2.id,
      lastLoginDaysAgo: 11,
      enrollments: [
        { title: "React Essentials", completed: 4, inProgress: 1, spreadDays: 26, pattern: "early" }, // 40%
        { title: "Node.js & APIs", completed: 0, inProgress: 0, spreadDays: 0 },
        { title: "Databases with SQL", completed: 0, inProgress: 0, spreadDays: 0 },
      ],
    },
    {
      // Just started: a tiny recent spike. Donut: dominated by "Not Started".
      name: "Diego Evans",
      email: "diego@example.com",
      password: "Diego#Learn2026",
      mentorId: mentor2.id,
      lastLoginDaysAgo: 0,
      enrollments: [
        { title: "TypeScript Deep Dive", completed: 1, inProgress: 1, spreadDays: 3, pattern: "recent" }, // 10%
        { title: "JavaScript Fundamentals", completed: 0, inProgress: 0, spreadDays: 0 },
      ],
    },
    {
      // Almost finished. Steady/even completion. Donut: overwhelmingly completed.
      name: "Emma Foster",
      email: "emma@example.com",
      password: "Emma#Learn2026",
      mentorId: mentor1.id,
      lastLoginDaysAgo: 1,
      enrollments: [
        { title: "React Essentials", completed: 9, inProgress: 0, spreadDays: 22, pattern: "even" }, // 90%
        { title: "TypeScript Deep Dive", completed: 10, inProgress: 0, spreadDays: 20, pattern: "even" }, // 100%
      ],
    },
    {
      // Binge learner: a big burst of completions in the last few days (tall recent spike).
      // Donut: prominent "In Progress" slice from many started-but-unfinished lessons.
      name: "Frank Nguyen",
      email: "frank@example.com",
      password: "Frank#Learn2026",
      mentorId: mentor1.id,
      lastLoginDaysAgo: 0,
      enrollments: [
        { title: "Data Structures & Algorithms", completed: 7, inProgress: 4, spreadDays: 5, pattern: "recent" }, // 50%
        { title: "Python for Beginners", completed: 2, inProgress: 3, spreadDays: 4, pattern: "recent" }, // ~17%
      ],
    },
    {
      // Consistent learner: evenly spaced completions -> flat, steady trend across 30 days.
      // Donut: balanced across completed / in-progress / not-started.
      name: "Grace Lee",
      email: "grace@example.com",
      password: "Grace#Learn2026",
      mentorId: mentor2.id,
      lastLoginDaysAgo: 1,
      enrollments: [
        { title: "Python for Beginners", completed: 8, inProgress: 1, spreadDays: 28, pattern: "even" }, // ~67%
        { title: "Web Security Basics", completed: 5, inProgress: 1, spreadDays: 24, pattern: "even" }, // ~56%
        { title: "JavaScript Fundamentals", completed: 4, inProgress: 2, spreadDays: 20, pattern: "even" }, // 33%
      ],
    },
    {
      // Explorer who enrolled broadly but barely started. Donut: dominated by "Not Started".
      // Inactive -> re-engage recommendation.
      name: "Hassan Ali",
      email: "hassan@example.com",
      password: "Hassan#Learn2026",
      mentorId: mentor2.id,
      lastLoginDaysAgo: 8,
      enrollments: [
        { title: "Web Security Basics", completed: 2, inProgress: 1, spreadDays: 26, pattern: "early" }, // ~22%
        { title: "Databases with SQL", completed: 1, inProgress: 0, spreadDays: 24, pattern: "early" }, // 10%
        { title: "Data Structures & Algorithms", completed: 0, inProgress: 0, spreadDays: 0 },
        { title: "Node.js & APIs", completed: 0, inProgress: 0, spreadDays: 0 },
      ],
    },
  ];

  console.log("Creating students, enrollments, progress, and activity...");
  for (const spec of students) {
    const student = await prisma.user.create({
      data: {
        name: spec.name,
        email: spec.email,
        passwordHash: await hash(spec.password),
        role: "STUDENT",
        mentorId: spec.mentorId,
      },
    });

    // A recent LOGIN event drives the inactivity recommendation.
    await prisma.activityEvent.create({
      data: {
        studentId: student.id,
        type: "LOGIN",
        createdAt: daysAgo(spec.lastLoginDaysAgo),
      },
    });

    for (const enr of spec.enrollments) {
      const course = byTitle(enr.title);
      await prisma.enrollment.create({
        data: { studentId: student.id, courseId: course.id },
      });

      // Completed lessons: distribute completion dates across the recency window using the
      // enrollment's pattern so the 30-day activity trend has a distinctive shape.
      const pattern = enr.pattern ?? "spread";
      for (let i = 0; i < enr.completed; i++) {
        const lesson = course.lessons[i];
        const dayOffset = offsetForPattern(i, enr.completed, enr.spreadDays, pattern);
        const when = daysAgo(dayOffset);
        await prisma.lessonProgress.create({
          data: {
            studentId: student.id,
            lessonId: lesson.id,
            completed: true,
            timeSpent: lesson.durationMin + (i % 3) * 5,
            completedAt: when,
          },
        });
        await prisma.activityEvent.create({
          data: {
            studentId: student.id,
            type: "LESSON_COMPLETED",
            metadata: JSON.stringify({ lessonId: lesson.id, courseId: course.id }),
            createdAt: when,
          },
        });
      }

      // In-progress lessons: a started-but-not-finished lesson with partial time. These
      // populate the "In Progress" slice of the completion donut.
      for (let j = 0; j < enr.inProgress; j++) {
        const lesson = course.lessons[enr.completed + j];
        if (!lesson) continue;
        await prisma.lessonProgress.create({
          data: {
            studentId: student.id,
            lessonId: lesson.id,
            completed: false,
            timeSpent: Math.round(lesson.durationMin / 2),
          },
        });
      }
    }

    // Generate deterministic recommendations for this student.
    await refreshRecommendations(student.id);
  }

  const counts = {
    users: await prisma.user.count(),
    courses: await prisma.course.count(),
    lessons: await prisma.lesson.count(),
    enrollments: await prisma.enrollment.count(),
    progress: await prisma.lessonProgress.count(),
    activities: await prisma.activityEvent.count(),
    recommendations: await prisma.recommendation.count(),
  };
  console.log("Seed complete:", counts);
  console.log("\nDemo accounts — each account has its own password:");
  console.log("  MENTORS");
  console.log("    mentor@example.com   Mentor#Mia2026     (Mia Mentor)");
  console.log("    marcus@example.com   Mentor#Marcus2026  (Marcus Reed)");
  console.log("  STUDENTS");
  for (const s of students) {
    console.log(`    ${s.email.padEnd(20)} ${s.password.padEnd(18)} (${s.name})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
