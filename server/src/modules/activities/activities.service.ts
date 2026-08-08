import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma";
import { ActivityType } from "../../domain";

// Records a learning activity event. `client` allows the call to participate in an
// enclosing transaction (e.g. from the progress service). Metadata is serialized to a
// JSON string because SQLite has no native JSON column.
export function recordActivity(
  studentId: string,
  type: ActivityType,
  metadata?: Record<string, unknown>,
  client: Prisma.TransactionClient | typeof prisma = prisma
) {
  return client.activityEvent.create({
    data: {
      studentId,
      type,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}

export const ACTIVITY_LIMIT_DEFAULT = 20;
export const ACTIVITY_LIMIT_MAX = 100;

// Clamp a requested page size into [1, ACTIVITY_LIMIT_MAX], defaulting when absent.
export function clampLimit(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return ACTIVITY_LIMIT_DEFAULT;
  return Math.min(Math.floor(n), ACTIVITY_LIMIT_MAX);
}

export function clampOffset(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

export async function listActivities(studentId: string, limit: number, offset: number) {
  const [rows, total] = await Promise.all([
    prisma.activityEvent.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    }),
    prisma.activityEvent.count({ where: { studentId } }),
  ]);
  // Deserialize the JSON metadata string back into an object for the client.
  const items = rows.map((r) => ({
    ...r,
    metadata: r.metadata ? safeParse(r.metadata) : null,
  }));
  return { items, total, limit, offset };
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
