"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

function buildPageHref(searchParams: URLSearchParams, page: number) {
  const nextParams = new URLSearchParams(searchParams.toString());

  if (page <= 1) {
    nextParams.delete("page");
  } else {
    nextParams.set("page", String(page));
  }

  const queryString = nextParams.toString();
  return queryString ? `?${queryString}` : "/dashboard/links";
}

type PageItem = number | "ellipsis-start" | "ellipsis-end";

export function getPageNumbers(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: PageItem[] = [];

  // Always include first page
  pages.push(1);

  // Determine the window around the current page
  const windowStart = Math.max(2, currentPage - 1);
  const windowEnd = Math.min(totalPages - 1, currentPage + 1);

  // Ellipsis before window
  if (windowStart > 2) {
    pages.push("ellipsis-start");
  }

  // Window pages (and any pages between first and window, or window and last)
  for (let i = windowStart; i <= windowEnd; i++) {
    pages.push(i);
  }

  // Ellipsis after window
  if (windowEnd < totalPages - 1) {
    pages.push("ellipsis-end");
  }

  // Always include last page
  pages.push(totalPages);

  return pages;
}

type LinkPaginationProps = {
  currentPage: number;
  totalPages: number;
};

export function LinkPagination({ currentPage, totalPages }: LinkPaginationProps) {
  const searchParams = useSearchParams();

  if (totalPages <= 1) {
    return null;
  }

  const pageItems = getPageNumbers(currentPage, totalPages);

  return (
    <nav aria-label="Link library pagination" className="flex flex-wrap items-center gap-2">
      <Link
        href={buildPageHref(searchParams, Math.max(1, currentPage - 1))}
        aria-disabled={currentPage === 1}
        className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 aria-disabled:pointer-events-none aria-disabled:opacity-50"
      >
        Previous
      </Link>
      {pageItems.map((item) => {
        if (item === "ellipsis-start" || item === "ellipsis-end") {
          return (
            <span key={item} className="px-2 text-zinc-500">
              ...
            </span>
          );
        }

        const isCurrent = item === currentPage;

        return (
          <Link
            key={item}
            href={buildPageHref(searchParams, item)}
            aria-current={isCurrent ? "page" : undefined}
            className={isCurrent
              ? "rounded-full border border-emerald-400 bg-emerald-400 px-4 py-2 text-sm font-semibold text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
              : "rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
            }
          >
            {item}
          </Link>
        );
      })}
      <Link
        href={buildPageHref(searchParams, Math.min(totalPages, currentPage + 1))}
        aria-disabled={currentPage === totalPages}
        className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 aria-disabled:pointer-events-none aria-disabled:opacity-50"
      >
        Next
      </Link>
    </nav>
  );
}
