import type { Link, Prisma } from "@prisma/client";

import { invalidateRedirectCache } from "@/lib/cache/invalidation";
import { prisma } from "@/lib/db/client";

export type LinkMetadataData = Pick<Link, "title" | "description" | "tags">;
export type CreateLinkData = Pick<Link, "slug" | "targetUrl" | "userId"> & Partial<LinkMetadataData> & { expiresAt?: Date | null };
export type UpdateLinkData = {
  targetUrl?: string;
  title?: string | null;
  description?: string | null;
  tags?: string[];
  expiresAt?: Date | null;
};

type FindLinksForLibraryParams = {
  userId: string;
  query?: string;
  tag?: string;
  page?: number;
  limit?: number;
};

export type LinkLibraryResult = {
  links: Link[];
  total: number;
};

export async function createLink(data: CreateLinkData) {
  return prisma.link.create({
    data,
  });
}

export async function findLinkBySlug(slug: string) {
  return prisma.link.findUnique({
    where: { slug },
  });
}

export async function findLinkById(id: string, userId: string) {
  return prisma.link.findFirst({
    where: { id, userId },
  });
}

export async function updateLink(id: string, userId: string, data: UpdateLinkData) {
  const link = await findLinkById(id, userId);

  if (!link) {
    return null;
  }

  const updatedLink = await prisma.link.update({
    where: { id },
    data,
  });

  await invalidateRedirectCache(link.slug);

  return updatedLink;
}

export async function deleteLink(id: string, userId: string): Promise<boolean> {
  const link = await findLinkById(id, userId);

  if (!link) {
    return false;
  }

  await prisma.link.delete({
    where: { id },
  });

  await invalidateRedirectCache(link.slug);

  return true;
}

export async function findLinksByUserId(userId: string) {
  return prisma.link.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export function buildLinkLibraryWhereClause({
  userId,
  query,
  tag,
}: Omit<FindLinksForLibraryParams, "page" | "limit">): Prisma.LinkWhereInput {
  const normalizedQuery = query?.trim();
  const normalizedTag = tag?.trim().toLowerCase();

  return {
    userId,
    ...(normalizedQuery
      ? {
          OR: [
            { title: { contains: normalizedQuery, mode: "insensitive" } },
            { slug: { contains: normalizedQuery, mode: "insensitive" } },
            { targetUrl: { contains: normalizedQuery, mode: "insensitive" } },
            { tags: { has: normalizedQuery.toLowerCase() } },
          ],
        }
      : {}),
    ...(normalizedTag ? { tags: { has: normalizedTag } } : {}),
  };
}

export async function findLinksForLibrary({
  userId,
  query,
  tag,
  page = 1,
  limit = 20,
}: FindLinksForLibraryParams): Promise<LinkLibraryResult> {
  const skip = (page - 1) * limit;
  const where = buildLinkLibraryWhereClause({ userId, query, tag });

  const [links, total] = await Promise.all([
    prisma.link.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.link.count({ where }),
  ]);

  return { links, total };
}
