// Centralised, typed API client. All backend communication goes through here so URLs
// and auth headers are defined in exactly one place.

import type {
  AuthResponse,
  CourseSummary,
  Dashboard,
  LessonSummary,
  User,
} from "../types";

// In dev, VITE_API_URL is empty and requests hit "/api/*" which Vite proxies to the API.
// In prod, set VITE_API_URL to the API origin.
const RAW_BASE = import.meta.env.VITE_API_URL ?? "";
const BASE = RAW_BASE ? RAW_BASE.replace(/\/$/, "") : "/api";

const TOKEN_KEY = "psd_token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 204) return undefined as T;

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const message =
      (isJson && body && typeof body === "object" && "message" in body
        ? (body as { message: string }).message
        : undefined) ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return body as T;
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (name: string, email: string, password: string) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),
  me: () => request<{ user: User }>("/auth/me"),

  // Dashboard
  dashboard: () => request<Dashboard>("/dashboard"),
  // CSV export needs the Bearer header, so fetch it as a blob rather than a plain link.
  downloadCsv: async (): Promise<Blob> => {
    const token = tokenStore.get();
    const res = await fetch(`${BASE}/dashboard/export.csv`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new ApiError(res.status, `Export failed (${res.status})`);
    return res.blob();
  },

  // Courses & lessons
  courses: () => request<CourseSummary[]>("/courses"),
  course: (id: string) => request<CourseSummary>(`/courses/${id}`),
  courseLessons: (id: string) => request<LessonSummary[]>(`/courses/${id}/lessons`),
  lesson: (id: string) => request<LessonSummary>(`/lessons/${id}`),

  // Progress
  updateProgress: (lessonId: string, body: { completed?: boolean; timeSpent?: number }) =>
    request<unknown>(`/progress/lessons/${lessonId}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
