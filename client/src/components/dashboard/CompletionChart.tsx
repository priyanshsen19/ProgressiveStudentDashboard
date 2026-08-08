import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { Dashboard } from "../../types";
import { EmptyState } from "../common/states";
import { useReflowOnMount } from "../../hooks/useReflowOnMount";

const COLORS = {
  Completed: "#4f46e5",
  "In Progress": "#22c55e",
  "Not Started": "#cbd5e1",
};

export function CompletionChart({
  distribution,
}: {
  distribution: Dashboard["completionDistribution"];
}) {
  useReflowOnMount();
  const data = [
    { name: "Completed", value: distribution.completed },
    { name: "In Progress", value: distribution.inProgress },
    { name: "Not Started", value: distribution.notStarted },
  ];
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-4 text-lg font-semibold">Completion Status</h2>
      {total === 0 ? (
        <EmptyState title="No lessons yet.">
          Enroll in a course to track completion.
        </EmptyState>
      ) : (
        <div className="h-64" aria-label="Donut chart of lesson completion distribution">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={COLORS[entry.name as keyof typeof COLORS]} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [`${v} lessons`, n]} />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
