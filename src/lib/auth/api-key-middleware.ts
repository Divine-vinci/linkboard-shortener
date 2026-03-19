import { hashApiKey } from "@/lib/auth/api-key";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/client";
import { findApiKeyByHash } from "@/lib/db/api-keys";

export type ApiKeyAuthResult = {
  userId: string;
  apiKeyId: string;
};

export type ApiRequestIdentity = {
  userId: string;
  rateLimitKey: string;
  kind: "apiKey" | "user";
};

export async function authenticateApiKey(request: Request): Promise<ApiKeyAuthResult | null> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const rawKey = authHeader.slice(7).trim();

  if (!rawKey) {
    return null;
  }

  const keyHash = hashApiKey(rawKey);
  const apiKey = await findApiKeyByHash(keyHash);

  if (!apiKey) {
    return null;
  }

  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  return {
    userId: apiKey.userId,
    apiKeyId: apiKey.id,
  };
}

export async function resolveApiRequestIdentity(request: Request): Promise<ApiRequestIdentity | null> {
  const apiKeyAuth = await authenticateApiKey(request);

  if (apiKeyAuth) {
    return {
      userId: apiKeyAuth.userId,
      rateLimitKey: `api-key:${apiKeyAuth.apiKeyId}`,
      kind: "apiKey",
    };
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;

  if (!userId) {
    return null;
  }

  return {
    userId,
    rateLimitKey: `user:${userId}`,
    kind: "user",
  };
}

export async function resolveSessionApiIdentity(): Promise<ApiRequestIdentity | null> {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  if (!userId) {
    return null;
  }

  return {
    userId,
    rateLimitKey: `user:${userId}`,
    kind: "user",
  };
}

export async function resolveUserId(request: Request): Promise<string | null> {
  const identity = await resolveApiRequestIdentity(request);
  return identity?.userId ?? null;
}
