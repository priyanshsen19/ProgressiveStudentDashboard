import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  clampLimit,
  clampOffset,
  listActivities,
  recordActivity,
} from "./activities.service";

export const activitiesRouter = Router();

const createSchema = z.object({
  type: z.enum([
    "LOGIN",
    "LESSON_STARTED",
    "LESSON_COMPLETED",
    "COURSE_STARTED",
    "COURSE_COMPLETED",
  ]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// POST /activities — record a client-emitted activity for the authenticated student.
activitiesRouter.post(
  "/",
  requireAuth,
  requireRole("STUDENT"),
  asyncHandler(async (req, res) => {
    const input = createSchema.parse(req.body);
    const event = await recordActivity(req.user!.id, input.type, input.metadata);
    res.status(201).json(event);
  })
);

// GET /activities?limit=&offset= — paginated (default 20, max 100), newest first.
activitiesRouter.get(
  "/",
  requireAuth,
  requireRole("STUDENT"),
  asyncHandler(async (req, res) => {
    const limit = clampLimit(req.query.limit);
    const offset = clampOffset(req.query.offset);
    const result = await listActivities(req.user!.id, limit, offset);
    res.json(result);
  })
);
