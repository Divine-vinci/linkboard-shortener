import { prisma } from "./client";

export type CreateApiKeyInput = {
  userId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
};

export async function createApiKey(data: CreateApiKeyInput) {
  return prisma.apiKey.create({
    data,
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      createdAt: true,
    },
  });
}

export async function findApiKeysByUserId(userId: string) {
  return prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });
}

export async function findApiKeyById(id: string, userId: string) {
  return prisma.apiKey.findFirst({
    where: { id, userId },
    select: {
      id: true,
      userId: true,
      name: true,
      keyPrefix: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });
}

/**
 * Lookup by hash for API authentication (Story 7.2+).
 * Returns only the fields needed for auth verification.
 */
export async function findApiKeyByHash(keyHash: string) {
  return prisma.apiKey.findFirst({
    where: { keyHash },
    select: {
      id: true,
      userId: true,
      keyHash: true,
    },
  });
}

export async function deleteApiKey(id: string, userId: string): Promise<boolean> {
  const apiKey = await prisma.apiKey.findFirst({
    where: { id, userId },
    select: {
      id: true,
    },
  });

  if (!apiKey) {
    return false;
  }

  await prisma.apiKey.delete({
    where: { id },
  });

  return true;
}
