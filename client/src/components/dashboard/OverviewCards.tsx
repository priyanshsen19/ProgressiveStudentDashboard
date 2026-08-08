import type { Dashboard } from "../../types";

function Card({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
      {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
    </div>
  );
}

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function OverviewCards({ overview }: { overview: Dashboard["overview"] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card
        label="Overall Progress"
        value={`${overview.overallProgress}%`}
        sub={`${overview.completedLessons} of ${overview.totalLessons} lessons`}
      />
      <Card label="Completed Lessons" value={String(overview.completedLessons)} />
      <Card label="Time Spent" value={formatMinutes(overview.timeSpentMinutes)} />
      <Card label="Courses" value={String(overview.coursesCount)} />
    </div>
  );
}
