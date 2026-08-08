import { Router } from "express";
import { prisma } from "../../prisma";
import { asyncHandler } from "../../lib/async-handler";
import { toCsv } from "../../lib/csv";
import { requireAuth, requireRole } from "../../middleware/auth";
import { getDashboard } from "./dashboard.service";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth, requireRole("STUDENT"));

// GET /dashboard — all primary dashboard data in a single response.
dashboardRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await getDashboard(req.user!.id));
  })
);

// GET /dashboard/export.csv — the authenticated student's own learning data as CSV.
dashboardRouter.get(
  "/export.csv",
  asyncHandler(async (req, res) => {
    const studentId = req.user!.id;
    const lessons = await prisma.lesson.findMany({
      where: { course: { enrollments: { some: { studentId } } } },
      orderBy: [{ course: { title: "asc" } }, { order: "asc" }],
      include: {
        course: { select: { title: true } },
        progress: { where: { studentId } },
      },
    });

    const rows = lessons.map((l) => {
      const p = l.progress[0];
      const status = p?.completed ? "Completed" : p ? "In Progress" : "Not Started";
      const date = p?.completedAt ? p.completedAt.toISOString().slice(0, 10) : "";
      return [date, l.course.title, l.title, p?.timeSpent ?? 0, status];
    });

    const csv = toCsv(["Date", "Course", "Lesson", "Time Spent (min)", "Status"], rows);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="progress.csv"');
    res.send(csv);
  })
);
