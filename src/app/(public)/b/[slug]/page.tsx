import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { PublicBoardHeader } from "@/components/public/public-board-header";
import { PublicBoardLinkList } from "@/components/public/public-board-link-list";
import { findPublicBoardBySlug } from "@/lib/db/boards";

const getPublicBoard = cache(findPublicBoardBySlug);

type PublicBoardPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: PublicBoardPageProps): Promise<Metadata> {
  const { slug } = await params;
  const board = await getPublicBoard(slug);

  if (!board) {
    return {
      title: "Board not found — Linkboard",
      description: "This board is unavailable.",
    };
  }

  const description = board.description ?? `Browse ${board.name} on Linkboard.`;
  const url = `/b/${board.slug}`;

  return {
    title: `${board.name} — Linkboard`,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: board.name,
      description,
      url,
      type: "website",
      images: [
        {
          url: "/og-default.png",
          width: 1200,
          height: 630,
          alt: board.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: board.name,
      description,
      images: ["/og-default.png"],
    },
  };
}

export default async function PublicBoardPage({ params }: PublicBoardPageProps) {
  const { slug } = await params;
  const board = await getPublicBoard(slug);

  if (!board) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-3 py-6 sm:px-6 sm:py-10 lg:px-8" data-testid="public-board-page">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 sm:gap-6">
        <PublicBoardHeader
          board={{
            name: board.name,
            description: board.description,
            slug: board.slug,
            _count: {
              boardLinks: board.boardLinks.length,
            },
          }}
        />
        <PublicBoardLinkList links={board.boardLinks} />
      </div>
    </main>
  );
}
