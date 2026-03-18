import type { Metadata } from "next";

import { BoardForm } from "@/components/boards/board-form";

export const metadata: Metadata = {
  title: "New board — Linkboard",
};

export default function NewBoardPage() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-emerald-400">New board</p>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">Create a board</h2>
        <p className="text-sm text-zinc-400">
          Set a name, optional description, and visibility before you start adding links.
        </p>
      </div>

      <BoardForm />
    </section>
  );
}
