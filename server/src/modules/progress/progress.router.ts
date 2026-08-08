import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { listProgress, upsertLessonProgress } from "./progress.service";

export const progressRouter = Router();

progressRouter.use(requireAuth, requireRole("STUDENT"));

const updateSchema = z
  .object({
    completed: z.boolean().optional(),
    timeSpent: z.number().int().min(0).max(100000).optional(),
  })
  .refine((v) => v.completed !== undefined || v.timeSpent !== undefined, {
    message: "Provide at least one of `completed` or `timeSpent`",
  });

// GET /progress — raw progress records for the authenticated student.
progressRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await listProgress(req.user!.id));
  })
);

// POST /progress/lessons/:lessonId — cumulative, idempotent progress update.
progressRouter.post(
  "/lessons/:lessonId",
  asyncHandler(async (req, res) => {
    const input = updateSchema.parse(req.body);
    const progress = await upsertLessonProgress(req.user!.id, req.params.lessonId, input);
    res.json(progress);
  })
);
