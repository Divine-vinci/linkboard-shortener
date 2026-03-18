import type { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "./client";

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function findBoardsByUserId(userId: string, db: DbClient = prisma) {
  return db.board.findMany({
    where: { userId },
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
  });
}

export async function findBoardById(id: string, db: DbClient = prisma) {
  return db.board.findUnique({
    where: { id },
  });
}
