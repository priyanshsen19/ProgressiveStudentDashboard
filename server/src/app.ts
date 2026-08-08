import path from "path";
import fs from "fs";
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
// with supertest. All API endpoints live under /api so that, in production, the same
// server can also serve the built frontend without route collisions.
export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: config.corsOrigins.length ? config.corsOrigins : true,
      credentials: false,
    })
  );
  app.use(express.json());

  const api = express.Router();

  // Health check (unauthenticated).
  api.get("/health", (_req, res) => res.json({ status: "ok" }));

  // API docs.
  api.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));

  // Feature routers.
  api.use("/auth", authRouter);
  api.use("/courses", coursesRouter);
  api.use("/lessons", lessonsRouter);
  api.use("/progress", progressRouter);
  api.use("/activities", activitiesRouter);
  api.use("/dashboard", dashboardRouter);

  app.use("/api", api);

  // Anything else under /api that didn't match is a genuine API 404 (JSON).
  app.use("/api", notFoundHandler);

  // In production, serve the built frontend (client/dist) and fall back to index.html
  // for client-side routes. `CLIENT_DIST` can override the location.
  const clientDist =
    process.env.CLIENT_DIST || path.resolve(__dirname, "..", "..", "public");
  if (fs.existsSync(path.join(clientDist, "index.html"))) {
    app.use(express.static(clientDist));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  app.use(errorHandler);

  return app;
}
