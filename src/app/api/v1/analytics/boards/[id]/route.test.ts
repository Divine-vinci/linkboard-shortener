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
    resolveApiRequestIdentity: async (request: Request) => {
      const apiKeyAuth = await authenticateApiKey(request);

      if (apiKeyAuth) {
        return { userId: apiKeyAuth.userId, rateLimitKey: `api-key:${apiKeyAuth.apiKeyId}`, kind: "apiKey" as const };
      }

      const session = await auth();
      const userId = session?.user?.id ?? null;
      return userId ? { userId, rateLimitKey: `user:${userId}`, kind: "user" as const } : null;
    },
  };
});

vi.mock("@/lib/db/analytics", () => ({
  getBoardAnalyticsOverview: vi.fn(),
  getBoardClicksTimeseries: vi.fn(),
  getBoardReferrerBreakdown: vi.fn(),
  getBoardGeoBreakdown: vi.fn(),
}));

const { __resetRateLimitStore } = await import("@/lib/rate-limit");
const { GET } = await import("@/app/api/v1/analytics/boards/[id]/route");
const authModule = await import("@/lib/auth/config");
const apiKeyAuthModule = await import("@/lib/auth/api-key-middleware");
const analyticsModule = await import("@/lib/db/analytics");

const mockedAuth = authModule.auth as Mock;
const mockedAuthenticateApiKey = apiKeyAuthModule.authenticateApiKey as Mock;

function buildOverview(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    boardName: "Launch Assets",
    totalClicks: 5000,
    linkCount: 15,
    topLinks: [
      { id: "link-1", slug: "launch-doc", title: "Launch Doc", clicks: 500 },
    ],
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

describe("src/app/api/v1/analytics/boards/[id]/route.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetRateLimitStore();
    mockedAuthenticateApiKey.mockResolvedValue(null);
    vi.mocked(analyticsModule.getBoardAnalyticsOverview).mockResolvedValue(buildOverview());
    vi.mocked(analyticsModule.getBoardClicksTimeseries).mockResolvedValue(buildTimeseries());
    vi.mocked(analyticsModule.getBoardReferrerBreakdown).mockResolvedValue([
      { domain: "Direct / Unknown", clicks: 700 },
    ]);
    vi.mocked(analyticsModule.getBoardGeoBreakdown).mockResolvedValue([
      { country: "NG", clicks: 300 },
    ]);
  });

  it("returns 401 when unauthenticated", async () => {
    mockedAuth.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost:3000/api/v1/analytics/boards/board-123"), {
      params: Promise.resolve({ id: "board-123" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 401 for invalid api keys", async () => {
    mockedAuthenticateApiKey.mockResolvedValue(null);
    mockedAuth.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost:3000/api/v1/analytics/boards/board-123", {
      headers: { authorization: "Bearer invalid" },
    }), {
      params: Promise.resolve({ id: "board-123" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns board analytics with api key auth and default daily granularity", async () => {
    mockedAuthenticateApiKey.mockResolvedValue({ userId: "user-123", apiKeyId: "key-123" });

    const response = await GET(new Request("http://localhost:3000/api/v1/analytics/boards/board-123", {
      headers: { authorization: "Bearer lb_secret" },
    }), {
      params: Promise.resolve({ id: "board-123" }),
    });

    expect(response.status).toBe(200);
    expect(mockedAuth).not.toHaveBeenCalled();
    expect(analyticsModule.getBoardAnalyticsOverview).toHaveBeenCalledWith("user-123", "board-123");
    expect(analyticsModule.getBoardClicksTimeseries).toHaveBeenCalledWith("user-123", "board-123", "daily");
    await expect(response.json()).resolves.toEqual({
      data: {
        overview: buildOverview(),
        timeseries: {
          granularity: "daily",
          data: buildTimeseries(),
        },
        referrers: [{ domain: "Direct / Unknown", clicks: 700 }],
        geoBreakdown: [{ country: "NG", clicks: 300 }],
      },
    });
  });

  it("returns board analytics with session auth", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-123", email: "user@example.com" } });

    const response = await GET(
      new Request("http://localhost:3000/api/v1/analytics/boards/board-123?granularity=monthly"),
      { params: Promise.resolve({ id: "board-123" }) },
    );

    expect(response.status).toBe(200);
    expect(analyticsModule.getBoardClicksTimeseries).toHaveBeenCalledWith("user-123", "board-123", "monthly");
  });

  it.each(["daily", "weekly", "monthly"] as const)("passes %s granularity through to board timeseries lookup", async (granularity) => {
    mockedAuth.mockResolvedValue({ user: { id: "user-123", email: "user@example.com" } });

    const response = await GET(
      new Request(`http://localhost:3000/api/v1/analytics/boards/board-123?granularity=${granularity}`),
      { params: Promise.resolve({ id: "board-123" }) },
    );

    expect(response.status).toBe(200);
    expect(analyticsModule.getBoardClicksTimeseries).toHaveBeenCalledWith("user-123", "board-123", granularity);
  });

  it("returns 400 for invalid granularity", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-123", email: "user@example.com" } });

    const response = await GET(
      new Request("http://localhost:3000/api/v1/analytics/boards/board-123?granularity=hourly"),
      { params: Promise.resolve({ id: "board-123" }) },
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

  it("returns 404 when the board is not owned or does not exist", async () => {
    mockedAuthenticateApiKey.mockResolvedValue({ userId: "user-123", apiKeyId: "key-123" });
    vi.mocked(analyticsModule.getBoardAnalyticsOverview).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost:3000/api/v1/analytics/boards/board-404", {
      headers: { authorization: "Bearer lb_secret" },
    }), {
      params: Promise.resolve({ id: "board-404" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Board not found",
      },
    });
  });

  it("returns 404 for invalid UUIDs from prisma validation", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-123", email: "user@example.com" } });
    const prismaValidationError = new Error("invalid input syntax for type uuid");
    prismaValidationError.name = "PrismaClientValidationError";
    vi.mocked(analyticsModule.getBoardAnalyticsOverview).mockRejectedValue(prismaValidationError);

    const response = await GET(
      new Request("http://localhost:3000/api/v1/analytics/boards/not-a-uuid"),
      { params: Promise.resolve({ id: "not-a-uuid" }) },
    );

    expect(response.status).toBe(404);
  });
});
