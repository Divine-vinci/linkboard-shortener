import type { Board, BoardVisibility } from "@prisma/client";
import Link from "next/link";

const visibilityTone: Record<BoardVisibility, string> = {
  Private: "border-zinc-700 bg-zinc-800/80 text-zinc-200",
  Public: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  Unlisted: "border-amber-500/30 bg-amber-500/10 text-amber-300",
};

export type BoardOverviewItem = Pick<Board, "id" | "name" | "visibility"> & {
  _count: {
    boardLinks: number;
  };
};

export function BoardsOverview({ boards }: { boards: BoardOverviewItem[] }) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-zinc-100">Boards overview</h2>
          <p className="text-sm text-zinc-400">See your collections and jump back into organization work.</p>
        </div>
        <Link
          href="/dashboard/boards"
          className="text-sm font-medium text-emerald-400 transition hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
        >
          View all
        </Link>
      </div>

      {boards.length > 0 ? (
        <div className="mt-6 space-y-3">
          {boards.map((board) => (
            <Link
              key={board.id}
              href={`/dashboard/boards/${board.id}`}
              className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 transition hover:border-emerald-400/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            >
              <div className="min-w-0 space-y-2">
                <p className="truncate text-sm font-semibold text-zinc-100">{board.name}</p>
                <span className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-xs ${visibilityTone[board.visibility]}`}>
                  {board.visibility}
                </span>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Links</p>
                <p className="mt-1 text-sm font-medium text-zinc-100">{board._count.boardLinks}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/50 p-6 text-center">
          <h3 className="text-sm font-semibold text-zinc-100">No boards yet</h3>
          <p className="mt-2 text-sm text-zinc-400">Create a board to group links by campaign, team, or topic.</p>
        </div>
      )}
    </section>
  );
}
