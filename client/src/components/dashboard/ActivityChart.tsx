import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Dashboard } from "../../types";
import { EmptyState } from "../common/states";
import { useReflowOnMount } from "../../hooks/useReflowOnMount";

// Formats an ISO date (YYYY-MM-DD) as e.g. "Aug 3" for the axis.
function shortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function ActivityChart({ data }: { data: Dashboard["activityTrend"] }) {
  useReflowOnMount();
  const total = data.reduce((sum, d) => sum + d.minutes, 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Learning Activity</h2>
        <span className="text-sm text-slate-500">Last 30 days · {total} min</span>
      </div>
      {total === 0 ? (
        <EmptyState title="No learning activity yet.">
          Complete a lesson to see your trend here.
        </EmptyState>
      ) : (
        <div className="h-64" aria-label="Line chart of minutes learned per day over the last 30 days">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                tick={{ fontSize: 12, fill: "#64748b" }}
                minTickGap={24}
              />
              <YAxis tick={{ fontSize: 12, fill: "#64748b" }} allowDecimals={false} />
              <Tooltip
                labelFormatter={(l) => shortDate(String(l))}
                formatter={(v) => [`${v} min`, "Time"]}
              />
              <Area
                type="monotone"
                dataKey="minutes"
                stroke="#4f46e5"
                strokeWidth={2}
                fill="url(#activityFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
