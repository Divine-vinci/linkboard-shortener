import type { Link } from "@prisma/client";

function LinkMetadataBlock({ link }: { link: Pick<Link, "title" | "description" | "tags"> }) {
  const hasMetadata = Boolean(link.title || link.description || link.tags.length > 0);

  if (!hasMetadata) {
    return <p className="text-sm text-zinc-500">No metadata added yet.</p>;
  }

  return (
    <div className="space-y-3">
      {link.title ? <h3 className="text-base font-semibold text-zinc-100">{link.title}</h3> : null}
      {link.description ? <p className="text-sm text-zinc-300">{link.description}</p> : null}
      {link.tags.length > 0 ? (
        <ul aria-label="Link tags" className="flex flex-wrap gap-2">
          {link.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200"
            >
              #{tag}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

type LinkLibraryProps = {
  links: Array<
    Pick<
      Link,
      "id" | "slug" | "targetUrl" | "title" | "description" | "tags" | "createdAt"
    >
  >;
};

export function LinkLibrary({ links }: LinkLibraryProps) {
  return (
    <section className="space-y-4 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-100">Your links</h2>
        <p className="text-sm text-zinc-400">Metadata appears here when you add it while creating or editing a link.</p>
      </div>

      {links.length === 0 ? (
        <p className="text-sm text-zinc-500">You haven&apos;t created any links yet.</p>
      ) : (
        <ul className="space-y-3">
          {links.map((link) => (
            <li key={link.id} className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-emerald-300">/{link.slug}</p>
                <a
                  href={link.targetUrl}
                  className="break-all text-sm text-zinc-300 underline underline-offset-4"
                >
                  {link.targetUrl}
                </a>
              </div>
              <LinkMetadataBlock link={link} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
