type PublicBoardHeaderProps = {
  board: {
    name: string;
    description: string | null;
    slug: string;
    _count: {
      boardLinks: number;
    };
  };
};

export function PublicBoardHeader({ board }: PublicBoardHeaderProps) {
  return (
    <header className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-2xl shadow-black/20 sm:p-8">
      <div className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-emerald-400">Public board</p>
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">{board.name}</h1>
          <p className="max-w-3xl text-sm leading-6 text-zinc-400 sm:text-base">
            {board.description ?? "A curated collection of links shared via Linkboard."}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4 border-t border-zinc-800 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <dl className="flex flex-wrap gap-6 text-sm text-zinc-400">
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-zinc-500">Links</dt>
            <dd className="mt-1 font-medium text-zinc-100">{board._count.boardLinks}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-zinc-500">Share path</dt>
            <dd className="mt-1 font-medium text-emerald-300">/b/{board.slug}</dd>
          </div>
        </dl>

        <a
          href="/"
          className="inline-flex w-fit items-center rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-emerald-400/50 hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
        >
          Powered by Linkboard
        </a>
      </div>
    </header>
  );
}
