import type { Recommendation } from "../../types";
import { EmptyState } from "../common/states";

export function Recommendations({ items }: { items: Recommendation[] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-4 text-lg font-semibold">Recommended Next Steps</h2>
      {items.length === 0 ? (
        <EmptyState title="You're all caught up!">
          No recommendations right now.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <li
              key={r.key}
              className="rounded-lg border border-slate-100 bg-slate-50 p-3"
            >
              <p className="font-medium text-slate-800">{r.title}</p>
              <p className="mt-0.5 text-sm text-slate-600">{r.description}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
