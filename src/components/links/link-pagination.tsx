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

type LinkPaginationProps = {
  currentPage: number;
  totalPages: number;
};

export function LinkPagination({ currentPage, totalPages }: LinkPaginationProps) {
  const searchParams = useSearchParams();

  if (totalPages <= 1) {
    return null;
  }

  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav aria-label="Link library pagination" className="flex flex-wrap items-center gap-2">
      <Link
        href={buildPageHref(searchParams, Math.max(1, currentPage - 1))}
        aria-disabled={currentPage === 1}
        className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 aria-disabled:pointer-events-none aria-disabled:opacity-50"
      >
        Previous
      </Link>
      {pageNumbers.map((pageNumber) => {
        const isCurrent = pageNumber === currentPage;

        return (
          <Link
            key={pageNumber}
            href={buildPageHref(searchParams, pageNumber)}
            aria-current={isCurrent ? "page" : undefined}
            className={isCurrent
              ? "rounded-full border border-emerald-400 bg-emerald-400 px-4 py-2 text-sm font-semibold text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
              : "rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
            }
          >
            {pageNumber}
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
