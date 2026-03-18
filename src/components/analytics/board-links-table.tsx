import type { BoardLinkClickItem } from "@/lib/db/analytics";

function formatPercentage(clicks: number, totalClicks: number) {
  if (totalClicks <= 0) {
    return "0%";
  }

  return `${Math.round((clicks / totalClicks) * 100)}%`;
}

export function BoardLinksTable({ links, totalClicks }: { links: BoardLinkClickItem[]; totalClicks: number }) {
  if (links.length === 0) {
    return (
      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-emerald-400">Link comparison</p>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">Board links</h2>
          <p className="text-sm text-zinc-400">Compare every link in the board by total click volume.</p>
        </div>
        <div className="mt-6 rounded-3xl border border-dashed border-zinc-700 bg-zinc-950/50 p-8 text-center">
          <p className="text-lg font-semibold text-zinc-100">No links in this board yet</p>
          <p className="mt-2 text-sm text-zinc-400">Add links to this board to compare individual performance.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-emerald-400">Link comparison</p>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">Board links</h2>
        <p className="text-sm text-zinc-400">Top-performing links appear first so you can quickly compare click share across the board.</p>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table aria-label="Per-link click comparison for this board" className="min-w-full border-collapse text-left text-sm text-zinc-300">
          <thead>
            <tr className="border-b border-zinc-800 text-xs uppercase tracking-[0.2em] text-zinc-500">
              <th scope="col" className="px-4 py-3 font-medium">Slug</th>
              <th scope="col" className="px-4 py-3 font-medium">Title</th>
              <th scope="col" className="px-4 py-3 font-medium">Clicks</th>
              <th scope="col" className="px-4 py-3 font-medium">Share</th>
            </tr>
          </thead>
          <tbody>
            {links.map((link) => (
              <tr key={link.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                <th scope="row" className="px-4 py-4 font-medium text-zinc-100">/{link.slug}</th>
                <td className="px-4 py-4 text-zinc-300">{link.title ?? "Untitled link"}</td>
                <td className="px-4 py-4 text-zinc-100">{link.clicks}</td>
                <td className="px-4 py-4 text-zinc-300">{formatPercentage(link.clicks, totalClicks)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
