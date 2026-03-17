type RateLimitEntry = {
  count: number;
  expiresAt: number;
};

export type RateLimitStatus = {
  limited: boolean;
  retryAfter: number;
  remaining: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

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

export function getRateLimitStatus(
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

export function recordRateLimitFailure(
  key: string,
  maxAttempts: number,
  windowMs: number,
  currentTime = now(),
): RateLimitStatus {
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

  return getRateLimitStatus(key, maxAttempts, windowMs, currentTime);
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
}
