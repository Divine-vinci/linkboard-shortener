import type { Link } from "@prisma/client";

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
