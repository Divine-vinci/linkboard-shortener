// @vitest-environment node

import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/auth/config", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/auth/api-key-middleware", async () => {
  const { auth } = await import("@/lib/auth/config");
  const authenticateApiKey = vi.fn();
  return {
    authenticateApiKey,
    resolveUserId: async (request: Request) => {
      const apiKeyAuth = await authenticateApiKey(request);
      if (apiKeyAuth) return apiKeyAuth.userId;
      const session = await auth();
      return session?.user?.id ?? null;
    },
  };
});

vi.mock("@/lib/db/analytics", () => ({
  getLinkAnalyticsOverview: vi.fn(),
  getLinkClicksTimeseries: vi.fn(),
  getLinkReferrerBreakdown: vi.fn(),
  getLinkGeoBreakdown: vi.fn(),
}));

const { GET } = await import("@/app/api/v1/analytics/links/[id]/route");
const authModule = await import("@/lib/auth/config");
const apiKeyAuthModule = await import("@/lib/auth/api-key-middleware");
const analyticsModule = await import("@/lib/db/analytics");

const mockedAuth = authModule.auth as Mock;
const mockedAuthenticateApiKey = apiKeyAuthModule.authenticateApiKey as Mock;

function buildOverview(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "link-123",
    slug: "launch-plan",
    targetUrl: "https://example.com/launch",
    totalClicks: 1234,
    ...overrides,
  };
}

function buildTimeseries() {
  return [
    {
      label: "2026-03-16",
      periodStart: "2026-03-16T00:00:00.000Z",
      clicks: 42,
    },
  ];
}

describe("src/app/api/v1/analytics/links/[id]/route.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuthenticateApiKey.mockResolvedValue(null);
    vi.mocked(analyticsModule.getLinkAnalyticsOverview).mockResolvedValue(buildOverview());
    vi.mocked(analyticsModule.getLinkClicksTimeseries).mockResolvedValue(buildTimeseries());
    vi.mocked(analyticsModule.getLinkReferrerBreakdown).mockResolvedValue([
      { domain: "Direct / Unknown", clicks: 500 },
    ]);
    vi.mocked(analyticsModule.getLinkGeoBreakdown).mockResolvedValue([
      { country: "US", clicks: 600 },
    ]);
  });

  it("returns 401 when unauthenticated", async () => {
    mockedAuth.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost:3000/api/v1/analytics/links/link-123"), {
      params: Promise.resolve({ id: "link-123" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
    });
  });

  it("returns 401 for invalid api keys", async () => {
    mockedAuthenticateApiKey.mockResolvedValue(null);
    mockedAuth.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost:3000/api/v1/analytics/links/link-123", {
      headers: { authorization: "Bearer invalid" },
    }), {
      params: Promise.resolve({ id: "link-123" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns link analytics with api key auth and default daily granularity", async () => {
    mockedAuthenticateApiKey.mockResolvedValue({ userId: "user-123", apiKeyId: "key-123" });

    const response = await GET(new Request("http://localhost:3000/api/v1/analytics/links/link-123", {
      headers: { authorization: "Bearer lb_secret" },
    }), {
      params: Promise.resolve({ id: "link-123" }),
    });

    expect(response.status).toBe(200);
    expect(mockedAuth).not.toHaveBeenCalled();
    expect(analyticsModule.getLinkAnalyticsOverview).toHaveBeenCalledWith("user-123", "link-123");
    expect(analyticsModule.getLinkClicksTimeseries).toHaveBeenCalledWith("user-123", "link-123", "daily");
    await expect(response.json()).resolves.toEqual({
      data: {
        overview: buildOverview(),
        timeseries: {
          granularity: "daily",
          data: buildTimeseries(),
        },
        referrers: [{ domain: "Direct / Unknown", clicks: 500 }],
        geoBreakdown: [{ country: "US", clicks: 600 }],
      },
    });
  });

  it("returns link analytics with session auth", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-123", email: "user@example.com" } });

    const response = await GET(
      new Request("http://localhost:3000/api/v1/analytics/links/link-123?granularity=weekly"),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(200);
    expect(analyticsModule.getLinkClicksTimeseries).toHaveBeenCalledWith("user-123", "link-123", "weekly");
  });

  it.each(["daily", "weekly", "monthly"] as const)("passes %s granularity through to timeseries lookup", async (granularity) => {
    mockedAuth.mockResolvedValue({ user: { id: "user-123", email: "user@example.com" } });

    const response = await GET(
      new Request(`http://localhost:3000/api/v1/analytics/links/link-123?granularity=${granularity}`),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(200);
    expect(analyticsModule.getLinkClicksTimeseries).toHaveBeenCalledWith("user-123", "link-123", granularity);
  });

  it("returns 400 for invalid granularity", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-123", email: "user@example.com" } });

    const response = await GET(
      new Request("http://localhost:3000/api/v1/analytics/links/link-123?granularity=hourly"),
      { params: Promise.resolve({ id: "link-123" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid query parameters",
        details: {
          fields: {
            granularity: "Invalid option: expected one of \"daily\"|\"weekly\"|\"monthly\"",
          },
        },
      },
    });
  });

  it("returns 404 when the link is not owned or does not exist", async () => {
    mockedAuthenticateApiKey.mockResolvedValue({ userId: "user-123", apiKeyId: "key-123" });
    vi.mocked(analyticsModule.getLinkAnalyticsOverview).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost:3000/api/v1/analytics/links/link-404", {
      headers: { authorization: "Bearer lb_secret" },
    }), {
      params: Promise.resolve({ id: "link-404" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Link not found",
      },
    });
  });

  it("returns 404 for invalid UUIDs from prisma validation", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-123", email: "user@example.com" } });
    const prismaValidationError = new Error("invalid input syntax for type uuid");
    prismaValidationError.name = "PrismaClientValidationError";
    vi.mocked(analyticsModule.getLinkAnalyticsOverview).mockRejectedValue(prismaValidationError);

    const response = await GET(
      new Request("http://localhost:3000/api/v1/analytics/links/not-a-uuid"),
      { params: Promise.resolve({ id: "not-a-uuid" }) },
    );

    expect(response.status).toBe(404);
  });
});
