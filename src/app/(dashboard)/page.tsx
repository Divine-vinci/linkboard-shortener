export default function DashboardPage() {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
      <p className="text-sm font-medium uppercase tracking-[0.3em] text-emerald-400">
        Story 1.4
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight">Protected dashboard entry</h2>
      <p className="mt-3 max-w-2xl text-sm text-zinc-400">
        This minimal shell validates authenticated redirects for the login/session flow without
        pulling dashboard feature scope into Epic 4.
      </p>
    </section>
  );
}
