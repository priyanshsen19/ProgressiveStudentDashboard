// Hand-written OpenAPI 3 document served via swagger-ui-express at /api/docs.
// Kept in sync with the routers by hand.
export const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Progressive Student Dashboard API",
    version: "1.0.0",
    description:
      "Tracks student progress across courses. JWT Bearer auth; student-scoped data isolation.",
  },
  servers: [{ url: "/", description: "Same origin" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
          role: { type: "string", enum: ["STUDENT", "MENTOR"] },
        },
      },
      AuthResponse: {
        type: "object",
        properties: {
          user: { $ref: "#/components/schemas/User" },
          token: { type: "string" },
        },
      },
      Error: {
        type: "object",
        properties: { message: { type: "string" } },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        security: [],
        tags: ["System"],
        responses: { "200": { description: "OK" } },
      },
    },
    "/auth/register": {
      post: {
        summary: "Register a new student",
        security: [],
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Created",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } },
            },
          },
          "409": { description: "Email already exists" },
          "422": { description: "Validation error" },
        },
      },
    },
    "/auth/login": {
      post: {
        summary: "Log in",
        security: [],
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } },
            },
          },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/auth/me": {
      get: {
        summary: "Current user (student or mentor)",
        tags: ["Auth"],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { user: { $ref: "#/components/schemas/User" } },
                },
              },
            },
          },
          "401": { description: "Unauthenticated" },
        },
      },
    },
    "/courses": {
      get: {
        summary: "List enrolled courses with completion stats",
        tags: ["Courses"],
        responses: { "200": { description: "OK" }, "401": { description: "Unauthenticated" } },
      },
    },
    "/courses/{courseId}": {
      get: {
        summary: "Get an enrolled course",
        tags: ["Courses"],
        parameters: [
          { name: "courseId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "OK" },
          "403": { description: "Not enrolled" },
          "404": { description: "Not found" },
        },
      },
    },
    "/courses/{courseId}/lessons": {
      get: {
        summary: "List lessons of an enrolled course (with completion flags)",
        tags: ["Courses"],
        parameters: [
          { name: "courseId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "OK" }, "403": { description: "Not enrolled" } },
      },
    },
    "/lessons/{lessonId}": {
      get: {
        summary: "Lesson detail with the student's completion state",
        tags: ["Lessons"],
        parameters: [
          { name: "lessonId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "OK" },
          "403": { description: "Not enrolled" },
          "404": { description: "Not found" },
        },
      },
    },
    "/progress": {
      get: {
        summary: "Raw progress records for the student",
        tags: ["Progress"],
        responses: { "200": { description: "OK" } },
      },
    },
    "/progress/lessons/{lessonId}": {
      post: {
        summary: "Upsert lesson progress (cumulative timeSpent, idempotent)",
        tags: ["Progress"],
        parameters: [
          { name: "lessonId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  completed: { type: "boolean" },
                  timeSpent: {
                    type: "integer",
                    description: "Absolute cumulative minutes (not an increment)",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Updated progress" },
          "403": { description: "Not enrolled" },
          "404": { description: "Lesson not found" },
        },
      },
    },
    "/activities": {
      get: {
        summary: "List activity events (paginated: default 20, max 100)",
        tags: ["Activities"],
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
          { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
        ],
        responses: { "200": { description: "OK" } },
      },
      post: {
        summary: "Record an activity event",
        tags: ["Activities"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["type"],
                properties: {
                  type: {
                    type: "string",
                    enum: [
                      "LOGIN",
                      "LESSON_STARTED",
                      "LESSON_COMPLETED",
                      "COURSE_STARTED",
                      "COURSE_COMPLETED",
                    ],
                  },
                  metadata: { type: "object" },
                },
              },
            },
          },
        },
        responses: { "201": { description: "Created" } },
      },
    },
    "/dashboard": {
      get: {
        summary: "Aggregated dashboard data (overview, courses, trend, distribution, recs)",
        tags: ["Dashboard"],
        responses: { "200": { description: "OK" }, "401": { description: "Unauthenticated" } },
      },
    },
    "/dashboard/export.csv": {
      get: {
        summary: "Export the student's learning data as CSV",
        tags: ["Dashboard"],
        responses: { "200": { description: "CSV file" } },
      },
    },
  },
} as const;
