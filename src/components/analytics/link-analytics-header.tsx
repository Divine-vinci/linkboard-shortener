export function LinkAnalyticsHeader({
  slug,
  targetUrl,
  totalClicks,
}: {
  slug: string;
  targetUrl: string;
  totalClicks: number;
}) {
  return (
    <section aria-label="Link analytics overview" className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-emerald-400">Analytics</p>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Link analytics</h1>
            <p className="text-lg font-medium text-emerald-300">/{slug}</p>
            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-sm text-zinc-300 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
            >
              {targetUrl}
            </a>
          </div>
        </div>

        <div className="min-w-44 rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-emerald-400">Total clicks</p>
          <p className="mt-3 text-4xl font-semibold tracking-tight text-zinc-100">{totalClicks}</p>
        </div>
      </div>
    </section>
  );
}
