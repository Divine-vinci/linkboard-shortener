import type { Link as LinkModel } from "@prisma/client";
import Link from "next/link";

export type RecentLinkItem = Pick<LinkModel, "id" | "slug" | "targetUrl" | "title" | "createdAt">;

export function formatRelativeDate(date: Date) {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60_000));

  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: now.getFullYear() === date.getFullYear() ? undefined : "numeric",
  }).format(date);
}

export function RecentLinks({ links }: { links: RecentLinkItem[] }) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-zinc-100">Recent links</h2>
          <p className="text-sm text-zinc-400">Your latest short links and placeholders for analytics.</p>
        </div>
        <Link
          href="/dashboard/links"
          className="text-sm font-medium text-emerald-400 transition hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
        >
          View all
        </Link>
      </div>

      {links.length > 0 ? (
        <div className="mt-6 space-y-3">
          {links.map((link) => (
            <a
              key={link.id}
              href={link.targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 transition hover:border-emerald-400/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-2">
                  <p className="truncate text-sm font-semibold text-zinc-100">{link.title || link.slug}</p>
                  <p className="truncate text-sm text-zinc-400">{link.targetUrl}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Clicks</p>
                  <p className="mt-1 text-sm font-medium text-zinc-100">—</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-zinc-500">Created {formatRelativeDate(link.createdAt)}</p>
            </a>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/50 p-6 text-center">
          <h3 className="text-sm font-semibold text-zinc-100">No recent links yet</h3>
          <p className="mt-2 text-sm text-zinc-400">Create your first short link to see it here.</p>
        </div>
      )}
    </section>
  );
}
