import { Router } from "express";
import { prisma } from "../../prisma";
import { asyncHandler } from "../../lib/async-handler";
import { unauthorized } from "../../lib/http-error";
import { requireAuth, signToken } from "../../middleware/auth";
import { Role } from "../../domain";
import { loginSchema, registerSchema } from "./auth.schemas";
import { registerUser, toPublicUser, verifyCredentials } from "./auth.service";
import { recordActivity } from "../activities/activities.service";

export const authRouter = Router();

// POST /auth/register — self-registration (students only). Returns a token so the
// user is logged in immediately.
authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    const user = await registerUser(input);
    const token = signToken({ id: user.id, role: user.role, email: user.email });
    res.status(201).json({ user, token });
  })
);

// POST /auth/login — verify credentials, emit a LOGIN activity, return token + user.
authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const user = await verifyCredentials(input);
    if (user.role === Role.STUDENT) {
      await recordActivity(user.id, "LOGIN");
    }
    const token = signToken({
      id: user.id,
      role: user.role as Role,
      email: user.email,
    });
    res.json({ user: toPublicUser(user), token });
  })
);

// GET /auth/me — returns the authenticated user (works for students and mentors).
authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw unauthorized();
    res.json({ user: toPublicUser(user) });
  })
);
