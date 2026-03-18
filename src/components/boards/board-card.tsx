import { BoardVisibility } from "@prisma/client";
import Link from "next/link";

const visibilityTone = {
  [BoardVisibility.Private]: "border-zinc-700 bg-zinc-800/80 text-zinc-200",
  [BoardVisibility.Public]: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  [BoardVisibility.Unlisted]: "border-amber-500/30 bg-amber-500/10 text-amber-300",
} as const;

type BoardCardProps = {
  board: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    visibility: BoardVisibility;
    createdAt: Date;
    _count?: {
      boardLinks: number;
    };
  };
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function BoardCard({ board }: BoardCardProps) {
  const sharePath = board.visibility === BoardVisibility.Private ? null : `/b/${board.slug}`;

  return (
    <article className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Link
            href={`/dashboard/boards/${board.id}`}
            className="text-lg font-semibold text-zinc-100 transition hover:text-emerald-300"
          >
            {board.name}
          </Link>
          <p className="text-sm text-zinc-400">
            {board.description ?? "No description yet. Add links and details in the next stories."}
          </p>
        </div>

        <span
          className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-medium ${visibilityTone[board.visibility]}`}
        >
          {board.visibility}
        </span>
      </div>

      <dl className="mt-5 grid gap-3 text-sm text-zinc-400 sm:grid-cols-3">
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-zinc-500">Links</dt>
          <dd className="mt-1 font-medium text-zinc-100">{board._count?.boardLinks ?? 0}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-zinc-500">Created</dt>
          <dd className="mt-1 font-medium text-zinc-100">{formatDate(board.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-zinc-500">Share URL</dt>
          <dd className="mt-1 font-medium text-zinc-100">
            {sharePath ? <code className="text-xs text-emerald-300">{sharePath}</code> : "Owner only"}
          </dd>
        </div>
      </dl>
    </article>
  );
}
