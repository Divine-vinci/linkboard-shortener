import { randomBytes } from "node:crypto";

import type { Board, Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "./client";

type DbClient = PrismaClient | Prisma.TransactionClient;

type CreateBoardParams = {
  name: string;
  description?: string;
  visibility: Board["visibility"];
  userId: string;
};

type FindBoardsOptions = {
  limit?: number;
  offset?: number;
};

export function createBoardSlug(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");

  return slug || "board";
}

function createSlugWithSuffix(baseSlug: string, suffix: string) {
  const trimmedBase = baseSlug.slice(0, Math.max(1, 60 - suffix.length - 1)).replace(/-+$/g, "");
  return `${trimmedBase || "board"}-${suffix}`;
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as Record<string, unknown>).code === "P2002"
  );
}

function createRandomSuffix() {
  return randomBytes(2).toString("hex");
}

export async function findBoardsByUserId(
  userId: string,
  options: FindBoardsOptions = {},
  db: DbClient = prisma,
) {
  const { limit, offset } = options;

  return db.board.findMany({
    where: { userId },
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    include: {
      _count: {
        select: {
          boardLinks: true,
        },
      },
    },
    ...(typeof offset === "number" ? { skip: offset } : {}),
    ...(typeof limit === "number" ? { take: limit } : {}),
  });
}

export async function countBoardsByUserId(userId: string, db: DbClient = prisma) {
  return db.board.count({ where: { userId } });
}

export async function findBoardById(id: string, db: DbClient = prisma) {
  return db.board.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          boardLinks: true,
        },
      },
      boardLinks: {
        include: {
          link: true,
        },
        orderBy: {
          position: "asc",
        },
      },
    },
  });
}

export async function findBoardBySlug(slug: string, db: DbClient = prisma) {
  return db.board.findUnique({
    where: { slug },
  });
}

export async function createBoard({ name, description, visibility, userId }: CreateBoardParams, db: DbClient = prisma) {
  const baseSlug = createBoardSlug(name);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const slug = attempt === 0 ? baseSlug : createSlugWithSuffix(baseSlug, createRandomSuffix());

    try {
      return await db.board.create({
        data: {
          name,
          description,
          visibility,
          userId,
          slug,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error) && attempt < 2) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Unable to generate a unique board slug");
}
