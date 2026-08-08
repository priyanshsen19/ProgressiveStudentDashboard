import { Router } from "express";
import { prisma } from "../../prisma";
import { asyncHandler } from "../../lib/async-handler";
import { notFound } from "../../lib/http-error";
import { requireAuth, requireRole } from "../../middleware/auth";
import { assertEnrolled } from "../courses/courses.service";

export const lessonsRouter = Router();

// GET /lessons/:lessonId — lesson detail with the authenticated student's completion state.
lessonsRouter.get(
  "/:lessonId",
  requireAuth,
  requireRole("STUDENT"),
  asyncHandler(async (req, res) => {
    const lesson = await prisma.lesson.findUnique({
      where: { id: req.params.lessonId },
      include: {
        progress: { where: { studentId: req.user!.id } },
      },
    });
    if (!lesson) throw notFound("Lesson not found");
    // Enforce course access before returning any lesson content.
    await assertEnrolled(req.user!.id, lesson.courseId);

    const progress = lesson.progress[0];
    res.json({
      id: lesson.id,
      courseId: lesson.courseId,
      title: lesson.title,
      description: lesson.description,
      durationMin: lesson.durationMin,
      order: lesson.order,
      completed: progress?.completed ?? false,
      timeSpent: progress?.timeSpent ?? 0,
    });
  })
);
