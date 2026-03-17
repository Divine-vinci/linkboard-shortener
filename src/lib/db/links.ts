import type { Link } from "@prisma/client";

import { prisma } from "@/lib/db/client";

export type CreateLinkData = Pick<Link, "slug" | "targetUrl" | "userId">;

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

export async function findLinksByUserId(userId: string) {
  return prisma.link.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}
