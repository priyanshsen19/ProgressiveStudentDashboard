import bcrypt from "bcryptjs";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/prisma";

export const app = createApp();

// Removes all rows in FK-safe order. Called before each test for isolation.
export async function resetDb() {
  await prisma.recommendation.deleteMany();
  await prisma.activityEvent.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();
}

const PASSWORD = "Password123!";

export async function createUser(opts: {
  email: string;
  name?: string;
  role?: "STUDENT" | "MENTOR";
  mentorId?: string;
}) {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  return prisma.user.create({
    data: {
      email: opts.email,
      name: opts.name ?? opts.email,
      passwordHash,
      role: opts.role ?? "STUDENT",
      mentorId: opts.mentorId,
    },
  });
}

// Logs in via the API and returns a Bearer token.
export async function login(email: string, password = PASSWORD): Promise<string> {
  const res = await request(app)
    .post("/auth/login")
    .send({ email, password })
    .expect(200);
  return res.body.token as string;
}

// Creates a course with `lessonCount` lessons (each 30 min) and returns them.
export async function createCourse(title: string, lessonCount: number) {
  const course = await prisma.course.create({
    data: { title, description: `${title} description` },
  });
  await prisma.lesson.createMany({
    data: Array.from({ length: lessonCount }, (_, i) => ({
      courseId: course.id,
      title: `${title} L${i + 1}`,
      description: "desc",
      durationMin: 30,
      order: i + 1,
    })),
  });
  const lessons = await prisma.lesson.findMany({
    where: { courseId: course.id },
    orderBy: { order: "asc" },
  });
  return { course, lessons };
}

export async function enroll(studentId: string, courseId: string) {
  return prisma.enrollment.create({ data: { studentId, courseId } });
}

export { request, prisma, PASSWORD };
