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
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
