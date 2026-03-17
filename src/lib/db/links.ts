import type { Link } from "@prisma/client";

import { prisma } from "@/lib/db/client";

export type LinkMetadataData = Pick<Link, "title" | "description" | "tags">;
export type CreateLinkData = Pick<Link, "slug" | "targetUrl" | "userId"> & Partial<LinkMetadataData>;
export type UpdateLinkData = {
  title?: string | null;
  description?: string | null;
  tags?: string[];
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

  return prisma.link.update({
    where: { id },
    data,
  });
}

export async function findLinksByUserId(userId: string) {
  return prisma.link.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}
