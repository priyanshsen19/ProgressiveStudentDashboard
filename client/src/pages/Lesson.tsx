import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAsync } from "../hooks/useAsync";
import { Layout } from "../components/Layout";
import { LoadingState, ErrorState } from "../components/common/states";

export function Lesson() {
  const { courseId = "", lessonId = "" } = useParams();
  const { data, loading, error, reload } = useAsync(() => api.lesson(lessonId), [lessonId]);

  const [saving, setSaving] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Track time spent on this page to add to the lesson's cumulative total.
  const openedAt = useRef<number>(Date.now());
  useEffect(() => {
    openedAt.current = Date.now();
  }, [lessonId]);

  const completed = data?.completed || justCompleted;

  async function onComplete() {
    if (!data || saving || completed) return;
    setSaving(true);
    setSaveError(null);
    const minutesThisSession = Math.max(1, Math.round((Date.now() - openedAt.current) / 60000));
    // timeSpent is cumulative/absolute — send the new running total.
    const newTotal = data.timeSpent + minutesThisSession;
    try {
      await api.updateProgress(lessonId, { completed: true, timeSpent: newTotal });
      setJustCompleted(true);
      reload();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save progress");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <Link to={`/courses/${courseId}`} className="text-sm text-brand-700 hover:underline">
        ← Back to course
      </Link>

      {loading && <LoadingState label="Loading lesson..." />}
      {error && <ErrorState message="Unable to load this lesson." onRetry={reload} />}

      {data && (
        <article className="mt-2 max-w-2xl">
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
            <span>Lesson {data.order}</span>
            <span aria-hidden>·</span>
            <span>{data.durationMin} min</span>
          </div>
          <h1 className="text-2xl font-semibold">{data.title}</h1>
          <p className="mt-3 leading-relaxed text-slate-600">{data.description}</p>

          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
            <p className="mb-3 text-sm text-slate-500">
              Time recorded: {data.timeSpent} min
            </p>
            {completed ? (
              <div className="inline-flex items-center gap-2 rounded-md bg-brand-50 px-4 py-2 font-medium text-brand-700">
                <span aria-hidden>✓</span> Completed
              </div>
            ) : (
              <button
                onClick={onComplete}
                disabled={saving}
                className="rounded-md bg-brand-600 px-5 py-2.5 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              >
                {saving ? "Saving..." : "Mark Lesson Complete"}
              </button>
            )}
            {saveError && (
              <p role="alert" className="mt-2 text-sm text-red-600">
                {saveError}
              </p>
            )}
          </div>
        </article>
      )}
    </Layout>
  );
}
