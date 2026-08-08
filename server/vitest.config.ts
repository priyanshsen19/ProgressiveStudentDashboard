import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/setup/global-setup.ts"],
    // Run test files sequentially to avoid SQLite write contention on the shared test DB.
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "file:./test.db",
      JWT_SECRET: "test-secret",
    },
  },
});
