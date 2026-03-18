import type { Metadata } from "next";
import { BoardVisibility } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BoardLinkAdd } from "@/components/boards/board-link-add";
import { BoardDeleteButton } from "@/components/boards/board-delete-button";
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
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <span className="inline-flex w-fit items-center rounded-full border border-zinc-700 bg-zinc-800/80 px-3 py-1 text-xs font-medium text-zinc-100">
              {board.visibility}
            </span>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/dashboard/boards/${board.id}/analytics`}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-100 transition hover:border-emerald-400/60 hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
              >
                Analytics
              </Link>
              <Link
                href={`/dashboard/boards/${board.id}/edit`}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-100 transition hover:border-emerald-400/60 hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
              >
                Edit board
              </Link>
              <BoardDeleteButton boardId={board.id} />
            </div>
          </div>
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

      <BoardLinkAdd
        boardId={board.id}
        initialLinks={board.boardLinks.map((boardLink) => ({
          id: boardLink.id,
          boardId: boardLink.boardId,
          linkId: boardLink.linkId,
          position: boardLink.position,
          addedAt: boardLink.addedAt.toISOString(),
          link: {
            id: boardLink.link.id,
            slug: boardLink.link.slug,
            targetUrl: boardLink.link.targetUrl,
            title: boardLink.link.title,
            tags: boardLink.link.tags,
            expiresAt: boardLink.link.expiresAt?.toISOString() ?? null,
          },
        }))}
      />
    </section>
  );
}
