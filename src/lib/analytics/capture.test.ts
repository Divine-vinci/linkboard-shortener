// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { createMock, errorMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  errorMock: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    clickEvent: {
      create: createMock,
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: errorMock,
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

const { captureClickEvent } = await import("./capture");

function createRequest(url = "https://linkboard.test/docs", headers?: HeadersInit) {
  return new NextRequest(url, { headers });
}

describe("src/lib/analytics/capture.ts", () => {
  beforeEach(() => {
    createMock.mockReset();
    errorMock.mockReset();
  });

  it("writes click events with request metadata", async () => {
    createMock.mockResolvedValue({ id: "event-1" });

    await expect(
      captureClickEvent(
        "link-123",
        createRequest(undefined, {
          referer: "https://referrer.test/post",
          "user-agent": "Vitest Agent",
          "x-vercel-ip-country": "NG",
        }),
      ),
    ).resolves.toBeUndefined();

    expect(createMock).toHaveBeenCalledWith({
      data: {
        linkId: "link-123",
        referrer: "https://referrer.test/post",
        country: "NG",
        userAgent: "Vitest Agent",
      },
    });
    expect(errorMock).not.toHaveBeenCalled();
  });

  it("falls back to request.geo country when vercel header is missing", async () => {
    createMock.mockResolvedValue({ id: "event-2" });

    const request = createRequest(undefined, {
      referer: "https://referrer.test/post",
      "user-agent": "Vitest Agent",
    }) as NextRequest & { geo?: { country?: string | null } };
    request.geo = { country: "US" };

    await captureClickEvent("link-456", request);

    expect(createMock).toHaveBeenCalledWith({
      data: {
        linkId: "link-456",
        referrer: "https://referrer.test/post",
        country: "US",
        userAgent: "Vitest Agent",
      },
    });
  });

  it("handles missing headers gracefully", async () => {
    createMock.mockResolvedValue({ id: "event-3" });

    await captureClickEvent("link-789", createRequest());

    expect(createMock).toHaveBeenCalledWith({
      data: {
        linkId: "link-789",
        referrer: null,
        country: null,
        userAgent: "unknown",
      },
    });
  });

  it("truncates oversized header values", async () => {
    createMock.mockResolvedValue({ id: "event-trunc" });

    const longUA = "A".repeat(1000);
    const longRef = "https://example.com/" + "x".repeat(3000);
    const longCountry = "X".repeat(20);

    await captureClickEvent(
      "link-trunc",
      createRequest(undefined, {
        referer: longRef,
        "user-agent": longUA,
        "x-vercel-ip-country": longCountry,
      }),
    );

    const call = createMock.mock.calls[0][0];
    expect(call.data.userAgent).toHaveLength(512);
    expect(call.data.referrer).toHaveLength(2048);
    expect(call.data.country).toHaveLength(10);
  });

  it("logs database failures without throwing", async () => {
    const error = new Error("db unavailable");
    createMock.mockRejectedValue(error);

    await expect(captureClickEvent("link-999", createRequest())).resolves.toBeUndefined();

    expect(errorMock).toHaveBeenCalledWith("analytics.capture_click_event_failed", {
      linkId: "link-999",
      error,
    });
  });
});
