"use client";

import Link from "next/link";
import { useState } from "react";

import { CreateLinkForm } from "@/components/links/create-link-form";

type BoardOption = {
  id: string;
  name: string;
};

export function QuickActions({ boards }: { boards: BoardOption[] }) {
  const [showCreateLink, setShowCreateLink] = useState(false);

  return (
    <section className="space-y-4 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-emerald-400">Quick actions</p>
          <h2 className="text-lg font-semibold text-zinc-100">Create something new</h2>
          <p className="text-sm text-zinc-400">Jump straight into creating a short link or a new board.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => setShowCreateLink((current) => !current)}
            aria-expanded={showCreateLink}
            aria-controls="dashboard-create-link-panel"
            className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
          >
            Create Link
          </button>
          <Link
            href="/dashboard/boards/new"
            className="rounded-2xl border border-zinc-700 px-4 py-2 text-center text-sm text-zinc-300 transition hover:border-emerald-400 hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
          >
            Create Board
          </Link>
        </div>
      </div>

      {showCreateLink ? (
        <div id="dashboard-create-link-panel">
          <CreateLinkForm boards={boards} />
        </div>
      ) : null}
    </section>
  );
}
