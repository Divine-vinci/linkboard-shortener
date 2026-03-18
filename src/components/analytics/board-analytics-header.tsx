export function BoardAnalyticsHeader({
  boardName,
  totalClicks,
  linkCount,
}: {
  boardName: string;
  totalClicks: number;
  linkCount: number;
}) {
  const zeroStateMessage = linkCount === 0 ? "No links in this board" : totalClicks === 0 ? "No clicks yet" : null;

  return (
    <section
      aria-label={`Board analytics overview for ${boardName} with ${totalClicks} total clicks`}
      className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-emerald-400">Analytics</p>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Board analytics</h1>
            <p className="text-lg font-medium text-emerald-300">{boardName}</p>
            <p className="text-sm text-zinc-400">Aggregate performance across every link currently assigned to this board.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:min-w-[20rem]">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-emerald-400">Total clicks</p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-zinc-100">{totalClicks}</p>
          </div>
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-emerald-400">Links in board</p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-zinc-100">{linkCount}</p>
          </div>
        </div>
      </div>

      {zeroStateMessage ? (
        <div className="mt-6 rounded-3xl border border-dashed border-zinc-700 bg-zinc-950/50 p-8 text-center">
          <p className="text-lg font-semibold text-zinc-100">{zeroStateMessage}</p>
          <p className="mt-2 text-sm text-zinc-400">
            {linkCount === 0
              ? "Add links to this board to start comparing performance."
              : "This board has links, but none of them have recorded clicks yet."}
          </p>
        </div>
      ) : null}
    </section>
  );
}
