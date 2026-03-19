import type Redis from "ioredis";
import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

type RateLimitEntry = {
  count: number;
  expiresAt: number;
};

export type RateLimitStatus = {
  limited: boolean;
  retryAfter: number;
  remaining: number;
};

export type RateLimitResult = RateLimitStatus & {
  count: number;
  resetAt: number;
};

export type RateLimitConfig = {
  maxAttempts: number;
  windowMs: number;
  message?: string;
  prefix?: string;
};

const rateLimitStore = new Map<string, RateLimitEntry>();
const DEFAULT_API_RATE_LIMIT_MESSAGE = "Too many requests";

export const API_RATE_LIMIT = {
  maxAttempts: 100,
  windowMs: 60 * 1000,
  message: DEFAULT_API_RATE_LIMIT_MESSAGE,
  prefix: "api",
} satisfies RateLimitConfig;

let redisPromise: Promise<Redis | null> | null = null;

function now() {
  return Date.now();
}

function getEntry(key: string, currentTime = now()) {
  const entry = rateLimitStore.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= currentTime) {
    rateLimitStore.delete(key);
    return null;
  }

  return entry;
}

function getMemoryStatus(
  key: string,
  maxAttempts: number,
  windowMs: number,
  currentTime = now(),
): RateLimitStatus {
  const entry = getEntry(key, currentTime);

  if (!entry) {
    return {
      limited: false,
      retryAfter: 0,
      remaining: maxAttempts,
    };
  }

  const retryAfter = Math.max(1, Math.ceil((entry.expiresAt - currentTime) / 1000));
  const remaining = Math.max(0, maxAttempts - entry.count);

  return {
    limited: entry.count >= maxAttempts,
    retryAfter: entry.count >= maxAttempts ? retryAfter : 0,
    remaining,
  };
}

function consumeMemoryRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
  currentTime = now(),
): RateLimitResult {
  const existing = getEntry(key, currentTime);

  if (!existing) {
    rateLimitStore.set(key, {
      count: 1,
      expiresAt: currentTime + windowMs,
    });
  } else {
    existing.count += 1;
    rateLimitStore.set(key, existing);
  }

  const entry = getEntry(key, currentTime)!;
  const retryAfter = Math.max(1, Math.ceil((entry.expiresAt - currentTime) / 1000));

  return {
    limited: entry.count > maxAttempts,
    retryAfter: entry.count > maxAttempts ? retryAfter : 0,
    remaining: Math.max(0, maxAttempts - entry.count),
    count: entry.count,
    resetAt: entry.expiresAt,
  };
}

async function getRedisClient(): Promise<Redis | null> {
  if (process.env.NODE_ENV === "test" || !process.env.REDIS_URL) {
    return null;
  }

  if (!redisPromise) {
    redisPromise = (async () => {
      try {
        const { default: Redis } = await import("ioredis");
        const client = new Redis(process.env.REDIS_URL!, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
        });

        await client.connect();
        return client;
      } catch (error) {
        logger.warn("rate_limit.redis_unavailable", {
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    })();
  }

  return redisPromise;
}

async function consumeRedisRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): Promise<RateLimitResult | null> {
  const redis = await getRedisClient();

  if (!redis) {
    return null;
  }

  try {
    const luaScript = `
      local count = redis.call('INCR', KEYS[1])
      if count == 1 then
        redis.call('PEXPIRE', KEYS[1], ARGV[1])
      end
      local ttl = redis.call('PTTL', KEYS[1])
      return {count, ttl}
    `;
    const result = await redis.eval(luaScript, 1, key, windowMs) as [number, number];
    const count = result[0];
    const ttlMs = result[1];

    const remainingWindowMs = ttlMs > 0 ? ttlMs : windowMs;
    const resetAt = now() + remainingWindowMs;
    const retryAfter = Math.max(1, Math.ceil(remainingWindowMs / 1000));

    return {
      limited: count > maxAttempts,
      retryAfter: count > maxAttempts ? retryAfter : 0,
      remaining: Math.max(0, maxAttempts - count),
      count,
      resetAt,
    };
  } catch (error) {
    logger.warn("rate_limit.redis_consume_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export function getRateLimitStatus(
  key: string,
  maxAttempts: number,
  windowMs: number,
  currentTime = now(),
): RateLimitStatus {
  return getMemoryStatus(key, maxAttempts, windowMs, currentTime);
}

export function recordRateLimitFailure(
  key: string,
  maxAttempts: number,
  windowMs: number,
  currentTime = now(),
): RateLimitStatus {
  const result = consumeMemoryRateLimit(key, maxAttempts, windowMs, currentTime);

  return {
    limited: result.limited,
    retryAfter: result.retryAfter,
    remaining: result.remaining,
  };
}

export async function consumeRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const redisResult = await consumeRedisRateLimit(key, maxAttempts, windowMs);

  if (redisResult) {
    return redisResult;
  }

  return consumeMemoryRateLimit(key, maxAttempts, windowMs);
}

export async function enforceApiRateLimit(
  identityKey: string,
  config: RateLimitConfig = API_RATE_LIMIT,
): Promise<NextResponse | null> {
  const scopedKey = `${config.prefix ?? "rate-limit"}:${identityKey}`;
  const result = await consumeRateLimit(scopedKey, config.maxAttempts, config.windowMs);

  if (!result.limited) {
    return null;
  }

  const retryAfter = result.retryAfter;

  return NextResponse.json(
    errorResponse(new AppError("RATE_LIMITED", config.message ?? DEFAULT_API_RATE_LIMIT_MESSAGE, 429), {
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
      },
    },
  );
}

export function resetRateLimit(key: string) {
  rateLimitStore.delete(key);
}

export function extractClientIp(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for");

  if (forwardedFor) {
    const [firstIp] = forwardedFor.split(",");
    const normalized = firstIp?.trim();

    if (normalized) {
      return normalized;
    }
  }

  const realIp = headers.get("x-real-ip")?.trim();

  if (realIp) {
    return realIp;
  }

  return "unknown";
}

export function __resetRateLimitStore() {
  rateLimitStore.clear();
  redisPromise = null;
}
