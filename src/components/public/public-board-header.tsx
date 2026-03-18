import Link from "next/link";

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
    <header className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 shadow-2xl shadow-black/20 sm:p-8">
      <div className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-emerald-400 sm:text-sm">Public board</p>
        <div className="space-y-3">
          <h1 className="text-balance break-words text-2xl font-bold tracking-tight text-zinc-100 sm:text-4xl">{board.name}</h1>
          <p className="max-w-3xl break-words text-sm leading-6 text-zinc-300 sm:text-base">
            {board.description ?? "A curated collection of links shared via Linkboard."}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4 border-t border-zinc-800 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <dl className="grid gap-4 text-sm text-zinc-300 sm:grid-flow-col sm:auto-cols-max sm:gap-6">
          <div className="min-w-0">
            <dt className="text-xs uppercase tracking-[0.2em] text-zinc-500">Links</dt>
            <dd className="mt-1 font-medium text-zinc-100">{board._count.boardLinks}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs uppercase tracking-[0.2em] text-zinc-500">Share path</dt>
            <dd className="mt-1 break-all font-medium text-emerald-300">/b/{board.slug}</dd>
          </div>
        </dl>

        <Link
          href="/"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-emerald-400/50 hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 sm:min-h-10 sm:w-fit"
        >
          Powered by Linkboard
        </Link>
      </div>
    </header>
  );
}
