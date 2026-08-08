import { useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useAsync } from "../hooks/useAsync";
import { Layout } from "../components/Layout";
import { LoadingState, ErrorState } from "../components/common/states";
import { OverviewCards } from "../components/dashboard/OverviewCards";
import { ActivityChart } from "../components/dashboard/ActivityChart";
import { CompletionChart } from "../components/dashboard/CompletionChart";
import { CourseProgress } from "../components/dashboard/CourseProgress";
import { Recommendations } from "../components/dashboard/Recommendations";

export function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.dashboard());
  const [exporting, setExporting] = useState(false);

  async function onExport() {
    setExporting(true);
    try {
      const blob = await api.downloadCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "progress.csv";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Layout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Hi, {user?.name.split(" ")[0]} 👋</h1>
          <p className="text-slate-500">Here's your learning progress.</p>
        </div>
        <button
          onClick={onExport}
          disabled={exporting || !data}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {exporting ? "Exporting..." : "Export CSV"}
        </button>
      </div>

      {loading && <LoadingState label="Loading dashboard..." />}
      {error && <ErrorState message="Unable to load your dashboard." onRetry={reload} />}

      {data && (
        <div className="space-y-6">
          <OverviewCards overview={data.overview} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ActivityChart data={data.activityTrend} />
            </div>
            <CompletionChart distribution={data.completionDistribution} />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <CourseProgress courses={data.courses} />
            <Recommendations items={data.recommendations} />
          </div>
        </div>
      )}
    </Layout>
  );
}
