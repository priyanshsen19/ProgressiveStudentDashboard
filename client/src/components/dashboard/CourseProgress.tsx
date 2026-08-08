import { Link } from "react-router-dom";
import type { CourseSummary } from "../../types";
import { EmptyState } from "../common/states";

export function ProgressBar({ value }: { value: number }) {
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-brand-600 transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export function CourseProgress({ courses }: { courses: CourseSummary[] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-4 text-lg font-semibold">Your Courses</h2>
      {courses.length === 0 ? (
        <EmptyState title="You're not enrolled in any courses yet." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {courses.map((c) => (
            <li key={c.id} className="py-3">
              <div className="flex items-center justify-between gap-4">
                <Link
                  to={`/courses/${c.id}`}
                  className="font-medium text-slate-800 hover:text-brand-700"
                >
                  {c.title}
                </Link>
                <span className="shrink-0 text-sm text-slate-500">
                  {c.completedLessons}/{c.totalLessons} · {c.progress}%
                </span>
              </div>
              <div className="mt-2">
                <ProgressBar value={c.progress} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
