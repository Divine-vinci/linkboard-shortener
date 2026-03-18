import type { Link, Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "./client";

type DbClient = PrismaClient | Prisma.TransactionClient;

type BoardLinkWithMetadata = {
  id: string;
  boardId: string;
  linkId: string;
  position: number;
  addedAt: Date;
  link: Pick<
    Link,
    "id" | "slug" | "targetUrl" | "title" | "description" | "tags" | "expiresAt" | "userId" | "createdAt" | "updatedAt"
  >;
};

export async function getNextBoardLinkPosition(boardId: string, db: DbClient = prisma) {
  const result = await db.boardLink.aggregate({
    where: { boardId },
    _max: { position: true },
  });

  return (result._max.position ?? -1) + 1;
}

export async function addLinkToBoard(
  { boardId, linkId }: { boardId: string; linkId: string },
  db: DbClient = prisma,
) {
  const position = await getNextBoardLinkPosition(boardId, db);

  return db.boardLink.create({
    data: {
      boardId,
      linkId,
      position,
    },
  });
}

export async function removeLinkFromBoard(boardId: string, linkId: string, db: DbClient = prisma) {
  return db.boardLink.delete({
    where: {
      boardId_linkId: {
        boardId,
        linkId,
      },
    },
  });
}

export async function recompactBoardLinkPositions(boardId: string, db: DbClient = prisma) {
  const boardLinks = await db.boardLink.findMany({
    where: { boardId },
    orderBy: { position: "asc" },
    select: {
      id: true,
      position: true,
    },
  });

  await Promise.all(
    boardLinks.map((boardLink, index) => {
      if (boardLink.position === index) {
        return Promise.resolve(boardLink);
      }

      return db.boardLink.update({
        where: { id: boardLink.id },
        data: { position: index },
      });
    }),
  );
}

export async function getBoardLinksWithMetadata(boardId: string, db: DbClient = prisma): Promise<BoardLinkWithMetadata[]> {
  return db.boardLink.findMany({
    where: { boardId },
    orderBy: { position: "asc" },
    include: {
      link: true,
    },
  });
}
