import { useAuth } from "../lib/auth";
import { Layout } from "../components/Layout";

// Mentors can authenticate (the challenge requires the role), but no mentor-specific
// dashboard is part of this build. This page explains that clearly.
export function MentorInfo() {
  const { user } = useAuth();
  return (
    <Layout>
      <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-brand-600 text-xl text-white">
          ✦
        </div>
        <h1 className="text-xl font-semibold">Signed in as mentor</h1>
        <p className="mt-2 text-slate-600">
          Welcome, {user?.name}. Mentor authentication works and your role is{" "}
          <span className="font-medium">{user?.role}</span>.
        </p>
        <p className="mt-3 text-sm text-slate-500">
          A dedicated mentor dashboard is intentionally out of scope for this build. Mentor
          accounts do not have access to student data through the API.
        </p>
      </div>
    </Layout>
  );
}
