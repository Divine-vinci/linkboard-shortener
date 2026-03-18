type PublicBoardLinkListProps = {
  links: Array<{
    id: string;
    position: number;
    link: {
      slug: string;
      title: string | null;
      description: string | null;
      targetUrl: string;
    };
  }>;
};

function getHostname(targetUrl: string) {
  try {
    return new URL(targetUrl).hostname;
  } catch {
    return targetUrl;
  }
}

export function PublicBoardLinkList({ links }: PublicBoardLinkListProps) {
  if (links.length === 0) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-8 text-center">
        <p className="text-sm text-zinc-400">This board has no links yet.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-4" aria-label="Board links">
      {links.map((boardLink) => {
        const label = boardLink.link.title?.trim() || boardLink.link.slug;
        const hostname = getHostname(boardLink.link.targetUrl);

        return (
          <li key={boardLink.id}>
            <a
              href={`/${boardLink.link.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 transition hover:border-emerald-400/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950 text-xs font-semibold text-zinc-300">
                      {boardLink.position + 1}
                    </span>
                    <h2 className="text-lg font-semibold text-zinc-100 transition group-hover:text-emerald-300">{label}</h2>
                  </div>
                  {boardLink.link.description ? (
                    <p className="max-w-3xl text-sm leading-6 text-zinc-400">{boardLink.link.description}</p>
                  ) : null}
                </div>

                <span className="shrink-0 rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs font-medium text-zinc-400">
                  {hostname}
                </span>
              </div>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
