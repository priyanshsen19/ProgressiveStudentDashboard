import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAsync } from "../hooks/useAsync";
import { Layout } from "../components/Layout";
import { LoadingState, ErrorState } from "../components/common/states";
import { ProgressBar } from "../components/dashboard/CourseProgress";

export function CourseDetail() {
  const { courseId = "" } = useParams();
  const course = useAsync(() => api.course(courseId), [courseId]);
  const lessons = useAsync(() => api.courseLessons(courseId), [courseId]);

  const loading = course.loading || lessons.loading;
  const error = course.error || lessons.error;

  return (
    <Layout>
      <Link to="/courses" className="text-sm text-brand-700 hover:underline">
        ← Back to courses
      </Link>

      {loading && <LoadingState label="Loading course..." />}
      {error && (
        <ErrorState
          message="Unable to load this course."
          onRetry={() => {
            course.reload();
            lessons.reload();
          }}
        />
      )}

      {course.data && lessons.data && (
        <>
          <div className="mb-6 mt-2">
            <h1 className="text-2xl font-semibold">{course.data.title}</h1>
            <p className="mt-1 text-slate-500">{course.data.description}</p>
            <div className="mt-4 max-w-md">
              <div className="mb-1 flex justify-between text-sm text-slate-500">
                <span>
                  {course.data.completedLessons}/{course.data.totalLessons} lessons complete
                </span>
                <span>{course.data.progress}%</span>
              </div>
              <ProgressBar value={course.data.progress} />
            </div>
          </div>

          <ol className="space-y-2">
            {lessons.data.map((l) => (
              <li key={l.id}>
                <Link
                  to={`/courses/${courseId}/lessons/${l.id}`}
                  className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 transition hover:border-brand-300"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-medium ${
                        l.completed
                          ? "bg-brand-600 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                      aria-hidden
                    >
                      {l.completed ? "✓" : l.order}
                    </span>
                    <div>
                      <p className="font-medium text-slate-800">{l.title}</p>
                      <p className="text-sm text-slate-500">{l.durationMin} min</p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      l.completed
                        ? "bg-brand-50 text-brand-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {l.completed ? "Completed" : "Not done"}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </>
      )}
    </Layout>
  );
}
