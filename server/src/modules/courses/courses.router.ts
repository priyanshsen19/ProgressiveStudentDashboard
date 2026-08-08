import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  getCourseLessons,
  getEnrolledCourse,
  listEnrolledCourses,
} from "./courses.service";

export const coursesRouter = Router();

coursesRouter.use(requireAuth, requireRole("STUDENT"));

// GET /courses — courses the student is enrolled in, with completion stats.
coursesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await listEnrolledCourses(req.user!.id));
  })
);

// GET /courses/:courseId — single enrolled course.
coursesRouter.get(
  "/:courseId",
  asyncHandler(async (req, res) => {
    res.json(await getEnrolledCourse(req.user!.id, req.params.courseId));
  })
);

// GET /courses/:courseId/lessons — lessons with per-student completion.
coursesRouter.get(
  "/:courseId/lessons",
  asyncHandler(async (req, res) => {
    res.json(await getCourseLessons(req.user!.id, req.params.courseId));
  })
);
