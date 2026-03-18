import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BoardCard } from "@/components/boards/board-card";
import { auth } from "@/lib/auth/config";
import { findBoardsByUserId } from "@/lib/db/boards";

export const metadata: Metadata = {
  title: "Boards — Linkboard",
};

export default async function BoardsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const boards = await findBoardsByUserId(userId);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-emerald-400">Boards</p>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">Organize your links</h2>
          <p className="text-sm text-zinc-400">
            Group related links into boards, control who can access them, and prepare collections to share.
          </p>
        </div>
        <Link
          href="/dashboard/boards/new"
          className="inline-flex items-center justify-center rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300"
        >
          New board
        </Link>
      </div>

      {boards.length > 0 ? (
        <div className="grid gap-4">
          {boards.map((board) => (
            <BoardCard key={board.id} board={board} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-zinc-700 bg-zinc-950/50 p-8 text-center">
          <h3 className="text-lg font-semibold text-zinc-100">No boards yet</h3>
          <p className="mt-2 text-sm text-zinc-400">
            Create your first board to start grouping links by campaign, project, or topic.
          </p>
          <Link
            href="/dashboard/boards/new"
            className="mt-5 inline-flex items-center justify-center rounded-2xl border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-100 transition hover:border-emerald-400 hover:text-emerald-300"
          >
            Create your first board
          </Link>
        </div>
      )}
    </section>
  );
}
