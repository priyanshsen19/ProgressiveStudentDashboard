import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The dev server proxies /api -> the Express API so the browser talks to a single origin
// (no CORS in dev). In production the frontend uses VITE_API_URL.
export default defineConfig({
  plugins: [react()],
  // Relative asset paths so the production build works when served from any base path
  // (and doesn't 404 its assets when opened outside the web root).
  base: "./",
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // The API is namespaced under /api on the backend, so forward the path as-is
      // (no rewrite). Browser calls /api/... -> http://localhost:4000/api/...
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
