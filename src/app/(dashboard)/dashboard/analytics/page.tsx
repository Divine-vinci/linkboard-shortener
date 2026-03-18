import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics — Linkboard",
};

export default function AnalyticsPlaceholderPage() {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-emerald-400">Analytics</p>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">Analytics are on the roadmap</h2>
        <p className="max-w-2xl text-sm text-zinc-400">
          Story 4.1 ships the navigation surface for analytics. Reporting views arrive in Epic 6.
        </p>
      </div>
    </section>
  );
}
