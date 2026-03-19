// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

describe("src/lib/rate-limit.ts", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.REDIS_URL;
    process.env = { ...process.env, NODE_ENV: "test" };

    const rateLimit = await import("@/lib/rate-limit");
    rateLimit.__resetRateLimitStore();
  });

  it("allows requests until the configured limit and then returns retry metadata", async () => {
    const { consumeRateLimit } = await import("@/lib/rate-limit");

    const first = await consumeRateLimit("api:user-1", 2, 60_000);
    const second = await consumeRateLimit("api:user-1", 2, 60_000);
    const third = await consumeRateLimit("api:user-1", 2, 60_000);

    expect(first.limited).toBe(false);
    expect(first.remaining).toBe(1);
    expect(second.limited).toBe(false);
    expect(second.remaining).toBe(0);
    expect(third.limited).toBe(true);
    expect(third.retryAfter).toBeGreaterThan(0);
    expect(third.remaining).toBe(0);
  });

  it("keeps identities isolated", async () => {
    const { consumeRateLimit } = await import("@/lib/rate-limit");

    await consumeRateLimit("api:user-a", 1, 60_000);
    const limited = await consumeRateLimit("api:user-a", 1, 60_000);
    const separateIdentity = await consumeRateLimit("api:user-b", 1, 60_000);

    expect(limited.limited).toBe(true);
    expect(separateIdentity.limited).toBe(false);
    expect(separateIdentity.remaining).toBe(0);
  });

  it("falls back to in-memory limiting when redis is unavailable", async () => {
    process.env = { ...process.env, NODE_ENV: "development" };
    process.env.REDIS_URL = "redis://localhost:6379";

    vi.doMock("ioredis", () => ({
      default: class RedisMock {
        async connect() {
          throw new Error("redis unavailable");
        }
      },
    }));

    const rateLimit = await import("@/lib/rate-limit");
    rateLimit.__resetRateLimitStore();

    const first = await rateLimit.consumeRateLimit("api:fallback", 1, 60_000);
    const second = await rateLimit.consumeRateLimit("api:fallback", 1, 60_000);

    expect(first.limited).toBe(false);
    expect(second.limited).toBe(true);
  });

  it("builds the standardized API 429 response contract", async () => {
    const { enforceApiRateLimit } = await import("@/lib/rate-limit");

    const first = await enforceApiRateLimit("user:test", { maxAttempts: 1, windowMs: 60_000, prefix: "api" });
    const second = await enforceApiRateLimit("user:test", { maxAttempts: 1, windowMs: 60_000, prefix: "api" });

    expect(first).toBeNull();
    expect(second?.status).toBe(429);
    expect(second?.headers.get("Retry-After")).toBeTruthy();
    await expect(second?.json()).resolves.toEqual({
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests",
        details: {
          retryAfter: expect.any(Number),
        },
      },
    });
  });
});
