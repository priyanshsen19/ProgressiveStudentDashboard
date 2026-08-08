import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAsync } from "../hooks/useAsync";
import { Layout } from "../components/Layout";
import { LoadingState, ErrorState, EmptyState } from "../components/common/states";
import { ProgressBar } from "../components/dashboard/CourseProgress";

export function Courses() {
  const { data, loading, error, reload } = useAsync(() => api.courses());

  return (
    <Layout>
      <h1 className="mb-6 text-2xl font-semibold">Courses</h1>
      {loading && <LoadingState label="Loading courses..." />}
      {error && <ErrorState message="Unable to load courses." onRetry={reload} />}
      {data && data.length === 0 && (
        <EmptyState title="You're not enrolled in any courses yet." />
      )}
      {data && data.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <Link
              key={c.id}
              to={`/courses/${c.id}`}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-sm"
            >
              <h2 className="font-semibold text-slate-800">{c.title}</h2>
              <p className="mt-1 flex-1 text-sm text-slate-500">{c.description}</p>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-sm text-slate-500">
                  <span>
                    {c.completedLessons}/{c.totalLessons} lessons
                  </span>
                  <span>{c.progress}%</span>
                </div>
                <ProgressBar value={c.progress} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
