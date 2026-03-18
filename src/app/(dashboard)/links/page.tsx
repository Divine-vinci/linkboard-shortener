import type { Metadata } from "next";

import { CreateLinkForm } from "@/components/links/create-link-form";
import { LinkFilters } from "@/components/links/link-filters";
import { LinkLibrary } from "@/components/links/link-library";
import { LinkPagination } from "@/components/links/link-pagination";
import { auth } from "@/lib/auth/config";
import { findLinksForLibrary, getDistinctTagsForUser } from "@/lib/db/links";
import { getCurrentTimeMs } from "@/lib/time";
import { linkLibraryQuerySchema } from "@/lib/validations/link";

export const metadata: Metadata = {
  title: "Links — Linkboard",
};

type LinksPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LinksPage({ searchParams }: LinksPageProps) {
  const session = await auth();
  const userId = session?.user?.id;
  const resolvedSearchParams = (await searchParams) ?? {};
  const parsedQuery = linkLibraryQuerySchema.safeParse({
    q: getSingleParam(resolvedSearchParams.q),
    tag: getSingleParam(resolvedSearchParams.tag),
    page: getSingleParam(resolvedSearchParams.page),
    limit: getSingleParam(resolvedSearchParams.limit),
  });
  const filters = parsedQuery.success ? parsedQuery.data : linkLibraryQuerySchema.parse({});
  const { links, total } = userId
    ? await findLinksForLibrary({
        userId,
        query: filters.q,
        tag: filters.tag,
        page: filters.page,
        limit: filters.limit,
      })
    : { links: [], total: 0 };
  const currentTimeMs = getCurrentTimeMs();
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));
  const clampedPage = Math.min(filters.page, totalPages);
  const availableTags = userId ? await getDistinctTagsForUser(userId) : [];

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">Links</h2>
        <p className="text-sm text-zinc-400">
          Create and manage your short links, then search, filter, and page through your library.
        </p>
      </div>

      <CreateLinkForm />
      <LinkFilters
        availableTags={availableTags}
        currentQuery={filters.q}
        currentTag={filters.tag}
        total={total}
      />
      <LinkLibrary links={links} currentTimeMs={currentTimeMs} query={filters.q} tag={filters.tag} />
      <LinkPagination currentPage={clampedPage} totalPages={totalPages} />
    </section>
  );
}
