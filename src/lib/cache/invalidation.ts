import { logger } from "@/lib/logger";

import { redis } from "./client";

function getRedirectCacheKey(slug: string) {
  return `slug:${slug}`;
}

export async function invalidateRedirectCache(slug: string) {
  try {
    await redis.del(getRedirectCacheKey(slug));
  } catch (error) {
    logger.warn("redirect_cache.invalidate_failed", { slug, error });
  }
}
