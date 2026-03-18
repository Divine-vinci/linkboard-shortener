import type { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "./client";

type DbClient = PrismaClient | Prisma.TransactionClient;

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
