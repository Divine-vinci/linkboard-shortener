"use client";

import Link from "next/link";
import { useState } from "react";

import { CreateLinkForm } from "@/components/links/create-link-form";

type BoardOption = {
  id: string;
  name: string;
};

export function EmptyState({ boards }: { boards: BoardOption[] }) {
  const [showCreateLink, setShowCreateLink] = useState(false);

  return (
    <section className="rounded-3xl border border-dashed border-zinc-700 bg-zinc-900/50 p-8 text-center">
      <p className="text-sm font-medium uppercase tracking-[0.3em] text-emerald-400">Welcome</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-100">Your dashboard is ready</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm text-zinc-400">
        Create your first board and start adding links to build a shareable library.
      </p>

      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => setShowCreateLink((current) => !current)}
          aria-expanded={showCreateLink}
          aria-controls="dashboard-empty-create-link-panel"
          className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
        >
          Create Link
        </button>
        <Link
          href="/dashboard/boards/new"
          className="rounded-2xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-emerald-400 hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
        >
          Create Board
        </Link>
      </div>

      {showCreateLink ? (
        <div id="dashboard-empty-create-link-panel" className="mt-6 text-left">
          <CreateLinkForm boards={boards} />
        </div>
      ) : null}
    </section>
  );
}
