"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, type FormEvent } from "react";

function updateSearchParam(searchParams: URLSearchParams, key: string, value?: string) {
  if (value) {
    searchParams.set(key, value);
  } else {
    searchParams.delete(key);
  }

  searchParams.delete("page");
}

type LinkFiltersProps = {
  availableTags: string[];
  currentQuery?: string;
  currentTag?: string;
  total: number;
};

export function LinkFilters({ availableTags, currentQuery, currentTag, total }: LinkFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function navigate(nextParams: URLSearchParams) {
    const queryString = nextParams.toString();
    const nextUrl = queryString ? `?${queryString}` : "/dashboard/links";

    startTransition(() => {
      router.push(nextUrl);
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const nextQuery = String(formData.get("q") ?? "").trim();
    const nextParams = new URLSearchParams(searchParams.toString());
    updateSearchParam(nextParams, "q", nextQuery || undefined);
    navigate(nextParams);
  }

  function handleTagChange(nextTag: string) {
    const nextParams = new URLSearchParams(searchParams.toString());
    updateSearchParam(nextParams, "tag", nextTag || undefined);
    navigate(nextParams);
  }

  function handleReset() {
    startTransition(() => {
      router.push("/dashboard/links");
    });
  }

  return (
    <section className="space-y-4 rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-zinc-100">Search your library</h2>
          <p className="text-sm text-zinc-400">
            Filter by title, slug, destination URL, or tags. {total} link{total === 1 ? "" : "s"} matched.
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
        >
          Clear filters
        </button>
      </div>

      <form className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-end" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-200" htmlFor="library-search">
            Search links
          </label>
          <input
            id="library-search"
            name="q"
            type="search"
            defaultValue={currentQuery ?? ""}
            placeholder="Search title, slug, URL, or tags"
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-200" htmlFor="library-tag-filter">
            Tag filter
          </label>
          <select
            id="library-tag-filter"
            value={currentTag ?? ""}
            onChange={(event) => handleTagChange(event.target.value)}
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
          >
            <option value="">All tags</option>
            {availableTags.map((tag) => (
              <option key={tag} value={tag}>
                #{tag}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Updating..." : "Apply"}
        </button>
      </form>
    </section>
  );
}
