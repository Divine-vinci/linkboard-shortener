import type { Metadata } from "next";
import { BoardVisibility } from "@prisma/client";
import { notFound } from "next/navigation";

import { auth } from "@/lib/auth/config";
import { findBoardById } from "@/lib/db/boards";

export const metadata: Metadata = {
  title: "Board details — Linkboard",
};

function sharePathForBoard(visibility: BoardVisibility, slug: string) {
  if (visibility === BoardVisibility.Private) {
    return null;
  }

  return `/b/${slug}`;
}

export default async function BoardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  const { id } = await params;
  const board = await findBoardById(id);

  if (!userId || !board || board.userId !== userId) {
    notFound();
  }

  const sharePath = sharePathForBoard(board.visibility, board.slug);

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-emerald-400">Board</p>
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">{board.name}</h2>
            <p className="max-w-2xl text-sm text-zinc-400">{board.description ?? "No description added yet."}</p>
          </div>
          <span className="inline-flex w-fit items-center rounded-full border border-zinc-700 bg-zinc-800/80 px-3 py-1 text-xs font-medium text-zinc-100">
            {board.visibility}
          </span>
        </div>

        <dl className="mt-6 grid gap-4 text-sm text-zinc-400 sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-zinc-500">Slug</dt>
            <dd className="mt-1 font-medium text-zinc-100">{board.slug}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-zinc-500">Share URL</dt>
            <dd className="mt-1 font-medium text-zinc-100">
              {sharePath ? <code className="text-xs text-emerald-300">{sharePath}</code> : "Owner only"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-zinc-500">Links</dt>
            <dd className="mt-1 font-medium text-zinc-100">{board._count?.boardLinks ?? 0}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-3xl border border-dashed border-zinc-700 bg-zinc-950/50 p-8">
        <h3 className="text-lg font-semibold text-zinc-100">Links</h3>
        <p className="mt-2 text-sm text-zinc-400">
          Board link management is coming soon. For now, this page shows the board configuration.
        </p>
        {board.boardLinks.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">This board does not contain any links yet.</p>
        ) : null}
      </div>
    </section>
  );
}
