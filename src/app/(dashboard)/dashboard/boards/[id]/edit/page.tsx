import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BoardEditForm } from "@/components/boards/board-edit-form";
import { auth } from "@/lib/auth/config";
import { findBoardById } from "@/lib/db/boards";

export const metadata: Metadata = {
  title: "Edit board — Linkboard",
};

export default async function EditBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  const { id } = await params;
  const board = await findBoardById(id);

  if (!userId || !board || board.userId !== userId) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-emerald-400">Board</p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">Edit {board.name}</h1>
        <p className="text-sm text-zinc-400">Change the board metadata and visibility settings for this collection.</p>
      </div>
      <BoardEditForm
        board={{
          id: board.id,
          name: board.name,
          slug: board.slug,
          description: board.description,
          visibility: board.visibility,
        }}
      />
    </section>
  );
}
