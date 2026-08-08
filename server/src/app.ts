import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { config } from "./config";
import { openapiSpec } from "./openapi";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { authRouter } from "./modules/auth/auth.router";
import { coursesRouter } from "./modules/courses/courses.router";
import { lessonsRouter } from "./modules/lessons/lessons.router";
import { progressRouter } from "./modules/progress/progress.router";
import { activitiesRouter } from "./modules/activities/activities.router";
import { dashboardRouter } from "./modules/dashboard/dashboard.router";

// Builds the Express application. Exported (without listening) so tests can drive it
// with supertest.
export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: config.corsOrigins.length ? config.corsOrigins : true,
      credentials: false,
    })
  );
  app.use(express.json());

  // Health check (unauthenticated).
  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  // API docs.
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));

  // Feature routers.
  app.use("/auth", authRouter);
  app.use("/courses", coursesRouter);
  app.use("/lessons", lessonsRouter);
  app.use("/progress", progressRouter);
  app.use("/activities", activitiesRouter);
  app.use("/dashboard", dashboardRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
