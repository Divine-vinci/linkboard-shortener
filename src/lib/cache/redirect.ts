import { logger } from "@/lib/logger";

import { redis } from "./client";

export interface RedirectCacheEntry {
  targetUrl: string;
  linkId: string;
  expiresAt: string | null;
}

export const REDIRECT_CACHE_TTL_SECONDS = 86_400;

function getRedirectCacheKey(slug: string) {
  return `slug:${slug}`;
}

export async function getRedirectCache(slug: string): Promise<RedirectCacheEntry | null> {
  try {
    const cached = await redis.get(getRedirectCacheKey(slug));

    if (!cached) {
      return null;
    }

    return JSON.parse(cached) as RedirectCacheEntry;
  } catch (error) {
    logger.warn("redirect_cache.get_failed", { slug, error });
    return null;
  }
}

export async function setRedirectCache(slug: string, data: RedirectCacheEntry) {
  try {
    await redis.setex(getRedirectCacheKey(slug), REDIRECT_CACHE_TTL_SECONDS, JSON.stringify(data));
  } catch (error) {
    logger.warn("redirect_cache.set_failed", { slug, error });
  }
}
